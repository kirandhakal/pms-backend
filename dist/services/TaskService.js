"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskService = void 0;
const data_source_1 = require("../config/data-source");
const Task_1 = require("../entities/Task");
class TaskService {
    constructor() {
        this.taskRepo = data_source_1.AppDataSource.getRepository(Task_1.Task);
    }
    async createTask(data) {
        const task = this.taskRepo.create(data);
        return await this.taskRepo.save(task);
    }
    async updateTaskStatus(taskId, status, completion) {
        const task = await this.taskRepo.findOneBy({ id: taskId });
        if (!task)
            throw new Error("Task not found");
        task.status = status;
        if (completion !== undefined)
            task.completionPercentage = completion;
        if (status === Task_1.TaskStatus.DONE) {
            task.completedAt = new Date();
            task.completionPercentage = 100;
        }
        return await this.taskRepo.save(task);
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
}
exports.TaskService = TaskService;
