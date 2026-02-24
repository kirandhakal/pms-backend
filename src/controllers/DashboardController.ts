import { NextFunction, Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { DashboardService } from "../services/DashboardService";
import { ApiError } from "../middlewares/errorHandler";

const dashboardService = new DashboardService();

export class DashboardController {
    async getUserDashboard(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) {
                throw new ApiError("Unauthorized", 401);
            }
            const data = await dashboardService.getUserDashboard(req.user.id);
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    async getAdminDashboard(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const data = await dashboardService.getAdminDashboard();
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    async getSuperAdminDashboard(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const data = await dashboardService.getSuperAdminDashboard();
            res.json(data);
        } catch (err) {
            next(err);
        }
    }
}
