"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationController = void 0;
const OrganizationServiceClean_1 = require("../services/OrganizationServiceClean");
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
    async join(req, res) {
        try {
            const actorId = req.user?.id;
            if (!actorId) {
                res.status(401).json({ message: "Unauthorized" });
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
    async invite(req, res) {
        try {
            const actorId = req.user?.id;
            if (!actorId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }
            const teamId = String(req.params.teamId);
            const { email, role } = req.body;
            const result = await organizationService.inviteMember(actorId, teamId, email, role);
            res.json(result);
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
            const permissionValues = Array.isArray(req.body?.permissions) ? req.body.permissions : [];
            const result = await organizationService.setMemberPermissions(actorId, teamId, memberId, permissionValues);
            res.json(result);
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
}
exports.OrganizationController = OrganizationController;
