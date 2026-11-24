import { projectAccess, taskAccess } from '../services/ProjectAccess';
import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { Router } from "express";
import { z } from "zod";
import { Brackets, EntityManager, In } from "typeorm";
import { AppDataSource as db } from "../config/data-source";
import { authenticate, authenticateToken, AuthRequest } from "../middlewares/auth";
import { ApiError } from "../middlewares/errorHandler";
import { Channel, ChannelType } from "../entities/Channel";
import { ChannelMember } from "../entities/ChannelMember";
import { Friendship, FriendshipStatus } from "../entities/Friendship";
import { Project } from "../entities/Project";
import { ProjectMember } from "../entities/ProjectMember";
import { Task } from "../entities/Task";
import { User } from "../entities/User";
import { DirectMessage } from "../entities/DirectMessage";
import { ChannelMessage } from "../entities/ChannelMessage";
import { TaskComment } from "../entities/TaskComment";
import { ProjectMessage } from "../entities/ProjectMessage";
import { ChatAttachment } from "../entities/ChatAttachment";
import { ChatEvent } from "../entities/ChatEvent";
import { chatMediaRouter } from "../routes/chat-media.routes";
import { attachmentDto, claimAttachments, mediaLimits } from "../services/ChatAttachmentService";

export const targetSchema = z.object({ kind: z.enum(["friend", "channel", "project", "task"]), id: z.uuid() });
export type ChatTarget = z.infer<typeof targetSchema>;
export const sendSchema = targetSchema.extend({
    body: z.string().trim().max(4000).default(""), clientMessageId: z.uuid(),
    attachmentIds: z.array(z.uuid()).max(20).default([]), replyToMessageId: z.uuid().optional(),
}).refine(p => p.body.length > 0 || p.attachmentIds.length > 0)
    .refine(p => new Set(p.attachmentIds).size === p.attachmentIds.length);
const cursorSchema = z.string().regex(/^\d{1,19}$/).refine(s => BigInt(s) <= 9223372036854775807n);
const pageSchema = z.object({ after: cursorSchema.optional(), before: cursorSchema.optional(), limit: z.coerce.number().int().min(1).max(100).default(50) }).refine(v => !(v.after && v.before));
export const origins = (process.env.CHAT_ALLOWED_ORIGINS || "http://localhost:3000").split(",").map(s => s.trim());
let io: Server;
const rates = new Map<string, { start: number; count: number }>();
function rate(userId: string) {
    const now = Date.now();
    for (const [key, value] of rates) if (now - value.start >= 60000) rates.delete(key);
    const value = rates.get(userId) || { start: now, count: 0 };
    if (++value.count > 60) throw new ApiError("Too many chat actions; try again shortly", 429);
    rates.set(userId, value);
}
export function room(userId: string, t: ChatTarget) {
    return t.kind === "friend" ? `friend:${[userId, t.id].sort().join(":")}` : `${t.kind}:${t.id}`;
}
export async function access(userId: string, t: ChatTarget, m: EntityManager = db.manager): Promise<void> {
    if (t.kind === "friend") {
        const status = FriendshipStatus.ACCEPTED;
        if (!await m.findOneBy(Friendship, [{ requesterId: userId, addresseeId: t.id, status }, { requesterId: t.id, addresseeId: userId, status }])) throw new ApiError("You can only message friends", 403);
    } else if (t.kind === "channel") {
        const c = await m.findOneBy(Channel, { id: t.id, isActive: true });
        const u = await m.findOne(User, { where: { id: userId }, relations: ["team"] });
        const member = await m.findOneBy(ChannelMember, { channelId: t.id, userId });
        if (!c || c.teamId !== u?.team?.id || (c.type !== ChannelType.PUBLIC && !member)) throw new ApiError("Channel access denied", 403);
    } else if (t.kind === "project") {
        await projectAccess(userId, t.id, undefined, m);
    } else {
        await taskAccess(userId, t.id, m);
    }
}
function entity(t: ChatTarget) {
    return (t.kind === "friend" ? DirectMessage : t.kind === "channel" ? ChannelMessage : t.kind === "task" ? TaskComment : ProjectMessage) as typeof ChannelMessage;
}
export function messageQuery(m: EntityManager, userId: string, t: ChatTarget) {
    const q = m.getRepository(entity(t)).createQueryBuilder("msg");
    if (t.kind === "friend") q.where(new Brackets(w => w.where('msg."senderId" = :u AND msg."recipientId" = :id').orWhere('msg."senderId" = :id AND msg."recipientId" = :u')), { u: userId, id: t.id });
    else q.where(`msg."${t.kind === "channel" ? "channelId" : t.kind === "task" ? "taskId" : "projectId"}" = :id`, { id: t.id });
    return q;
}
function dto(raw: any) {
    return {
        id: raw.id, senderId: raw.senderId || raw.userId, recipientId: raw.recipientId,
        body: raw.isDeleted ? "" : raw.body ?? raw.content,
        clientMessageId: raw.clientMessageId, sequence: String(raw.chatSequence),
        version: String(raw.chatVersion || "0"), createdAt: raw.createdAt,
        isDeleted: Boolean(raw.isDeleted), pinnedAt: raw.isDeleted ? null : raw.pinnedAt || null,
        replyToMessageId: raw.replyToMessageId || null,
    };
}
export async function hydrateMessages(m: EntityManager, userId: string, t: ChatTarget, rows: any[]) {
    if (!rows.length) return [];
    const ids = rows.filter(r => !r.isDeleted).map(r => r.id);
    const files = ids.length ? await m.find(ChatAttachment, { where: { conversationKey: room(userId, t), messageId: In(ids), status: "ready" }, order: { createdAt: "ASC", id: "ASC" } }) : [];
    const replyIds = [...new Set(rows.filter(r => !r.isDeleted && r.replyToMessageId).map(r => r.replyToMessageId))];
    const replies = replyIds.length ? await messageQuery(m, userId, t).andWhere("msg.id IN (:...replyIds)", { replyIds }).getMany() : [];
    return rows.map(raw => {
        const reply = replies.find(r => r.id === raw.replyToMessageId);
        return {
            ...dto(raw), attachments: raw.isDeleted ? [] : files.filter(f => f.messageId === raw.id).map(attachmentDto),
            replyTo: !raw.isDeleted && reply ? { id: reply.id, senderId: (reply as any).senderId || reply.userId, body: reply.isDeleted ? "Message removed" : ((reply as any).body ?? (reply as any).content), isDeleted: reply.isDeleted } : null,
        };
    });
}
export async function history(userId: string, t: ChatTarget, input: unknown) {
    const p = pageSchema.parse(input);
    return db.transaction("REPEATABLE READ", async m => {
        await access(userId, t, m);
        const q = messageQuery(m, userId, t);
        if (p.after) q.andWhere('msg."chatSequence" > :cursor', { cursor: p.after });
        if (p.before) q.andWhere('msg."chatSequence" < :cursor', { cursor: p.before });
        const rows = await q.orderBy('msg."chatSequence"', p.after ? "ASC" : "DESC").take(p.limit + 1).getMany();
        const hasMore = rows.length > p.limit;
        const page = rows.slice(0, p.limit);
        if (!p.after) page.reverse();
        const latest = await m.findOne(ChatEvent, { where: { conversationKey: room(userId, t) }, order: { sequence: "DESC" } });
        const pinned = await messageQuery(m, userId, t).andWhere('msg."pinnedAt" IS NOT NULL AND msg."isDeleted" = false').orderBy('msg."pinnedAt"', "DESC").take(20).getMany();
        return { data: await hydrateMessages(m, userId, t, page), hasMore, eventCursor: latest?.sequence || "0", pinned: await hydrateMessages(m, userId, t, pinned) };
    });
}
export async function changes(userId: string, t: ChatTarget, input: unknown) {
    const p = z.object({ after: cursorSchema }).parse(input);
    await access(userId, t);
    const events = await db.getRepository(ChatEvent).createQueryBuilder("event")
        .where('event."conversationKey" = :key AND event.sequence > :after', { key: room(userId, t), after: p.after })
        .orderBy("event.sequence", "ASC").take(101).getMany();
    const page = events.slice(0, 100);
    const ids = [...new Set(page.map(e => e.messageId))];
    const rows = ids.length ? await messageQuery(db.manager, userId, t).andWhere("msg.id IN (:...ids)", { ids }).getMany() : [];
    return { data: await hydrateMessages(db.manager, userId, t, rows), hasMore: events.length > 100, eventCursor: page[page.length - 1]?.sequence || p.after };
}
async function lockConversation(m: EntityManager, userId: string, t: ChatTarget) {
    await m.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [room(userId, t)]);
    await access(userId, t, m);
}
async function recordChange(m: EntityManager, userId: string, t: ChatTarget, saved: any) {
    const event = await m.save(ChatEvent, m.create(ChatEvent, { conversationKey: room(userId, t), messageId: saved.id }));
    saved.chatVersion = event.sequence;
    saved.chatUpdatedAt = new Date();
    await m.getRepository(entity(t)).update(saved.id, { chatVersion: event.sequence, chatUpdatedAt: saved.chatUpdatedAt });
}
async function broadcast(userId: string, t: ChatTarget, event: string, message: unknown) {
    if (!io) return;
    const sockets = await io.in(room(userId, t)).fetchSockets();
    await Promise.all(sockets.map(async s => {
        try {
            await authenticateToken(s.data.token);
            await access(s.data.userId, { kind: t.kind, id: t.kind === "friend" ? (s.data.userId === userId ? t.id : userId) : t.id });
            s.emit(event, message);
        } catch { await s.leave(room(userId, t)); }
    }));
}
export async function send(userId: string, input: unknown) {
    let p: z.infer<typeof sendSchema>;
    try { p = sendSchema.parse(input); } catch { throw new ApiError("Invalid chat request", 400); }
    rate(userId);
    const result = await db.transaction(async m => {
        await lockConversation(m, userId, p);
        const old = await messageQuery(m, userId, p).andWhere('msg."clientMessageId" = :client AND msg."' + (p.kind === "friend" ? "senderId" : "userId") + '" = :sender', { client: p.clientMessageId, sender: userId }).getOne();
        if (old) return { raw: old, created: false };
        if (p.attachmentIds.length > mediaLimits().maxAttachments) throw new ApiError("Too many attachments", 400);
        if (p.kind === "channel" && (await m.findOneBy(ChannelMember, { channelId: p.id, userId }))?.isMuted) throw new ApiError("Channel is muted", 400);
        if (p.replyToMessageId && !await messageQuery(m, userId, p).andWhere('msg.id = :replyId AND msg."isDeleted" = false', { replyId: p.replyToMessageId }).getOne()) throw new ApiError("Reply target is unavailable in this conversation", 400);
        const shared = { clientMessageId: p.clientMessageId, replyToMessageId: p.replyToMessageId };
        const values = { ...shared, body: p.body, userId };
        let saved: any;
        if (p.kind === "friend") saved = await m.save(DirectMessage, m.create(DirectMessage, { ...shared, senderId: userId, recipientId: p.id, body: p.body }));
        else if (p.kind === "channel") saved = await m.save(ChannelMessage, m.create(ChannelMessage, { ...values, channelId: p.id }));
        else if (p.kind === "task") saved = await m.save(TaskComment, m.create(TaskComment, { ...shared, userId, taskId: p.id, content: p.body }));
        else saved = await m.save(ProjectMessage, m.create(ProjectMessage, { ...values, projectId: p.id }));
        await claimAttachments(m, userId, p, p.attachmentIds, saved.id);
        await recordChange(m, userId, p, saved);
        return { raw: saved, created: true };
    });
    const [message] = await hydrateMessages(db.manager, userId, p, [result.raw]);
    if (result.created) await broadcast(userId, p, "message:new", message);
    return message;
}
export async function changeMessage(userId: string, input: unknown) {
    const p = targetSchema.extend({ messageId: z.uuid(), action: z.enum(["remove", "pin", "unpin"]) }).parse(input);
    rate(userId);
    const raw = await db.transaction(async m => {
        await lockConversation(m, userId, p);
        const message: any = await messageQuery(m, userId, p).andWhere("msg.id = :messageId", { messageId: p.messageId }).getOne();
        if (!message) throw new ApiError("Message not found", 404);
        const channel = p.kind === "channel" ? await m.findOneBy(Channel, { id: p.id }) : null;
        const owner = channel?.createdById === userId;
        if (p.action === "remove") {
            if ((message.senderId || message.userId) !== userId && !owner) throw new ApiError("You can only remove your own messages", 403);
            if (message.isDeleted) return message;
            message.isDeleted = true; message.pinnedAt = null; message.pinnedById = null;
            if (p.kind === "task") { message.content = ""; message.attachments = null; } else message.body = "";
            await m.update(ChatAttachment, { conversationKey: room(userId, p), messageId: message.id }, { status: "deleted", expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
        } else {
            if (channel && !owner) throw new ApiError("Only the channel owner can pin messages", 403);
            if (message.isDeleted) throw new ApiError("Message has been removed", 400);
            if ((p.action === "pin") === Boolean(message.pinnedAt)) return message;
            if (p.action === "pin") {
                const count = await messageQuery(m, userId, p).andWhere('msg."pinnedAt" IS NOT NULL AND msg."isDeleted" = false').getCount();
                if (count >= 20) throw new ApiError("Unpin a message first (maximum 20 pins)", 400);
            }
            message.pinnedAt = p.action === "pin" ? new Date() : null;
            message.pinnedById = p.action === "pin" ? userId : null;
        }
        await m.save(entity(p), message);
        await recordChange(m, userId, p, message);
        return message;
    });
    const [message] = await hydrateMessages(db.manager, userId, p, [raw]);
    await broadcast(userId, p, "message:updated", message);
    return message;
}
export const chatRouter = Router();
chatRouter.use(authenticate);
chatRouter.use(chatMediaRouter);
const route = (fn: (req: AuthRequest) => Promise<unknown>) => async (req: AuthRequest, res: any, next: any) => {
    try { res.json(await fn(req)); }
    catch (e) { next(e instanceof z.ZodError ? new ApiError("Invalid chat request", 400) : e); }
};
chatRouter.get("/:kind/:id/messages", route(req => history(req.user!.id, targetSchema.parse(req.params), req.query)));
chatRouter.get("/:kind/:id/changes", route(req => changes(req.user!.id, targetSchema.parse(req.params), req.query)));
chatRouter.post("/:kind/:id/messages/:messageId/action", route(req => changeMessage(req.user!.id, { ...req.body, ...req.params })));
export function attachChat(server: HttpServer) {
    mediaLimits();
    io = new Server(server, { cors: { origin: origins }, maxHttpBufferSize: 20000, allowRequest: (req, done) => done(null, !req.headers.origin || origins.includes(req.headers.origin)) });
    io.use(async (socket, next) => {
        try {
            const token = z.string().min(1).max(4096).parse(socket.handshake.auth.token);
            const session = await authenticateToken(token);
            socket.data = { userId: session.user.id, token }; next();
        } catch { next(new Error("Unauthorized")); }
    });
    io.on("connection", socket => {
        const handle = (event: string, fn: (p: any) => Promise<any>) => socket.on(event, async (p, ack) => {
            if (typeof ack !== "function") return;
            try { await authenticateToken(socket.data.token); ack({ ok: true, data: await fn(p) }); }
            catch (e) { ack({ ok: false, error: e instanceof ApiError ? e.message : e instanceof z.ZodError ? "Invalid chat request" : "Chat request failed" }); }
        });
        handle("conversation:join", async p => {
            const t = targetSchema.parse(p); await access(socket.data.userId, t);
            for (const r of [...socket.rooms].filter(r => r !== socket.id && r !== room(socket.data.userId, t))) await socket.leave(r);
            await socket.join(room(socket.data.userId, t)); return { joined: true };
        });
        handle("message:send", p => send(socket.data.userId, p));
        handle("message:action", p => changeMessage(socket.data.userId, p));
    });
    return io;
}
