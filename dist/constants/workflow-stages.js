"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PROJECT_WORKFLOW_STAGES = exports.ELEVATED_PROJECT_ROLES = exports.PROJECT_ROLE = void 0;
exports.canViewStage = canViewStage;
exports.canDragStage = canDragStage;
exports.PROJECT_ROLE = {
    ORG_CREATOR: "ORG_CREATOR",
    PROJECT_MANAGER: "PROJECT_MANAGER",
    TEAM_LEAD: "TEAM_LEAD",
    FRONTEND: "FRONTEND",
    BACKEND: "BACKEND",
    TESTER: "TESTER",
    DEVOPS: "DEVOPS",
    PM: "PM",
    MEMBER: "MEMBER",
};
exports.ELEVATED_PROJECT_ROLES = [
    exports.PROJECT_ROLE.ORG_CREATOR,
    exports.PROJECT_ROLE.PROJECT_MANAGER,
    exports.PROJECT_ROLE.TEAM_LEAD,
];
exports.PROJECT_WORKFLOW_STAGES = [
    {
        name: "Backlog",
        order: 0,
        color: "#94a3b8",
        isDefault: true,
        isFinal: false,
        category: "backlog",
        assignedRole: exports.PROJECT_ROLE.PM,
        visibleToRoles: [...exports.ELEVATED_PROJECT_ROLES, exports.PROJECT_ROLE.PM],
    },
    {
        name: "Development Pending",
        order: 1,
        color: "#3b82f6",
        isDefault: false,
        isFinal: false,
        category: "development",
        assignedRole: exports.PROJECT_ROLE.FRONTEND,
        visibleToRoles: [...exports.ELEVATED_PROJECT_ROLES, exports.PROJECT_ROLE.FRONTEND, exports.PROJECT_ROLE.BACKEND],
    },
    {
        name: "Development In Progress",
        order: 2,
        color: "#2563eb",
        isDefault: false,
        isFinal: false,
        category: "development",
        assignedRole: exports.PROJECT_ROLE.BACKEND,
        visibleToRoles: [...exports.ELEVATED_PROJECT_ROLES, exports.PROJECT_ROLE.FRONTEND, exports.PROJECT_ROLE.BACKEND],
    },
    {
        name: "Development Done",
        order: 3,
        color: "#1d4ed8",
        isDefault: false,
        isFinal: false,
        category: "development",
        assignedRole: exports.PROJECT_ROLE.BACKEND,
        visibleToRoles: [...exports.ELEVATED_PROJECT_ROLES, exports.PROJECT_ROLE.FRONTEND, exports.PROJECT_ROLE.BACKEND],
    },
    {
        name: "Testing",
        order: 4,
        color: "#f59e0b",
        isDefault: false,
        isFinal: false,
        category: "testing",
        assignedRole: exports.PROJECT_ROLE.TESTER,
        visibleToRoles: [...exports.ELEVATED_PROJECT_ROLES, exports.PROJECT_ROLE.TESTER],
    },
    {
        name: "DevOps",
        order: 5,
        color: "#8b5cf6",
        isDefault: false,
        isFinal: false,
        category: "devops",
        assignedRole: exports.PROJECT_ROLE.DEVOPS,
        visibleToRoles: [...exports.ELEVATED_PROJECT_ROLES, exports.PROJECT_ROLE.DEVOPS],
    },
    {
        name: "Done",
        order: 6,
        color: "#22c55e",
        isDefault: false,
        isFinal: true,
        category: "done",
        assignedRole: exports.PROJECT_ROLE.TEAM_LEAD,
        visibleToRoles: Object.values(exports.PROJECT_ROLE),
    },
];
function canViewStage(stage, viewerRole) {
    if (exports.ELEVATED_PROJECT_ROLES.includes(viewerRole)) {
        return true;
    }
    const category = stage.settings?.category || stage.category;
    const visibleToRoles = stage.settings?.visibleToRoles;
    if (visibleToRoles?.includes(viewerRole)) {
        return true;
    }
    if (viewerRole === exports.PROJECT_ROLE.MEMBER && category === "development") {
        return true;
    }
    return false;
}
/** Dev/Frontend/Backend can only drag development stages; Tester → testing; etc. */
function canDragStage(stage, actorRole) {
    if (exports.ELEVATED_PROJECT_ROLES.includes(actorRole)) {
        return true;
    }
    const category = stage.settings?.category || stage.category;
    const assignedRole = stage.settings?.assignedRole || stage.assignedRole;
    const roleCategory = {
        [exports.PROJECT_ROLE.FRONTEND]: "development",
        [exports.PROJECT_ROLE.BACKEND]: "development",
        [exports.PROJECT_ROLE.MEMBER]: "development",
        [exports.PROJECT_ROLE.TESTER]: "testing",
        [exports.PROJECT_ROLE.DEVOPS]: "devops",
        [exports.PROJECT_ROLE.PM]: "backlog",
    };
    if (assignedRole && assignedRole === actorRole) {
        return true;
    }
    return roleCategory[actorRole] !== undefined && roleCategory[actorRole] === category;
}
