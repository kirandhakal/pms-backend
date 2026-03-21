"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthController_1 = require("../controllers/AuthController");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
const authController = new AuthController_1.AuthController();
router.post("/register", authController.register);
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/me", auth_1.authenticate, authController.me);
router.post("/setup-admin", authController.setupSuperAdmin);
// Google OAuth routes
router.get("/google", authController.googleAuth);
router.get("/google/callback", authController.googleCallback);
// GitHub OAuth routes
router.get("/github", authController.githubAuth);
router.get("/github/callback", authController.githubCallback);
exports.default = router;
