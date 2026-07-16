import { Router } from "express";
import { authenticate } from "../middlewares/auth";
import { loadPermissions, authorize } from "../middlewares/permission";
import { resolveTenant, requireTenant, TenantRequest } from "../middlewares/tenantResolver";
import { PermissionResource, PermissionAction } from "../config/permissions";
import { TeamRoleController } from "../controllers/TeamRoleController";
import { validateBody } from "../middlewares/validate";
import { z } from "zod";

const router = Router();
const ctrl = new TeamRoleController();

// Validation schemas
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

// ──────────────────────────────────────────────
// ORGANIZATION TEAM ROLES
// ──────────────────────────────────────────────

/**
 * @route   GET /api/organizations/:orgId/team-roles
 * @desc    List all team roles for an organization
 */
router.get(
    "/organizations/:orgId/team-roles",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.TEAMS, PermissionAction.READ),
    ctrl.listRoles
);

/**
 * @route   POST /api/organizations/:orgId/team-roles
 * @desc    Create a custom team role
 */
router.post(
    "/organizations/:orgId/team-roles",
    authenticate,
    loadPermissions,
    resolveTenant,
    requireTenant,
    authorize(PermissionResource.TEAMS, PermissionAction.CREATE),
    validateBody(createRoleSchema),
    ctrl.createRole
);

/**
 * @route   DELETE /api/organizations/:orgId/team-roles/:roleId
 * @desc    Delete a custom team role
 */
router.delete(
    "/organizations/:orgId/team-roles/:roleId",
    authenticate,
    loadPermissions,
    resolveTenant,
    requireTenant,
    authorize(PermissionResource.TEAMS, PermissionAction.DELETE),
    ctrl.deleteRole
);

/**
 * @route   POST /api/organizations/:orgId/team-roles/seed
 * @desc    Seed default system team roles for an organization
 */
router.post(
    "/organizations/:orgId/team-roles/seed",
    authenticate,
    loadPermissions,
    resolveTenant,
    requireTenant,
    authorize(PermissionResource.TEAMS, PermissionAction.CREATE),
    ctrl.seedDefaults
);

// ──────────────────────────────────────────────
// TEAM MEMBERS (typed membership)
// ──────────────────────────────────────────────

/**
 * @route   GET /api/teams/:teamId/members
 * @desc    List team members with their sub-roles
 */
router.get(
    "/teams/:teamId/members",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.TEAMS, PermissionAction.READ),
    ctrl.listTeamMembers
);

/**
 * @route   POST /api/teams/:teamId/members
 * @desc    Add a member to a team with a specific team role
 */
router.post(
    "/teams/:teamId/members",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.TEAMS, PermissionAction.CREATE),
    validateBody(addTeamMemberSchema),
    ctrl.addTeamMember
);

/**
 * @route   PATCH /api/teams/:teamId/members/:userId/role
 * @desc    Update a team member's sub-role
 */
router.patch(
    "/teams/:teamId/members/:userId/role",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.TEAMS, PermissionAction.UPDATE),
    validateBody(updateMemberRoleSchema),
    ctrl.updateTeamMemberRole
);

/**
 * @route   DELETE /api/teams/:teamId/members/:userId
 * @desc    Remove a member from a team
 */
router.delete(
    "/teams/:teamId/members/:userId",
    authenticate,
    loadPermissions,
    resolveTenant,
    authorize(PermissionResource.TEAMS, PermissionAction.DELETE),
    ctrl.removeTeamMember
);

export default router;
