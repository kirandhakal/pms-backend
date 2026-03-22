import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { authenticate } from "../middlewares/auth";

const router = Router();
const authController = new AuthController();

router.post("/register", authController.register);
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/me", authenticate, authController.me);
router.patch("/profile", authenticate, authController.updateProfile);
router.patch("/change-password", authenticate, authController.changePassword);
router.post("/forgot-password", authController.requestForgotPasswordOtp);
router.post("/reset-password-otp", authController.resetPasswordWithOtp);
router.post("/setup-admin", authController.setupSuperAdmin);

// Google OAuth routes
router.get("/google", authController.googleAuth);
router.get("/google/callback", authController.googleCallback);

// GitHub OAuth routes
router.get("/github", authController.githubAuth);
router.get("/github/callback", authController.githubCallback);

export default router;
