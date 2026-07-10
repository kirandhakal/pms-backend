import { Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { worklogService } from "../services/WorklogService";

export class WorklogController {
    async listByProject(req: AuthRequest, res: Response) {
        try {
            const worklogs = await worklogService.getByProject(String(req.params.projectId));
            res.json({ data: worklogs });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }

    async listByUser(req: AuthRequest, res: Response) {
        try {
            const userId = (req.query.userId as string) || req.user!.id;
            const worklogs = await worklogService.getByUser(userId);
            res.json({ data: worklogs });
        } catch (err: any) {
            res.status(err.statusCode || 500).json({ message: err.message });
        }
    }

    async create(req: AuthRequest, res: Response) {
        try {
            const worklog = await worklogService.createManual({
                ...req.body,
                userId: req.body.userId || req.user!.id,
            });
            res.status(201).json({ data: worklog });
        } catch (err: any) {
            res.status(err.statusCode || 400).json({ message: err.message });
        }
    }
}
