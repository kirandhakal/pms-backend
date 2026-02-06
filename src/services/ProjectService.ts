import { AppDataSource } from "../config/data-source";
import { Project } from "../entities/Project";
import { Task, TaskStatus } from "../entities/Task";

export class ProjectService {
    private projectRepo = AppDataSource.getRepository(Project);
    private taskRepo = AppDataSource.getRepository(Task);

    async createProject(data: any) {
        const project = this.projectRepo.create(data);
        return await this.projectRepo.save(project);
    }

    async getProjects() {
        return await this.projectRepo.find({ relations: ["manager", "team"] });
    }

    async getProjectMetrics(projectId: string) {
        const tasks = await this.taskRepo.find({ where: { project: { id: projectId } } });
        if (tasks.length === 0) return { completionPercentage: 0, totalTasks: 0, doneTasks: 0 };

        const doneTasks = tasks.filter(t => t.status === TaskStatus.DONE).length;
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
            const doneTasks = project.tasks.filter(t => t.status === TaskStatus.DONE).length;
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
