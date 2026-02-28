/**
 * Permission System Configuration
 * 
 * Defines all resources, actions, and scopes for the RBAC system.
 * Permissions are modular and dynamically configurable.
 */

export enum PermissionResource {
    USERS = "users",
    ORGANIZATIONS = "organizations",
    DEPARTMENTS = "departments",
    WORKFLOWS = "workflows",
    TASKS = "tasks",
    INVITATIONS = "invitations",
    ROLES = "roles",
    PERMISSIONS = "permissions",
    SETTINGS = "settings",
    AUDIT_LOGS = "audit_logs",
    DASHBOARD = "dashboard",
    REPORTS = "reports"
}

export enum PermissionAction {
    CREATE = "create",
    READ = "read",
    UPDATE = "update",
    DELETE = "delete",
    MANAGE = "manage",      // Full CRUD + special actions
    ASSIGN = "assign",      // Assign to users/departments
    INVITE = "invite",      // Send invitations
    EXPORT = "export",      // Export data
    APPROVE = "approve"     // Approve workflows/tasks
}

export enum PermissionScope {
    OWN = "own",                    // Only own resources
    DEPARTMENT = "department",       // Resources within department
    ORGANIZATION = "organization",   // Resources within organization
    SYSTEM = "system"               // System-wide access
}

export interface Permission {
    resource: PermissionResource;
    action: PermissionAction;
    scope: PermissionScope;
}

export interface PermissionCheck {
    resource: PermissionResource;
    action: PermissionAction;
    targetOwnerId?: string;
    targetDepartmentId?: string;
    targetOrganizationId?: string;
}

/**
 * Role hierarchy levels - lower number = higher privilege
 */
export enum RoleLevel {
    SUDO_ADMIN = 0,
    SUPER_ADMIN = 1,
    ADMIN = 2,
    DEPARTMENT_HEAD = 3,
    MANAGER = 4,
    MEMBER = 5,
    GUEST = 6
}

/**
 * System role names (matching UserRole enum)
 */
export const SystemRoles = {
    SUDO_ADMIN: "SUDO_ADMIN",
    SUPER_ADMIN: "SUPER_ADMIN",
    ADMIN: "ADMIN",
    DEPARTMENT_HEAD: "DEPARTMENT_HEAD",
    MANAGER: "MANAGER",
    MEMBER: "MEMBER",
    GUEST: "GUEST"
} as const;

export type SystemRoleName = typeof SystemRoles[keyof typeof SystemRoles];

/**
 * Default permission configurations for system roles
 */
export const DefaultRolePermissions: Record<SystemRoleName, Permission[]> = {
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
export function permissionToString(permission: Permission): string {
    return `${permission.resource}:${permission.action}:${permission.scope}`;
}

/**
 * Parse permission string back to Permission object
 */
export function stringToPermission(permString: string): Permission | null {
    const parts = permString.split(":");
    if (parts.length !== 3) return null;

    const [resource, action, scope] = parts;
    
    if (!Object.values(PermissionResource).includes(resource as PermissionResource)) return null;
    if (!Object.values(PermissionAction).includes(action as PermissionAction)) return null;
    if (!Object.values(PermissionScope).includes(scope as PermissionScope)) return null;

    return {
        resource: resource as PermissionResource,
        action: action as PermissionAction,
        scope: scope as PermissionScope
    };
}

/**
 * Check if a permission grants access for a given check
 * Implements scope hierarchy: SYSTEM > ORGANIZATION > DEPARTMENT > OWN
 */
export function permissionGrantsAccess(
    permission: Permission,
    check: PermissionCheck,
    userContext: {
        userId: string;
        departmentId?: string;
        organizationId?: string;
    }
): boolean {
    // Resource and action must match (or permission action must be MANAGE)
    if (permission.resource !== check.resource) return false;
    if (permission.action !== check.action && permission.action !== PermissionAction.MANAGE) return false;

    // Scope hierarchy check
    switch (permission.scope) {
        case PermissionScope.SYSTEM:
            return true; // System scope has access to everything

        case PermissionScope.ORGANIZATION:
            // User must be in the same organization as the target
            if (!userContext.organizationId) return false;
            return !check.targetOrganizationId || userContext.organizationId === check.targetOrganizationId;

        case PermissionScope.DEPARTMENT:
            // User must be in the same department as the target
            if (!userContext.departmentId) return false;
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
export function generateAllPermissions(): Permission[] {
    const permissions: Permission[] = [];

    for (const resource of Object.values(PermissionResource)) {
        for (const action of Object.values(PermissionAction)) {
            for (const scope of Object.values(PermissionScope)) {
                permissions.push({ resource, action, scope });
            }
        }
    }

    return permissions;
}
