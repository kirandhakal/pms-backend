import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { Router } from "express";
import { z } from "zod";
import { Brackets, EntityManager } from "typeorm";
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

export const targetSchema = z.object({ kind: z.enum(["friend", "channel", "project", "task"]), id: z.uuid() });
const sendSchema = targetSchema.extend({ body: z.string().trim().min(1).max(4000), clientMessageId: z.uuid() });
const pageSchema = z.object({ after: z.string().regex(/^\d{1,19}$/).optional(), before: z.string().regex(/^\d{1,19}$/).optional(), limit: z.coerce.number().int().min(1).max(100).default(50) }).refine(v => !(v.after && v.before));
type Target = z.infer<typeof targetSchema>;
export const origins = (process.env.CHAT_ALLOWED_ORIGINS || "http://localhost:3000").split(",").map(s => s.trim());
let io: Server;
const rates = new Map<string, { start: number; count: number }>();
function rate(userId: string) {
 const now = Date.now();
 for (const [key, value] of rates) if (now - value.start >= 60000) rates.delete(key);
 const value = rates.get(userId) || { start: now, count: 0 };
 if (++value.count > 60) throw new ApiError("Too many messages; try again shortly", 429);
 rates.set(userId, value);
}
export function room(userId: string, t: Target) { return t.kind === "friend" ? `friend:${[userId,t.id].sort().join(":")}` : `${t.kind}:${t.id}`; }
export async function access(userId: string, t: Target, m: EntityManager = db.manager): Promise<void> {
 if (t.kind === "friend") {
  const status = FriendshipStatus.ACCEPTED;
  if (!await m.findOneBy(Friendship, [{requesterId:userId,addresseeId:t.id,status},{requesterId:t.id,addresseeId:userId,status}])) throw new ApiError("You can only message friends",403);
 } else if (t.kind === "channel") {
  const c = await m.findOneBy(Channel,{id:t.id,isActive:true});
  const u = await m.findOne(User,{where:{id:userId},relations:["team"]});
  const member = await m.findOneBy(ChannelMember,{channelId:t.id,userId});
  if (!c || c.teamId !== u?.team?.id || (c.type !== ChannelType.PUBLIC && !member)) throw new ApiError("Channel access denied",403);
 } else if (t.kind === "project") {
  const p = await m.findOneBy(Project,{id:t.id});
  if (!p || (p.managerId !== userId && p.teamLeadId !== userId && !await m.findOneBy(ProjectMember,{projectId:t.id,userId}))) throw new ApiError("Project access denied",403);
 } else {
  const task = await m.findOneBy(Task,{id:t.id});
  if (!task) throw new ApiError("Task not found",404);
  if ([task.assigneeId,task.createdById,task.ownerId].includes(userId)) return;
  if (task.projectId) return access(userId,{kind:"project",id:task.projectId},m);
  throw new ApiError("Task access denied",403);
 }
}
function query(m: EntityManager, userId: string, t: Target) {
 const entity = t.kind === "friend" ? DirectMessage : t.kind === "channel" ? ChannelMessage : t.kind === "task" ? TaskComment : ProjectMessage;
 const q = m.getRepository(entity as typeof ChannelMessage).createQueryBuilder("msg");
 if (t.kind === "friend") q.where(new Brackets(w => w.where('msg."senderId" = :u AND msg."recipientId" = :id').orWhere('msg."senderId" = :id AND msg."recipientId" = :u')), {u:userId,id:t.id});
 else q.where(`msg."${t.kind === "channel" ? "channelId" : t.kind === "task" ? "taskId" : "projectId"}" = :id`,{id:t.id});
 return q;
}
function dto(raw: any) {
 return {id:raw.id, senderId:raw.senderId || raw.userId, recipientId:raw.recipientId, body:raw.body ?? raw.content, clientMessageId:raw.clientMessageId, sequence:String(raw.chatSequence), createdAt:raw.createdAt};
}
export async function history(userId: string, t: Target, input: unknown) {
 const p = pageSchema.parse(input);
 await access(userId,t);
 const q = query(db.manager,userId,t).andWhere('msg."isDeleted" = false');
 if(p.after) q.andWhere('msg."chatSequence" > :cursor',{cursor:p.after});
 if(p.before) q.andWhere('msg."chatSequence" < :cursor',{cursor:p.before});
 const rows = await q.orderBy('msg."chatSequence"',p.after ? "ASC" : "DESC").take(p.limit+1).getMany();
 const hasMore = rows.length > p.limit; const data = rows.slice(0,p.limit).map(dto);
 if (!p.after) data.reverse();
 return {data,hasMore};
}
export async function send(userId: string, input: unknown) {
 let p: z.infer<typeof sendSchema>;
 try { p = sendSchema.parse(input); } catch { throw new ApiError("Invalid chat request",400); }
 rate(userId);
 const result = await db.transaction(async m => {
  // Serialize each conversation: cursor order follows commit order, including concurrent sends.
  await m.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',[room(userId,p)]);
  await access(userId,p,m);
  const old = await query(m,userId,p).andWhere('msg."clientMessageId" = :client AND msg."'+(p.kind === "friend" ? "senderId" : "userId")+'" = :sender',{client:p.clientMessageId,sender:userId}).getOne();
  if (old) return {message:dto(old),created:false};
  if(p.kind === "channel" && (await m.findOneBy(ChannelMember,{channelId:p.id,userId}))?.isMuted) throw new ApiError("Channel is muted",400);
  const values = {clientMessageId:p.clientMessageId,body:p.body,userId};
  let saved: any;
  if(p.kind === "friend") saved = await m.save(DirectMessage,m.create(DirectMessage,{senderId:userId,recipientId:p.id,body:p.body,clientMessageId:p.clientMessageId}));
  else if(p.kind === "channel") saved = await m.save(ChannelMessage,m.create(ChannelMessage,{...values,channelId:p.id}));
  else if(p.kind === "task") saved = await m.save(TaskComment,m.create(TaskComment,{userId,taskId:p.id,content:p.body,clientMessageId:p.clientMessageId}));
  else saved = await m.save(ProjectMessage,m.create(ProjectMessage,{...values,projectId:p.id}));
  return {message:dto(saved),created:true};
 });
 if(result.created && io) {
  // Recheck access before delivery, including sockets whose membership was revoked.
  const sockets = await io.in(room(userId,p)).fetchSockets();
  await Promise.all(sockets.map(async s => { try { await authenticateToken(s.data.token); await access(s.data.userId,{kind:p.kind,id:p.kind === "friend" ? (s.data.userId === userId ? p.id : userId) : p.id}); s.emit("message:new",result.message); } catch { await s.leave(room(userId,p)); } }));
 }
 return result.message;
}
export const chatRouter = Router();
chatRouter.use(authenticate);
chatRouter.get("/:kind/:id/messages",async (req: AuthRequest,res,next) => {
 try { const t = targetSchema.parse(req.params); res.json(await history(req.user!.id,t,req.query)); }
 catch(e) { next(e instanceof z.ZodError ? new ApiError("Invalid chat request",400) : e); }
});
export function attachChat(server: HttpServer) {
 io = new Server(server,{cors:{origin:origins}, maxHttpBufferSize:20000,allowRequest:(req,done)=>done(null,!req.headers.origin || origins.includes(req.headers.origin))});
 io.use(async (socket,next) => { try { const token = z.string().min(1).max(4096).parse(socket.handshake.auth.token); const session = await authenticateToken(token); socket.data={userId:session.user.id,token}; next(); } catch { next(new Error("Unauthorized")); } });
 io.on("connection",socket => {
  const handle = (event: string, fn: (p: any)=>Promise<any>) => socket.on(event,async (p,ack) => {
   if (typeof ack !== "function") return;
   try { await authenticateToken(socket.data.token); ack({ok:true,data:await fn(p)}); }
   catch(e) { ack({ok:false,error:e instanceof ApiError ? e.message : e instanceof z.ZodError ? "Invalid chat request" : "Chat request failed"}); }
  });
  handle("conversation:join",async p => { const t=targetSchema.parse(p); await access(socket.data.userId,t); const rooms=[...socket.rooms].filter(r=>r!==socket.id && r!==room(socket.data.userId,t)); for(const r of rooms) await socket.leave(r); await socket.join(room(socket.data.userId,t)); return {joined:true}; });
  handle("message:send",p=>send(socket.data.userId,p));
 });
 return io;
}
