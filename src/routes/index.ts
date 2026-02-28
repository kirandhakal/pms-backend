import { Router } from "express";
import authRoutes from "./auth.routes";
import projectRoutes from "./project.routes";
import taskRoutes from "./task.routes";
import inviteRoutes from "./invite.routes";
import userRoutes from "./user.routes";
import dashboardRoutes from "./dashboard.routes";
import publicRoutes from "./public.routes";
import organizationRoutes from "./organization.routes";
import workflowRoutes from "./workflow.routes";
import roleRoutes from "./role.routes";

const router = Router();

// Public routes (no auth required)
router.use("/public", publicRoutes);

// Authentication routes
router.use("/auth", authRoutes);

// Protected routes
router.use("/organizations", organizationRoutes);
router.use("/workflows", workflowRoutes);
router.use("/roles", roleRoutes);
router.use("/projects", projectRoutes);
router.use("/tasks", taskRoutes);
router.use("/invites", inviteRoutes);
router.use("/users", userRoutes);
router.use("/dashboard", dashboardRoutes);

export default router;
