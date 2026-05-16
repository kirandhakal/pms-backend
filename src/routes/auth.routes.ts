import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { authenticate } from "../middlewares/auth";
<<<<<<< HEAD
=======
import { validateBody } from "../middlewares/validate";
import {
	changePasswordSchema,
	createAdminSchema,
	loginSchema,
	registerSchema,
	updateProfileSchema
} from "../validations/auth.schemas";
>>>>>>> new/rafc

const router = Router();
const authController = new AuthController();

<<<<<<< HEAD
router.post("/register", authController.register);
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/me", authenticate, authController.me);
router.post("/setup-admin", authController.setupSuperAdmin);
=======
router.post("/register", validateBody(registerSchema), authController.register);
router.post("/login", validateBody(loginSchema), authController.login);
router.post("/logout", authenticate, authController.logout);
router.get("/me", authenticate, authController.getCurrentUser);
router.patch("/profile", authenticate, validateBody(updateProfileSchema), authController.updateProfile);
router.patch("/change-password", authenticate, validateBody(changePasswordSchema), authController.changePassword);

router.post(
	"/setup-super-admin",
	validateBody(createAdminSchema),
	(req, res, next) => {
		const bootstrapSecret = process.env.BOOTSTRAP_SECRET;
		if (!bootstrapSecret) {
			return res.status(404).json({ message: "Not found" });
		}

		const providedSecret = req.headers["x-bootstrap-secret"];
		if (providedSecret !== bootstrapSecret) {
			return res.status(403).json({ message: "Forbidden" });
		}

		next();
	},
	authController.setupSuperAdmin
);
>>>>>>> new/rafc

// Google OAuth routes
router.get("/google", authController.googleAuth);
router.get("/google/callback", authController.googleCallback);

// GitHub OAuth routes
router.get("/github", authController.githubAuth);
router.get("/github/callback", authController.githubCallback);

export default router;
