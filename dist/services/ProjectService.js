"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const data_source_1 = require("../config/data-source");
const Project_1 = require("../entities/Project");
const Task_1 = require("../entities/Task");
const User_1 = require("../entities/User");
const PermissionService_1 = require("./PermissionService");
const access_1 = require("../constants/access");
const Team_1 = require("../entities/Team");
const ProjectPermission_1 = require("../entities/ProjectPermission");
const project_access_1 = require("../constants/project-access");
class ProjectService {
    constructor() {
        this.projectRepo = data_source_1.AppDataSource.getRepository(Project_1.Project);
        this.taskRepo = data_source_1.AppDataSource.getRepository(Task_1.Task);
        this.userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
        this.teamRepo = data_source_1.AppDataSource.getRepository(Team_1.Team);
        this.projectPermissionRepo = data_source_1.AppDataSource.getRepository(ProjectPermission_1.ProjectPermission);
        this.permissionService = new PermissionService_1.PermissionService();
    }
    sanitizeProjectPermissions(permissions) {
        const deduped = Array.from(new Set(permissions || []));
        return deduped.filter((permission) => project_access_1.ALL_PROJECT_PERMISSIONS.includes(permission));
    }
    async validateProjectMembers(teamId, memberPermissions) {
        const uniqueIds = Array.from(new Set(memberPermissions.map((entry) => entry.userId)));
        if (uniqueIds.length === 0) {
            return new Map();
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
    async createProject(actorId, data) {
        const actor = await this.userRepo.findOne({
            where: { id: actorId },
            relations: ["team", "team.createdBy"]
        });
        if (!actor || !actor.team?.id) {
            throw new Error("Only organization members can create projects");
        }
        const canCreateProject = await this.permissionService.userHasPermission(actor, access_1.PermissionKey.PROJECT_CREATE);
        if (!canCreateProject) {
            throw new Error("You do not have permission to create projects");
        }
        if (data.team?.id && data.team.id !== actor.team.id) {
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
        const permissionRows = [];
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
        for (const permission of project_access_1.ALL_PROJECT_PERMISSIONS) {
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
    async getProjects(actorId) {
        const actor = await this.userRepo.findOne({ where: { id: actorId }, relations: ["team"] });
        if (!actor?.team?.id) {
            throw new Error("Join or create an organization to view projects");
        }
        return await this.projectRepo.find({
            where: { team: { id: actor.team.id } },
            relations: ["manager", "team", "projectPermissions", "projectPermissions.user"]
        });
    }
    async getProjectMetrics(projectId) {
        const tasks = await this.taskRepo.find({ where: { project: { id: projectId } } });
        if (tasks.length === 0)
            return { completionPercentage: 0, totalTasks: 0, doneTasks: 0 };
        const doneTasks = tasks.filter(t => t.status === Task_1.TaskStatus.DONE).length;
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
            const doneTasks = project.tasks.filter(t => t.status === Task_1.TaskStatus.DONE).length;
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
exports.ProjectService = ProjectService;
