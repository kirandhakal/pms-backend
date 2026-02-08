import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { InviteService } from "../services/InviteService";

const inviteService = new InviteService();

export class InviteController {
    async invite(req: AuthRequest, res: Response) {
        try {
            const { email, role, projectId } = req.body;
            const result = await inviteService.createInvite(email, role, projectId);
            res.json({ message: "Invite generated", ...result });
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }
}
