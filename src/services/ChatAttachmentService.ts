import { randomUUID } from "crypto";
import { EntityManager, In, IsNull, LessThan } from "typeorm";
import { z } from "zod";
import { fromBuffer } from "file-type";
import { AppDataSource as db } from "../config/data-source";
import { ChatAttachment } from "../entities/ChatAttachment";
import { Channel } from "../entities/Channel";
import { ApiError } from "../middlewares/errorHandler";
import { access, room, targetSchema } from "../realtime/chat";
import { chatStorageService } from "./ChatStorageService";

type Target = z.infer<typeof targetSchema>;
export const FILE_TYPES = [
    { mime: "image/jpeg", label: "JPEG", extensions: ["jpg", "jpeg"] },
    { mime: "image/png", label: "PNG", extensions: ["png"] },
    { mime: "image/gif", label: "GIF", extensions: ["gif"] },
    { mime: "image/webp", label: "WebP", extensions: ["webp"] },
    { mime: "application/pdf", label: "PDF", extensions: ["pdf"] },
];
export function mediaLimits() {
    const mb = z.coerce.number().int().min(1).max(100).parse(process.env.CHAT_MAX_FILE_SIZE_MB || 10);
    const maxAttachments = z.coerce.number().int().min(1).max(20).parse(process.env.CHAT_MAX_ATTACHMENTS || 8);
    return { maxFileSizeBytes: mb * 1024 * 1024, maxAttachments };
}
export function storageConfigured() {
    return ["OCI_ACCESS_KEY", "OCI_SECRET_KEY", "OCI_NAMESPACE", "OCI_REGION", "OCI_BUCKET"].every(key => Boolean(process.env[key]));
}
export async function mediaPolicy(userId: string, t: Target, m: EntityManager = db.manager) {
    await access(userId, t, m);
    const channel = t.kind === "channel" ? await m.findOneBy(Channel, { id: t.id }) : null;
    const canManage = channel?.createdById === userId;
    return {
        ...mediaLimits(), supportedTypes: FILE_TYPES,
        allowedTypes: channel?.allowedFileTypes ?? FILE_TYPES.map(f => f.mime),
        canManage, canModerate: canManage, canPin: t.kind !== "channel" || canManage,
        uploadsEnabled: storageConfigured(),
    };
}
export async function updateMediaPolicy(userId: string, t: Target, input: unknown) {
    const policy = await mediaPolicy(userId, t);
    if (!policy.canManage) throw new ApiError("Only the channel owner can change file types", 403);
    const { allowedTypes } = z.object({ allowedTypes: z.array(z.string().refine(mime => FILE_TYPES.some(f => f.mime === mime))).max(FILE_TYPES.length) }).parse(input);
    return db.transaction(async m => {
        await m.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [room(userId, t)]);
        const current = await mediaPolicy(userId, t, m);
        if (!current.canManage) throw new ApiError("Only the channel owner can change file types", 403);
        await m.update(Channel, { id: t.id, createdById: userId }, { allowedFileTypes: [...new Set(allowedTypes)] });
        return mediaPolicy(userId, t, m);
    });
}
export function validateFileMetadata(name: string, mimeType: string, size: number, allowedTypes: string[]) {
    const type = FILE_TYPES.find(type => type.mime === mimeType);
    const extension = name.split(".").pop()?.toLowerCase() || "";
    if (!type || !allowedTypes.includes(mimeType) || !type.extensions.includes(extension)) {
        throw new ApiError("This file type is not allowed in this conversation", 400);
    }
    if (size <= 0 || size > mediaLimits().maxFileSizeBytes) throw new ApiError("File exceeds the configured size limit", 413);
}
export async function validateFileBytes(body: Buffer, file: Pick<ChatAttachment, "name" | "mimeType" | "size">, allowedTypes: string[]) {
    validateFileMetadata(file.name, file.mimeType, body.length, allowedTypes);
    if (body.length !== file.size) throw new ApiError("Uploaded size does not match the selected file", 400);
    const detected = await fromBuffer(body);
    if (!detected || detected.mime !== file.mimeType) throw new ApiError("File contents do not match its type", 400);
}
export function attachmentDto(a: ChatAttachment) {
    return { id: a.id, name: a.name, mimeType: a.mimeType, size: a.size };
}
const reservations = new Map<string, { at: number; count: number }>();
export async function beginAttachment(userId: string, t: Target, input: unknown) {
    const p = z.object({ name: z.string().trim().min(1).max(200).refine(s => !/[\x00-\x1f\x7f/\\]/.test(s)), mimeType: z.string().max(100), size: z.number().int().positive() }).parse(input);
    const policy = await mediaPolicy(userId, t);
    if (!policy.uploadsEnabled) throw new ApiError("Chat storage is not configured", 503);
    validateFileMetadata(p.name, p.mimeType, p.size, policy.allowedTypes);
    const now = Date.now();
    for (const [id, value] of reservations) if (now - value.at >= 60000) reservations.delete(id);
    const counter = reservations.get(userId) || { at: now, count: 0 };
    if (++counter.count > 40) throw new ApiError("Too many uploads; try again shortly", 429);
    reservations.set(userId, counter);
    return db.transaction(async m => {
        await m.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`uploads:${userId}`]);
        const pending = await m.getRepository(ChatAttachment).createQueryBuilder("a")
            .where('a."uploaderId" = :userId AND a."messageId" IS NULL AND a.status != :deleted AND a."expiresAt" > now()', { userId, deleted: "deleted" }).getCount();
        if (pending >= 32) throw new ApiError("Too many pending attachments; cancel unused uploads", 429);
        const id = randomUUID();
        return attachmentDto(await m.save(ChatAttachment, m.create(ChatAttachment, {
            ...p, id, uploaderId: userId, conversationKey: room(userId, t),
            objectKey: `chat/${userId}/${id}`, status: "pending", messageId: null,
            expiresAt: new Date(now + 24 * 60 * 60 * 1000),
        })));
    });
}
export async function pendingAttachment(userId: string, t: Target, id: string) {
    await access(userId, t);
    const file = await db.getRepository(ChatAttachment).findOneBy({ id, conversationKey: room(userId, t), uploaderId: userId });
    if (!file || file.status === "deleted" || file.expiresAt <= new Date() || file.messageId) throw new ApiError("Pending attachment not found", 404);
    if (file.status !== "pending") throw new ApiError("Attachment upload is already in progress or complete", 409);
    return file;
}
export async function uploadAttachment(userId: string, t: Target, id: string, body: Buffer, signal?: AbortSignal) {
    if (!Buffer.isBuffer(body)) throw new ApiError("Upload must contain binary file data", 400);
    const file = await pendingAttachment(userId, t, id);
    const policy = await mediaPolicy(userId, t);
    await validateFileBytes(body, file, policy.allowedTypes);
    const repo = db.getRepository(ChatAttachment);
    // Only one PUT can own a reservation. Never overwrite a linked object's bytes.
    const claim = await repo.update({ id, status: "pending", messageId: IsNull() }, { status: "uploading" });
    if (!claim.affected) throw new ApiError("Attachment upload is already in progress or complete", 409);
    try {
        await chatStorageService.put(file.objectKey, body, file.mimeType, signal);
        if (signal?.aborted) throw new ApiError("Upload cancelled", 409);
        const updated = await repo.update({ id, status: "uploading", messageId: IsNull() }, { status: "ready" });
        if (!updated.affected) throw new ApiError("Upload cancelled", 409);
        return attachmentDto(file);
    } catch (error) {
        await repo.update({ id, messageId: IsNull() }, { status: "deleted", expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
        // A failed delete is retried by the cleanup job; never log storage request details.
        await chatStorageService.remove(file.objectKey).catch(() => {});
        throw error;
    }
}
export async function cancelAttachment(userId: string, t: Target, id: string) {
    await access(userId, t);
    const result = await db.getRepository(ChatAttachment).update({ id, uploaderId: userId, conversationKey: room(userId, t), messageId: IsNull() }, { status: "deleted", expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
    if (!result.affected) throw new ApiError("Only unclaimed uploads can be cancelled", 409);
    const file = await db.getRepository(ChatAttachment).findOneBy({ id, uploaderId: userId, status: "deleted" });
    if (file) await chatStorageService.remove(file.objectKey).catch(() => {});
    // Deletion is durable and the cleanup job retries physical removal, including in-flight PUTs.
}
export async function claimAttachments(m: EntityManager, userId: string, t: Target, ids: string[], messageId: string) {
    if (!ids.length) return;
    const policy = await mediaPolicy(userId, t, m);
    if (ids.length > policy.maxAttachments) throw new ApiError("Too many attachments", 400);
    const files = await m.getRepository(ChatAttachment).createQueryBuilder("a").setLock("pessimistic_write")
        .where("a.id IN (:...ids)", { ids }).orderBy("a.id", "ASC").getMany();
    if (files.length !== ids.length || files.some(f => f.uploaderId !== userId || f.conversationKey !== room(userId, t) || f.status !== "ready" || f.messageId || f.expiresAt <= new Date())) {
        throw new ApiError("Attachment is unavailable or belongs to another conversation", 403);
    }
    for (const file of files) validateFileMetadata(file.name, file.mimeType, file.size, policy.allowedTypes);
    await m.update(ChatAttachment, { id: In(ids) }, { messageId });
}
export async function cleanupChatAttachments() {
    const repo = db.getRepository(ChatAttachment);
    // A grace period lets cancelled/in-flight object writes settle before deletion.
    const files = await repo.find({ where: [
        { messageId: IsNull(), expiresAt: LessThan(new Date()) },
        { status: "deleted", expiresAt: LessThan(new Date()) },
    ], take: 100, order: { createdAt: "ASC" } });
    let removed = 0;
    for (const file of files) {
        const claimed = await repo.createQueryBuilder().update(ChatAttachment).set({ status: "deleted" })
            .where("id = :id", { id: file.id })
            .andWhere('"expiresAt" < now() AND (status = :deleted OR "messageId" IS NULL)', { deleted: "deleted" }).execute();
        if (!claimed.affected) continue;
        await chatStorageService.remove(file.objectKey);
        await repo.delete({ id: file.id, status: "deleted" });
        removed++;
    }
    return removed;
}
