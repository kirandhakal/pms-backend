import { AppDataSource } from "../config/data-source";
import { Project, ProjectStatus } from "../entities/Project";
import { ProjectMember, ProjectMemberRole } from "../entities/ProjectMember";
import { Task, TaskStatus } from "../entities/Task";
import { User, UserRole } from "../entities/User";
import { Team } from "../entities/Team";
import { workflowEngine } from "./WorkflowEngine";
import { ensureOrganizationForTeam } from "../utils/organization-bridge";
import { ApiError } from "../middlewares/errorHandler";
import { ProjectRole, PROJECT_ROLE, canViewStage } from "../constants/workflow-stages";

export interface CreateProjectDTO {
    name: string;
    description?: string;
    color?: string;
    startDate?: string;
    endDate?: string;
    teamLeadId?: string;
    memberIds?: string[];
}

export class ProjectService {
    private projectRepo = AppDataSource.getRepository(Project);
    private taskRepo = AppDataSource.getRepository(Task);
    private userRepo = AppDataSource.getRepository(User);
    private teamRepo = AppDataSource.getRepository(Team);
    private memberRepo = AppDataSource.getRepository(ProjectMember);

    private resolveProjectRole(user: User, project: Project): ProjectRole {
        if (user.legacyRole === UserRole.SUPER_ADMIN || user.legacyRole === UserRole.SUDO_ADMIN) {
            return "ORG_CREATOR";
        }
        if (project.managerId === user.id) {
            return "PROJECT_MANAGER";
        }
        if (project.teamLeadId === user.id) {
            return "TEAM_LEAD";
        }
        return PROJECT_ROLE.MEMBER;
    }

    async createProject(actorId: string, data: CreateProjectDTO) {
        const actor = await this.userRepo.findOne({
            where: { id: actorId },
            relations: ["team"],
        });
        if (!actor?.team?.id) {
            throw new ApiError("You must belong to an organization to create projects", 403);
        }

        const team = await this.teamRepo.findOne({ where: { id: actor.team.id } });
        if (!team) {
            throw new ApiError("Organization not found", 404);
        }

        const organizationId = await ensureOrganizationForTeam(team);

        const workflow = await workflowEngine.createProjectWorkflow(
            data.name,
            organizationId,
            actorId
        );

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
            status: ProjectStatus.ACTIVE,
        });

        const savedProject = await this.projectRepo.save(project);

        const memberRows: ProjectMember[] = [
            this.memberRepo.create({
                projectId: savedProject.id,
                userId: actorId,
                role: ProjectMemberRole.PROJECT_MANAGER,
            }),
        ];

        if (data.teamLeadId) {
            memberRows.push(
                this.memberRepo.create({
                    projectId: savedProject.id,
                    userId: data.teamLeadId,
                    role: ProjectMemberRole.TEAM_LEAD,
                })
            );
        }

        if (data.memberIds?.length) {
            for (const memberId of data.memberIds) {
                if (memberId === actorId || memberId === data.teamLeadId) continue;
                memberRows.push(
                    this.memberRepo.create({
                        projectId: savedProject.id,
                        userId: memberId,
                        role: ProjectMemberRole.MEMBER,
                    })
                );
            }
        }

        await this.memberRepo.save(memberRows);

        return this.getProjectById(savedProject.id);
    }

    async getProjectById(projectId: string) {
        return this.projectRepo.findOne({
            where: { id: projectId },
            relations: ["manager", "teamLead", "team", "workflow", "workflow.stages", "members", "members.user"],
        });
    }

    async getProjects(userId?: string) {
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

    async getProjectWorkflowForUser(projectId: string, userId: string) {
        const project = await this.getProjectById(projectId);
        if (!project?.workflowId) {
            throw new ApiError("Project workflow not found", 404);
        }

        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) {
            throw new ApiError("User not found", 404);
        }

        const member = project.members?.find((m) => m.userId === userId);
        let viewerRole: ProjectRole = this.resolveProjectRole(user, project);

        if (member) {
            const roleMap: Record<ProjectMemberRole, ProjectRole> = {
                [ProjectMemberRole.PROJECT_MANAGER]: "PROJECT_MANAGER",
                [ProjectMemberRole.TEAM_LEAD]: "TEAM_LEAD",
                [ProjectMemberRole.FRONTEND]: "FRONTEND",
                [ProjectMemberRole.BACKEND]: "BACKEND",
                [ProjectMemberRole.TESTER]: "TESTER",
                [ProjectMemberRole.DEVOPS]: "DEVOPS",
                [ProjectMemberRole.MEMBER]: "MEMBER",
            };
            viewerRole = roleMap[member.role] || viewerRole;
        }

        // Elevated roles (org creator / PM / team lead) see all stages
        const isElevated =
            viewerRole === "ORG_CREATOR" ||
            viewerRole === "PROJECT_MANAGER" ||
            viewerRole === "TEAM_LEAD";

        // New per-stage visibility (TEAM_ONLY | PROJECT_WIDE + stage members)
        let visibleStages = await workflowEngine.getVisibleStagesForUser(
            project.workflowId,
            userId,
            isElevated
        );

        // Also apply legacy role-category visibility for non-elevated viewers
        if (!isElevated) {
            visibleStages = visibleStages.filter((stage) =>
                canViewStage(
                    { category: stage.settings?.category, settings: stage.settings },
                    viewerRole
                )
            );
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

    async addProjectMember(
        actorId: string,
        projectId: string,
        userId: string,
        role: ProjectMemberRole = ProjectMemberRole.MEMBER
    ) {
        const project = await this.getProjectById(projectId);
        if (!project) {
            throw new ApiError("Project not found", 404);
        }
        if (project.managerId !== actorId) {
            throw new ApiError("Only project manager can add members", 403);
        }

        const existing = await this.memberRepo.findOne({ where: { projectId, userId } });
        if (existing) {
            existing.role = role;
            return this.memberRepo.save(existing);
        }

        const member = this.memberRepo.create({ projectId, userId, role });
        return this.memberRepo.save(member);
    }

    async getProjectMetrics(projectId: string) {
        const tasks = await this.taskRepo.find({ where: { project: { id: projectId } } });
        if (tasks.length === 0) return { completionPercentage: 0, totalTasks: 0, doneTasks: 0 };

        const doneTasks = tasks.filter((t) => t.status === TaskStatus.DONE).length;
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
            const doneTasks = project.tasks.filter((t) => t.status === TaskStatus.DONE).length;
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
