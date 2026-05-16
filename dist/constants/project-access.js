"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ALL_PROJECT_PERMISSIONS = exports.ProjectPermissionKey = void 0;
var ProjectPermissionKey;
(function (ProjectPermissionKey) {
    ProjectPermissionKey["PROJECT_VIEW"] = "PROJECT_VIEW";
    ProjectPermissionKey["TASK_CREATE"] = "TASK_CREATE";
    ProjectPermissionKey["TASK_EDIT"] = "TASK_EDIT";
    ProjectPermissionKey["TASK_DELETE"] = "TASK_DELETE";
    ProjectPermissionKey["TASK_MOVE"] = "TASK_MOVE";
    ProjectPermissionKey["TASK_ASSIGN"] = "TASK_ASSIGN";
    ProjectPermissionKey["PROJECT_MEMBER_MANAGE"] = "PROJECT_MEMBER_MANAGE";
    ProjectPermissionKey["PROJECT_SETTINGS_MANAGE"] = "PROJECT_SETTINGS_MANAGE";
    ProjectPermissionKey["PROJECT_ARCHIVE"] = "PROJECT_ARCHIVE";
    ProjectPermissionKey["PROJECT_DELETE"] = "PROJECT_DELETE";
})(ProjectPermissionKey || (exports.ProjectPermissionKey = ProjectPermissionKey = {}));
exports.ALL_PROJECT_PERMISSIONS = Object.values(ProjectPermissionKey);
