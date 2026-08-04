"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskController = void 0;
const TaskService_1 = require("../services/TaskService");
const WorkflowEngine_1 = require("../services/WorkflowEngine");
const data_source_1 = require("../config/data-source");
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
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    /**
     * Move a task to another workflow stage (role-gated drag).
     * Body: { toStageId, actorRole? }
     */
    async transitionStage(req, res) {
        try {
            const taskId = String(req.params.taskId);
            const { toStageId, actorRole: bodyRole } = req.body;
            if (!toStageId) {
                return res.status(400).json({ message: "toStageId is required" });
            }
            const task = await data_source_1.AppDataSource.getRepository(Task_1.Task).findOne({
                where: { id: taskId },
            });
            const actorRole = bodyRole ||
                (await WorkflowEngine_1.workflowEngine.resolveActorRole(req.user.id, task?.projectId));
            const result = await WorkflowEngine_1.workflowEngine.transitionTask(taskId, toStageId, req.user.id, actorRole);
            res.json({ data: result });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async markLive(req, res) {
        try {
            const task = await WorkflowEngine_1.workflowEngine.markLive(String(req.params.taskId), req.user?.id);
            res.json({ data: task });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async rebug(req, res) {
        try {
            const reason = req.body?.reason || "Rebug from live";
            const result = await WorkflowEngine_1.workflowEngine.rebug(String(req.params.taskId), reason, req.user?.id);
            res.json({ data: result });
        }
        catch (err) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
    async getMyProgress(req, res) {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const progress = await taskService.getUserProgress(req.user.id);
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
            const progress = await taskService.getUserProgress(userIdParam);
            res.json(progress);
        }
        catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
}
exports.TaskController = TaskController;
