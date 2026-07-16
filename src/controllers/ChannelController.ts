import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { channelService } from "../services/ChannelService";
import { ChannelType } from "../entities/Channel";

export class ChannelController {
    async list(req: AuthRequest, res: Response) {
        try {
            const teamId = (req.query.teamId as string) || req.user?.teamId;
            if (!teamId) {
                return res.status(400).json({ message: "teamId is required" });
            }
            const channels = await channelService.listChannels(req.user!.id, teamId);
            res.json({ data: channels });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }

    async create(req: AuthRequest, res: Response) {
        try {
            const channel = await channelService.createChannel({
                ...req.body,
                createdById: req.user!.id,
            });
            res.status(201).json({ data: channel });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async join(req: AuthRequest, res: Response) {
        try {
            const membership = await channelService.joinPublicChannel(
                req.user!.id,
                String(req.params.id)
            );
            res.json({ data: membership });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async getMessages(req: AuthRequest, res: Response) {
        try {
            const messages = await channelService.getMessages(
                req.user!.id,
                String(req.params.id)
            );
            res.json({ data: messages });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }

    async sendMessage(req: AuthRequest, res: Response) {
        try {
            const message = await channelService.sendMessage(
                req.user!.id,
                String(req.params.id),
                req.body.body
            );
            res.status(201).json({ data: message });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async deleteMessage(req: AuthRequest, res: Response) {
        try {
            await channelService.deleteMessage(req.user!.id, String(req.params.messageId));
            res.json({ message: "Message deleted" });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async setMute(req: AuthRequest, res: Response) {
        try {
            const membership = await channelService.setMute(
                req.user!.id,
                String(req.params.id),
                Boolean(req.body.isMuted)
            );
            res.json({ data: membership });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
}
