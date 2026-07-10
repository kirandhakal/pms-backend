"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FriendController = void 0;
const FriendService_1 = require("../services/FriendService");
class FriendController {
    async search(req, res) {
        try {
            const query = String(req.query.q || "");
            const users = await FriendService_1.friendService.searchUsers(query, req.user.id);
            res.json({ data: users });
        }
        catch (err) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }
    async sendRequest(req, res) {
        try {
            const friendship = await FriendService_1.friendService.sendFriendRequest(req.user.id, req.body.userId);
            res.status(201).json({ data: friendship });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async respond(req, res) {
        try {
            const friendship = await FriendService_1.friendService.respondToRequest(req.user.id, String(req.params.id), Boolean(req.body.accept));
            res.json({ data: friendship });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async listFriends(req, res) {
        try {
            const friends = await FriendService_1.friendService.getFriends(req.user.id);
            res.json({ data: friends });
        }
        catch (err) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }
    async listPending(req, res) {
        try {
            const requests = await FriendService_1.friendService.getPendingRequests(req.user.id);
            res.json({ data: requests });
        }
        catch (err) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }
    async getConversation(req, res) {
        try {
            const messages = await FriendService_1.friendService.getConversation(req.user.id, String(req.params.userId));
            res.json({ data: messages });
        }
        catch (err) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }
    async sendMessage(req, res) {
        try {
            const message = await FriendService_1.friendService.sendDirectMessage(req.user.id, req.body.recipientId, req.body.body);
            res.status(201).json({ data: message });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async setMute(req, res) {
        try {
            await FriendService_1.friendService.setDmMute(req.user.id, req.body.userId, Boolean(req.body.isMuted));
            res.json({ message: "Mute preference updated" });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
}
exports.FriendController = FriendController;
