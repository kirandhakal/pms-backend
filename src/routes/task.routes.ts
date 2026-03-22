import { Router } from "express";
import { TaskController } from "../controllers/TaskController";
import { authenticate, authorize } from "../middlewares/auth";
import { UserRole } from "../entities/User";

const router = Router();
const taskController = new TaskController();

router.use(authenticate);

router.post("/", taskController.create);
router.patch("/:taskId/status", taskController.updateStatus);

// Progress tracking
router.get("/progress/my", taskController.getMyProgress);
router.get("/progress/:userId", authorize([UserRole.SUDO_ADMIN, UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]), taskController.getIndividualProgress);
router.get("/history/org/:teamId", taskController.getOrganizationTaskHistory);

export default router;
