import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { teamRoleService } from "../services/TeamRoleService";

export class TeamRoleController {
    async listRoles(req: AuthRequest, res: Response) {
        try {
            const orgId = req.params.orgId;
            const roles = await teamRoleService.getRolesByOrganization(orgId);
            res.json({ data: roles });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }

    async createRole(req: AuthRequest, res: Response) {
        try {
            const orgId = req.params.orgId;
            const { name } = req.body;
            const role = await teamRoleService.createRole(orgId, name);
            res.status(201).json({ message: "Team role created", data: role });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async deleteRole(req: AuthRequest, res: Response) {
        try {
            await teamRoleService.deleteRole(req.params.roleId);
            res.json({ message: "Team role deleted" });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async seedDefaults(req: AuthRequest, res: Response) {
        try {
            const orgId = req.params.orgId;
            const roles = await teamRoleService.seedDefaultRoles(orgId);
            res.json({ message: "Default team roles seeded", data: roles });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }

    async listTeamMembers(req: AuthRequest, res: Response) {
        try {
            const members = await teamRoleService.getTeamMembers(req.params.teamId);
            res.json({ data: members });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }

    async addTeamMember(req: AuthRequest, res: Response) {
        try {
            const { userId, teamRoleId } = req.body;
            const membership = await teamRoleService.addTeamMember(
                req.params.teamId,
                userId,
                teamRoleId
            );
            res.status(201).json({ message: "Team member added", data: membership });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async updateTeamMemberRole(req: AuthRequest, res: Response) {
        try {
            const { teamRoleId } = req.body;
            const membership = await teamRoleService.updateTeamMemberRole(
                req.params.teamId,
                req.params.userId,
                teamRoleId
            );
            res.json({ message: "Team member role updated", data: membership });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async removeTeamMember(req: AuthRequest, res: Response) {
        try {
            await teamRoleService.removeTeamMember(req.params.teamId, req.params.userId);
            res.json({ message: "Team member removed" });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
}
