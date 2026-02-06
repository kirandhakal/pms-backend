import { Router } from "express";
import { ProjectController } from "../controllers/ProjectController";
import { authenticate, authorize } from "../middlewares/auth";
import { UserRole } from "../entities/User";

const router = Router();
const projectController = new ProjectController();

router.use(authenticate);

router.post("/", authorize([UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER]), projectController.create);
router.get("/", projectController.getAll);

// Restricted Dashboard
router.get("/dashboard", authorize([UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER]), projectController.getDashboard);

export default router;
