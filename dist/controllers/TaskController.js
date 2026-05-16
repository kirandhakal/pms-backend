"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskController = void 0;
const TaskService_1 = require("../services/TaskService");
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
            const updated = await taskService.updateTaskStatus(taskIdParam, status, completion);
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
