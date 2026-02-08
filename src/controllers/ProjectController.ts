import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { ProjectService } from "../services/ProjectService";

const projectService = new ProjectService();

export class ProjectController {
    async create(req: AuthRequest, res: Response) {
        try {
            const project = await projectService.createProject(req.body);
            res.status(201).json(project);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    async getAll(req: AuthRequest, res: Response) {
        try {
            const projects = await projectService.getProjects(req.user!.id, req.user!.role);
            res.json(projects);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
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
}
