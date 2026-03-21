"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskController = void 0;
const TaskService_1 = require("../services/TaskService");
const taskService = new TaskService_1.TaskService();
class TaskController {
    async create(req, res) {
        try {
            const actorId = req.user?.id;
            if (!actorId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }
            const task = await taskService.createTask({
                ...req.body,
                ownerId: req.body.ownerId ?? actorId,
                actorId
            });
            res.status(201).json(task);
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
    async updateStatus(req, res) {
        try {
            const taskId = req.params.taskId;
            const { status, completion } = req.body;
            const task = await taskService.updateTaskStatus(taskId, status, completion, req.user?.id);
            res.json(task);
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
    async getMyProgress(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }
            const progress = await taskService.getUserProgress(userId);
            res.json(progress);
        }
        catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
    async getIndividualProgress(req, res) {
        try {
            const userId = req.params.userId;
            const progress = await taskService.getUserProgress(userId);
            res.json(progress);
        }
        catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
    async getOrganizationTaskHistory(req, res) {
        try {
            const teamId = req.params.teamId;
            const history = await taskService.getOrganizationTaskHistory(teamId);
            res.json(history);
        }
        catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
}
exports.TaskController = TaskController;
