import { AppDataSource } from "../config/data-source";
import { Task, TaskStatus } from "../entities/Task";
import { Project } from "../entities/Project";
import { Team } from "../entities/Team";
import { User } from "../entities/User";
import { ActivityAction } from "../entities/ActivityLog";
import { ActivityLogService } from "./ActivityLogService";
import { worklogService } from "./WorklogService";

export class TaskService {
    private taskRepo = AppDataSource.getRepository(Task);
    private activityLogService = new ActivityLogService();

    async createTask(data: {
        name: string;
        description?: string;
        status?: TaskStatus;
        completionPercentage?: number;
        projectId?: string;
        teamId?: string;
        assignedUserId?: string;
        ownerId?: string;
        actorId?: string;
    }) {
        const task = this.taskRepo.create({
            name: data.name,
            description: data.description,
            status: data.status,
            completionPercentage: data.completionPercentage,
            project: data.projectId ? ({ id: data.projectId } as Project) : undefined,
            team: data.teamId ? ({ id: data.teamId } as Team) : undefined,
            assignedUser: data.assignedUserId ? ({ id: data.assignedUserId } as User) : undefined,
            owner: data.ownerId ? ({ id: data.ownerId } as User) : undefined
        });

        const savedTask = await this.taskRepo.save(task);

        if (data.teamId) {
            await this.activityLogService.log({
                action: ActivityAction.TASK_CREATED,
                actorId: data.actorId,
                teamId: data.teamId,
                taskId: savedTask.id,
                details: `Task ${savedTask.name} created`
            });
        }

        return savedTask;
    }

    async updateTaskStatus(taskId: string, status: TaskStatus, completion?: number, actorId?: string) {
        const task = await this.taskRepo.findOne({
            where: { id: taskId },
            relations: ["team"]
        });
        if (!task) throw new Error("Task not found");

        const previousStatus = task.status;
        task.status = status;
        if (completion !== undefined) task.completionPercentage = completion;
        if (status === TaskStatus.DONE) {
            task.completedAt = new Date();
            task.completionPercentage = 100;
        } else if (previousStatus === TaskStatus.DONE) {
            task.completedAt = undefined;
        }

        if (status === TaskStatus.IN_PROGRESS && !task.startDate) {
            task.startDate = new Date();
        }

        const savedTask = await this.taskRepo.save(task);

        // Auto-worklog when status transitions to Done
        if (status === TaskStatus.DONE && previousStatus !== TaskStatus.DONE) {
            try {
                await worklogService.createFromTaskCompletion(
                    savedTask,
                    actorId || savedTask.assigneeId
                );
            } catch (err) {
                console.warn("Auto worklog creation skipped:", (err as Error).message);
            }
        }

        if (savedTask.team?.id) {
            await this.activityLogService.log({
                action: ActivityAction.TASK_STATUS_UPDATED,
                actorId,
                teamId: savedTask.team.id,
                taskId: savedTask.id,
                details: `Task ${savedTask.name} moved to ${savedTask.status}`
            });
        }

        return savedTask;
    }

    async getUserProgress(userId: string) {
        const tasks = await this.taskRepo.find({ where: { assignedUser: { id: userId } } });
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === TaskStatus.DONE).length;

        return {
            userId,
            totalTasks: total,
            completedTasks: completed,
            overallCompletion: total > 0 ? Math.round((completed / total) * 100) : 0,
            tasks: tasks.map(t => ({
                id: t.id,
                name: t.name,
                status: t.status,
                completion: t.completionPercentage,
                updatedAt: t.updatedAt
            }))
        };
    }

    async getOrganizationTaskHistory(teamId: string) {
        return this.taskRepo.find({
            where: { team: { id: teamId } },
            relations: ["assignedUser", "owner", "project"],
            order: { updatedAt: "DESC" }
        });
    }
}
