import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { ProjectService } from "../services/ProjectService";
import { ProjectMemberRole } from "../entities/ProjectMember";

const projectService = new ProjectService();

export class ProjectController {
    async create(req: AuthRequest, res: Response) {
        try {
            const project = await projectService.createProject(req.user!.id, req.body);
            res.status(201).json(project);
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async getAll(req: AuthRequest, res: Response) {
        try {
            const projects = await projectService.getProjects(req.user?.id);
            res.json(projects);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    }

    async getById(req: AuthRequest, res: Response) {
        try {
            const project = await projectService.getProjectById(String(req.params.id));
            if (!project) {
                return res.status(404).json({ message: "Project not found" });
            }
            res.json(project);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    }

    async getWorkflow(req: AuthRequest, res: Response) {
        try {
            const data = await projectService.getProjectWorkflowForUser(
                String(req.params.id),
                req.user!.id
            );
            res.json({ data });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }

    async addMember(req: AuthRequest, res: Response) {
        try {
            const member = await projectService.addProjectMember(
                req.user!.id,
                String(req.params.id),
                req.body.userId,
                req.body.role || ProjectMemberRole.MEMBER
            );
            res.status(201).json(member);
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async getDashboard(req: AuthRequest, res: Response) {
        try {
            const metrics = await projectService.getAdminDashboardMetrics();
            res.json({
                title: "Admin/PM Discussion Dashboard",
                message: "Welcome to the restricted project overview.",
                projects: metrics,
            });
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    }
}
