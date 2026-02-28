import { NextFunction, Response } from "express";
import { AuthRequest } from "../middlewares/auth";
import { DashboardService } from "../services/DashboardService";
import { ApiError } from "../middlewares/errorHandler";
import { RoleLevel } from "../config/permissions";

const dashboardService = new DashboardService();

export class DashboardController {
    // Generic dashboard - returns role-appropriate data
    async getDashboard(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) {
                throw new ApiError("Unauthorized", 401);
            }

            const roleLevel = req.user.role?.level ?? RoleLevel.MEMBER;
            let data;

            if (roleLevel <= RoleLevel.SUDO_ADMIN) {
                data = await dashboardService.getSudoDashboard();
            } else if (roleLevel <= RoleLevel.SUPER_ADMIN) {
                data = await dashboardService.getSuperAdminDashboard(req.user.organizationId);
            } else if (roleLevel <= RoleLevel.ADMIN) {
                data = await dashboardService.getAdminDashboard(req.user.organizationId);
            } else if (roleLevel <= RoleLevel.DEPARTMENT_HEAD) {
                data = await dashboardService.getDepartmentDashboard(req.user.id, req.user.departmentId);
            } else if (roleLevel <= RoleLevel.MANAGER) {
                data = await dashboardService.getManagerDashboard(req.user.id, req.user.departmentId);
            } else {
                data = await dashboardService.getMemberDashboard(req.user.id);
            }

            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }

    // Sudo Admin dashboard
    async getSudoDashboard(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            const data = await dashboardService.getSudoDashboard();
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }

    // Department dashboard
    async getDepartmentDashboard(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) {
                throw new ApiError("Unauthorized", 401);
            }
            const data = await dashboardService.getDepartmentDashboard(
                req.user.id, 
                req.user.departmentId
            );
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }

    // Manager dashboard
    async getManagerDashboard(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) {
                throw new ApiError("Unauthorized", 401);
            }
            const data = await dashboardService.getManagerDashboard(
                req.user.id,
                req.user.departmentId
            );
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }

    // Member dashboard
    async getMemberDashboard(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) {
                throw new ApiError("Unauthorized", 401);
            }
            const data = await dashboardService.getMemberDashboard(req.user.id);
            res.json({ success: true, data });
        } catch (err) {
            next(err);
        }
    }

    // Task stats
    async getTaskStats(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) {
                throw new ApiError("Unauthorized", 401);
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
        } catch (err) {
            next(err);
        }
    }

    // Project stats
    async getProjectStats(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) {
                throw new ApiError("Unauthorized", 401);
            }
            const data = await dashboardService.getManagerDashboard(
                req.user.id,
                req.user.departmentId
            );
            res.json({ 
                success: true, 
                data: {
                    totalProjects: data.totalProjects,
                    activeWorkflows: data.activeWorkflows
                }
            });
        } catch (err) {
            next(err);
        }
    }

    // Team stats
    async getTeamStats(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) {
                throw new ApiError("Unauthorized", 401);
            }
            const data = await dashboardService.getManagerDashboard(
                req.user.id,
                req.user.departmentId
            );
            res.json({ 
                success: true, 
                data: {
                    teamSize: data.teamSize
                }
            });
        } catch (err) {
            next(err);
        }
    }

    // Recent activity
    async getRecentActivity(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) {
                throw new ApiError("Unauthorized", 401);
            }
            const data = await dashboardService.getMemberDashboard(req.user.id);
            res.json({ 
                success: true, 
                data: data.recentActivity || []
            });
        } catch (err) {
            next(err);
        }
    }

    // Legacy methods for backwards compatibility
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
            if (!req.user) {
                throw new ApiError("Unauthorized", 401);
            }
            const data = await dashboardService.getAdminDashboard(req.user.organizationId);
            res.json(data);
        } catch (err) {
            next(err);
        }
    }

    async getSuperAdminDashboard(req: AuthRequest, res: Response, next: NextFunction) {
        try {
            if (!req.user) {
                throw new ApiError("Unauthorized", 401);
            }
            const data = await dashboardService.getSuperAdminDashboard(req.user.organizationId);
            res.json(data);
        } catch (err) {
            next(err);
        }
    }
}
