import { Router } from "express";
import { ContactController } from "../controllers/ContactController";
import { authenticate, authorizeRoles } from "../middlewares/auth";
import { UserRole } from "../entities/User";

const router = Router();
const controller = new ContactController();
router.post("/", controller.create.bind(controller));
router.get("/", authenticate, authorizeRoles(UserRole.SUPER_ADMIN, UserRole.SUDO_ADMIN), controller.list.bind(controller));
router.patch("/:id", authenticate, authorizeRoles(UserRole.SUPER_ADMIN, UserRole.SUDO_ADMIN), controller.updateStatus.bind(controller));
export default router;
