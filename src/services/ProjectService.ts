import { AppDataSource } from "../config/data-source";
import { Project } from "../entities/Project";
import { Task, TaskStatus } from "../entities/Task";
import { User } from "../entities/User";
import { PermissionService } from "./PermissionService";
import { PermissionKey } from "../constants/access";
import { Team } from "../entities/Team";

export class ProjectService {
    private projectRepo = AppDataSource.getRepository(Project);
    private taskRepo = AppDataSource.getRepository(Task);
    private userRepo = AppDataSource.getRepository(User);
    private teamRepo = AppDataSource.getRepository(Team);
    private permissionService = new PermissionService();

    async createProject(actorId: string, data: any) {
        const actor = await this.userRepo.findOne({
            where: { id: actorId },
            relations: ["team", "team.createdBy"]
        });

        if (!actor || !actor.team?.id) {
            throw new Error("Only organization members can create projects");
        }

        const canCreateProject = await this.permissionService.userHasPermission(actor, PermissionKey.PROJECT_CREATE);
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
