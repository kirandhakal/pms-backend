"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatRouter = exports.origins = exports.sendSchema = exports.targetSchema = void 0;
exports.room = room;
exports.access = access;
exports.messageQuery = messageQuery;
exports.hydrateMessages = hydrateMessages;
exports.history = history;
exports.changes = changes;
exports.send = send;
exports.changeMessage = changeMessage;
exports.attachChat = attachChat;
const socket_io_1 = require("socket.io");
const express_1 = require("express");
const zod_1 = require("zod");
const typeorm_1 = require("typeorm");
const data_source_1 = require("../config/data-source");
const auth_1 = require("../middlewares/auth");
const errorHandler_1 = require("../middlewares/errorHandler");
const Channel_1 = require("../entities/Channel");
const ChannelMember_1 = require("../entities/ChannelMember");
const Friendship_1 = require("../entities/Friendship");
const Project_1 = require("../entities/Project");
const ProjectMember_1 = require("../entities/ProjectMember");
const Task_1 = require("../entities/Task");
const User_1 = require("../entities/User");
const DirectMessage_1 = require("../entities/DirectMessage");
const ChannelMessage_1 = require("../entities/ChannelMessage");
const TaskComment_1 = require("../entities/TaskComment");
const ProjectMessage_1 = require("../entities/ProjectMessage");
const ChatAttachment_1 = require("../entities/ChatAttachment");
const ChatEvent_1 = require("../entities/ChatEvent");
const chat_media_routes_1 = require("../routes/chat-media.routes");
const ChatAttachmentService_1 = require("../services/ChatAttachmentService");
exports.targetSchema = zod_1.z.object({ kind: zod_1.z.enum(["friend", "channel", "project", "task"]), id: zod_1.z.uuid() });
exports.sendSchema = exports.targetSchema.extend({
    body: zod_1.z.string().trim().max(4000).default(""), clientMessageId: zod_1.z.uuid(),
    attachmentIds: zod_1.z.array(zod_1.z.uuid()).max(20).default([]), replyToMessageId: zod_1.z.uuid().optional(),
}).refine(p => p.body.length > 0 || p.attachmentIds.length > 0)
    .refine(p => new Set(p.attachmentIds).size === p.attachmentIds.length);
const cursorSchema = zod_1.z.string().regex(/^\d{1,19}$/).refine(s => BigInt(s) <= 9223372036854775807n);
const pageSchema = zod_1.z.object({ after: cursorSchema.optional(), before: cursorSchema.optional(), limit: zod_1.z.coerce.number().int().min(1).max(100).default(50) }).refine(v => !(v.after && v.before));
exports.origins = (process.env.CHAT_ALLOWED_ORIGINS || "http://localhost:3000").split(",").map(s => s.trim());
let io;
const rates = new Map();
function rate(userId) {
    const now = Date.now();
    for (const [key, value] of rates)
        if (now - value.start >= 60000)
            rates.delete(key);
    const value = rates.get(userId) || { start: now, count: 0 };
    if (++value.count > 60)
        throw new errorHandler_1.ApiError("Too many chat actions; try again shortly", 429);
    rates.set(userId, value);
}
function room(userId, t) {
    return t.kind === "friend" ? `friend:${[userId, t.id].sort().join(":")}` : `${t.kind}:${t.id}`;
}
async function access(userId, t, m = data_source_1.AppDataSource.manager) {
    if (t.kind === "friend") {
        const status = Friendship_1.FriendshipStatus.ACCEPTED;
        if (!await m.findOneBy(Friendship_1.Friendship, [{ requesterId: userId, addresseeId: t.id, status }, { requesterId: t.id, addresseeId: userId, status }]))
            throw new errorHandler_1.ApiError("You can only message friends", 403);
    }
    else if (t.kind === "channel") {
        const c = await m.findOneBy(Channel_1.Channel, { id: t.id, isActive: true });
        const u = await m.findOne(User_1.User, { where: { id: userId }, relations: ["team"] });
        const member = await m.findOneBy(ChannelMember_1.ChannelMember, { channelId: t.id, userId });
        if (!c || c.teamId !== u?.team?.id || (c.type !== Channel_1.ChannelType.PUBLIC && !member))
            throw new errorHandler_1.ApiError("Channel access denied", 403);
    }
    else if (t.kind === "project") {
        const p = await m.findOneBy(Project_1.Project, { id: t.id });
        if (!p || (p.managerId !== userId && p.teamLeadId !== userId && !await m.findOneBy(ProjectMember_1.ProjectMember, { projectId: t.id, userId })))
            throw new errorHandler_1.ApiError("Project access denied", 403);
    }
    else {
        const task = await m.findOneBy(Task_1.Task, { id: t.id });
        if (!task)
            throw new errorHandler_1.ApiError("Task not found", 404);
        if ([task.assigneeId, task.createdById, task.ownerId].includes(userId))
            return;
        if (task.projectId)
            return access(userId, { kind: "project", id: task.projectId }, m);
        throw new errorHandler_1.ApiError("Task access denied", 403);
    }
}
function entity(t) {
    return (t.kind === "friend" ? DirectMessage_1.DirectMessage : t.kind === "channel" ? ChannelMessage_1.ChannelMessage : t.kind === "task" ? TaskComment_1.TaskComment : ProjectMessage_1.ProjectMessage);
}
function messageQuery(m, userId, t) {
    const q = m.getRepository(entity(t)).createQueryBuilder("msg");
    if (t.kind === "friend")
        q.where(new typeorm_1.Brackets(w => w.where('msg."senderId" = :u AND msg."recipientId" = :id').orWhere('msg."senderId" = :id AND msg."recipientId" = :u')), { u: userId, id: t.id });
    else
        q.where(`msg."${t.kind === "channel" ? "channelId" : t.kind === "task" ? "taskId" : "projectId"}" = :id`, { id: t.id });
    return q;
}
function dto(raw) {
    return {
        id: raw.id, senderId: raw.senderId || raw.userId, recipientId: raw.recipientId,
        body: raw.isDeleted ? "" : raw.body ?? raw.content,
        clientMessageId: raw.clientMessageId, sequence: String(raw.chatSequence),
        version: String(raw.chatVersion || "0"), createdAt: raw.createdAt,
        isDeleted: Boolean(raw.isDeleted), pinnedAt: raw.isDeleted ? null : raw.pinnedAt || null,
        replyToMessageId: raw.replyToMessageId || null,
    };
}
async function hydrateMessages(m, userId, t, rows) {
    if (!rows.length)
        return [];
    const ids = rows.filter(r => !r.isDeleted).map(r => r.id);
    const files = ids.length ? await m.find(ChatAttachment_1.ChatAttachment, { where: { conversationKey: room(userId, t), messageId: (0, typeorm_1.In)(ids), status: "ready" }, order: { createdAt: "ASC", id: "ASC" } }) : [];
    const replyIds = [...new Set(rows.filter(r => !r.isDeleted && r.replyToMessageId).map(r => r.replyToMessageId))];
    const replies = replyIds.length ? await messageQuery(m, userId, t).andWhere("msg.id IN (:...replyIds)", { replyIds }).getMany() : [];
    return rows.map(raw => {
        const reply = replies.find(r => r.id === raw.replyToMessageId);
        return {
            ...dto(raw), attachments: raw.isDeleted ? [] : files.filter(f => f.messageId === raw.id).map(ChatAttachmentService_1.attachmentDto),
            replyTo: !raw.isDeleted && reply ? { id: reply.id, senderId: reply.senderId || reply.userId, body: reply.isDeleted ? "Message removed" : (reply.body ?? reply.content), isDeleted: reply.isDeleted } : null,
        };
    });
}
async function history(userId, t, input) {
    const p = pageSchema.parse(input);
    return data_source_1.AppDataSource.transaction("REPEATABLE READ", async (m) => {
        await access(userId, t, m);
        const q = messageQuery(m, userId, t);
        if (p.after)
            q.andWhere('msg."chatSequence" > :cursor', { cursor: p.after });
        if (p.before)
            q.andWhere('msg."chatSequence" < :cursor', { cursor: p.before });
        const rows = await q.orderBy('msg."chatSequence"', p.after ? "ASC" : "DESC").take(p.limit + 1).getMany();
        const hasMore = rows.length > p.limit;
        const page = rows.slice(0, p.limit);
        if (!p.after)
            page.reverse();
        const latest = await m.findOne(ChatEvent_1.ChatEvent, { where: { conversationKey: room(userId, t) }, order: { sequence: "DESC" } });
        const pinned = await messageQuery(m, userId, t).andWhere('msg."pinnedAt" IS NOT NULL AND msg."isDeleted" = false').orderBy('msg."pinnedAt"', "DESC").take(20).getMany();
        return { data: await hydrateMessages(m, userId, t, page), hasMore, eventCursor: latest?.sequence || "0", pinned: await hydrateMessages(m, userId, t, pinned) };
    });
}
async function changes(userId, t, input) {
    const p = zod_1.z.object({ after: cursorSchema }).parse(input);
    await access(userId, t);
    const events = await data_source_1.AppDataSource.getRepository(ChatEvent_1.ChatEvent).createQueryBuilder("event")
        .where('event."conversationKey" = :key AND event.sequence > :after', { key: room(userId, t), after: p.after })
        .orderBy("event.sequence", "ASC").take(101).getMany();
    const page = events.slice(0, 100);
    const ids = [...new Set(page.map(e => e.messageId))];
    const rows = ids.length ? await messageQuery(data_source_1.AppDataSource.manager, userId, t).andWhere("msg.id IN (:...ids)", { ids }).getMany() : [];
    return { data: await hydrateMessages(data_source_1.AppDataSource.manager, userId, t, rows), hasMore: events.length > 100, eventCursor: page[page.length - 1]?.sequence || p.after };
}
async function lockConversation(m, userId, t) {
    await m.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [room(userId, t)]);
    await access(userId, t, m);
}
async function recordChange(m, userId, t, saved) {
    const event = await m.save(ChatEvent_1.ChatEvent, m.create(ChatEvent_1.ChatEvent, { conversationKey: room(userId, t), messageId: saved.id }));
    saved.chatVersion = event.sequence;
    saved.chatUpdatedAt = new Date();
    await m.getRepository(entity(t)).update(saved.id, { chatVersion: event.sequence, chatUpdatedAt: saved.chatUpdatedAt });
}
async function broadcast(userId, t, event, message) {
    if (!io)
        return;
    const sockets = await io.in(room(userId, t)).fetchSockets();
    await Promise.all(sockets.map(async (s) => {
        try {
            await (0, auth_1.authenticateToken)(s.data.token);
            await access(s.data.userId, { kind: t.kind, id: t.kind === "friend" ? (s.data.userId === userId ? t.id : userId) : t.id });
            s.emit(event, message);
        }
        catch {
            await s.leave(room(userId, t));
        }
    }));
}
async function send(userId, input) {
    let p;
    try {
        p = exports.sendSchema.parse(input);
    }
    catch {
        throw new errorHandler_1.ApiError("Invalid chat request", 400);
    }
    rate(userId);
    const result = await data_source_1.AppDataSource.transaction(async (m) => {
        await lockConversation(m, userId, p);
        const old = await messageQuery(m, userId, p).andWhere('msg."clientMessageId" = :client AND msg."' + (p.kind === "friend" ? "senderId" : "userId") + '" = :sender', { client: p.clientMessageId, sender: userId }).getOne();
        if (old)
            return { raw: old, created: false };
        if (p.attachmentIds.length > (0, ChatAttachmentService_1.mediaLimits)().maxAttachments)
            throw new errorHandler_1.ApiError("Too many attachments", 400);
        if (p.kind === "channel" && (await m.findOneBy(ChannelMember_1.ChannelMember, { channelId: p.id, userId }))?.isMuted)
            throw new errorHandler_1.ApiError("Channel is muted", 400);
        if (p.replyToMessageId && !await messageQuery(m, userId, p).andWhere('msg.id = :replyId AND msg."isDeleted" = false', { replyId: p.replyToMessageId }).getOne())
            throw new errorHandler_1.ApiError("Reply target is unavailable in this conversation", 400);
        const shared = { clientMessageId: p.clientMessageId, replyToMessageId: p.replyToMessageId };
        const values = { ...shared, body: p.body, userId };
        let saved;
        if (p.kind === "friend")
            saved = await m.save(DirectMessage_1.DirectMessage, m.create(DirectMessage_1.DirectMessage, { ...shared, senderId: userId, recipientId: p.id, body: p.body }));
        else if (p.kind === "channel")
            saved = await m.save(ChannelMessage_1.ChannelMessage, m.create(ChannelMessage_1.ChannelMessage, { ...values, channelId: p.id }));
        else if (p.kind === "task")
            saved = await m.save(TaskComment_1.TaskComment, m.create(TaskComment_1.TaskComment, { ...shared, userId, taskId: p.id, content: p.body }));
        else
            saved = await m.save(ProjectMessage_1.ProjectMessage, m.create(ProjectMessage_1.ProjectMessage, { ...values, projectId: p.id }));
        await (0, ChatAttachmentService_1.claimAttachments)(m, userId, p, p.attachmentIds, saved.id);
        await recordChange(m, userId, p, saved);
        return { raw: saved, created: true };
    });
    const [message] = await hydrateMessages(data_source_1.AppDataSource.manager, userId, p, [result.raw]);
    if (result.created)
        await broadcast(userId, p, "message:new", message);
    return message;
}
async function changeMessage(userId, input) {
    const p = exports.targetSchema.extend({ messageId: zod_1.z.uuid(), action: zod_1.z.enum(["remove", "pin", "unpin"]) }).parse(input);
    rate(userId);
    const raw = await data_source_1.AppDataSource.transaction(async (m) => {
        await lockConversation(m, userId, p);
        const message = await messageQuery(m, userId, p).andWhere("msg.id = :messageId", { messageId: p.messageId }).getOne();
        if (!message)
            throw new errorHandler_1.ApiError("Message not found", 404);
        const channel = p.kind === "channel" ? await m.findOneBy(Channel_1.Channel, { id: p.id }) : null;
        const owner = channel?.createdById === userId;
        if (p.action === "remove") {
            if ((message.senderId || message.userId) !== userId && !owner)
                throw new errorHandler_1.ApiError("You can only remove your own messages", 403);
            if (message.isDeleted)
                return message;
            message.isDeleted = true;
            message.pinnedAt = null;
            message.pinnedById = null;
            if (p.kind === "task") {
                message.content = "";
                message.attachments = null;
            }
            else
                message.body = "";
            await m.update(ChatAttachment_1.ChatAttachment, { conversationKey: room(userId, p), messageId: message.id }, { status: "deleted", expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
        }
        else {
            if (channel && !owner)
                throw new errorHandler_1.ApiError("Only the channel owner can pin messages", 403);
            if (message.isDeleted)
                throw new errorHandler_1.ApiError("Message has been removed", 400);
            if ((p.action === "pin") === Boolean(message.pinnedAt))
                return message;
            if (p.action === "pin") {
                const count = await messageQuery(m, userId, p).andWhere('msg."pinnedAt" IS NOT NULL AND msg."isDeleted" = false').getCount();
                if (count >= 20)
                    throw new errorHandler_1.ApiError("Unpin a message first (maximum 20 pins)", 400);
            }
            message.pinnedAt = p.action === "pin" ? new Date() : null;
            message.pinnedById = p.action === "pin" ? userId : null;
        }
        await m.save(entity(p), message);
        await recordChange(m, userId, p, message);
        return message;
    });
    const [message] = await hydrateMessages(data_source_1.AppDataSource.manager, userId, p, [raw]);
    await broadcast(userId, p, "message:updated", message);
    return message;
}
exports.chatRouter = (0, express_1.Router)();
exports.chatRouter.use(auth_1.authenticate);
exports.chatRouter.use(chat_media_routes_1.chatMediaRouter);
const route = (fn) => async (req, res, next) => {
    try {
        res.json(await fn(req));
    }
    catch (e) {
        next(e instanceof zod_1.z.ZodError ? new errorHandler_1.ApiError("Invalid chat request", 400) : e);
    }
};
exports.chatRouter.get("/:kind/:id/messages", route(req => history(req.user.id, exports.targetSchema.parse(req.params), req.query)));
exports.chatRouter.get("/:kind/:id/changes", route(req => changes(req.user.id, exports.targetSchema.parse(req.params), req.query)));
exports.chatRouter.post("/:kind/:id/messages/:messageId/action", route(req => changeMessage(req.user.id, { ...req.body, ...req.params })));
function attachChat(server) {
    (0, ChatAttachmentService_1.mediaLimits)();
    io = new socket_io_1.Server(server, { cors: { origin: exports.origins }, maxHttpBufferSize: 20000, allowRequest: (req, done) => done(null, !req.headers.origin || exports.origins.includes(req.headers.origin)) });
    io.use(async (socket, next) => {
        try {
            const token = zod_1.z.string().min(1).max(4096).parse(socket.handshake.auth.token);
            const session = await (0, auth_1.authenticateToken)(token);
            socket.data = { userId: session.user.id, token };
            next();
        }
        catch {
            next(new Error("Unauthorized"));
        }
    });
    io.on("connection", socket => {
        const handle = (event, fn) => socket.on(event, async (p, ack) => {
            if (typeof ack !== "function")
                return;
            try {
                await (0, auth_1.authenticateToken)(socket.data.token);
                ack({ ok: true, data: await fn(p) });
            }
            catch (e) {
                ack({ ok: false, error: e instanceof errorHandler_1.ApiError ? e.message : e instanceof zod_1.z.ZodError ? "Invalid chat request" : "Chat request failed" });
            }
        });
        handle("conversation:join", async (p) => {
            const t = exports.targetSchema.parse(p);
            await access(socket.data.userId, t);
            for (const r of [...socket.rooms].filter(r => r !== socket.id && r !== room(socket.data.userId, t)))
                await socket.leave(r);
            await socket.join(room(socket.data.userId, t));
            return { joined: true };
        });
        handle("message:send", p => send(socket.data.userId, p));
        handle("message:action", p => changeMessage(socket.data.userId, p));
    });
    return io;
}
