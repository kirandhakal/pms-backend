import type { StageSettings } from "../entities/WorkflowStage";

export const PROJECT_ROLE = {
    ORG_CREATOR: "ORG_CREATOR",
    PROJECT_MANAGER: "PROJECT_MANAGER",
    TEAM_LEAD: "TEAM_LEAD",
    FRONTEND: "FRONTEND",
    BACKEND: "BACKEND",
    TESTER: "TESTER",
    DEVOPS: "DEVOPS",
    PM: "PM",
    MEMBER: "MEMBER",
} as const;

export type ProjectRole = (typeof PROJECT_ROLE)[keyof typeof PROJECT_ROLE];

export const ELEVATED_PROJECT_ROLES: ProjectRole[] = [
    PROJECT_ROLE.ORG_CREATOR,
    PROJECT_ROLE.PROJECT_MANAGER,
    PROJECT_ROLE.TEAM_LEAD,
];

export interface ProjectWorkflowStageTemplate {
    name: string;
    order: number;
    color: string;
    isDefault: boolean;
    isFinal: boolean;
    category: string;
    assignedRole: ProjectRole;
    visibleToRoles: ProjectRole[];
    settings?: StageSettings;
}

export const PROJECT_WORKFLOW_STAGES: ProjectWorkflowStageTemplate[] = [
    {
        name: "Backlog",
        order: 0,
        color: "#94a3b8",
        isDefault: true,
        isFinal: false,
        category: "backlog",
        assignedRole: PROJECT_ROLE.PM,
        visibleToRoles: [...ELEVATED_PROJECT_ROLES, PROJECT_ROLE.PM],
    },
    {
        name: "Development Pending",
        order: 1,
        color: "#3b82f6",
        isDefault: false,
        isFinal: false,
        category: "development",
        assignedRole: PROJECT_ROLE.FRONTEND,
        visibleToRoles: [...ELEVATED_PROJECT_ROLES, PROJECT_ROLE.FRONTEND, PROJECT_ROLE.BACKEND],
    },
    {
        name: "Development In Progress",
        order: 2,
        color: "#2563eb",
        isDefault: false,
        isFinal: false,
        category: "development",
        assignedRole: PROJECT_ROLE.BACKEND,
        visibleToRoles: [...ELEVATED_PROJECT_ROLES, PROJECT_ROLE.FRONTEND, PROJECT_ROLE.BACKEND],
    },
    {
        name: "Development Done",
        order: 3,
        color: "#1d4ed8",
        isDefault: false,
        isFinal: false,
        category: "development",
        assignedRole: PROJECT_ROLE.BACKEND,
        visibleToRoles: [...ELEVATED_PROJECT_ROLES, PROJECT_ROLE.FRONTEND, PROJECT_ROLE.BACKEND],
    },
    {
        name: "Testing",
        order: 4,
        color: "#f59e0b",
        isDefault: false,
        isFinal: false,
        category: "testing",
        assignedRole: PROJECT_ROLE.TESTER,
        visibleToRoles: [...ELEVATED_PROJECT_ROLES, PROJECT_ROLE.TESTER],
    },
    {
        name: "DevOps",
        order: 5,
        color: "#8b5cf6",
        isDefault: false,
        isFinal: false,
        category: "devops",
        assignedRole: PROJECT_ROLE.DEVOPS,
        visibleToRoles: [...ELEVATED_PROJECT_ROLES, PROJECT_ROLE.DEVOPS],
    },
    {
        name: "Done",
        order: 6,
        color: "#22c55e",
        isDefault: false,
        isFinal: true,
        category: "done",
        assignedRole: PROJECT_ROLE.TEAM_LEAD,
        visibleToRoles: Object.values(PROJECT_ROLE),
    },
];

export function canViewStage(
    stage: { category?: string; settings?: StageSettings },
    viewerRole: ProjectRole
): boolean {
    if (ELEVATED_PROJECT_ROLES.includes(viewerRole)) {
        return true;
    }

    const category = stage.settings?.category || stage.category;
    const visibleToRoles = stage.settings?.visibleToRoles as ProjectRole[] | undefined;

    if (visibleToRoles?.includes(viewerRole)) {
        return true;
    }

    if (viewerRole === PROJECT_ROLE.MEMBER && category === "development") {
        return true;
    }

    return false;
}

/** Dev/Frontend/Backend can only drag development stages; Tester → testing; etc. */
export function canDragStage(
    stage: { category?: string; settings?: StageSettings; assignedRole?: ProjectRole },
    actorRole: ProjectRole
): boolean {
    if (ELEVATED_PROJECT_ROLES.includes(actorRole)) {
        return true;
    }

    const category = stage.settings?.category || stage.category;
    const assignedRole =
        (stage.settings?.assignedRole as ProjectRole | undefined) || stage.assignedRole;

    const roleCategory: Partial<Record<ProjectRole, string>> = {
        [PROJECT_ROLE.FRONTEND]: "development",
        [PROJECT_ROLE.BACKEND]: "development",
        [PROJECT_ROLE.MEMBER]: "development",
        [PROJECT_ROLE.TESTER]: "testing",
        [PROJECT_ROLE.DEVOPS]: "devops",
        [PROJECT_ROLE.PM]: "backlog",
    };

    if (assignedRole && assignedRole === actorRole) {
        return true;
    }

    return roleCategory[actorRole] !== undefined && roleCategory[actorRole] === category;
}
