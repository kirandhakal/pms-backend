"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamRoleController = void 0;
const TeamRoleService_1 = require("../services/TeamRoleService");
class TeamRoleController {
    async listRoles(req, res) {
        try {
            const roles = await TeamRoleService_1.teamRoleService.getRolesByOrganization(String(req.params.orgId));
            res.json({ data: roles });
        }
        catch (err) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }
    async createRole(req, res) {
        try {
            const { name } = req.body;
            const role = await TeamRoleService_1.teamRoleService.createRole(String(req.params.orgId), name);
            res.status(201).json({ message: "Team role created", data: role });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async deleteRole(req, res) {
        try {
            await TeamRoleService_1.teamRoleService.deleteRole(String(req.params.roleId));
            res.json({ message: "Team role deleted" });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async seedDefaults(req, res) {
        try {
            const roles = await TeamRoleService_1.teamRoleService.seedDefaultRoles(String(req.params.orgId));
            res.json({ message: "Default team roles seeded", data: roles });
        }
        catch (err) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }
    async listTeamMembers(req, res) {
        try {
            const members = await TeamRoleService_1.teamRoleService.getTeamMembers(String(req.params.teamId));
            res.json({ data: members });
        }
        catch (err) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }
    async addTeamMember(req, res) {
        try {
            const { userId, teamRoleId } = req.body;
            const membership = await TeamRoleService_1.teamRoleService.addTeamMember(String(req.params.teamId), userId, teamRoleId);
            res.status(201).json({ message: "Team member added", data: membership });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async updateTeamMemberRole(req, res) {
        try {
            const { teamRoleId } = req.body;
            const membership = await TeamRoleService_1.teamRoleService.updateTeamMemberRole(String(req.params.teamId), String(req.params.userId), teamRoleId);
            res.json({ message: "Team member role updated", data: membership });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async removeTeamMember(req, res) {
        try {
            await TeamRoleService_1.teamRoleService.removeTeamMember(String(req.params.teamId), String(req.params.userId));
            res.json({ message: "Team member removed" });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
}
exports.TeamRoleController = TeamRoleController;
