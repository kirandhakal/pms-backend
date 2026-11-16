"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.organizationAccess = organizationAccess;
exports.projectAccess = projectAccess;
exports.visibleStages = visibleStages;
exports.projectTasks = projectTasks;
exports.taskAccess = taskAccess;
exports.requireManagement = requireManagement;
const data_source_1 = require("../config/data-source");
const errorHandler_1 = require("../middlewares/errorHandler");
const User_1 = require("../entities/User");
const Team_1 = require("../entities/Team");
const Organization_1 = require("../entities/Organization");
const UserOrganization_1 = require("../entities/UserOrganization");
const TeamMembership_1 = require("../entities/TeamMembership");
const Project_1 = require("../entities/Project");
const ProjectMember_1 = require("../entities/ProjectMember");
const Task_1 = require("../entities/Task");
const WorkflowStage_1 = require("../entities/WorkflowStage");
const WorkflowStageMember_1 = require("../entities/WorkflowStageMember");
const workflow_stages_1 = require("../constants/workflow-stages");
async function organizationAccess(userId, organizationId, m = data_source_1.AppDataSource.manager) {
    const user = await m.findOne(User_1.User, { where: { id: userId, isActive: true }, relations: ['team'] });
    const org = await m.findOneBy(Organization_1.Organization, { id: organizationId, isActive: true });
    const team = await m.findOneBy(Team_1.Team, { id: organizationId });
    const membership = await m.findOneBy(UserOrganization_1.UserOrganization, { userId, organizationId });
    const legacyMembership = await m.findOneBy(TeamMembership_1.TeamMembership, { userId, teamId: organizationId });
    const owner = org?.ownerId === userId || team?.createdById === userId;
    if (!user || (!org && !team) || !(owner || membership || legacyMembership || user.team?.id === organizationId || user.organizationId === organizationId))
        throw new errorHandler_1.ApiError('Organization access denied', 403);
    const role = owner ? 'OWNER' : membership?.role || 'MEMBER';
    return { organizationId, user, role, admin: owner || role === 'ADMIN' };
}
async function projectAccess(userId, projectId, organizationId, m = data_source_1.AppDataSource.manager) {
    const project = await m.findOneBy(Project_1.Project, { id: projectId });
    if (!project || (organizationId && project.teamId !== organizationId))
        throw new errorHandler_1.ApiError('Project not found', 404);
    const org = await organizationAccess(userId, project.teamId, m);
    const member = await m.findOneBy(ProjectMember_1.ProjectMember, { projectId, userId });
    if (!org.admin && !member && project.managerId !== userId && project.teamLeadId !== userId)
        throw new errorHandler_1.ApiError('Project access denied', 403);
    const role = project.managerId === userId ? 'PROJECT_MANAGER' : project.teamLeadId === userId ? 'TEAM_LEAD' : member?.role || (org.admin ? 'ORG_CREATOR' : 'MEMBER');
    const manageMembers = org.admin || role === 'PROJECT_MANAGER';
    return { ...org, project, role, manageMembers, manage: manageMembers || role === 'TEAM_LEAD' };
}
async function visibleStages(access, userId, m = data_source_1.AppDataSource.manager) {
    if (!access.project.workflowId)
        return [];
    const stages = await m.find(WorkflowStage_1.WorkflowStage, { where: { workflowId: access.project.workflowId, isActive: true }, order: { order: 'ASC' } });
    if (access.manage)
        return stages;
    const membership = await m.find(WorkflowStageMember_1.WorkflowStageMember, { where: { userId } });
    return stages.filter(s => (s.visibility === 'PROJECT_WIDE' || membership.some(x => x.stageId === s.id)) && (!s.settings?.category && !s.settings?.visibleToRoles || (0, workflow_stages_1.canViewStage)(s, access.role)));
}
async function projectTasks(access, userId, m = data_source_1.AppDataSource.manager) {
    const stages = await visibleStages(access, userId, m);
    const q = m.getRepository(Task_1.Task).createQueryBuilder('t').where('t."isArchived" = false').andWhere('(t."projectId" = :id OR (t."projectId" IS NULL AND t."workflowId" = :workflow))', { id: access.project.id, workflow: access.project.workflowId || null });
    const tasks = await q.orderBy('t.createdAt', 'DESC').getMany();
    return tasks.filter(t => (!t.teamId || t.teamId === access.project.teamId) && (!t.stageId || stages.some(s => s.id === t.stageId)));
}
async function taskAccess(userId, taskId, m = data_source_1.AppDataSource.manager) {
    const task = await m.findOneBy(Task_1.Task, { id: taskId });
    if (!task)
        throw new errorHandler_1.ApiError('Task not found', 404);
    const project = task.projectId ? await m.findOneBy(Project_1.Project, { id: task.projectId }) : task.workflowId ? await m.findOneBy(Project_1.Project, { workflowId: task.workflowId }) : null;
    if (project) {
        const access = await projectAccess(userId, project.id, undefined, m);
        if (task.teamId && task.teamId !== project.teamId)
            throw new errorHandler_1.ApiError('Task access denied', 403);
        if (task.stageId && !(await visibleStages(access, userId, m)).some(s => s.id === task.stageId))
            throw new errorHandler_1.ApiError('Task access denied', 403);
        return;
    }
    if (task.teamId)
        await organizationAccess(userId, task.teamId, m);
    if (![task.assigneeId, task.createdById, task.ownerId].includes(userId))
        throw new errorHandler_1.ApiError('Task access denied', 403);
}
function requireManagement(access) {
    if (!access.manage)
        throw new errorHandler_1.ApiError('Project management permission required', 403);
}
