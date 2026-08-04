import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { TaskService } from "../services/TaskService";
import { TaskStatus } from "../entities/Task";
import { workflowEngine } from "../services/WorkflowEngine";
import { ProjectRole } from "../constants/workflow-stages";
import { AppDataSource } from "../config/data-source";
import { Task } from "../entities/Task";

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
            const updated = await taskService.updateTaskStatus(
                taskIdParam,
                status as TaskStatus,
                completion,
                req.user?.id
            );
            res.json(updated);
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    /**
     * Move a task to another workflow stage (role-gated drag).
     * Body: { toStageId, actorRole? }
     */
    async transitionStage(req: AuthRequest, res: Response) {
        try {
            const taskId = String(req.params.taskId);
            const { toStageId, actorRole: bodyRole } = req.body as {
                toStageId: string;
                actorRole?: ProjectRole;
            };
            if (!toStageId) {
                return res.status(400).json({ message: "toStageId is required" });
            }

            const task = await AppDataSource.getRepository(Task).findOne({
                where: { id: taskId },
            });
            const actorRole =
                (bodyRole as ProjectRole | undefined) ||
                (await workflowEngine.resolveActorRole(req.user!.id, task?.projectId));

            const result = await workflowEngine.transitionTask(
                taskId,
                toStageId,
                req.user!.id,
                actorRole
            );
            res.json({ data: result });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async markLive(req: AuthRequest, res: Response) {
        try {
            const task = await workflowEngine.markLive(String(req.params.taskId), req.user?.id);
            res.json({ data: task });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }

    async rebug(req: AuthRequest, res: Response) {
        try {
            const reason = (req.body?.reason as string) || "Rebug from live";
            const result = await workflowEngine.rebug(
                String(req.params.taskId),
                reason,
                req.user?.id
            );
            res.json({ data: result });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
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
