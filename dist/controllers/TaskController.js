"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskController = void 0;
const data_source_1 = require("../config/data-source");
const Project_1 = require("../entities/Project");
const ProjectAccess_1 = require("../services/ProjectAccess");
const errorHandler_1 = require("../middlewares/errorHandler");
async function scopedProgress(req, userId) {
    const org = req.get('X-Organization-Id') || req.user?.organizationId || req.user?.teamId;
    if (org)
        await (0, ProjectAccess_1.organizationAccess)(req.user.id, org);
    const candidates = await data_source_1.AppDataSource.getRepository(Task_1.Task).find({ where: { assigneeId: userId, isArchived: false } });
    const tasks = [];
    for (const t of candidates) {
        try {
            await (0, ProjectAccess_1.taskAccess)(req.user.id, t.id);
            const p = t.projectId ? await data_source_1.AppDataSource.getRepository(Project_1.Project).findOneBy({ id: t.projectId }) : t.workflowId ? await data_source_1.AppDataSource.getRepository(Project_1.Project).findOneBy({ workflowId: t.workflowId }) : null;
            if (p)
                await (0, ProjectAccess_1.projectAccess)(req.user.id, p.id, org);
            else if (org && t.teamId !== org)
                continue;
            tasks.push(t);
        }
        catch (e) {
            if (!(e instanceof errorHandler_1.ApiError) || ![403, 404].includes(e.statusCode))
                throw e;
        }
    }
    const completed = tasks.filter(t => t.status === Task_1.TaskStatus.DONE).length;
    const inProgress = tasks.filter(t => t.status === Task_1.TaskStatus.IN_PROGRESS).length;
    return { userId, totalTasks: tasks.length, completedTasks: completed, inProgressTasks: inProgress, pendingTasks: tasks.length - completed - inProgress, overallCompletion: tasks.length ? Math.round(completed / tasks.length * 100) : 0, tasks: tasks.map(t => ({ id: t.id, name: t.name, status: t.status, completion: t.completionPercentage, updatedAt: t.updatedAt })) };
}
const TaskService_1 = require("../services/TaskService");
const Task_1 = require("../entities/Task");
const taskService = new TaskService_1.TaskService();
class TaskController {
    async create(req, res) {
        try {
            const task = await taskService.createTask(req.body);
            res.status(201).json(task);
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
    async updateStatus(req, res) {
        try {
            const taskIdParam = req.params.taskId;
            if (!taskIdParam || Array.isArray(taskIdParam)) {
                return res.status(400).json({ message: "taskId is required" });
            }
            const { status, completion } = req.body;
            const updated = await taskService.updateTaskStatus(taskIdParam, status, completion, req.user?.id);
            res.json(updated);
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
    async getMyProgress(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const progress = await scopedProgress(req, req.user.id);
            res.json(progress);
        }
        catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
    async getIndividualProgress(req, res) {
        try {
            const userIdParam = req.params.userId;
            if (!userIdParam || Array.isArray(userIdParam)) {
                return res.status(400).json({ message: "userId is required" });
            }
            const progress = await scopedProgress(req, userIdParam);
            res.json(progress);
        }
        catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
}
exports.TaskController = TaskController;
