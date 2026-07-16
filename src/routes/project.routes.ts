import { Router } from "express";
import { ProjectController } from "../controllers/ProjectController";
import { authenticate, authorizeRoles } from "../middlewares/auth";
import { UserRole } from "../entities/User";

const router = Router();
const projectController = new ProjectController();

router.use(authenticate);

router.post("/", authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER), projectController.create);
router.get("/dashboard", authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN), projectController.getDashboard);
router.get("/", projectController.getAll);
router.get("/:id/workflow", projectController.getWorkflow);
router.get("/:id", projectController.getById);
router.post("/:id/members", authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER), projectController.addMember);

export default router;
