import notificationRoutes from "./notification.routes";
import { Router } from "express";
import authRoutes from "./auth.routes";
import projectRoutes from "./project.routes";
import taskRoutes from "./task.routes";
import inviteRoutes from "./invite.routes";
import organizationRoutes from "./organization.routes";
import userOrganizationsRoutes from "./user-organizations.routes";
import workflowRoutes from "./workflow.routes";
import channelRoutes from "./channel.routes";
import friendRoutes from "./friend.routes";
import worklogRoutes from "./worklog.routes";
import teamRoleRoutes from "./team-role.routes";
import meetingRoutes from "./meeting.routes";
import momRoutes from "./mom.routes";
import publicMeetingRoutes from "./public-meeting.routes";
import contactRoutes from "./contact.routes";

import { chatRouter } from "../realtime/chat";

const router = Router();
router.use("/chat", chatRouter);

router.use("/notifications", notificationRoutes);
router.use("/auth", authRoutes);
router.use("/projects", projectRoutes);
router.use("/tasks", taskRoutes);
router.use("/invites", inviteRoutes);
router.use("/organizations", organizationRoutes);
router.use(userOrganizationsRoutes);
router.use("/workflows", workflowRoutes);
router.use("/channels", channelRoutes);
router.use("/friends", friendRoutes);
router.use("/worklogs", worklogRoutes);
router.use(teamRoleRoutes);
router.use("/meetings", meetingRoutes);
router.use("/mom", momRoutes);
router.use("/public", publicMeetingRoutes);
router.use("/contact", contactRoutes);

export default router;
