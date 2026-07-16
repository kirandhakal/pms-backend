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
    // Projects
    PROJECT_CREATE = "PROJECT_CREATE",
    // Tasks
    TASK_CREATE = "TASK_CREATE",
    // Meetings
    MEETING_SCHEDULE = "MEETING_SCHEDULE",
    // Workflow (separate from kanban)
    WORKFLOW_TASK_CREATE = "WORKFLOW_TASK_CREATE",
    WORKFLOW_BOARD_EDIT = "WORKFLOW_BOARD_EDIT",
    WORKFLOW_BOARD_ACCESS = "WORKFLOW_BOARD_ACCESS",
    // Channels
    CHANNEL_CREATE = "CHANNEL_CREATE",
    CHANNEL_INVITE = "CHANNEL_INVITE",
    // Dashboard / analytics
    DASHBOARD_ANALYTICS = "DASHBOARD_ANALYTICS",
    VIEW_TEAM_ACTIVITY = "VIEW_TEAM_ACTIVITY",
    VIEW_TEAM_ANALYTICS = "VIEW_TEAM_ANALYTICS",
    VIEW_TEAM_PROGRESS = "VIEW_TEAM_PROGRESS",
    // Broadcast / members
    BROADCAST_SEND = "BROADCAST_SEND",
    BROADCAST_VIEW = "BROADCAST_VIEW",
    MEMBER_MANAGE = "MEMBER_MANAGE",
    ROLE_ASSIGN = "ROLE_ASSIGN",
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

/** Permissions only org creators / super-admins can grant */
export const CREATOR_CONTROLLED_PERMISSIONS = new Set<PermissionKey>([
    PermissionKey.PROJECT_CREATE,
    PermissionKey.MEMBER_MANAGE,
    PermissionKey.ROLE_ASSIGN,
    PermissionKey.WORKFLOW_BOARD_EDIT,
    PermissionKey.DASHBOARD_ANALYTICS,
    PermissionKey.VIEW_TEAM_ANALYTICS,
]);

/** Human-readable labels for UI */
export const PERMISSION_LABELS: Record<PermissionKey, string> = {
    [PermissionKey.PROJECT_CREATE]: "Create projects",
    [PermissionKey.TASK_CREATE]: "Create tasks",
    [PermissionKey.MEETING_SCHEDULE]: "Schedule meetings",
    [PermissionKey.WORKFLOW_TASK_CREATE]: "Create workflow tasks",
    [PermissionKey.WORKFLOW_BOARD_EDIT]: "Edit workflow boards",
    [PermissionKey.WORKFLOW_BOARD_ACCESS]: "Access workflow boards",
    [PermissionKey.CHANNEL_CREATE]: "Create channels",
    [PermissionKey.CHANNEL_INVITE]: "Invite to channels",
    [PermissionKey.DASHBOARD_ANALYTICS]: "Dashboard analytics",
    [PermissionKey.VIEW_TEAM_ACTIVITY]: "View team activity",
    [PermissionKey.VIEW_TEAM_ANALYTICS]: "View team analytics",
    [PermissionKey.VIEW_TEAM_PROGRESS]: "View team progress",
    [PermissionKey.BROADCAST_SEND]: "Send broadcast",
    [PermissionKey.BROADCAST_VIEW]: "View broadcast",
    [PermissionKey.MEMBER_MANAGE]: "Manage members",
    [PermissionKey.ROLE_ASSIGN]: "Assign permissions",
};

export const DEFAULT_ROLE_PERMISSIONS: Record<AccessRole, PermissionKey[]> = {
    [ROLE.SUDO_ADMIN]: Object.values(PermissionKey),
    [ROLE.SUPER_ADMIN]: Object.values(PermissionKey),
    [ROLE.ADMIN]: [
        PermissionKey.PROJECT_CREATE,
        PermissionKey.TASK_CREATE,
        PermissionKey.MEETING_SCHEDULE,
        PermissionKey.WORKFLOW_TASK_CREATE,
        PermissionKey.WORKFLOW_BOARD_EDIT,
        PermissionKey.WORKFLOW_BOARD_ACCESS,
        PermissionKey.CHANNEL_CREATE,
        PermissionKey.CHANNEL_INVITE,
        PermissionKey.DASHBOARD_ANALYTICS,
        PermissionKey.VIEW_TEAM_ACTIVITY,
        PermissionKey.VIEW_TEAM_ANALYTICS,
        PermissionKey.VIEW_TEAM_PROGRESS,
        PermissionKey.BROADCAST_SEND,
        PermissionKey.BROADCAST_VIEW,
        PermissionKey.MEMBER_MANAGE,
        PermissionKey.ROLE_ASSIGN,
    ],
    [ROLE.DEPARTMENT_HEAD]: [
        PermissionKey.TASK_CREATE,
        PermissionKey.MEETING_SCHEDULE,
        PermissionKey.WORKFLOW_TASK_CREATE,
        PermissionKey.WORKFLOW_BOARD_ACCESS,
        PermissionKey.CHANNEL_CREATE,
        PermissionKey.CHANNEL_INVITE,
        PermissionKey.VIEW_TEAM_ACTIVITY,
        PermissionKey.VIEW_TEAM_PROGRESS,
        PermissionKey.BROADCAST_VIEW,
        PermissionKey.DASHBOARD_ANALYTICS,
    ],
    [ROLE.MANAGER]: [
        PermissionKey.TASK_CREATE,
        PermissionKey.MEETING_SCHEDULE,
        PermissionKey.WORKFLOW_TASK_CREATE,
        PermissionKey.WORKFLOW_BOARD_ACCESS,
        PermissionKey.CHANNEL_INVITE,
        PermissionKey.VIEW_TEAM_ACTIVITY,
        PermissionKey.BROADCAST_VIEW,
    ],
    [ROLE.MEMBER]: [
        PermissionKey.TASK_CREATE,
        PermissionKey.WORKFLOW_BOARD_ACCESS,
        PermissionKey.BROADCAST_VIEW,
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
