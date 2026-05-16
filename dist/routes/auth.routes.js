"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthController_1 = require("../controllers/AuthController");
const auth_1 = require("../middlewares/auth");
const validate_1 = require("../middlewares/validate");
const auth_schemas_1 = require("../validations/auth.schemas");
const router = (0, express_1.Router)();
const authController = new AuthController_1.AuthController();
router.post("/register", (0, validate_1.validateBody)(auth_schemas_1.registerSchema), authController.register);
router.post("/login", (0, validate_1.validateBody)(auth_schemas_1.loginSchema), authController.login);
router.post("/logout", auth_1.authenticate, authController.logout);
router.get("/me", auth_1.authenticate, authController.getCurrentUser);
router.patch("/profile", auth_1.authenticate, (0, validate_1.validateBody)(auth_schemas_1.updateProfileSchema), authController.updateProfile);
router.patch("/change-password", auth_1.authenticate, (0, validate_1.validateBody)(auth_schemas_1.changePasswordSchema), authController.changePassword);
router.post("/setup-super-admin", (0, validate_1.validateBody)(auth_schemas_1.createAdminSchema), (req, res, next) => {
    const bootstrapSecret = process.env.BOOTSTRAP_SECRET;
    if (!bootstrapSecret) {
        return res.status(404).json({ message: "Not found" });
    }
    const providedSecret = req.headers["x-bootstrap-secret"];
    if (providedSecret !== bootstrapSecret) {
        return res.status(403).json({ message: "Forbidden" });
    }
    next();
}, authController.setupSuperAdmin);
exports.default = router;
