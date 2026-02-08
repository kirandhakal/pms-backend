import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { TaskService } from "../services/TaskService";

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
            const { taskId } = req.params;
            const { status, completion } = req.body;
            const task = await taskService.updateTaskStatus(taskId as string, status, completion);
            res.json(task);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    async getMyProgress(req: AuthRequest, res: Response) {
        try {
            const userId = req.user!.id;
            const progress = await taskService.getUserProgress(userId);
            res.json(progress);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    }

    async getIndividualProgress(req: AuthRequest, res: Response) {
        try {
            const { userId } = req.params;
            const progress = await taskService.getUserProgress(userId as string);
            res.json(progress);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    }

    async addComment(req: AuthRequest, res: Response) {
        try {
            const { taskId } = req.params;
            const { content } = req.body;
            const userId = req.user!.id;
            const comment = await taskService.addComment(taskId as string, userId, content);
            res.status(201).json(comment);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }
}
