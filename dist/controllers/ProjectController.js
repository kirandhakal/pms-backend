"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectController = void 0;
const ProjectService_1 = require("../services/ProjectService");
const ProjectMember_1 = require("../entities/ProjectMember");
const projectService = new ProjectService_1.ProjectService();
class ProjectController {
    async create(req, res) {
        try {
            const project = await projectService.createProject(req.user.id, req.body);
            res.status(201).json(project);
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async getAll(req, res) {
        try {
            const projects = await projectService.getProjects(req.user?.id);
            res.json(projects);
        }
        catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
    async getById(req, res) {
        try {
            const project = await projectService.getProjectById(String(req.params.id));
            if (!project) {
                return res.status(404).json({ message: "Project not found" });
            }
            res.json(project);
        }
        catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
    async getWorkflow(req, res) {
        try {
            const data = await projectService.getProjectWorkflowForUser(String(req.params.id), req.user.id);
            res.json({ data });
        }
        catch (err) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }
    async addMember(req, res) {
        try {
            const member = await projectService.addProjectMember(req.user.id, String(req.params.id), req.body.userId, req.body.role || ProjectMember_1.ProjectMemberRole.MEMBER);
            res.status(201).json(member);
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async getDashboard(req, res) {
        try {
            const metrics = await projectService.getAdminDashboardMetrics();
            res.json({
                title: "Admin/PM Discussion Dashboard",
                message: "Welcome to the restricted project overview.",
                projects: metrics,
            });
        }
        catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
}
exports.ProjectController = ProjectController;
