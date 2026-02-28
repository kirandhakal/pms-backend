"use strict";
/**
 * Permission System Configuration
 *
 * Defines all resources, actions, and scopes for the RBAC system.
 * Permissions are modular and dynamically configurable.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultRolePermissions = exports.SystemRoles = exports.RoleLevel = exports.PermissionScope = exports.PermissionAction = exports.PermissionResource = void 0;
exports.permissionToString = permissionToString;
exports.stringToPermission = stringToPermission;
exports.permissionGrantsAccess = permissionGrantsAccess;
exports.generateAllPermissions = generateAllPermissions;
var PermissionResource;
(function (PermissionResource) {
    PermissionResource["USERS"] = "users";
    PermissionResource["ORGANIZATIONS"] = "organizations";
    PermissionResource["DEPARTMENTS"] = "departments";
    PermissionResource["WORKFLOWS"] = "workflows";
    PermissionResource["TASKS"] = "tasks";
    PermissionResource["INVITATIONS"] = "invitations";
    PermissionResource["ROLES"] = "roles";
    PermissionResource["PERMISSIONS"] = "permissions";
    PermissionResource["SETTINGS"] = "settings";
    PermissionResource["AUDIT_LOGS"] = "audit_logs";
    PermissionResource["DASHBOARD"] = "dashboard";
    PermissionResource["REPORTS"] = "reports";
})(PermissionResource || (exports.PermissionResource = PermissionResource = {}));
var PermissionAction;
(function (PermissionAction) {
    PermissionAction["CREATE"] = "create";
    PermissionAction["READ"] = "read";
    PermissionAction["UPDATE"] = "update";
    PermissionAction["DELETE"] = "delete";
    PermissionAction["MANAGE"] = "manage";
    PermissionAction["ASSIGN"] = "assign";
    PermissionAction["INVITE"] = "invite";
    PermissionAction["EXPORT"] = "export";
    PermissionAction["APPROVE"] = "approve"; // Approve workflows/tasks
})(PermissionAction || (exports.PermissionAction = PermissionAction = {}));
var PermissionScope;
(function (PermissionScope) {
    PermissionScope["OWN"] = "own";
    PermissionScope["DEPARTMENT"] = "department";
    PermissionScope["ORGANIZATION"] = "organization";
    PermissionScope["SYSTEM"] = "system"; // System-wide access
})(PermissionScope || (exports.PermissionScope = PermissionScope = {}));
/**
 * Role hierarchy levels - lower number = higher privilege
 */
var RoleLevel;
(function (RoleLevel) {
    RoleLevel[RoleLevel["SUDO_ADMIN"] = 0] = "SUDO_ADMIN";
    RoleLevel[RoleLevel["SUPER_ADMIN"] = 1] = "SUPER_ADMIN";
    RoleLevel[RoleLevel["ADMIN"] = 2] = "ADMIN";
    RoleLevel[RoleLevel["DEPARTMENT_HEAD"] = 3] = "DEPARTMENT_HEAD";
    RoleLevel[RoleLevel["MANAGER"] = 4] = "MANAGER";
    RoleLevel[RoleLevel["MEMBER"] = 5] = "MEMBER";
    RoleLevel[RoleLevel["GUEST"] = 6] = "GUEST";
})(RoleLevel || (exports.RoleLevel = RoleLevel = {}));
/**
 * System role names (matching UserRole enum)
 */
exports.SystemRoles = {
    SUDO_ADMIN: "SUDO_ADMIN",
    SUPER_ADMIN: "SUPER_ADMIN",
    ADMIN: "ADMIN",
    DEPARTMENT_HEAD: "DEPARTMENT_HEAD",
    MANAGER: "MANAGER",
    MEMBER: "MEMBER",
    GUEST: "GUEST"
};
/**
 * Default permission configurations for system roles
 */
exports.DefaultRolePermissions = {
    SUDO_ADMIN: [
        // Full system access
        { resource: PermissionResource.USERS, action: PermissionAction.MANAGE, scope: PermissionScope.SYSTEM },
        { resource: PermissionResource.ORGANIZATIONS, action: PermissionAction.MANAGE, scope: PermissionScope.SYSTEM },
        { resource: PermissionResource.DEPARTMENTS, action: PermissionAction.MANAGE, scope: PermissionScope.SYSTEM },
        { resource: PermissionResource.WORKFLOWS, action: PermissionAction.MANAGE, scope: PermissionScope.SYSTEM },
        { resource: PermissionResource.TASKS, action: PermissionAction.MANAGE, scope: PermissionScope.SYSTEM },
        { resource: PermissionResource.INVITATIONS, action: PermissionAction.MANAGE, scope: PermissionScope.SYSTEM },
        { resource: PermissionResource.ROLES, action: PermissionAction.MANAGE, scope: PermissionScope.SYSTEM },
        { resource: PermissionResource.PERMISSIONS, action: PermissionAction.MANAGE, scope: PermissionScope.SYSTEM },
        { resource: PermissionResource.SETTINGS, action: PermissionAction.MANAGE, scope: PermissionScope.SYSTEM },
        { resource: PermissionResource.AUDIT_LOGS, action: PermissionAction.READ, scope: PermissionScope.SYSTEM },
        { resource: PermissionResource.DASHBOARD, action: PermissionAction.READ, scope: PermissionScope.SYSTEM },
        { resource: PermissionResource.REPORTS, action: PermissionAction.EXPORT, scope: PermissionScope.SYSTEM },
    ],
    SUPER_ADMIN: [
        // Multi-organization management
        { resource: PermissionResource.USERS, action: PermissionAction.CREATE, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.USERS, action: PermissionAction.READ, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.USERS, action: PermissionAction.UPDATE, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.ORGANIZATIONS, action: PermissionAction.MANAGE, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.DEPARTMENTS, action: PermissionAction.MANAGE, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.WORKFLOWS, action: PermissionAction.MANAGE, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.TASKS, action: PermissionAction.MANAGE, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.INVITATIONS, action: PermissionAction.MANAGE, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.ROLES, action: PermissionAction.MANAGE, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.SETTINGS, action: PermissionAction.UPDATE, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.AUDIT_LOGS, action: PermissionAction.READ, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.DASHBOARD, action: PermissionAction.READ, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.REPORTS, action: PermissionAction.EXPORT, scope: PermissionScope.ORGANIZATION },
    ],
    ADMIN: [
        // Organization-level control
        { resource: PermissionResource.USERS, action: PermissionAction.CREATE, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.USERS, action: PermissionAction.READ, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.USERS, action: PermissionAction.UPDATE, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.ORGANIZATIONS, action: PermissionAction.READ, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.DEPARTMENTS, action: PermissionAction.MANAGE, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.WORKFLOWS, action: PermissionAction.MANAGE, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.TASKS, action: PermissionAction.MANAGE, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.INVITATIONS, action: PermissionAction.MANAGE, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.ROLES, action: PermissionAction.READ, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.SETTINGS, action: PermissionAction.READ, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.DASHBOARD, action: PermissionAction.READ, scope: PermissionScope.ORGANIZATION },
    ],
    DEPARTMENT_HEAD: [
        // Department management
        { resource: PermissionResource.USERS, action: PermissionAction.READ, scope: PermissionScope.DEPARTMENT },
        { resource: PermissionResource.USERS, action: PermissionAction.UPDATE, scope: PermissionScope.DEPARTMENT },
        { resource: PermissionResource.ORGANIZATIONS, action: PermissionAction.READ, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.DEPARTMENTS, action: PermissionAction.READ, scope: PermissionScope.DEPARTMENT },
        { resource: PermissionResource.DEPARTMENTS, action: PermissionAction.UPDATE, scope: PermissionScope.DEPARTMENT },
        { resource: PermissionResource.WORKFLOWS, action: PermissionAction.READ, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.TASKS, action: PermissionAction.MANAGE, scope: PermissionScope.DEPARTMENT },
        { resource: PermissionResource.INVITATIONS, action: PermissionAction.CREATE, scope: PermissionScope.DEPARTMENT },
        { resource: PermissionResource.INVITATIONS, action: PermissionAction.READ, scope: PermissionScope.DEPARTMENT },
        { resource: PermissionResource.DASHBOARD, action: PermissionAction.READ, scope: PermissionScope.DEPARTMENT },
    ],
    MANAGER: [
        // Team/project management
        { resource: PermissionResource.USERS, action: PermissionAction.READ, scope: PermissionScope.DEPARTMENT },
        { resource: PermissionResource.ORGANIZATIONS, action: PermissionAction.READ, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.DEPARTMENTS, action: PermissionAction.READ, scope: PermissionScope.DEPARTMENT },
        { resource: PermissionResource.WORKFLOWS, action: PermissionAction.READ, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.TASKS, action: PermissionAction.MANAGE, scope: PermissionScope.DEPARTMENT },
        { resource: PermissionResource.DASHBOARD, action: PermissionAction.READ, scope: PermissionScope.DEPARTMENT },
    ],
    MEMBER: [
        // Task execution
        { resource: PermissionResource.USERS, action: PermissionAction.READ, scope: PermissionScope.DEPARTMENT },
        { resource: PermissionResource.ORGANIZATIONS, action: PermissionAction.READ, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.DEPARTMENTS, action: PermissionAction.READ, scope: PermissionScope.DEPARTMENT },
        { resource: PermissionResource.WORKFLOWS, action: PermissionAction.READ, scope: PermissionScope.ORGANIZATION },
        { resource: PermissionResource.TASKS, action: PermissionAction.READ, scope: PermissionScope.DEPARTMENT },
        { resource: PermissionResource.TASKS, action: PermissionAction.UPDATE, scope: PermissionScope.OWN },
        { resource: PermissionResource.DASHBOARD, action: PermissionAction.READ, scope: PermissionScope.OWN },
    ],
    GUEST: [
        // Read-only access to public kanban
        { resource: PermissionResource.TASKS, action: PermissionAction.READ, scope: PermissionScope.OWN },
    ]
};
/**
 * Generate permission string for easy comparison
 */
function permissionToString(permission) {
    return `${permission.resource}:${permission.action}:${permission.scope}`;
}
/**
 * Parse permission string back to Permission object
 */
function stringToPermission(permString) {
    const parts = permString.split(":");
    if (parts.length !== 3)
        return null;
    const [resource, action, scope] = parts;
    if (!Object.values(PermissionResource).includes(resource))
        return null;
    if (!Object.values(PermissionAction).includes(action))
        return null;
    if (!Object.values(PermissionScope).includes(scope))
        return null;
    return {
        resource: resource,
        action: action,
        scope: scope
    };
}
/**
 * Check if a permission grants access for a given check
 * Implements scope hierarchy: SYSTEM > ORGANIZATION > DEPARTMENT > OWN
 */
function permissionGrantsAccess(permission, check, userContext) {
    // Resource and action must match (or permission action must be MANAGE)
    if (permission.resource !== check.resource)
        return false;
    if (permission.action !== check.action && permission.action !== PermissionAction.MANAGE)
        return false;
    // Scope hierarchy check
    switch (permission.scope) {
        case PermissionScope.SYSTEM:
            return true; // System scope has access to everything
        case PermissionScope.ORGANIZATION:
            // User must be in the same organization as the target
            if (!userContext.organizationId)
                return false;
            return !check.targetOrganizationId || userContext.organizationId === check.targetOrganizationId;
        case PermissionScope.DEPARTMENT:
            // User must be in the same department as the target
            if (!userContext.departmentId)
                return false;
            return !check.targetDepartmentId || userContext.departmentId === check.targetDepartmentId;
        case PermissionScope.OWN:
            // User must be the owner of the resource
            return !check.targetOwnerId || userContext.userId === check.targetOwnerId;
        default:
            return false;
    }
}
/**
 * Generate all possible permissions for seeding
 */
function generateAllPermissions() {
    const permissions = [];
    for (const resource of Object.values(PermissionResource)) {
        for (const action of Object.values(PermissionAction)) {
            for (const scope of Object.values(PermissionScope)) {
                permissions.push({ resource, action, scope });
            }
        }
    }
    return permissions;
}
