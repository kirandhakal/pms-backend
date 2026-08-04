"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationController = void 0;
const OrganizationServiceClean_1 = require("../services/OrganizationServiceClean");
const User_1 = require("../entities/User");
const organizationService = new OrganizationServiceClean_1.OrganizationService();
class OrganizationController {
    async create(req, res) {
        try {
            const actorId = req.user?.id;
            const { name } = req.body;
            if (!actorId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }
            const org = await organizationService.createOrganization(actorId, name);
            res.status(201).json(org);
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
    async search(req, res) {
        try {
            const q = req.query.q;
            const result = await organizationService.searchOrganizations(q);
            res.json(result);
        }
        catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
    async searchUsers(req, res) {
        try {
            const actorId = req.user?.id;
            if (!actorId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }
            const teamId = String(req.params.teamId);
            const q = String(req.query.q || "");
            const result = await organizationService.searchUsersForOrg(actorId, teamId, q);
            res.json({ data: result });
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
    async join(req, res) {
        try {
            const actorId = req.user?.id;
            if (!actorId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }
            if (req.body?.token) {
                const result = await organizationService.joinViaInviteToken(actorId, String(req.body.token));
                res.json(result);
                return;
            }
            const { teamId } = req.body;
            const member = await organizationService.joinOrganization(actorId, teamId);
            res.json(member);
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
    async invitePreview(req, res) {
        try {
            const token = String(req.params.token || "");
            const preview = await organizationService.getInvitePreview(token);
            res.json({ data: preview });
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
    async createInviteLink(req, res) {
        try {
            const actorId = req.user?.id;
            if (!actorId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }
            const teamId = String(req.params.teamId);
            const result = await organizationService.createInviteLink(actorId, teamId, {
                role: req.body.role || User_1.UserRole.MEMBER,
                permissions: req.body.permissions,
                teamRoleId: req.body.teamRoleId,
                expiresInHours: req.body.expiresInHours,
            });
            res.status(201).json(result);
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
    async invite(req, res) {
        try {
            const actorId = req.user?.id;
            if (!actorId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }
            const teamId = String(req.params.teamId);
            const { email, role, permissions, teamRoleId } = req.body;
            const result = await organizationService.inviteMember(actorId, teamId, email, role || User_1.UserRole.MEMBER, permissions || [], teamRoleId);
            res.json(result);
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
    async addExistingUser(req, res) {
        try {
            const actorId = req.user?.id;
            if (!actorId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }
            const teamId = String(req.params.teamId);
            const { userId, role, permissions, teamRoleId } = req.body;
            if (!userId) {
                res.status(400).json({ message: "userId is required" });
                return;
            }
            const member = await organizationService.addExistingUser(actorId, teamId, userId, role || User_1.UserRole.MEMBER, permissions || [], teamRoleId);
            res.status(201).json(member);
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
    async addMember(req, res) {
        try {
            const actorId = req.user?.id;
            if (!actorId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }
            const teamId = String(req.params.teamId);
            const { name, email, role } = req.body;
            const member = await organizationService.addMemberManually(actorId, teamId, name, email, role);
            res.status(201).json(member);
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
    async updateMemberRole(req, res) {
        try {
            const actorId = req.user?.id;
            if (!actorId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }
            const teamId = String(req.params.teamId);
            const memberId = String(req.params.memberId);
            const { role } = req.body;
            const member = await organizationService.updateMemberRole(actorId, teamId, memberId, role);
            res.json(member);
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
    async removeMember(req, res) {
        try {
            const actorId = req.user?.id;
            if (!actorId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }
            const teamId = String(req.params.teamId);
            const memberId = String(req.params.memberId);
            const member = await organizationService.removeMember(actorId, teamId, memberId);
            res.json(member);
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
    async members(req, res) {
        try {
            const teamId = String(req.params.teamId);
            const members = await organizationService.getMembers(teamId);
            res.json(members);
        }
        catch (err) {
            res.status(404).json({ message: err.message });
        }
    }
    async activity(req, res) {
        try {
            const teamId = String(req.params.teamId);
            const limit = Number(req.query.limit ?? 50);
            const result = await organizationService.getActivity(teamId, Number.isNaN(limit) ? 50 : limit);
            res.json(result);
        }
        catch (err) {
            res.status(404).json({ message: err.message });
        }
    }
    async getMemberPermissions(req, res) {
        try {
            const actorId = req.user?.id;
            if (!actorId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }
            const teamId = String(req.params.teamId);
            const memberId = String(req.params.memberId);
            const result = await organizationService.getMemberPermissions(actorId, teamId, memberId);
            res.json(result);
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
    async setMemberPermissions(req, res) {
        try {
            const actorId = req.user?.id;
            if (!actorId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }
            const teamId = String(req.params.teamId);
            const memberId = String(req.params.memberId);
            const permissionValues = Array.isArray(req.body?.permissions)
                ? req.body.permissions
                : [];
            const result = await organizationService.setMemberPermissions(actorId, teamId, memberId, permissionValues);
            res.json(result);
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
}
exports.OrganizationController = OrganizationController;
