"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectController = void 0;
const ProjectService_1 = require("../services/ProjectService");
const projectService = new ProjectService_1.ProjectService();
class ProjectController {
    async create(req, res) {
        try {
            const project = await projectService.createProject(req.body);
            res.status(201).json(project);
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
    async getAll(req, res) {
        try {
            const projects = await projectService.getProjects();
            res.json(projects);
        }
        catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
    async getDashboard(req, res) {
        try {
            const metrics = await projectService.getAdminDashboardMetrics();
            res.json({
                title: "Admin/PM Discussion Dashboard",
                message: "Welcome to the restricted project overview.",
                projects: metrics
            });
        }
        catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
}
exports.ProjectController = ProjectController;
