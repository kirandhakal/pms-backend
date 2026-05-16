"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ROLE_PERMISSIONS = exports.CREATOR_CONTROLLED_PERMISSIONS = exports.ROLE_LEVEL = exports.PermissionKey = void 0;
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
    PermissionKey["PROJECT_CREATE"] = "PROJECT_CREATE";
    PermissionKey["VIEW_TEAM_ACTIVITY"] = "VIEW_TEAM_ACTIVITY";
    PermissionKey["VIEW_TEAM_ANALYTICS"] = "VIEW_TEAM_ANALYTICS";
    PermissionKey["VIEW_TEAM_PROGRESS"] = "VIEW_TEAM_PROGRESS";
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
exports.CREATOR_CONTROLLED_PERMISSIONS = new Set([
    PermissionKey.PROJECT_CREATE,
    PermissionKey.VIEW_TEAM_ACTIVITY,
    PermissionKey.VIEW_TEAM_ANALYTICS,
    PermissionKey.VIEW_TEAM_PROGRESS,
    PermissionKey.ROLE_ASSIGN
]);
exports.DEFAULT_ROLE_PERMISSIONS = {
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
