"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InviteController = void 0;
const InviteService_1 = require("../services/InviteService");
const inviteService = new InviteService_1.InviteService();
class InviteController {
    async invite(req, res) {
        try {
            const { email, role, projectId } = req.body;
            const result = await inviteService.createInvite(email, role, projectId);
            res.json({ message: "Invite generated", ...result });
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
}
exports.InviteController = InviteController;
