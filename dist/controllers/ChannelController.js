"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelController = void 0;
const ChannelService_1 = require("../services/ChannelService");
class ChannelController {
    async list(req, res) {
        try {
            const teamId = req.query.teamId || req.user?.teamId;
            if (!teamId) {
                return res.status(400).json({ message: "teamId is required" });
            }
            const channels = await ChannelService_1.channelService.listChannels(req.user.id, teamId);
            res.json({ data: channels });
        }
        catch (err) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }
    async create(req, res) {
        try {
            const channel = await ChannelService_1.channelService.createChannel({
                ...req.body,
                createdById: req.user.id,
            });
            res.status(201).json({ data: channel });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async join(req, res) {
        try {
            const membership = await ChannelService_1.channelService.joinPublicChannel(req.user.id, String(req.params.id));
            res.json({ data: membership });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async getMessages(req, res) {
        try {
            const messages = await ChannelService_1.channelService.getMessages(req.user.id, String(req.params.id));
            res.json({ data: messages });
        }
        catch (err) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }
    async sendMessage(req, res) {
        try {
            const message = await ChannelService_1.channelService.sendMessage(req.user.id, String(req.params.id), req.body.body);
            res.status(201).json({ data: message });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async deleteMessage(req, res) {
        try {
            await ChannelService_1.channelService.deleteMessage(req.user.id, String(req.params.messageId));
            res.json({ message: "Message deleted" });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async setMute(req, res) {
        try {
            const membership = await ChannelService_1.channelService.setMute(req.user.id, String(req.params.id), Boolean(req.body.isMuted));
            res.json({ data: membership });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
}
exports.ChannelController = ChannelController;
