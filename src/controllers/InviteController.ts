import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { InviteService } from "../services/InviteService";

const inviteService = new InviteService();

export class InviteController {
    /** POST /api/invites — Send an invitation */
    async invite(req: AuthRequest, res: Response) {
        try {
            const { email, role, projectId } = req.body;
            const result = await inviteService.createInvite(email, role, projectId);
            res.json({ message: "Invitation sent successfully!", ...result });
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    /** GET /api/invites — List all invitations (admin) */
    async list(_req: AuthRequest, res: Response) {
        try {
            const invites = await inviteService.listInvites();
            res.json(invites);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    }

    /** GET /api/invites/validate/:token — Validate invitation token */
    async validate(req: Request, res: Response) {
        try {
            const token = req.params.token as string;
            const invite = await inviteService.validateToken(token);
            res.json({ valid: true, email: invite.email, role: invite.role });
        } catch (err: any) {
            res.status(400).json({ valid: false, message: err.message });
        }
    }
}
