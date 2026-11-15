"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatMediaRouter = void 0;
const express_1 = __importStar(require("express"));
const zod_1 = require("zod");
const promises_1 = require("stream/promises");
const data_source_1 = require("../config/data-source");
const errorHandler_1 = require("../middlewares/errorHandler");
const ChatAttachment_1 = require("../entities/ChatAttachment");
const chat_1 = require("../realtime/chat");
const ChatAttachmentService_1 = require("../services/ChatAttachmentService");
const ChatStorageService_1 = require("../services/ChatStorageService");
// Mounted inside the existing authenticated chat router.
exports.chatMediaRouter = (0, express_1.Router)();
const wrap = (fn) => async (req, res, next) => {
    try {
        await fn(req, res);
    }
    catch (e) {
        next(e instanceof zod_1.z.ZodError ? new errorHandler_1.ApiError("Invalid attachment request", 400) : e);
    }
};
exports.chatMediaRouter.get("/:kind/:id/media-policy", wrap(async (req, res) => {
    res.json({ data: await (0, ChatAttachmentService_1.mediaPolicy)(req.user.id, chat_1.targetSchema.parse(req.params)) });
}));
exports.chatMediaRouter.put("/:kind/:id/media-policy", wrap(async (req, res) => {
    res.json({ data: await (0, ChatAttachmentService_1.updateMediaPolicy)(req.user.id, chat_1.targetSchema.parse(req.params), req.body) });
}));
exports.chatMediaRouter.post("/:kind/:id/attachments", wrap(async (req, res) => {
    res.status(201).json({ data: await (0, ChatAttachmentService_1.beginAttachment)(req.user.id, chat_1.targetSchema.parse(req.params), req.body) });
}));
const inFlight = new Set();
exports.chatMediaRouter.put("/:kind/:id/attachments/:attachmentId", async (req, res, next) => {
    try {
        const target = chat_1.targetSchema.parse(req.params);
        zod_1.z.uuid().parse(req.params.attachmentId);
        const pending = await (0, ChatAttachmentService_1.pendingAttachment)(req.user.id, target, String(req.params.attachmentId));
        const length = req.get("content-length");
        if (length && Number(length) !== pending.size)
            throw new errorHandler_1.ApiError("Uploaded size does not match the selected file", 400);
        if (inFlight.size >= 4 || inFlight.has(req.user.id))
            throw new errorHandler_1.ApiError("Another upload is in progress; try again shortly", 429);
        if (!req.is("application/octet-stream"))
            throw new errorHandler_1.ApiError("Use application/octet-stream for file uploads", 415);
        inFlight.add(req.user.id);
        let released = false;
        const release = () => { if (!released) {
            released = true;
            inFlight.delete(req.user.id);
        } };
        res.once("close", release);
        express_1.default.raw({ type: "application/octet-stream", limit: (0, ChatAttachmentService_1.mediaLimits)().maxFileSizeBytes, inflate: false })(req, res, error => {
            if (error) {
                release();
                next(new errorHandler_1.ApiError("File exceeds the upload limit or has invalid encoding", error.status || 400));
                return;
            }
            const controller = new AbortController();
            const abort = () => controller.abort();
            res.once("close", abort);
            (0, ChatAttachmentService_1.uploadAttachment)(req.user.id, target, String(req.params.attachmentId), req.body, controller.signal)
                .then(data => { if (!res.destroyed)
                res.json({ data }); })
                .catch(next).finally(() => { res.off("close", abort); release(); });
        });
    }
    catch (e) {
        next(e instanceof zod_1.z.ZodError ? new errorHandler_1.ApiError("Invalid attachment request", 400) : e);
    }
});
exports.chatMediaRouter.delete("/:kind/:id/attachments/:attachmentId", wrap(async (req, res) => {
    await (0, ChatAttachmentService_1.cancelAttachment)(req.user.id, chat_1.targetSchema.parse(req.params), zod_1.z.uuid().parse(req.params.attachmentId));
    res.json({ message: "Upload cancelled" });
}));
exports.chatMediaRouter.get("/:kind/:id/attachments/:attachmentId/content", wrap(async (req, res) => {
    const target = chat_1.targetSchema.parse(req.params);
    const userId = req.user.id;
    await (0, chat_1.access)(userId, target);
    const file = await data_source_1.AppDataSource.getRepository(ChatAttachment_1.ChatAttachment).findOneBy({ id: zod_1.z.uuid().parse(req.params.attachmentId), conversationKey: (0, chat_1.room)(userId, target), status: "ready" });
    if (!file)
        throw new errorHandler_1.ApiError("Attachment not found", 404);
    if (file.messageId) {
        if (!await (0, chat_1.messageQuery)(data_source_1.AppDataSource.manager, userId, target).andWhere('msg.id = :id AND msg."isDeleted" = false', { id: file.messageId }).getOne())
            throw new errorHandler_1.ApiError("Message has been removed", 404);
    }
    else if (file.uploaderId !== userId || file.expiresAt <= new Date()) {
        throw new errorHandler_1.ApiError("Attachment not found", 404);
    }
    const object = await ChatStorageService_1.chatStorageService.get(file.objectKey);
    if (!object.Body)
        throw new errorHandler_1.ApiError("Attachment content is unavailable", 404);
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Length", file.size);
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    try {
        await (0, promises_1.pipeline)(object.Body, res);
    }
    catch {
        if (!res.destroyed)
            res.destroy();
    }
}));
