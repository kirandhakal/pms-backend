import { AppDataSource } from "../config/data-source";
import { Project } from "../entities/Project";
import { Task, TaskStatus } from "../entities/Task";
import { User, UserRole } from "../entities/User";
import { PermissionService } from "./PermissionService";
import { PermissionKey } from "../constants/access";
import { Team } from "../entities/Team";
import { ProjectPermission } from "../entities/ProjectPermission";
import { ALL_PROJECT_PERMISSIONS, ProjectPermissionKey } from "../constants/project-access";

type CreateProjectMemberPermission = {
    userId: string;
    permissions: ProjectPermissionKey[];
};

type CreateProjectPayload = {
    name: string;
    description?: string;
    managerId?: string;
    memberPermissions?: CreateProjectMemberPermission[];
    teamId?: string;
};

export class ProjectService {
    private projectRepo = AppDataSource.getRepository(Project);
    private taskRepo = AppDataSource.getRepository(Task);
    private userRepo = AppDataSource.getRepository(User);
    private teamRepo = AppDataSource.getRepository(Team);
    private projectPermissionRepo = AppDataSource.getRepository(ProjectPermission);
    private permissionService = new PermissionService();

    private isOrganizationCreator(actor: User) {
        if (actor.team?.createdBy?.id) {
            return actor.team.createdBy.id === actor.id;
        }

        // Backward compatibility for organizations created before createdBy was persisted.
        return actor.role === UserRole.SUPER_ADMIN || actor.role === UserRole.SUDO_ADMIN;
    }

    private sanitizeProjectPermissions(permissions: ProjectPermissionKey[]) {
        const deduped = Array.from(new Set(permissions || []));
        return deduped.filter((permission) => ALL_PROJECT_PERMISSIONS.includes(permission));
    }

    private async ensureProjectAccessContext(actorId: string, projectId: string) {
        const actor = await this.userRepo.findOne({
            where: { id: actorId },
            relations: ["team", "team.createdBy"]
        });

        if (!actor || !actor.team?.id) {
            throw new Error("Only organization members can access projects");
        }

        const project = await this.projectRepo.findOne({
            where: { id: projectId },
            relations: ["team", "team.createdBy"]
        });

        if (!project || project.team?.id !== actor.team.id) {
            throw new Error("Project not found in your organization");
        }

        return { actor, project };
    }

    private async ensureProjectMemberManager(actorId: string, projectId: string) {
        const { actor, project } = await this.ensureProjectAccessContext(actorId, projectId);

        const isOrganizationCreator = this.isOrganizationCreator(actor);
        if (isOrganizationCreator) {
            return { actor, project };
        }

        const canManageMembers = await this.projectPermissionRepo.findOne({
            where: {
                project: { id: projectId },
                user: { id: actorId },
                permission: ProjectPermissionKey.PROJECT_MEMBER_MANAGE
            }
        });

        if (!canManageMembers) {
            throw new Error("You do not have permission to manage project members");
        }

        return { actor, project };
    }

    private async ensureProjectPermissionReader(actorId: string, projectId: string, memberId: string) {
        const context = await this.ensureProjectAccessContext(actorId, projectId);
        if (actorId === memberId) {
            return context;
        }

        return this.ensureProjectMemberManager(actorId, projectId);
    }

    private async validateProjectMembers(teamId: string, memberPermissions: CreateProjectMemberPermission[]) {
        const uniqueIds = Array.from(new Set(memberPermissions.map((entry) => entry.userId)));
        if (uniqueIds.length === 0) {
            return new Map<string, User>();
        }

        const members = await this.userRepo.find({
            where: uniqueIds.map((id) => ({ id, team: { id: teamId } })),
            relations: ["team"]
        });

        if (members.length !== uniqueIds.length) {
            throw new Error("All project members must belong to your organization");
        }

        return new Map(members.map((member) => [member.id, member]));
    }

    async createProject(actorId: string, data: CreateProjectPayload) {
        const actor = await this.userRepo.findOne({
            where: { id: actorId },
            relations: ["team", "team.createdBy"]
        });

        if (!actor || !actor.team?.id) {
            throw new Error("Only organization members can create projects");
        }

        const isOrganizationCreator = this.isOrganizationCreator(actor);
        if (!isOrganizationCreator) {
            throw new Error("Only the organization creator can create projects");
        }

        const canCreateProject = await this.permissionService.userHasPermission(actor, PermissionKey.PROJECT_CREATE);
        if (!canCreateProject) {
            throw new Error("You do not have permission to create projects in this organization");
        }

        if ((data as any).team?.id && (data as any).team.id !== actor.team.id) {
            throw new Error("You can only create projects in your organization");
        }

        if (data.teamId && data.teamId !== actor.team.id) {
            throw new Error("You can only create projects in your organization");
        }

        const team = await this.teamRepo.findOne({ where: { id: actor.team.id } });
        if (!team) {
            throw new Error("Organization not found");
        }

        const memberPermissions = Array.isArray(data.memberPermissions) ? data.memberPermissions : [];
        const memberMap = await this.validateProjectMembers(actor.team.id, memberPermissions);

        const manager = data.managerId
            ? memberMap.get(data.managerId) || await this.userRepo.findOne({ where: { id: data.managerId, team: { id: actor.team.id } } })
            : undefined;

        if (data.managerId && !manager) {
            throw new Error("Project manager must belong to your organization");
        }

        const project = this.projectRepo.create({
            name: data.name,
            description: data.description,
            team,
            ...(manager ? { manager } : {})
        });

        const savedProject = await this.projectRepo.save(project);

        const permissionRows: ProjectPermission[] = [];

        for (const memberPermission of memberPermissions) {
            const member = memberMap.get(memberPermission.userId);
            if (!member) {
                continue;
            }

            const sanitized = this.sanitizeProjectPermissions(memberPermission.permissions);
            for (const permission of sanitized) {
                permissionRows.push(this.projectPermissionRepo.create({
                    project: savedProject,
                    user: member,
                    grantedBy: actor,
                    permission
                }));
            }
        }

        // Project creator always has full project permissions.
        for (const permission of ALL_PROJECT_PERMISSIONS) {
            permissionRows.push(this.projectPermissionRepo.create({
                project: savedProject,
                user: actor,
                grantedBy: actor,
                permission
            }));
        }

        if (permissionRows.length > 0) {
            await this.projectPermissionRepo.save(permissionRows);
        }

        return await this.projectRepo.findOne({
            where: { id: savedProject.id },
            relations: ["manager", "team", "projectPermissions", "projectPermissions.user"]
        });
    }

    async getProjectMemberPermissions(actorId: string, projectId: string, memberId: string) {
        await this.ensureProjectPermissionReader(actorId, projectId, memberId);

        const member = await this.userRepo.findOne({
            where: { id: memberId },
            relations: ["team"]
        });

        if (!member) {
            throw new Error("Project member not found");
        }

        const project = await this.projectRepo.findOne({
            where: { id: projectId },
            relations: ["team"]
        });

        if (!project || !project.team?.id || member.team?.id !== project.team.id) {
            throw new Error("Project member must belong to the same organization");
        }

        const explicit = await this.projectPermissionRepo.find({
            where: {
                project: { id: projectId },
                user: { id: memberId }
            }
        });

        return {
            projectId,
            memberId,
            explicitPermissions: explicit.map((entry) => entry.permission)
        };
    }

    async setProjectMemberPermissions(actorId: string, projectId: string, memberId: string, permissions: ProjectPermissionKey[]) {
        const { actor, project } = await this.ensureProjectMemberManager(actorId, projectId);

        const member = await this.userRepo.findOne({
            where: { id: memberId },
            relations: ["team"]
        });

        if (!member || member.team?.id !== project.team?.id) {
            throw new Error("Project member must belong to the same organization");
        }

        const validPermissions = this.sanitizeProjectPermissions(permissions || []);

        await this.projectPermissionRepo.delete({
            project: { id: projectId },
            user: { id: memberId }
        });

        if (validPermissions.length > 0) {
            const rows = validPermissions.map((permission) =>
                this.projectPermissionRepo.create({
                    project: { id: projectId } as Project,
                    user: { id: memberId } as User,
                    grantedBy: { id: actor.id } as User,
                    permission
                })
            );

            await this.projectPermissionRepo.save(rows);
        }

        return this.getProjectMemberPermissions(actorId, projectId, memberId);
    }

    async getProjects(actorId: string) {
        const actor = await this.userRepo.findOne({ where: { id: actorId }, relations: ["team"] });
        if (!actor?.team?.id) {
            throw new Error("Join or create an organization to view projects");
        }

        return await this.projectRepo.find({
            where: { team: { id: actor.team.id } },
            relations: ["manager", "team", "projectPermissions", "projectPermissions.user"]
        });
    }

    async getProjectMetrics(projectId: string) {
        const tasks = await this.taskRepo.find({ where: { project: { id: projectId } } });
        if (tasks.length === 0) return { completionPercentage: 0, totalTasks: 0, doneTasks: 0 };

        const doneTasks = tasks.filter(t => t.status === TaskStatus.DONE).length;
        const progress = Math.round((doneTasks / tasks.length) * 100);

        return {
            projectId,
            completionPercentage: progress,
            totalTasks: tasks.length,
            doneTasks
        };
    }

    async getAdminDashboardMetrics() {
        const projects = await this.projectRepo.find({ relations: ["tasks"] });
        return projects.map(project => {
            const totalTasks = project.tasks.length;
            const doneTasks = project.tasks.filter(t => t.status === TaskStatus.DONE).length;
            const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

            return {
                id: project.id,
                name: project.name,
                progress: `${progress}%`,
                status: progress === 100 ? "Completed" : "In Progress"
            };
        });
    }
}
