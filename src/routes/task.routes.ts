import { Router } from "express";
import { TaskController } from "../controllers/TaskController";
import { authenticate, authorizeRoles } from "../middlewares/auth";
import { UserRole } from "../entities/User";

const router = Router();
const taskController = new TaskController();

router.use(authenticate);

<<<<<<< HEAD
router.post("/", taskController.create);
=======
router.post("/", authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN), taskController.create);
>>>>>>> new/rafc
router.patch("/:taskId/status", taskController.updateStatus);

// Progress tracking
router.get("/progress/my", taskController.getMyProgress);
<<<<<<< HEAD
router.get("/progress/:userId", authorize([UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER]), taskController.getIndividualProgress);
router.get("/history/org/:teamId", taskController.getOrganizationTaskHistory);
=======
router.get("/progress/:userId", authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN), taskController.getIndividualProgress);
>>>>>>> new/rafc

export default router;
