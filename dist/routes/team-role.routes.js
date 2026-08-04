"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middlewares/auth");
const TeamRoleController_1 = require("../controllers/TeamRoleController");
const validate_1 = require("../middlewares/validate");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const ctrl = new TeamRoleController_1.TeamRoleController();
const createRoleSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
});
const addTeamMemberSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    teamRoleId: zod_1.z.string().uuid(),
});
const updateMemberRoleSchema = zod_1.z.object({
    teamRoleId: zod_1.z.string().uuid(),
});
router.use(auth_1.authenticate);
router.get("/organizations/:orgId/team-roles", ctrl.listRoles);
router.post("/organizations/:orgId/team-roles", (0, validate_1.validateBody)(createRoleSchema), ctrl.createRole);
router.delete("/organizations/:orgId/team-roles/:roleId", ctrl.deleteRole);
router.post("/organizations/:orgId/team-roles/seed", ctrl.seedDefaults);
router.get("/teams/:teamId/members", ctrl.listTeamMembers);
router.post("/teams/:teamId/members", (0, validate_1.validateBody)(addTeamMemberSchema), ctrl.addTeamMember);
router.patch("/teams/:teamId/members/:userId/role", (0, validate_1.validateBody)(updateMemberRoleSchema), ctrl.updateTeamMemberRole);
router.delete("/teams/:teamId/members/:userId", ctrl.removeTeamMember);
exports.default = router;
