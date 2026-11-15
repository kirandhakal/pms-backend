import express, { Router, Response, NextFunction } from "express";
import { z } from "zod";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import { AppDataSource as db } from "../config/data-source";
import { AuthRequest } from "../middlewares/auth";
import { ApiError } from "../middlewares/errorHandler";
import { ChatAttachment } from "../entities/ChatAttachment";
import { access, messageQuery, room, targetSchema } from "../realtime/chat";
import { beginAttachment, cancelAttachment, mediaLimits, mediaPolicy, updateMediaPolicy, uploadAttachment } from "../services/ChatAttachmentService";
import { chatStorageService } from "../services/ChatStorageService";

// Mounted inside the existing authenticated chat router.
export const chatMediaRouter = Router();
const wrap = (fn: (req: AuthRequest, res: Response) => Promise<unknown>) => async (req: AuthRequest, res: Response, next: NextFunction) => {
    try { await fn(req, res); }
    catch (e) { next(e instanceof z.ZodError ? new ApiError("Invalid attachment request", 400) : e); }
};
chatMediaRouter.get("/:kind/:id/media-policy", wrap(async (req, res) => {
    res.json({ data: await mediaPolicy(req.user!.id, targetSchema.parse(req.params)) });
}));
chatMediaRouter.put("/:kind/:id/media-policy", wrap(async (req, res) => {
    res.json({ data: await updateMediaPolicy(req.user!.id, targetSchema.parse(req.params), req.body) });
}));
chatMediaRouter.post("/:kind/:id/attachments", wrap(async (req, res) => {
    res.status(201).json({ data: await beginAttachment(req.user!.id, targetSchema.parse(req.params), req.body) });
}));
const inFlight = new Set<string>();
chatMediaRouter.put("/:kind/:id/attachments/:attachmentId", async (req: AuthRequest, res, next) => {
    try {
        const target = targetSchema.parse(req.params);
        z.uuid().parse(req.params.attachmentId);
        await access(req.user!.id, target);
        if (inFlight.size >= 4 || inFlight.has(req.user!.id)) throw new ApiError("Another upload is in progress; try again shortly", 429);
        if (!req.is("application/octet-stream")) throw new ApiError("Use application/octet-stream for file uploads", 415);
        inFlight.add(req.user!.id);
        let released = false;
        const release = () => { if (!released) { released = true; inFlight.delete(req.user!.id); } };
        res.once("close", release);
        express.raw({ type: "application/octet-stream", limit: mediaLimits().maxFileSizeBytes, inflate: false })(req, res, error => {
            if (error) { release(); next(new ApiError("File exceeds the upload limit or has invalid encoding", error.status || 400)); return; }
            const controller = new AbortController();
            const abort = () => controller.abort();
            res.once("close", abort);
            uploadAttachment(req.user!.id, target, String(req.params.attachmentId), req.body, controller.signal)
                .then(data => { if (!res.destroyed) res.json({ data }); })
                .catch(next).finally(() => { res.off("close", abort); release(); });
        });
    } catch (e) { next(e instanceof z.ZodError ? new ApiError("Invalid attachment request", 400) : e); }
});
chatMediaRouter.delete("/:kind/:id/attachments/:attachmentId", wrap(async (req, res) => {
    await cancelAttachment(req.user!.id, targetSchema.parse(req.params), z.uuid().parse(req.params.attachmentId));
    res.json({ message: "Upload cancelled" });
}));
chatMediaRouter.get("/:kind/:id/attachments/:attachmentId/content", wrap(async (req, res) => {
    const target = targetSchema.parse(req.params);
    const userId = req.user!.id;
    await access(userId, target);
    const file = await db.getRepository(ChatAttachment).findOneBy({ id: z.uuid().parse(req.params.attachmentId), conversationKey: room(userId, target), status: "ready" });
    if (!file) throw new ApiError("Attachment not found", 404);
    if (file.messageId) {
        if (!await messageQuery(db.manager, userId, target).andWhere('msg.id = :id AND msg."isDeleted" = false', { id: file.messageId }).getOne()) throw new ApiError("Message has been removed", 404);
    } else if (file.uploaderId !== userId || file.expiresAt <= new Date()) {
        throw new ApiError("Attachment not found", 404);
    }
    const object = await chatStorageService.get(file.objectKey);
    if (!object.Body) throw new ApiError("Attachment content is unavailable", 404);
    res.setHeader("Content-Type", file.mimeType);
    res.setHeader("Content-Length", file.size);
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    try { await pipeline(object.Body as Readable, res); }
    catch { if (!res.destroyed) res.destroy(); }
}));
