import { Router } from "express";
import authRoutes from "./auth.routes";
import projectRoutes from "./project.routes";
import taskRoutes from "./task.routes";
import inviteRoutes from "./invite.routes";
import userRoutes from "./user.routes";
import dashboardRoutes from "./dashboard.routes";
import publicRoutes from "./public.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/public", publicRoutes);
router.use("/projects", projectRoutes);
router.use("/tasks", taskRoutes);
router.use("/invites", inviteRoutes);
router.use("/users", userRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
