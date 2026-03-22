import { Router } from "express";
import { InviteController } from "../controllers/InviteController";
import { authenticate, authorize } from "../middlewares/auth";
import { UserRole } from "../entities/User";

const router = Router();
const inviteController = new InviteController();

router.post("/", authenticate, authorize([UserRole.SUDO_ADMIN, UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MANAGER]), inviteController.invite);

export default router;
