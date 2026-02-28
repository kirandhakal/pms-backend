"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardController = void 0;
const DashboardService_1 = require("../services/DashboardService");
const errorHandler_1 = require("../middlewares/errorHandler");
const permissions_1 = require("../config/permissions");
const dashboardService = new DashboardService_1.DashboardService();
class DashboardController {
    // Generic dashboard - returns role-appropriate data
    async getDashboard(req, res, next) {
        try {
            if (!req.user) {
                throw new errorHandler_1.ApiError("Unauthorized", 401);
            }
            const roleLevel = req.user.role?.level ?? permissions_1.RoleLevel.MEMBER;
            let data;
            if (roleLevel <= permissions_1.RoleLevel.SUDO_ADMIN) {
                data = await dashboardService.getSudoDashboard();
            }
            else if (roleLevel <= permissions_1.RoleLevel.SUPER_ADMIN) {
                data = await dashboardService.getSuperAdminDashboard(req.user.organizationId);
            }
            else if (roleLevel <= permissions_1.RoleLevel.ADMIN) {
                data = await dashboardService.getAdminDashboard(req.user.organizationId);
            }
            else if (roleLevel <= permissions_1.RoleLevel.DEPARTMENT_HEAD) {
                data = await dashboardService.getDepartmentDashboard(req.user.id, req.user.departmentId);
            }
            else if (roleLevel <= permissions_1.RoleLevel.MANAGER) {
                data = await dashboardService.getManagerDashboard(req.user.id, req.user.departmentId);
            }
            else {
                data = await dashboardService.getMemberDashboard(req.user.id);
            }
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    }
    // Sudo Admin dashboard
    async getSudoDashboard(req, res, next) {
        try {
            const data = await dashboardService.getSudoDashboard();
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    }
    // Department dashboard
    async getDepartmentDashboard(req, res, next) {
        try {
            if (!req.user) {
                throw new errorHandler_1.ApiError("Unauthorized", 401);
            }
            const data = await dashboardService.getDepartmentDashboard(req.user.id, req.user.departmentId);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    }
    // Manager dashboard
    async getManagerDashboard(req, res, next) {
        try {
            if (!req.user) {
                throw new errorHandler_1.ApiError("Unauthorized", 401);
            }
            const data = await dashboardService.getManagerDashboard(req.user.id, req.user.departmentId);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    }
    // Member dashboard
    async getMemberDashboard(req, res, next) {
        try {
            if (!req.user) {
                throw new errorHandler_1.ApiError("Unauthorized", 401);
            }
            const data = await dashboardService.getMemberDashboard(req.user.id);
            res.json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    }
    // Task stats
    async getTaskStats(req, res, next) {
        try {
            if (!req.user) {
                throw new errorHandler_1.ApiError("Unauthorized", 401);
            }
            // Get member dashboard which includes task stats
            const data = await dashboardService.getMemberDashboard(req.user.id);
            res.json({
                success: true,
                data: {
                    totalTasks: data.totalTasks,
                    completedTasks: data.completedTasks,
                    inProgressTasks: data.inProgressTasks,
                    pendingTasks: data.pendingTasks,
                    overdueTasks: data.overdueTasks
                }
            });
        }
        catch (err) {
            next(err);
        }
    }
    // Project stats
    async getProjectStats(req, res, next) {
        try {
            if (!req.user) {
                throw new errorHandler_1.ApiError("Unauthorized", 401);
            }
            const data = await dashboardService.getManagerDashboard(req.user.id, req.user.departmentId);
            res.json({
                success: true,
                data: {
                    totalProjects: data.totalProjects,
                    activeWorkflows: data.activeWorkflows
                }
            });
        }
        catch (err) {
            next(err);
        }
    }
    // Team stats
    async getTeamStats(req, res, next) {
        try {
            if (!req.user) {
                throw new errorHandler_1.ApiError("Unauthorized", 401);
            }
            const data = await dashboardService.getManagerDashboard(req.user.id, req.user.departmentId);
            res.json({
                success: true,
                data: {
                    teamSize: data.teamSize
                }
            });
        }
        catch (err) {
            next(err);
        }
    }
    // Recent activity
    async getRecentActivity(req, res, next) {
        try {
            if (!req.user) {
                throw new errorHandler_1.ApiError("Unauthorized", 401);
            }
            const data = await dashboardService.getMemberDashboard(req.user.id);
            res.json({
                success: true,
                data: data.recentActivity || []
            });
        }
        catch (err) {
            next(err);
        }
    }
    // Legacy methods for backwards compatibility
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
            if (!req.user) {
                throw new errorHandler_1.ApiError("Unauthorized", 401);
            }
            const data = await dashboardService.getAdminDashboard(req.user.organizationId);
            res.json(data);
        }
        catch (err) {
            next(err);
        }
    }
    async getSuperAdminDashboard(req, res, next) {
        try {
            if (!req.user) {
                throw new errorHandler_1.ApiError("Unauthorized", 401);
            }
            const data = await dashboardService.getSuperAdminDashboard(req.user.organizationId);
            res.json(data);
        }
        catch (err) {
            next(err);
        }
    }
}
exports.DashboardController = DashboardController;
