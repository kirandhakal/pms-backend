import { Router } from "express";
import { DashboardController } from "../controllers/DashboardController";
import { authenticate, authorizeRoles } from "../middlewares/auth";
import { UserRole } from "../entities/User";

const router = Router();
const dashboardController = new DashboardController();

router.use(authenticate);

router.get("/user", authorizeRoles(UserRole.USER, UserRole.ADMIN, UserRole.SUPER_ADMIN), dashboardController.getUserDashboard);
router.get("/admin", authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN), dashboardController.getAdminDashboard);
router.get("/super-admin", authorizeRoles(UserRole.SUPER_ADMIN), dashboardController.getSuperAdminDashboard);

export default router;
