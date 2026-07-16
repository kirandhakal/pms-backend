import { Router, Request, Response, NextFunction } from "express";
import { meetingService } from "../services/MeetingService";
import { z } from "zod";
import { AuthRequest } from "../middlewares/auth";
import { verifyToken } from "../utils/auth";
import { AppDataSource } from "../config/data-source";
import { Session } from "../entities/Session";

const router = Router();

const guestJoinSchema = z.object({
    name: z.string().min(1).max(120),
    email: z.string().email().optional().or(z.literal("")),
});

/**
 * Optional auth — attaches user if valid Bearer token present; never blocks.
 */
async function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith("Bearer ")) return next();

        const token = authHeader.split(" ")[1];
        const decoded = verifyToken(token);
        if (!decoded) return next();

        const sessionRepo = AppDataSource.getRepository(Session);
        const session = await sessionRepo.findOne({
            where: { token, isActive: true },
            relations: ["user", "user.role", "user.team"],
        });

        if (
            !session?.user ||
            !session.user.isActive ||
            session.expiresAt <= new Date()
        ) {
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
    } catch {
        // ignore
    }
    next();
}

router.get("/meetings/:slug", async (req: Request, res: Response) => {
    try {
        const preview = await meetingService.getPublicPreview(String(req.params.slug));
        res.json({ data: preview });
    } catch (err: any) {
        res.status(err.statusCode || 404).json({ message: err.message });
    }
});

router.post(
    "/meetings/:slug/join",
    optionalAuth,
    async (req: AuthRequest, res: Response) => {
        try {
            const slug = String(req.params.slug);

            if (req.user?.id) {
                const meeting = await meetingService.joinViaSlug(req.user.id, slug);
                return res.json({ message: "Joined meeting", data: meeting, asGuest: false });
            }

            const parsed = guestJoinSchema.safeParse(req.body);
            if (!parsed.success) {
                return res.status(400).json({
                    message: "Name is required to join as a guest (or sign in)",
                });
            }

            const result = await meetingService.joinAsGuest(slug, {
                name: parsed.data.name,
                email: parsed.data.email || undefined,
            });

            res.json({
                message: "Joined as guest",
                data: result.meeting,
                guest: result.guest,
                asGuest: true,
            });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
);

export default router;
