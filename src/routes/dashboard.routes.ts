import { Router } from "express";
import { DashboardController } from "../controllers/DashboardController";
import { authenticate, authorizeRoles } from "../middlewares/auth";
import { UserRole } from "../entities/User";
import { requireRoleLevel } from "../middlewares/permission";
import { RoleLevel } from "../config/permissions";

const router = Router();
const dashboardController = new DashboardController();

router.use(authenticate);

// Generic dashboard endpoint - returns role-appropriate data
router.get("/", dashboardController.getDashboard);

// Role-specific endpoints (new system)
router.get("/sudo", requireRoleLevel(RoleLevel.SUDO_ADMIN), dashboardController.getSudoDashboard);
router.get("/department", requireRoleLevel(RoleLevel.DEPARTMENT_HEAD), dashboardController.getDepartmentDashboard);
router.get("/manager", requireRoleLevel(RoleLevel.MANAGER), dashboardController.getManagerDashboard);
router.get("/member", dashboardController.getMemberDashboard);

// Stats endpoints
router.get("/stats/tasks", dashboardController.getTaskStats);
router.get("/stats/projects", dashboardController.getProjectStats);
router.get("/stats/team", requireRoleLevel(RoleLevel.MANAGER), dashboardController.getTeamStats);

// Activity endpoint
router.get("/activity", dashboardController.getRecentActivity);

// Legacy endpoints (for backwards compatibility)
router.get("/user", authorizeRoles(UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.TEAM_MEMBER, UserRole.PROJECT_MANAGER, UserRole.TEAM_LEAD), dashboardController.getUserDashboard);
router.get("/admin", authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.TEAM_LEAD), dashboardController.getAdminDashboard);
router.get("/super-admin", authorizeRoles(UserRole.SUPER_ADMIN), dashboardController.getSuperAdminDashboard);

export default router;
