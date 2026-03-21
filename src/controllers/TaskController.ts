import { Request, Response } from "express";
import { TaskService } from "../services/TaskService";
import { AuthRequest } from "../middlewares/auth";
import { TaskStatus } from "../entities/Task";

const taskService = new TaskService();

export class TaskController {
    async create(req: AuthRequest, res: Response) {
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
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    async updateStatus(req: AuthRequest, res: Response) {
        try {
            const taskId = req.params.taskId as string;
            const { status, completion } = req.body;
            const task = await taskService.updateTaskStatus(taskId, status as TaskStatus, completion, req.user?.id);
            res.json(task);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    async getMyProgress(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
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

    async getOrganizationTaskHistory(req: AuthRequest, res: Response) {
        try {
            const teamId = req.params.teamId as string;
            const history = await taskService.getOrganizationTaskHistory(teamId);
            res.json(history);
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    }
}
