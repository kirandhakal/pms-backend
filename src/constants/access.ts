import type { UserRole } from "../entities/User";

const ROLE = {
    SUDO_ADMIN: "SUDO_ADMIN",
    SUPER_ADMIN: "SUPER_ADMIN",
    ADMIN: "ADMIN",
    DEPARTMENT_HEAD: "DEPARTMENT_HEAD",
    MANAGER: "MANAGER",
    MEMBER: "MEMBER",
    GUEST: "GUEST"
} as const;

type AccessRole = typeof ROLE[keyof typeof ROLE];

export enum PermissionKey {
    PROJECT_CREATE = "PROJECT_CREATE",
    VIEW_TEAM_ACTIVITY = "VIEW_TEAM_ACTIVITY",
    VIEW_TEAM_ANALYTICS = "VIEW_TEAM_ANALYTICS",
    VIEW_TEAM_PROGRESS = "VIEW_TEAM_PROGRESS",
    BROADCAST_SEND = "BROADCAST_SEND",
    BROADCAST_VIEW = "BROADCAST_VIEW",
    MEMBER_MANAGE = "MEMBER_MANAGE",
    ROLE_ASSIGN = "ROLE_ASSIGN"
}

const LEGACY_ROLE_ALIAS: Record<string, AccessRole> = {
    SuperAdmin: ROLE.SUPER_ADMIN,
    ProjectManager: ROLE.MANAGER,
    TeamMember: ROLE.MEMBER
};

export const ROLE_LEVEL: Record<AccessRole, number> = {
    [ROLE.SUDO_ADMIN]: 0,
    [ROLE.SUPER_ADMIN]: 1,
    [ROLE.ADMIN]: 2,
    [ROLE.DEPARTMENT_HEAD]: 3,
    [ROLE.MANAGER]: 4,
    [ROLE.MEMBER]: 5,
    [ROLE.GUEST]: 6
};

export const CREATOR_CONTROLLED_PERMISSIONS = new Set<PermissionKey>([
    PermissionKey.PROJECT_CREATE,
    PermissionKey.VIEW_TEAM_ACTIVITY,
    PermissionKey.VIEW_TEAM_ANALYTICS,
    PermissionKey.VIEW_TEAM_PROGRESS,
    PermissionKey.ROLE_ASSIGN
]);

export const DEFAULT_ROLE_PERMISSIONS: Record<AccessRole, PermissionKey[]> = {
    [ROLE.SUDO_ADMIN]: [
        PermissionKey.PROJECT_CREATE,
        PermissionKey.VIEW_TEAM_ACTIVITY,
        PermissionKey.VIEW_TEAM_ANALYTICS,
        PermissionKey.VIEW_TEAM_PROGRESS,
        PermissionKey.BROADCAST_SEND,
        PermissionKey.BROADCAST_VIEW,
        PermissionKey.MEMBER_MANAGE,
        PermissionKey.ROLE_ASSIGN
    ],
    [ROLE.SUPER_ADMIN]: [
        PermissionKey.PROJECT_CREATE,
        PermissionKey.VIEW_TEAM_ACTIVITY,
        PermissionKey.VIEW_TEAM_ANALYTICS,
        PermissionKey.VIEW_TEAM_PROGRESS,
        PermissionKey.BROADCAST_SEND,
        PermissionKey.BROADCAST_VIEW,
        PermissionKey.MEMBER_MANAGE,
        PermissionKey.ROLE_ASSIGN
    ],
    [ROLE.ADMIN]: [
        PermissionKey.BROADCAST_SEND,
        PermissionKey.BROADCAST_VIEW,
        PermissionKey.MEMBER_MANAGE,
        PermissionKey.VIEW_TEAM_ACTIVITY,
        PermissionKey.VIEW_TEAM_PROGRESS
    ],
    [ROLE.DEPARTMENT_HEAD]: [
        PermissionKey.BROADCAST_VIEW,
        PermissionKey.VIEW_TEAM_ACTIVITY,
        PermissionKey.VIEW_TEAM_PROGRESS
    ],
    [ROLE.MANAGER]: [
        PermissionKey.BROADCAST_VIEW,
        PermissionKey.VIEW_TEAM_ACTIVITY
    ],
    [ROLE.MEMBER]: [
        PermissionKey.BROADCAST_VIEW
    ],
    [ROLE.GUEST]: []
};

export function normalizeRole(input?: string | UserRole | null): UserRole {
    if (!input) {
        return ROLE.GUEST as UserRole;
    }

    if (Object.values(ROLE).includes(input as AccessRole)) {
        return input as UserRole;
    }

    if (LEGACY_ROLE_ALIAS[input]) {
        return LEGACY_ROLE_ALIAS[input] as UserRole;
    }

    return ROLE.GUEST as UserRole;
}

export function hasMinimumRole(inputRole: string | UserRole | undefined, minimumRole: UserRole): boolean {
    const normalized = normalizeRole(inputRole);
    return ROLE_LEVEL[normalized as AccessRole] <= ROLE_LEVEL[minimumRole as AccessRole];
}
