import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { TeamRoleController } from "../controllers/TeamRoleController";
import { validateBody } from "../middlewares/validate";
import { z } from "zod";

const router = Router();
const ctrl = new TeamRoleController();

const createRoleSchema = z.object({
    name: z.string().min(1).max(100),
});

const addTeamMemberSchema = z.object({
    userId: z.string().uuid(),
    teamRoleId: z.string().uuid(),
});

const updateMemberRoleSchema = z.object({
    teamRoleId: z.string().uuid(),
});

router.use(authenticate);

router.get("/organizations/:orgId/team-roles", ctrl.listRoles);

router.post(
    "/organizations/:orgId/team-roles",
    validateBody(createRoleSchema),
    ctrl.createRole
);

router.delete("/organizations/:orgId/team-roles/:roleId", ctrl.deleteRole);

router.post("/organizations/:orgId/team-roles/seed", ctrl.seedDefaults);

router.get("/teams/:teamId/members", ctrl.listTeamMembers);

router.post(
    "/teams/:teamId/members",
    validateBody(addTeamMemberSchema),
    ctrl.addTeamMember
);

router.patch(
    "/teams/:teamId/members/:userId/role",
    validateBody(updateMemberRoleSchema),
    ctrl.updateTeamMemberRole
);

router.delete("/teams/:teamId/members/:userId", ctrl.removeTeamMember);

export default router;
