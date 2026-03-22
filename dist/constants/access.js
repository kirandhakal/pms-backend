"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_ROLE_PERMISSIONS = exports.CREATOR_CONTROLLED_PERMISSIONS = exports.ROLE_LEVEL = exports.PermissionKey = void 0;
exports.normalizeRole = normalizeRole;
exports.hasMinimumRole = hasMinimumRole;
const User_1 = require("../entities/User");
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
    SuperAdmin: User_1.UserRole.SUPER_ADMIN,
    ProjectManager: User_1.UserRole.MANAGER,
    TeamMember: User_1.UserRole.MEMBER
};
exports.ROLE_LEVEL = {
    [User_1.UserRole.SUDO_ADMIN]: 0,
    [User_1.UserRole.SUPER_ADMIN]: 1,
    [User_1.UserRole.ADMIN]: 2,
    [User_1.UserRole.DEPARTMENT_HEAD]: 3,
    [User_1.UserRole.MANAGER]: 4,
    [User_1.UserRole.MEMBER]: 5,
    [User_1.UserRole.GUEST]: 6
};
exports.CREATOR_CONTROLLED_PERMISSIONS = new Set([
    PermissionKey.PROJECT_CREATE,
    PermissionKey.VIEW_TEAM_ACTIVITY,
    PermissionKey.VIEW_TEAM_ANALYTICS,
    PermissionKey.VIEW_TEAM_PROGRESS,
    PermissionKey.ROLE_ASSIGN
]);
exports.DEFAULT_ROLE_PERMISSIONS = {
    [User_1.UserRole.SUDO_ADMIN]: [
        PermissionKey.PROJECT_CREATE,
        PermissionKey.VIEW_TEAM_ACTIVITY,
        PermissionKey.VIEW_TEAM_ANALYTICS,
        PermissionKey.VIEW_TEAM_PROGRESS,
        PermissionKey.BROADCAST_SEND,
        PermissionKey.BROADCAST_VIEW,
        PermissionKey.MEMBER_MANAGE,
        PermissionKey.ROLE_ASSIGN
    ],
    [User_1.UserRole.SUPER_ADMIN]: [
        PermissionKey.PROJECT_CREATE,
        PermissionKey.VIEW_TEAM_ACTIVITY,
        PermissionKey.VIEW_TEAM_ANALYTICS,
        PermissionKey.VIEW_TEAM_PROGRESS,
        PermissionKey.BROADCAST_SEND,
        PermissionKey.BROADCAST_VIEW,
        PermissionKey.MEMBER_MANAGE,
        PermissionKey.ROLE_ASSIGN
    ],
    [User_1.UserRole.ADMIN]: [
        PermissionKey.BROADCAST_SEND,
        PermissionKey.BROADCAST_VIEW,
        PermissionKey.MEMBER_MANAGE,
        PermissionKey.VIEW_TEAM_ACTIVITY,
        PermissionKey.VIEW_TEAM_PROGRESS
    ],
    [User_1.UserRole.DEPARTMENT_HEAD]: [
        PermissionKey.BROADCAST_VIEW,
        PermissionKey.VIEW_TEAM_ACTIVITY,
        PermissionKey.VIEW_TEAM_PROGRESS
    ],
    [User_1.UserRole.MANAGER]: [
        PermissionKey.BROADCAST_VIEW,
        PermissionKey.VIEW_TEAM_ACTIVITY
    ],
    [User_1.UserRole.MEMBER]: [
        PermissionKey.BROADCAST_VIEW
    ],
    [User_1.UserRole.GUEST]: []
};
function normalizeRole(input) {
    if (!input) {
        return User_1.UserRole.GUEST;
    }
    if (Object.values(User_1.UserRole).includes(input)) {
        return input;
    }
    if (LEGACY_ROLE_ALIAS[input]) {
        return LEGACY_ROLE_ALIAS[input];
    }
    return User_1.UserRole.GUEST;
}
function hasMinimumRole(inputRole, minimumRole) {
    const normalized = normalizeRole(inputRole);
    return exports.ROLE_LEVEL[normalized] <= exports.ROLE_LEVEL[minimumRole];
}
