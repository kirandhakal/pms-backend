"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FILE_TYPES = void 0;
exports.mediaLimits = mediaLimits;
exports.storageConfigured = storageConfigured;
exports.mediaPolicy = mediaPolicy;
exports.updateMediaPolicy = updateMediaPolicy;
exports.validateFileMetadata = validateFileMetadata;
exports.validateFileBytes = validateFileBytes;
exports.attachmentDto = attachmentDto;
exports.beginAttachment = beginAttachment;
exports.pendingAttachment = pendingAttachment;
exports.uploadAttachment = uploadAttachment;
exports.cancelAttachment = cancelAttachment;
exports.claimAttachments = claimAttachments;
exports.cleanupChatAttachments = cleanupChatAttachments;
const crypto_1 = require("crypto");
const typeorm_1 = require("typeorm");
const zod_1 = require("zod");
const file_type_1 = require("file-type");
const data_source_1 = require("../config/data-source");
const ChatAttachment_1 = require("../entities/ChatAttachment");
const Channel_1 = require("../entities/Channel");
const errorHandler_1 = require("../middlewares/errorHandler");
const chat_1 = require("../realtime/chat");
const ChatStorageService_1 = require("./ChatStorageService");
exports.FILE_TYPES = [
    { mime: "image/jpeg", label: "JPEG", extensions: ["jpg", "jpeg"] },
    { mime: "image/png", label: "PNG", extensions: ["png"] },
    { mime: "image/gif", label: "GIF", extensions: ["gif"] },
    { mime: "image/webp", label: "WebP", extensions: ["webp"] },
    { mime: "application/pdf", label: "PDF", extensions: ["pdf"] },
];
function mediaLimits() {
    const mb = zod_1.z.coerce.number().int().min(1).max(100).parse(process.env.CHAT_MAX_FILE_SIZE_MB || 10);
    const maxAttachments = zod_1.z.coerce.number().int().min(1).max(20).parse(process.env.CHAT_MAX_ATTACHMENTS || 8);
    return { maxFileSizeBytes: mb * 1024 * 1024, maxAttachments };
}
function storageConfigured() {
    return ["OCI_ACCESS_KEY", "OCI_SECRET_KEY", "OCI_NAMESPACE", "OCI_REGION", "OCI_BUCKET"].every(key => Boolean(process.env[key]));
}
async function mediaPolicy(userId, t, m = data_source_1.AppDataSource.manager) {
    await (0, chat_1.access)(userId, t, m);
    const channel = t.kind === "channel" ? await m.findOneBy(Channel_1.Channel, { id: t.id }) : null;
    const canManage = channel?.createdById === userId;
    return {
        ...mediaLimits(), supportedTypes: exports.FILE_TYPES,
        allowedTypes: channel?.allowedFileTypes ?? exports.FILE_TYPES.map(f => f.mime),
        canManage, canModerate: canManage, canPin: t.kind !== "channel" || canManage,
        uploadsEnabled: storageConfigured(),
    };
}
async function updateMediaPolicy(userId, t, input) {
    const policy = await mediaPolicy(userId, t);
    if (!policy.canManage)
        throw new errorHandler_1.ApiError("Only the channel owner can change file types", 403);
    const { allowedTypes } = zod_1.z.object({ allowedTypes: zod_1.z.array(zod_1.z.string().refine(mime => exports.FILE_TYPES.some(f => f.mime === mime))).max(exports.FILE_TYPES.length) }).parse(input);
    return data_source_1.AppDataSource.transaction(async (m) => {
        await m.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [(0, chat_1.room)(userId, t)]);
        const current = await mediaPolicy(userId, t, m);
        if (!current.canManage)
            throw new errorHandler_1.ApiError("Only the channel owner can change file types", 403);
        await m.update(Channel_1.Channel, { id: t.id, createdById: userId }, { allowedFileTypes: [...new Set(allowedTypes)] });
        return mediaPolicy(userId, t, m);
    });
}
function validateFileMetadata(name, mimeType, size, allowedTypes) {
    const type = exports.FILE_TYPES.find(type => type.mime === mimeType);
    const extension = name.split(".").pop()?.toLowerCase() || "";
    if (!type || !allowedTypes.includes(mimeType) || !type.extensions.includes(extension)) {
        throw new errorHandler_1.ApiError("This file type is not allowed in this conversation", 400);
    }
    if (size <= 0 || size > mediaLimits().maxFileSizeBytes)
        throw new errorHandler_1.ApiError("File exceeds the configured size limit", 413);
}
async function validateFileBytes(body, file, allowedTypes) {
    validateFileMetadata(file.name, file.mimeType, body.length, allowedTypes);
    if (body.length !== file.size)
        throw new errorHandler_1.ApiError("Uploaded size does not match the selected file", 400);
    const detected = await (0, file_type_1.fromBuffer)(body);
    if (!detected || detected.mime !== file.mimeType)
        throw new errorHandler_1.ApiError("File contents do not match its type", 400);
}
function attachmentDto(a) {
    return { id: a.id, name: a.name, mimeType: a.mimeType, size: a.size };
}
const reservations = new Map();
async function beginAttachment(userId, t, input) {
    const p = zod_1.z.object({ name: zod_1.z.string().trim().min(1).max(200).refine(s => !/[\x00-\x1f\x7f/\\]/.test(s)), mimeType: zod_1.z.string().max(100), size: zod_1.z.number().int().positive() }).parse(input);
    const policy = await mediaPolicy(userId, t);
    if (!policy.uploadsEnabled)
        throw new errorHandler_1.ApiError("Chat storage is not configured", 503);
    validateFileMetadata(p.name, p.mimeType, p.size, policy.allowedTypes);
    const now = Date.now();
    for (const [id, value] of reservations)
        if (now - value.at >= 60000)
            reservations.delete(id);
    const counter = reservations.get(userId) || { at: now, count: 0 };
    if (++counter.count > 40)
        throw new errorHandler_1.ApiError("Too many uploads; try again shortly", 429);
    reservations.set(userId, counter);
    return data_source_1.AppDataSource.transaction(async (m) => {
        await m.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [`uploads:${userId}`]);
        const pending = await m.getRepository(ChatAttachment_1.ChatAttachment).createQueryBuilder("a")
            .where('a."uploaderId" = :userId AND a."messageId" IS NULL AND a.status != :deleted AND a."expiresAt" > now()', { userId, deleted: "deleted" }).getCount();
        if (pending >= 32)
            throw new errorHandler_1.ApiError("Too many pending attachments; cancel unused uploads", 429);
        const id = (0, crypto_1.randomUUID)();
        return attachmentDto(await m.save(ChatAttachment_1.ChatAttachment, m.create(ChatAttachment_1.ChatAttachment, {
            ...p, id, uploaderId: userId, conversationKey: (0, chat_1.room)(userId, t),
            objectKey: `chat/${userId}/${id}`, status: "pending", messageId: null,
            expiresAt: new Date(now + 24 * 60 * 60 * 1000),
        })));
    });
}
async function pendingAttachment(userId, t, id) {
    await (0, chat_1.access)(userId, t);
    const file = await data_source_1.AppDataSource.getRepository(ChatAttachment_1.ChatAttachment).findOneBy({ id, conversationKey: (0, chat_1.room)(userId, t), uploaderId: userId });
    if (!file || file.status === "deleted" || file.expiresAt <= new Date() || file.messageId)
        throw new errorHandler_1.ApiError("Pending attachment not found", 404);
    if (file.status !== "pending")
        throw new errorHandler_1.ApiError("Attachment upload is already in progress or complete", 409);
    return file;
}
async function uploadAttachment(userId, t, id, body, signal) {
    if (!Buffer.isBuffer(body))
        throw new errorHandler_1.ApiError("Upload must contain binary file data", 400);
    const file = await pendingAttachment(userId, t, id);
    const policy = await mediaPolicy(userId, t);
    await validateFileBytes(body, file, policy.allowedTypes);
    const repo = data_source_1.AppDataSource.getRepository(ChatAttachment_1.ChatAttachment);
    // Only one PUT can own a reservation. Never overwrite a linked object's bytes.
    const claim = await repo.update({ id, status: "pending", messageId: (0, typeorm_1.IsNull)() }, { status: "uploading" });
    if (!claim.affected)
        throw new errorHandler_1.ApiError("Attachment upload is already in progress or complete", 409);
    try {
        await ChatStorageService_1.chatStorageService.put(file.objectKey, body, file.mimeType, signal);
        if (signal?.aborted)
            throw new errorHandler_1.ApiError("Upload cancelled", 409);
        const updated = await repo.update({ id, status: "uploading", messageId: (0, typeorm_1.IsNull)() }, { status: "ready" });
        if (!updated.affected)
            throw new errorHandler_1.ApiError("Upload cancelled", 409);
        return attachmentDto(file);
    }
    catch (error) {
        await repo.update({ id, messageId: (0, typeorm_1.IsNull)() }, { status: "deleted", expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
        // A failed delete is retried by the cleanup job; never log storage request details.
        await ChatStorageService_1.chatStorageService.remove(file.objectKey).catch(() => { });
        throw error;
    }
}
async function cancelAttachment(userId, t, id) {
    await (0, chat_1.access)(userId, t);
    const result = await data_source_1.AppDataSource.getRepository(ChatAttachment_1.ChatAttachment).update({ id, uploaderId: userId, conversationKey: (0, chat_1.room)(userId, t), messageId: (0, typeorm_1.IsNull)() }, { status: "deleted", expiresAt: new Date(Date.now() + 60 * 60 * 1000) });
    if (!result.affected)
        throw new errorHandler_1.ApiError("Only unclaimed uploads can be cancelled", 409);
    const file = await data_source_1.AppDataSource.getRepository(ChatAttachment_1.ChatAttachment).findOneBy({ id, uploaderId: userId, status: "deleted" });
    if (file)
        await ChatStorageService_1.chatStorageService.remove(file.objectKey).catch(() => { });
    // Deletion is durable and the cleanup job retries physical removal, including in-flight PUTs.
}
async function claimAttachments(m, userId, t, ids, messageId) {
    if (!ids.length)
        return;
    const policy = await mediaPolicy(userId, t, m);
    if (ids.length > policy.maxAttachments)
        throw new errorHandler_1.ApiError("Too many attachments", 400);
    const files = await m.getRepository(ChatAttachment_1.ChatAttachment).createQueryBuilder("a").setLock("pessimistic_write")
        .where("a.id IN (:...ids)", { ids }).orderBy("a.id", "ASC").getMany();
    if (files.length !== ids.length || files.some(f => f.uploaderId !== userId || f.conversationKey !== (0, chat_1.room)(userId, t) || f.status !== "ready" || f.messageId || f.expiresAt <= new Date())) {
        throw new errorHandler_1.ApiError("Attachment is unavailable or belongs to another conversation", 403);
    }
    for (const file of files)
        validateFileMetadata(file.name, file.mimeType, file.size, policy.allowedTypes);
    await m.update(ChatAttachment_1.ChatAttachment, { id: (0, typeorm_1.In)(ids) }, { messageId });
}
async function cleanupChatAttachments() {
    const repo = data_source_1.AppDataSource.getRepository(ChatAttachment_1.ChatAttachment);
    // A grace period lets cancelled/in-flight object writes settle before deletion.
    const files = await repo.find({ where: [
            { messageId: (0, typeorm_1.IsNull)(), expiresAt: (0, typeorm_1.LessThan)(new Date()) },
            { status: "deleted", expiresAt: (0, typeorm_1.LessThan)(new Date()) },
        ], take: 100, order: { createdAt: "ASC" } });
    let removed = 0;
    for (const file of files) {
        const claimed = await repo.createQueryBuilder().update(ChatAttachment_1.ChatAttachment).set({ status: "deleted" })
            .where("id = :id", { id: file.id })
            .andWhere('"expiresAt" < now() AND (status = :deleted OR "messageId" IS NULL)', { deleted: "deleted" }).execute();
        if (!claimed.affected)
            continue;
        await ChatStorageService_1.chatStorageService.remove(file.objectKey);
        await repo.delete({ id: file.id, status: "deleted" });
        removed++;
    }
    return removed;
}
