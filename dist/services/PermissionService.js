"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionService = void 0;
const data_source_1 = require("../config/data-source");
const access_1 = require("../constants/access");
const OrganizationPermission_1 = require("../entities/OrganizationPermission");
const User_1 = require("../entities/User");
const FRONTEND_PERMISSION_MAP = {
    [access_1.PermissionKey.PROJECT_CREATE]: [{ resource: "workflows", action: "create", scope: "organization" }],
    [access_1.PermissionKey.TASK_CREATE]: [{ resource: "tasks", action: "create", scope: "organization" }],
    [access_1.PermissionKey.MEETING_SCHEDULE]: [{ resource: "meetings", action: "create", scope: "organization" }],
    [access_1.PermissionKey.WORKFLOW_TASK_CREATE]: [{ resource: "workflows", action: "update", scope: "organization" }],
    [access_1.PermissionKey.WORKFLOW_BOARD_EDIT]: [{ resource: "workflows", action: "manage", scope: "organization" }],
    [access_1.PermissionKey.WORKFLOW_BOARD_ACCESS]: [{ resource: "workflows", action: "read", scope: "organization" }],
    [access_1.PermissionKey.CHANNEL_CREATE]: [{ resource: "organizations", action: "create", scope: "organization" }],
    [access_1.PermissionKey.CHANNEL_INVITE]: [{ resource: "organizations", action: "invite", scope: "organization" }],
    [access_1.PermissionKey.DASHBOARD_ANALYTICS]: [{ resource: "dashboard", action: "read", scope: "organization" }],
    [access_1.PermissionKey.VIEW_TEAM_ACTIVITY]: [{ resource: "audit_logs", action: "read", scope: "organization" }],
    [access_1.PermissionKey.VIEW_TEAM_ANALYTICS]: [{ resource: "reports", action: "read", scope: "organization" }],
    [access_1.PermissionKey.VIEW_TEAM_PROGRESS]: [{ resource: "dashboard", action: "read", scope: "organization" }],
    [access_1.PermissionKey.BROADCAST_SEND]: [{ resource: "organizations", action: "update", scope: "organization" }],
    [access_1.PermissionKey.BROADCAST_VIEW]: [{ resource: "organizations", action: "read", scope: "organization" }],
    [access_1.PermissionKey.MEMBER_MANAGE]: [{ resource: "users", action: "manage", scope: "organization" }],
    [access_1.PermissionKey.ROLE_ASSIGN]: [{ resource: "roles", action: "assign", scope: "organization" }],
};
class PermissionService {
    constructor() {
        this.permissionRepo = data_source_1.AppDataSource.getRepository(OrganizationPermission_1.OrganizationPermission);
    }
    async getExplicitPermissions(userId, teamId) {
        const where = teamId ? { user: { id: userId }, team: { id: teamId } } : { user: { id: userId } };
        const records = await this.permissionRepo.find({ where });
        return records.map((record) => record.permission);
    }
    async getEffectivePermissions(user) {
        const normalizedRole = (0, access_1.normalizeRole)(user.legacyRole ?? user.role?.name ?? User_1.UserRole.GUEST);
        const roleKey = normalizedRole;
        const defaults = access_1.DEFAULT_ROLE_PERMISSIONS[roleKey] ?? [];
        const explicit = await this.getExplicitPermissions(user.id, user.team?.id);
        const permissions = new Set([...defaults, ...explicit]);
        if (normalizedRole === User_1.UserRole.SUDO_ADMIN || normalizedRole === User_1.UserRole.SUPER_ADMIN) {
            Object.values(access_1.PermissionKey).forEach((permission) => permissions.add(permission));
        }
        return permissions;
    }
    async userHasPermission(user, permission) {
        const permissions = await this.getEffectivePermissions(user);
        return permissions.has(permission);
    }
    getRoleLevel(inputRole) {
        return access_1.ROLE_LEVEL[(0, access_1.normalizeRole)(inputRole)];
    }
    toFrontendPermissions(permissionKeys) {
        return permissionKeys.flatMap((permission) => FRONTEND_PERMISSION_MAP[permission] ?? []);
    }
}
exports.PermissionService = PermissionService;
