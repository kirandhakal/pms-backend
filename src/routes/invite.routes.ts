import { Router } from "express";
import { InviteController } from "../controllers/InviteController";
import { authenticate, authorizeRoles } from "../middlewares/auth";
import { UserRole } from "../entities/User";
import { validateBody } from "../middlewares/validate";
import { inviteSchema } from "../validations/invite.schemas";

const router = Router();
const inviteController = new InviteController();

router.post("/", authenticate, authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN), validateBody(inviteSchema), inviteController.invite);

export default router;
