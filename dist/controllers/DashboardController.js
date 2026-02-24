"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const DashboardService_1 = require("../services/DashboardService");
const errorHandler_1 = require("../middlewares/errorHandler");
const dashboardService = new DashboardService_1.DashboardService();
class DashboardController {
    async getUserDashboard(req, res, next) {
        try {
            if (!req.user) {
                throw new errorHandler_1.ApiError("Unauthorized", 401);
            }
            const data = await dashboardService.getUserDashboard(req.user.id);
            res.json(data);
        }
        catch (err) {
            next(err);
        }
    }
    async getAdminDashboard(req, res, next) {
        try {
            const data = await dashboardService.getAdminDashboard();
            res.json(data);
        }
        catch (err) {
            next(err);
        }
    }
    async getSuperAdminDashboard(req, res, next) {
        try {
            const data = await dashboardService.getSuperAdminDashboard();
            res.json(data);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.DashboardController = DashboardController;
