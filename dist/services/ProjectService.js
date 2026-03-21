"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const data_source_1 = require("../config/data-source");
const Project_1 = require("../entities/Project");
const Task_1 = require("../entities/Task");
class ProjectService {
    constructor() {
        this.projectRepo = data_source_1.AppDataSource.getRepository(Project_1.Project);
        this.taskRepo = data_source_1.AppDataSource.getRepository(Task_1.Task);
    }
    async createProject(data) {
        const project = this.projectRepo.create(data);
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
