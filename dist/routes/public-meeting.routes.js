"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const MeetingService_1 = require("../services/MeetingService");
const zod_1 = require("zod");
const auth_1 = require("../utils/auth");
const data_source_1 = require("../config/data-source");
const Session_1 = require("../entities/Session");
const router = (0, express_1.Router)();
const guestJoinSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(120),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal("")),
});
/**
 * Optional auth — attaches user if valid Bearer token present; never blocks.
 */
async function optionalAuth(req, _res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer "))
            return next();
        const token = authHeader.split(" ")[1];
        const decoded = (0, auth_1.verifyToken)(token);
        if (!decoded)
            return next();
        const sessionRepo = data_source_1.AppDataSource.getRepository(Session_1.Session);
        const session = await sessionRepo.findOne({
            where: { token, isActive: true },
            relations: ["user", "user.role", "user.team"],
        });
        if (!session?.user ||
            !session.user.isActive ||
            session.expiresAt <= new Date()) {
            return next();
        }
        req.user = {
            id: session.user.id,
            role: session.user.role,
            legacyRole: session.user.legacyRole,
            organizationId: session.user.organizationId,
            departmentId: session.user.departmentId,
            teamId: session.user.team?.id,
        };
    }
    catch {
        // ignore
    }
    next();
}
router.get("/meetings/:slug", async (req, res) => {
    try {
        const preview = await MeetingService_1.meetingService.getPublicPreview(String(req.params.slug));
        res.json({ data: preview });
    }
    catch (err) {
        res.status(err.statusCode || 404).json({ message: err.message });
    }
});
router.post("/meetings/:slug/join", optionalAuth, async (req, res) => {
    try {
        const slug = String(req.params.slug);
        if (req.user?.id) {
            const meeting = await MeetingService_1.meetingService.joinViaSlug(req.user.id, slug);
            return res.json({ message: "Joined meeting", data: meeting, asGuest: false });
        }
        const parsed = guestJoinSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Name is required to join as a guest (or sign in)",
            });
        }
        const result = await MeetingService_1.meetingService.joinAsGuest(slug, {
            name: parsed.data.name,
            email: parsed.data.email || undefined,
        });
        res.json({
            message: "Joined as guest",
            data: result.meeting,
            guest: result.guest,
            asGuest: true,
        });
    }
    catch (err) {
        res.status(err.statusCode || 400).json({ message: err.message });
    }
});
exports.default = router;
