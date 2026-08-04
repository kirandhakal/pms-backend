"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const data_source_1 = require("../config/data-source");
const Project_1 = require("../entities/Project");
const ProjectMember_1 = require("../entities/ProjectMember");
const Task_1 = require("../entities/Task");
const User_1 = require("../entities/User");
const Team_1 = require("../entities/Team");
const WorkflowEngine_1 = require("./WorkflowEngine");
const organization_bridge_1 = require("../utils/organization-bridge");
const errorHandler_1 = require("../middlewares/errorHandler");
const workflow_stages_1 = require("../constants/workflow-stages");
class ProjectService {
    constructor() {
        this.projectRepo = data_source_1.AppDataSource.getRepository(Project_1.Project);
        this.taskRepo = data_source_1.AppDataSource.getRepository(Task_1.Task);
        this.userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
        this.teamRepo = data_source_1.AppDataSource.getRepository(Team_1.Team);
        this.memberRepo = data_source_1.AppDataSource.getRepository(ProjectMember_1.ProjectMember);
    }
    resolveProjectRole(user, project) {
        if (user.legacyRole === User_1.UserRole.SUPER_ADMIN || user.legacyRole === User_1.UserRole.SUDO_ADMIN) {
            return "ORG_CREATOR";
        }
        if (project.managerId === user.id) {
            return "PROJECT_MANAGER";
        }
        if (project.teamLeadId === user.id) {
            return "TEAM_LEAD";
        }
        return workflow_stages_1.PROJECT_ROLE.MEMBER;
    }
    async createProject(actorId, data) {
        const actor = await this.userRepo.findOne({
            where: { id: actorId },
            relations: ["team"],
        });
        if (!actor?.team?.id) {
            throw new errorHandler_1.ApiError("You must belong to an organization to create projects", 403);
        }
        const team = await this.teamRepo.findOne({ where: { id: actor.team.id } });
        if (!team) {
            throw new errorHandler_1.ApiError("Organization not found", 404);
        }
        const organizationId = await (0, organization_bridge_1.ensureOrganizationForTeam)(team);
        const workflow = await WorkflowEngine_1.workflowEngine.createProjectWorkflow(data.name, organizationId, actorId);
        const project = this.projectRepo.create({
            name: data.name.trim(),
            description: data.description,
            color: data.color,
            manager: actor,
            managerId: actorId,
            teamLeadId: data.teamLeadId,
            team,
            teamId: team.id,
            workflow,
            workflowId: workflow.id,
            startDate: data.startDate ? new Date(data.startDate) : undefined,
            endDate: data.endDate ? new Date(data.endDate) : undefined,
            status: Project_1.ProjectStatus.ACTIVE,
        });
        const savedProject = await this.projectRepo.save(project);
        const memberRows = [
            this.memberRepo.create({
                projectId: savedProject.id,
                userId: actorId,
                role: ProjectMember_1.ProjectMemberRole.PROJECT_MANAGER,
            }),
        ];
        if (data.teamLeadId) {
            memberRows.push(this.memberRepo.create({
                projectId: savedProject.id,
                userId: data.teamLeadId,
                role: ProjectMember_1.ProjectMemberRole.TEAM_LEAD,
            }));
        }
        if (data.memberIds?.length) {
            for (const memberId of data.memberIds) {
                if (memberId === actorId || memberId === data.teamLeadId)
                    continue;
                memberRows.push(this.memberRepo.create({
                    projectId: savedProject.id,
                    userId: memberId,
                    role: ProjectMember_1.ProjectMemberRole.MEMBER,
                }));
            }
        }
        await this.memberRepo.save(memberRows);
        return this.getProjectById(savedProject.id);
    }
    async getProjectById(projectId) {
        return this.projectRepo.findOne({
            where: { id: projectId },
            relations: ["manager", "teamLead", "team", "workflow", "workflow.stages", "members", "members.user"],
        });
    }
    async getProjects(userId) {
        const query = this.projectRepo
            .createQueryBuilder("project")
            .leftJoinAndSelect("project.manager", "manager")
            .leftJoinAndSelect("project.teamLead", "teamLead")
            .leftJoinAndSelect("project.team", "team")
            .leftJoinAndSelect("project.workflow", "workflow")
            .leftJoinAndSelect("workflow.stages", "stages")
            .leftJoinAndSelect("project.members", "members")
            .leftJoinAndSelect("members.user", "memberUser")
            .orderBy("project.createdAt", "DESC")
            .addOrderBy("stages.order", "ASC");
        if (userId) {
            const actor = await this.userRepo.findOne({
                where: { id: userId },
                relations: ["team"],
            });
            if (actor?.team?.id) {
                query.where("project.teamId = :teamId", { teamId: actor.team.id });
            }
        }
        return query.getMany();
    }
    async getProjectWorkflowForUser(projectId, userId) {
        const project = await this.getProjectById(projectId);
        if (!project?.workflowId) {
            throw new errorHandler_1.ApiError("Project workflow not found", 404);
        }
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new errorHandler_1.ApiError("User not found", 404);
        }
        const member = project.members?.find((m) => m.userId === userId);
        let viewerRole = this.resolveProjectRole(user, project);
        if (member) {
            const roleMap = {
                [ProjectMember_1.ProjectMemberRole.PROJECT_MANAGER]: "PROJECT_MANAGER",
                [ProjectMember_1.ProjectMemberRole.TEAM_LEAD]: "TEAM_LEAD",
                [ProjectMember_1.ProjectMemberRole.FRONTEND]: "FRONTEND",
                [ProjectMember_1.ProjectMemberRole.BACKEND]: "BACKEND",
                [ProjectMember_1.ProjectMemberRole.TESTER]: "TESTER",
                [ProjectMember_1.ProjectMemberRole.DEVOPS]: "DEVOPS",
                [ProjectMember_1.ProjectMemberRole.MEMBER]: "MEMBER",
            };
            viewerRole = roleMap[member.role] || viewerRole;
        }
        // Elevated roles (org creator / PM / team lead) see all stages
        const isElevated = viewerRole === "ORG_CREATOR" ||
            viewerRole === "PROJECT_MANAGER" ||
            viewerRole === "TEAM_LEAD";
        // New per-stage visibility (TEAM_ONLY | PROJECT_WIDE + stage members)
        let visibleStages = await WorkflowEngine_1.workflowEngine.getVisibleStagesForUser(project.workflowId, userId, isElevated);
        // Also apply legacy role-category visibility for non-elevated viewers
        if (!isElevated) {
            visibleStages = visibleStages.filter((stage) => (0, workflow_stages_1.canViewStage)({ category: stage.settings?.category, settings: stage.settings }, viewerRole));
        }
        return {
            project,
            viewerRole,
            workflow: {
                ...project.workflow,
                stages: visibleStages,
            },
        };
    }
    async addProjectMember(actorId, projectId, userId, role = ProjectMember_1.ProjectMemberRole.MEMBER) {
        const project = await this.getProjectById(projectId);
        if (!project) {
            throw new errorHandler_1.ApiError("Project not found", 404);
        }
        if (project.managerId !== actorId) {
            throw new errorHandler_1.ApiError("Only project manager can add members", 403);
        }
        const existing = await this.memberRepo.findOne({ where: { projectId, userId } });
        if (existing) {
            existing.role = role;
            return this.memberRepo.save(existing);
        }
        const member = this.memberRepo.create({ projectId, userId, role });
        return this.memberRepo.save(member);
    }
    async getProjectMetrics(projectId) {
        const tasks = await this.taskRepo.find({ where: { project: { id: projectId } } });
        if (tasks.length === 0)
            return { completionPercentage: 0, totalTasks: 0, doneTasks: 0 };
        const doneTasks = tasks.filter((t) => t.status === Task_1.TaskStatus.DONE).length;
        const progress = Math.round((doneTasks / tasks.length) * 100);
        return {
            projectId,
            completionPercentage: progress,
            totalTasks: tasks.length,
            doneTasks,
        };
    }
    async getAdminDashboardMetrics() {
        const projects = await this.projectRepo.find({ relations: ["tasks"] });
        return projects.map((project) => {
            const totalTasks = project.tasks.length;
            const doneTasks = project.tasks.filter((t) => t.status === Task_1.TaskStatus.DONE).length;
            const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
            return {
                id: project.id,
                name: project.name,
                progress: `${progress}%`,
                status: progress === 100 ? "Completed" : "In Progress",
            };
        });
    }
}
exports.ProjectService = ProjectService;
