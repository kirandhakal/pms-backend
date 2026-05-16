import { Router } from "express";
import { ProjectController } from "../controllers/ProjectController";
import { authenticate, authorize } from "../middlewares/auth";
import { UserRole } from "../entities/User";

const router = Router();
const projectController = new ProjectController();

router.use(authenticate);

router.post("/", projectController.create);
router.get("/", projectController.getAll);
router.get("/:projectId/members/:memberId/permissions", projectController.getMemberPermissions);
router.put("/:projectId/members/:memberId/permissions", projectController.setMemberPermissions);

// Restricted Dashboard
router.get("/dashboard", authorize([UserRole.SUDO_ADMIN, UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]), projectController.getDashboard);

export default router;
