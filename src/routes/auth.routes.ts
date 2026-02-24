import { Router } from "express";
import { AuthController } from "../controllers/AuthController";
import { authenticate } from "../middlewares/auth";
import { validateBody } from "../middlewares/validate";
import {
	changePasswordSchema,
	createAdminSchema,
	loginSchema,
	registerSchema,
	updateProfileSchema
} from "../validations/auth.schemas";

const router = Router();
const authController = new AuthController();

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

export default router;
