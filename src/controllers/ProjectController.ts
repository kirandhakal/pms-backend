import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { ProjectService } from "../services/ProjectService";
import { ProjectPermissionKey } from "../constants/project-access";

const projectService = new ProjectService();

export class ProjectController {
    async create(req: AuthRequest, res: Response) {
        try {
            const actorId = req.user?.id;
            if (!actorId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const project = await projectService.createProject(actorId, req.body);
            res.status(201).json(project);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    async getAll(req: AuthRequest, res: Response) {
        try {
            const actorId = req.user?.id;
            if (!actorId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const projects = await projectService.getProjects(actorId);
            res.json(projects);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    async getDashboard(req: AuthRequest, res: Response) {
        try {
            const metrics = await projectService.getAdminDashboardMetrics();
            res.json({
                title: "Admin/PM Discussion Dashboard",
                message: "Welcome to the restricted project overview.",
                projects: metrics
            });
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    }

    async getMemberPermissions(req: AuthRequest, res: Response) {
        try {
            const actorId = req.user?.id;
            if (!actorId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }

            const projectId = String(req.params.projectId);
            const memberId = String(req.params.memberId);
            const result = await projectService.getProjectMemberPermissions(actorId, projectId, memberId);
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

            const projectId = String(req.params.projectId);
            const memberId = String(req.params.memberId);
            const permissionValues = Array.isArray(req.body?.permissions) ? req.body.permissions : [];
            const permissions = permissionValues as ProjectPermissionKey[];
            const result = await projectService.setProjectMemberPermissions(actorId, projectId, memberId, permissions);
            res.json(result);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }
}
