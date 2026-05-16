import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { authenticate, authorizeRoles } from "../middlewares/auth";
import { UserRole } from "../entities/User";
import { validateBody } from "../middlewares/validate";
import { createAdminSchema } from "../validations/auth.schemas";

const router = Router();
const userController = new UserController();

router.use(authenticate);

router.get("/", authorizeRoles(UserRole.ADMIN, UserRole.SUPER_ADMIN), userController.getAllUsers);
router.post("/admins", authorizeRoles(UserRole.SUPER_ADMIN), validateBody(createAdminSchema), userController.createAdmin);

export default router;
