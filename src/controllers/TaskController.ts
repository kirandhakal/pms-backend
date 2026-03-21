import { Request, Response } from "express";
import { TaskService } from "../services/TaskService";
import { AuthRequest } from "../middlewares/auth";
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
            const taskId = req.params.taskId as string;
            const { status, completion } = req.body;
            const task = await taskService.updateTaskStatus(taskId, status as TaskStatus, completion);
            res.json(task);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    async getMyProgress(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ message: "Unauthorized" });
            }
            const progress = await taskService.getUserProgress(userId);
            res.json(progress);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    }

    async getIndividualProgress(req: AuthRequest, res: Response) {
        try {
            const userId = req.params.userId as string;
            const progress = await taskService.getUserProgress(userId);
            res.json(progress);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    }
}
