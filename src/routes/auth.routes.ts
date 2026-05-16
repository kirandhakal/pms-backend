import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { authenticate } from "../middlewares/auth";

const router = Router();
const authController = new AuthController();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authenticate, authController.logout);
router.get("/me", authenticate, authController.getCurrentUser);
router.patch("/profile", authenticate, authController.updateProfile);
router.patch("/change-password", authenticate, authController.changePassword);
router.post("/setup-super-admin", authController.setupSuperAdmin);

export default router;