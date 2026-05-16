"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskService = void 0;
const data_source_1 = require("../config/data-source");
const Task_1 = require("../entities/Task");
const ActivityLog_1 = require("../entities/ActivityLog");
const ActivityLogService_1 = require("./ActivityLogService");
class TaskService {
    constructor() {
        this.taskRepo = data_source_1.AppDataSource.getRepository(Task_1.Task);
        this.activityLogService = new ActivityLogService_1.ActivityLogService();
    }
    async createTask(data) {
        const task = this.taskRepo.create({
            name: data.name,
            description: data.description,
            status: data.status,
            completionPercentage: data.completionPercentage,
            project: data.projectId ? { id: data.projectId } : undefined,
            team: data.teamId ? { id: data.teamId } : undefined,
            assignedUser: data.assignedUserId ? { id: data.assignedUserId } : undefined,
            owner: data.ownerId ? { id: data.ownerId } : undefined
        });
        const savedTask = await this.taskRepo.save(task);
        if (data.teamId) {
            await this.activityLogService.log({
                action: ActivityLog_1.ActivityAction.TASK_CREATED,
                actorId: data.actorId,
                teamId: data.teamId,
                taskId: savedTask.id,
                details: `Task ${savedTask.name} created`
            });
        }
        return savedTask;
    }
    async updateTaskStatus(taskId, status, completion, actorId) {
        const task = await this.taskRepo.findOne({
            where: { id: taskId },
            relations: ["team"]
        });
        if (!task)
            throw new Error("Task not found");
        task.status = status;
        if (completion !== undefined)
            task.completionPercentage = completion;
        if (status === Task_1.TaskStatus.DONE) {
            task.completedAt = new Date();
            task.completionPercentage = 100;
        }
        const savedTask = await this.taskRepo.save(task);
        if (savedTask.team?.id) {
            await this.activityLogService.log({
                action: ActivityLog_1.ActivityAction.TASK_STATUS_UPDATED,
                actorId,
                teamId: savedTask.team.id,
                taskId: savedTask.id,
                details: `Task ${savedTask.name} moved to ${savedTask.status}`
            });
        }
        return savedTask;
    }
    async getUserProgress(userId) {
        const tasks = await this.taskRepo.find({ where: { assignedUser: { id: userId } } });
        const total = tasks.length;
        const completed = tasks.filter(t => t.status === Task_1.TaskStatus.DONE).length;
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
    async getOrganizationTaskHistory(teamId) {
        return this.taskRepo.find({
            where: { team: { id: teamId } },
            relations: ["assignedUser", "owner", "project"],
            order: { updatedAt: "DESC" }
        });
    }
}
exports.TaskService = TaskService;
