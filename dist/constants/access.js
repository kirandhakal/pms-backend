"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ROLE_PERMISSIONS = exports.PERMISSION_LABELS = exports.CREATOR_CONTROLLED_PERMISSIONS = exports.ROLE_LEVEL = exports.PermissionKey = void 0;
exports.normalizeRole = normalizeRole;
exports.hasMinimumRole = hasMinimumRole;
const ROLE = {
    SUDO_ADMIN: "SUDO_ADMIN",
    SUPER_ADMIN: "SUPER_ADMIN",
    ADMIN: "ADMIN",
    DEPARTMENT_HEAD: "DEPARTMENT_HEAD",
    MANAGER: "MANAGER",
    MEMBER: "MEMBER",
    GUEST: "GUEST"
};
var PermissionKey;
(function (PermissionKey) {
    // Projects
    PermissionKey["PROJECT_CREATE"] = "PROJECT_CREATE";
    // Tasks
    PermissionKey["TASK_CREATE"] = "TASK_CREATE";
    // Meetings
    PermissionKey["MEETING_SCHEDULE"] = "MEETING_SCHEDULE";
    // Workflow (separate from kanban)
    PermissionKey["WORKFLOW_TASK_CREATE"] = "WORKFLOW_TASK_CREATE";
    PermissionKey["WORKFLOW_BOARD_EDIT"] = "WORKFLOW_BOARD_EDIT";
    PermissionKey["WORKFLOW_BOARD_ACCESS"] = "WORKFLOW_BOARD_ACCESS";
    // Channels
    PermissionKey["CHANNEL_CREATE"] = "CHANNEL_CREATE";
    PermissionKey["CHANNEL_INVITE"] = "CHANNEL_INVITE";
    // Dashboard / analytics
    PermissionKey["DASHBOARD_ANALYTICS"] = "DASHBOARD_ANALYTICS";
    PermissionKey["VIEW_TEAM_ACTIVITY"] = "VIEW_TEAM_ACTIVITY";
    PermissionKey["VIEW_TEAM_ANALYTICS"] = "VIEW_TEAM_ANALYTICS";
    PermissionKey["VIEW_TEAM_PROGRESS"] = "VIEW_TEAM_PROGRESS";
    // Broadcast / members
    PermissionKey["BROADCAST_SEND"] = "BROADCAST_SEND";
    PermissionKey["BROADCAST_VIEW"] = "BROADCAST_VIEW";
    PermissionKey["MEMBER_MANAGE"] = "MEMBER_MANAGE";
    PermissionKey["ROLE_ASSIGN"] = "ROLE_ASSIGN";
})(PermissionKey || (exports.PermissionKey = PermissionKey = {}));
const LEGACY_ROLE_ALIAS = {
    SuperAdmin: ROLE.SUPER_ADMIN,
    ProjectManager: ROLE.MANAGER,
    TeamMember: ROLE.MEMBER
};
exports.ROLE_LEVEL = {
    [ROLE.SUDO_ADMIN]: 0,
    [ROLE.SUPER_ADMIN]: 1,
    [ROLE.ADMIN]: 2,
    [ROLE.DEPARTMENT_HEAD]: 3,
    [ROLE.MANAGER]: 4,
    [ROLE.MEMBER]: 5,
    [ROLE.GUEST]: 6
};
/** Permissions only org creators / super-admins can grant */
exports.CREATOR_CONTROLLED_PERMISSIONS = new Set([
    PermissionKey.PROJECT_CREATE,
    PermissionKey.MEMBER_MANAGE,
    PermissionKey.ROLE_ASSIGN,
    PermissionKey.WORKFLOW_BOARD_EDIT,
    PermissionKey.DASHBOARD_ANALYTICS,
    PermissionKey.VIEW_TEAM_ANALYTICS,
]);
/** Human-readable labels for UI */
exports.PERMISSION_LABELS = {
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
exports.DEFAULT_ROLE_PERMISSIONS = {
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
function normalizeRole(input) {
    if (!input) {
        return ROLE.GUEST;
    }
    if (Object.values(ROLE).includes(input)) {
        return input;
    }
    if (LEGACY_ROLE_ALIAS[input]) {
        return LEGACY_ROLE_ALIAS[input];
    }
    return ROLE.GUEST;
}
function hasMinimumRole(inputRole, minimumRole) {
    const normalized = normalizeRole(inputRole);
    return exports.ROLE_LEVEL[normalized] <= exports.ROLE_LEVEL[minimumRole];
}
