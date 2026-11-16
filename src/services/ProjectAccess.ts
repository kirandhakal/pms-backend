import { EntityManager } from 'typeorm';
import { AppDataSource as db } from '../config/data-source';
import { ApiError } from '../middlewares/errorHandler';
import { User } from '../entities/User';
import { Team } from '../entities/Team';
import { Organization } from '../entities/Organization';
import { UserOrganization } from '../entities/UserOrganization';
import { TeamMembership } from '../entities/TeamMembership';
import { Project } from '../entities/Project';
import { ProjectMember } from '../entities/ProjectMember';
import { Task } from '../entities/Task';
import { WorkflowStage } from '../entities/WorkflowStage';
import { WorkflowStageMember } from '../entities/WorkflowStageMember';
import { canViewStage, ProjectRole } from '../constants/workflow-stages';

export async function organizationAccess(userId: string, organizationId: string, m: EntityManager = db.manager) {
    const user = await m.findOne(User, { where: { id: userId, isActive: true }, relations: ['team'] });
    const org = await m.findOneBy(Organization, { id: organizationId, isActive: true });
    const team = await m.findOneBy(Team, { id: organizationId });
    const membership = await m.findOneBy(UserOrganization, { userId, organizationId });
    const legacyMembership = await m.findOneBy(TeamMembership, { userId, teamId: organizationId });
    const owner = org?.ownerId === userId || team?.createdById === userId;
    if (!user || (!org && !team) || !(owner || membership || legacyMembership || user.team?.id === organizationId || user.organizationId === organizationId)) throw new ApiError('Organization access denied', 403);
    const role = owner ? 'OWNER' : membership?.role || 'MEMBER';
    return { organizationId, user, role, admin: owner || role === 'ADMIN' };
}
export async function projectAccess(userId: string, projectId: string, organizationId?: string, m: EntityManager = db.manager) {
    const project = await m.findOneBy(Project, { id: projectId });
    if (!project || (organizationId && project.teamId !== organizationId)) throw new ApiError('Project not found', 404);
    const org = await organizationAccess(userId, project.teamId, m);
    const member = await m.findOneBy(ProjectMember, { projectId, userId });
    if (!org.admin && !member && project.managerId !== userId && project.teamLeadId !== userId) throw new ApiError('Project access denied', 403);
    const role = project.managerId === userId ? 'PROJECT_MANAGER' : project.teamLeadId === userId ? 'TEAM_LEAD' : member?.role || (org.admin ? 'ORG_CREATOR' : 'MEMBER');
    const manageMembers = org.admin || role === 'PROJECT_MANAGER';
    return { ...org, project, role, manageMembers, manage: manageMembers || role === 'TEAM_LEAD' };
}
export async function visibleStages(access: Awaited<ReturnType<typeof projectAccess>>, userId: string, m: EntityManager = db.manager) {
    if (!access.project.workflowId) return [];
    const stages = await m.find(WorkflowStage, { where: { workflowId: access.project.workflowId, isActive: true }, order: { order: 'ASC' } });
    if (access.manage) return stages;
    const membership = await m.find(WorkflowStageMember, { where: { userId } });
    return stages.filter(s => (s.visibility === 'PROJECT_WIDE' || membership.some(x => x.stageId === s.id)) && (!s.settings?.category && !s.settings?.visibleToRoles || canViewStage(s, access.role as ProjectRole)));
}
export async function projectTasks(access: Awaited<ReturnType<typeof projectAccess>>, userId: string, m: EntityManager = db.manager) {
    const stages = await visibleStages(access, userId, m);
    const q = m.getRepository(Task).createQueryBuilder('t').where('t."isArchived" = false').andWhere('(t."projectId" = :id OR (t."projectId" IS NULL AND t."workflowId" = :workflow))', { id: access.project.id, workflow: access.project.workflowId || null });
    const tasks = await q.orderBy('t.createdAt', 'DESC').getMany();
    return tasks.filter(t => (!t.teamId || t.teamId === access.project.teamId) && (!t.stageId || stages.some(s => s.id === t.stageId)));
}
export async function taskAccess(userId: string, taskId: string, m: EntityManager = db.manager) {
    const task = await m.findOneBy(Task, { id: taskId });
    if (!task) throw new ApiError('Task not found', 404);
    const project = task.projectId ? await m.findOneBy(Project, { id: task.projectId }) : task.workflowId ? await m.findOneBy(Project, { workflowId: task.workflowId }) : null;
    if (project) {
        const access = await projectAccess(userId, project.id, undefined, m);
        if (task.teamId && task.teamId !== project.teamId) throw new ApiError('Task access denied', 403);
        if (task.stageId && !(await visibleStages(access, userId, m)).some(s => s.id === task.stageId)) throw new ApiError('Task access denied', 403);
        return;
    }
    if (task.teamId) await organizationAccess(userId, task.teamId, m);
    if (![task.assigneeId, task.createdById, task.ownerId].includes(userId)) throw new ApiError('Task access denied', 403);
}
export function requireManagement(access: { manage: boolean }) {
    if (!access.manage) throw new ApiError('Project management permission required', 403);
}
