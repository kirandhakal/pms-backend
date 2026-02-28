"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InviteController = void 0;
const InviteService_1 = require("../services/InviteService");
const inviteService = new InviteService_1.InviteService();
class InviteController {
    /** POST /api/invites — Send an invitation */
    async invite(req, res) {
        try {
            const { email, role, projectId } = req.body;
            const result = await inviteService.createInvite(email, role, projectId);
            res.json({ message: "Invitation sent successfully!", ...result });
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
    /** GET /api/invites — List all invitations (admin) */
    async list(_req, res) {
        try {
            const invites = await inviteService.listInvites();
            res.json(invites);
        }
        catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
    /** GET /api/invites/validate/:token — Validate invitation token */
    async validate(req, res) {
        try {
            const token = req.params.token;
            const invite = await inviteService.validateToken(token);
            res.json({ valid: true, email: invite.email, role: invite.role });
        }
        catch (err) {
            res.status(400).json({ valid: false, message: err.message });
        }
    }
}
exports.InviteController = InviteController;
