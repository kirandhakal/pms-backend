import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { teamRoleService } from "../services/TeamRoleService";

export class TeamRoleController {
    async listRoles(req: AuthRequest, res: Response) {
        try {
            const roles = await teamRoleService.getRolesByOrganization(String(req.params.orgId));
            res.json({ data: roles });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }

    async createRole(req: AuthRequest, res: Response) {
        try {
            const { name } = req.body;
            const role = await teamRoleService.createRole(String(req.params.orgId), name);
            res.status(201).json({ message: "Team role created", data: role });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async deleteRole(req: AuthRequest, res: Response) {
        try {
            await teamRoleService.deleteRole(String(req.params.roleId));
            res.json({ message: "Team role deleted" });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async seedDefaults(req: AuthRequest, res: Response) {
        try {
            const roles = await teamRoleService.seedDefaultRoles(String(req.params.orgId));
            res.json({ message: "Default team roles seeded", data: roles });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }

    async listTeamMembers(req: AuthRequest, res: Response) {
        try {
            const members = await teamRoleService.getTeamMembers(String(req.params.teamId));
            res.json({ data: members });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }

    async addTeamMember(req: AuthRequest, res: Response) {
        try {
            const { userId, teamRoleId } = req.body;
            const membership = await teamRoleService.addTeamMember(
                String(req.params.teamId),
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
                String(req.params.teamId),
                String(req.params.userId),
                teamRoleId
            );
            res.json({ message: "Team member role updated", data: membership });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async removeTeamMember(req: AuthRequest, res: Response) {
        try {
            await teamRoleService.removeTeamMember(String(req.params.teamId), String(req.params.userId));
            res.json({ message: "Team member removed" });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
}
