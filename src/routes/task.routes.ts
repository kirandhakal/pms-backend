import { Router } from "express";
import { TaskController } from "../controllers/TaskController";
import { authenticate, authorize } from "../middlewares/auth";
import { UserRole } from "../entities/User";

const router = Router();
const taskController = new TaskController();

router.use(authenticate);

router.post("/", authorize([UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER]), taskController.create);
router.patch("/:taskId/status", taskController.updateStatus);

// Progress tracking
router.get("/progress/my", taskController.getMyProgress);
router.get("/progress/:userId", authorize([UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER]), taskController.getIndividualProgress);

export default router;
