import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { OrganizationService } from "../services/OrganizationService";
import { UserRole } from "../entities/User";
import { PermissionKey } from "../constants/access";

const organizationService = new OrganizationService();

export class OrganizationController {
    async create(req: AuthRequest, res: Response) {
        try {
            const actorId = req.user?.id;
            const { name } = req.body;

            if (!actorId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const org = await organizationService.createOrganization(actorId, name);
            res.status(201).json(org);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    async search(req: AuthRequest, res: Response) {
        try {
            const q = req.query.q as string | undefined;
            const result = await organizationService.searchOrganizations(q);
            res.json(result);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    }

    async join(req: AuthRequest, res: Response) {
        try {
            const actorId = req.user?.id;
            if (!actorId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const { teamId } = req.body;
            const member = await organizationService.joinOrganization(actorId, teamId);
            res.json(member);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    async invite(req: AuthRequest, res: Response) {
        try {
            const actorId = req.user?.id;
            if (!actorId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const teamId = String(req.params.teamId);
            const { email, role } = req.body;
            const result = await organizationService.inviteMember(actorId, teamId, email, role as UserRole);
            res.json(result);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    async addMember(req: AuthRequest, res: Response) {
        try {
            const actorId = req.user?.id;
            if (!actorId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const teamId = String(req.params.teamId);
            const { name, email, role } = req.body;
            const member = await organizationService.addMemberManually(actorId, teamId, name, email, role as UserRole);
            res.status(201).json(member);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    async updateMemberRole(req: AuthRequest, res: Response) {
        try {
            const actorId = req.user?.id;
            if (!actorId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const teamId = String(req.params.teamId);
            const memberId = String(req.params.memberId);
            const { role } = req.body;

            const member = await organizationService.updateMemberRole(actorId, teamId, memberId, role as UserRole);
            res.json(member);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    async removeMember(req: AuthRequest, res: Response) {
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
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    async members(req: AuthRequest, res: Response) {
        try {
            const actorId = req.user?.id;
            if (!actorId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const teamId = String(req.params.teamId);
            const members = await organizationService.getMembers(actorId, teamId);
            res.json(members);
        } catch (err: any) {
            res.status(404).json({ message: err.message });
        }
    }

    async activity(req: AuthRequest, res: Response) {
        try {
            const actorId = req.user?.id;
            if (!actorId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const teamId = String(req.params.teamId);
            const limit = Number(req.query.limit ?? 50);
            const result = await organizationService.getActivity(actorId, teamId, Number.isNaN(limit) ? 50 : limit);
            res.json(result);
        } catch (err: any) {
            res.status(404).json({ message: err.message });
        }
    }

    async getMemberPermissions(req: AuthRequest, res: Response) {
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
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    async setMemberPermissions(req: AuthRequest, res: Response) {
        try {
            const actorId = req.user?.id;
            if (!actorId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const teamId = String(req.params.teamId);
            const memberId = String(req.params.memberId);
            const permissionValues = Array.isArray(req.body?.permissions) ? req.body.permissions : [];
            const permissions = permissionValues as PermissionKey[];
            const result = await organizationService.setMemberPermissions(actorId, teamId, memberId, permissions);
            res.json(result);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }
}
