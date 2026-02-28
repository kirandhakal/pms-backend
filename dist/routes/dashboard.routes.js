"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const DashboardController_1 = require("../controllers/DashboardController");
const auth_1 = require("../middlewares/auth");
const User_1 = require("../entities/User");
const permission_1 = require("../middlewares/permission");
const permissions_1 = require("../config/permissions");
const router = (0, express_1.Router)();
const dashboardController = new DashboardController_1.DashboardController();
router.use(auth_1.authenticate);
// Generic dashboard endpoint - returns role-appropriate data
router.get("/", dashboardController.getDashboard);
// Role-specific endpoints (new system)
router.get("/sudo", (0, permission_1.requireRoleLevel)(permissions_1.RoleLevel.SUDO_ADMIN), dashboardController.getSudoDashboard);
router.get("/department", (0, permission_1.requireRoleLevel)(permissions_1.RoleLevel.DEPARTMENT_HEAD), dashboardController.getDepartmentDashboard);
router.get("/manager", (0, permission_1.requireRoleLevel)(permissions_1.RoleLevel.MANAGER), dashboardController.getManagerDashboard);
router.get("/member", dashboardController.getMemberDashboard);
// Stats endpoints
router.get("/stats/tasks", dashboardController.getTaskStats);
router.get("/stats/projects", dashboardController.getProjectStats);
router.get("/stats/team", (0, permission_1.requireRoleLevel)(permissions_1.RoleLevel.MANAGER), dashboardController.getTeamStats);
// Activity endpoint
router.get("/activity", dashboardController.getRecentActivity);
// Legacy endpoints (for backwards compatibility)
router.get("/user", (0, auth_1.authorizeRoles)(User_1.UserRole.USER, User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN, User_1.UserRole.TEAM_MEMBER, User_1.UserRole.PROJECT_MANAGER, User_1.UserRole.TEAM_LEAD), dashboardController.getUserDashboard);
router.get("/admin", (0, auth_1.authorizeRoles)(User_1.UserRole.ADMIN, User_1.UserRole.SUPER_ADMIN, User_1.UserRole.PROJECT_MANAGER, User_1.UserRole.TEAM_LEAD), dashboardController.getAdminDashboard);
router.get("/super-admin", (0, auth_1.authorizeRoles)(User_1.UserRole.SUPER_ADMIN), dashboardController.getSuperAdminDashboard);
exports.default = router;
