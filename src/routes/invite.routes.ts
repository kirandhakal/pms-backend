import { Router } from "express";
import { InviteController } from "../controllers/InviteController";
import { authenticate, authorizeRoles } from "../middlewares/auth";
import { UserRole } from "../entities/User";
import { validateBody } from "../middlewares/validate";
import { inviteSchema } from "../validations/invite.schemas";

const router = Router();
const inviteController = new InviteController();

// Send invitation (admin only)
router.post("/", authenticate, authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN), validateBody(inviteSchema), inviteController.invite);

// List all invitations (admin only)
router.get("/", authenticate, authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN), inviteController.list);

// Public: validate invitation token (used on registration page)
router.get("/validate/:token", inviteController.validate);

export default router;
