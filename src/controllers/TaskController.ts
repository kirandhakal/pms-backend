import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { TaskService } from "../services/TaskService";
import { TaskStatus } from "../entities/Task";

const taskService = new TaskService();

export class TaskController {
    async create(req: AuthRequest, res: Response) {
        try {
            const task = await taskService.createTask(req.body);
            res.status(201).json(task);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    async updateStatus(req: AuthRequest, res: Response) {
        try {
            const taskIdParam = req.params.taskId;
            if (!taskIdParam || Array.isArray(taskIdParam)) {
                return res.status(400).json({ message: "taskId is required" });
            }
            const { status, completion } = req.body;
            const updated = await taskService.updateTaskStatus(taskIdParam, status as TaskStatus, completion);
            res.json(updated);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    async getMyProgress(req: AuthRequest, res: Response) {
        try {
            if (!req.user) {
                return res.status(401).json({ message: "Unauthorized" });
            }

            const progress = await taskService.getUserProgress(req.user.id);
            res.json(progress);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    }

    async getIndividualProgress(req: AuthRequest, res: Response) {
        try {
            const userIdParam = req.params.userId;
            if (!userIdParam || Array.isArray(userIdParam)) {
                return res.status(400).json({ message: "userId is required" });
            }
            const progress = await taskService.getUserProgress(userIdParam);
            res.json(progress);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    }
}