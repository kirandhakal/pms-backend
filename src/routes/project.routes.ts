import { Router } from "express";
import { ProjectController } from "../controllers/ProjectController";
import { authenticate, authorizeRoles } from "../middlewares/auth";
import { UserRole } from "../entities/User";

const router = Router();
const projectController = new ProjectController();

router.use(authenticate);

router.post("/", authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN), projectController.create);
router.get("/", projectController.getAll);

// Restricted Dashboard
router.get("/dashboard", authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN), projectController.getDashboard);

export default router;
