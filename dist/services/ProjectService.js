"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const data_source_1 = require("../config/data-source");
const Project_1 = require("../entities/Project");
const Task_1 = require("../entities/Task");
const User_1 = require("../entities/User");
const PermissionService_1 = require("./PermissionService");
const access_1 = require("../constants/access");
const Team_1 = require("../entities/Team");
class ProjectService {
    constructor() {
        this.projectRepo = data_source_1.AppDataSource.getRepository(Project_1.Project);
        this.taskRepo = data_source_1.AppDataSource.getRepository(Task_1.Task);
        this.userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
        this.teamRepo = data_source_1.AppDataSource.getRepository(Team_1.Team);
        this.permissionService = new PermissionService_1.PermissionService();
    }
    async createProject(actorId, data) {
        const actor = await this.userRepo.findOne({
            where: { id: actorId },
            relations: ["team", "team.createdBy"]
        });
        if (!actor || !actor.team?.id) {
            throw new Error("Only organization members can create projects");
        }
        const canCreateProject = await this.permissionService.userHasPermission(actor, access_1.PermissionKey.PROJECT_CREATE);
        if (!canCreateProject) {
            throw new Error("You do not have permission to create projects");
        }
        if (data.team?.id && data.team.id !== actor.team.id) {
            throw new Error("You can only create projects in your organization");
        }
        if (data.teamId && data.teamId !== actor.team.id) {
            throw new Error("You can only create projects in your organization");
        }
        const team = await this.teamRepo.findOne({ where: { id: actor.team.id } });
        if (!team) {
            throw new Error("Organization not found");
        }
        const project = this.projectRepo.create({
            ...data,
            team
        });
        return await this.projectRepo.save(project);
    }
    async getProjects() {
        return await this.projectRepo.find({ relations: ["manager", "team"] });
    }
    async getProjectMetrics(projectId) {
        const tasks = await this.taskRepo.find({ where: { project: { id: projectId } } });
        if (tasks.length === 0)
            return { completionPercentage: 0, totalTasks: 0, doneTasks: 0 };
        const doneTasks = tasks.filter(t => t.status === Task_1.TaskStatus.DONE).length;
        const progress = Math.round((doneTasks / tasks.length) * 100);
        return {
            projectId,
            completionPercentage: progress,
            totalTasks: tasks.length,
            doneTasks
        };
    }
    async getAdminDashboardMetrics() {
        const projects = await this.projectRepo.find({ relations: ["tasks"] });
        return projects.map(project => {
            const totalTasks = project.tasks.length;
            const doneTasks = project.tasks.filter(t => t.status === Task_1.TaskStatus.DONE).length;
            const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
            return {
                id: project.id,
                name: project.name,
                progress: `${progress}%`,
                status: progress === 100 ? "Completed" : "In Progress"
            };
        });
    }
}
exports.ProjectService = ProjectService;
