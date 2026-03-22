import { UserRole } from "../entities/User";

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

const LEGACY_ROLE_ALIAS: Record<string, UserRole> = {
    SuperAdmin: UserRole.SUPER_ADMIN,
    ProjectManager: UserRole.MANAGER,
    TeamMember: UserRole.MEMBER
};

export const ROLE_LEVEL: Record<UserRole, number> = {
    [UserRole.SUDO_ADMIN]: 0,
    [UserRole.SUPER_ADMIN]: 1,
    [UserRole.ADMIN]: 2,
    [UserRole.DEPARTMENT_HEAD]: 3,
    [UserRole.MANAGER]: 4,
    [UserRole.MEMBER]: 5,
    [UserRole.GUEST]: 6
};

export const CREATOR_CONTROLLED_PERMISSIONS = new Set<PermissionKey>([
    PermissionKey.PROJECT_CREATE,
    PermissionKey.VIEW_TEAM_ACTIVITY,
    PermissionKey.VIEW_TEAM_ANALYTICS,
    PermissionKey.VIEW_TEAM_PROGRESS,
    PermissionKey.ROLE_ASSIGN
]);

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, PermissionKey[]> = {
    [UserRole.SUDO_ADMIN]: [
        PermissionKey.PROJECT_CREATE,
        PermissionKey.VIEW_TEAM_ACTIVITY,
        PermissionKey.VIEW_TEAM_ANALYTICS,
        PermissionKey.VIEW_TEAM_PROGRESS,
        PermissionKey.BROADCAST_SEND,
        PermissionKey.BROADCAST_VIEW,
        PermissionKey.MEMBER_MANAGE,
        PermissionKey.ROLE_ASSIGN
    ],
    [UserRole.SUPER_ADMIN]: [
        PermissionKey.PROJECT_CREATE,
        PermissionKey.VIEW_TEAM_ACTIVITY,
        PermissionKey.VIEW_TEAM_ANALYTICS,
        PermissionKey.VIEW_TEAM_PROGRESS,
        PermissionKey.BROADCAST_SEND,
        PermissionKey.BROADCAST_VIEW,
        PermissionKey.MEMBER_MANAGE,
        PermissionKey.ROLE_ASSIGN
    ],
    [UserRole.ADMIN]: [
        PermissionKey.BROADCAST_SEND,
        PermissionKey.BROADCAST_VIEW,
        PermissionKey.MEMBER_MANAGE,
        PermissionKey.VIEW_TEAM_ACTIVITY,
        PermissionKey.VIEW_TEAM_PROGRESS
    ],
    [UserRole.DEPARTMENT_HEAD]: [
        PermissionKey.BROADCAST_VIEW,
        PermissionKey.VIEW_TEAM_ACTIVITY,
        PermissionKey.VIEW_TEAM_PROGRESS
    ],
    [UserRole.MANAGER]: [
        PermissionKey.BROADCAST_VIEW,
        PermissionKey.VIEW_TEAM_ACTIVITY
    ],
    [UserRole.MEMBER]: [
        PermissionKey.BROADCAST_VIEW
    ],
    [UserRole.GUEST]: []
};

export function normalizeRole(input?: string | UserRole | null): UserRole {
    if (!input) {
        return UserRole.GUEST;
    }

    if (Object.values(UserRole).includes(input as UserRole)) {
        return input as UserRole;
    }

    if (LEGACY_ROLE_ALIAS[input]) {
        return LEGACY_ROLE_ALIAS[input];
    }

    return UserRole.GUEST;
}

export function hasMinimumRole(inputRole: string | UserRole | undefined, minimumRole: UserRole): boolean {
    const normalized = normalizeRole(inputRole);
    return ROLE_LEVEL[normalized] <= ROLE_LEVEL[minimumRole];
}
