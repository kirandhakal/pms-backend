import { Router } from "express";
import { TaskController } from "../controllers/TaskController";
import { authenticate, authorizeRoles } from "../middlewares/auth";
import { UserRole } from "../entities/User";

const router = Router();
const taskController = new TaskController();

router.use(authenticate);

router.post("/", authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN), taskController.create);
router.patch("/:taskId/status", taskController.updateStatus);

// Progress tracking
router.get("/progress/my", taskController.getMyProgress);
router.get("/progress/:userId", authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN), taskController.getIndividualProgress);

export default router;
