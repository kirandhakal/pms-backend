import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { friendService } from "../services/FriendService";

export class FriendController {
    async search(req: AuthRequest, res: Response) {
        try {
            const query = String(req.query.q || "");
            const users = await friendService.searchUsers(query, req.user!.id);
            res.json({ data: users });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }

    async sendRequest(req: AuthRequest, res: Response) {
        try {
            const friendship = await friendService.sendFriendRequest(
                req.user!.id,
                req.body.userId
            );
            res.status(201).json({ data: friendship });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async respond(req: AuthRequest, res: Response) {
        try {
            const friendship = await friendService.respondToRequest(
                req.user!.id,
                String(req.params.id),
                Boolean(req.body.accept)
            );
            res.json({ data: friendship });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async listFriends(req: AuthRequest, res: Response) {
        try {
            const friends = await friendService.getFriends(req.user!.id);
            res.json({ data: friends });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }

    async listPending(req: AuthRequest, res: Response) {
        try {
            const requests = await friendService.getPendingRequests(req.user!.id);
            res.json({ data: requests });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }

    async getConversation(req: AuthRequest, res: Response) {
        try {
            const messages = await friendService.getConversation(
                req.user!.id,
                String(req.params.userId)
            );
            res.json({ data: messages });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }

    async sendMessage(req: AuthRequest, res: Response) {
        try {
            const message = await friendService.sendDirectMessage(
                req.user!.id,
                req.body.recipientId,
                req.body.body
            );
            res.status(201).json({ data: message });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async setMute(req: AuthRequest, res: Response) {
        try {
            await friendService.setDmMute(
                req.user!.id,
                req.body.userId,
                Boolean(req.body.isMuted)
            );
            res.json({ message: "Mute preference updated" });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
}
