"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicUser = exports.rangeSchema = exports.day = void 0;
exports.taskSummary = taskSummary;
exports.eligibleMembers = eligibleMembers;
exports.listProjects = listProjects;
exports.createProject = createProject;
exports.projectDetail = projectDetail;
exports.updateMember = updateMember;
exports.saveTask = saveTask;
exports.resourceList = resourceList;
exports.createResource = createResource;
exports.overlaps = overlaps;
exports.allocateResource = allocateResource;
exports.releaseResource = releaseResource;
exports.report = report;
const typeorm_1 = require("typeorm");
const zod_1 = require("zod");
const data_source_1 = require("../config/data-source");
const ProjectAccess_1 = require("./ProjectAccess");
const Project_1 = require("../entities/Project");
const ProjectMember_1 = require("../entities/ProjectMember");
const User_1 = require("../entities/User");
const Workflow_1 = require("../entities/Workflow");
const WorkflowStage_1 = require("../entities/WorkflowStage");
const Task_1 = require("../entities/Task");
const Worklog_1 = require("../entities/Worklog");
const TaskActivity_1 = require("../entities/TaskActivity");
const ProjectMessage_1 = require("../entities/ProjectMessage");
const TaskComment_1 = require("../entities/TaskComment");
const Meeting_1 = require("../entities/Meeting");
const ProjectAssets_1 = require("../entities/ProjectAssets");
const errorHandler_1 = require("../middlewares/errorHandler");
const workflow_stages_1 = require("../constants/workflow-stages");
const WorkflowEngine_1 = require("./WorkflowEngine");
const ProjectDocumentService_1 = require("./ProjectDocumentService");
exports.day = zod_1.z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s, 'Invalid date');
exports.rangeSchema = zod_1.z.object({ from: exports.day, to: exports.day }).refine(x => x.from <= x.to, 'End date precedes start date');
const publicUser = (u) => ({ id: u.id, name: u.fullName || u.username || u.email, email: u.email });
exports.publicUser = publicUser;
function taskSummary(tasks, now = new Date()) {
    const done = tasks.filter(t => t.status === Task_1.TaskStatus.DONE).length;
    const upcoming = new Date(now.getTime() + 7 * 86400000);
    return { total: tasks.length, done, progress: tasks.length ? Math.round(done / tasks.length * 100) : 0,
        overdue: tasks.filter(t => t.status !== Task_1.TaskStatus.DONE && t.dueDate && new Date(t.dueDate) < now),
        upcoming: tasks.filter(t => t.status !== Task_1.TaskStatus.DONE && t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= upcoming) };
}
async function eligibleMembers(userId, orgId) {
    await (0, ProjectAccess_1.organizationAccess)(userId, orgId);
    const users = await data_source_1.AppDataSource.getRepository(User_1.User).createQueryBuilder('u').leftJoin('u.team', 'team')
        .where('u."isActive" = true').andWhere(new typeorm_1.Brackets(q => q.where('u."organizationId" = :org OR team.id = :org', { org: orgId })
        .orWhere('EXISTS (SELECT 1 FROM user_organizations m WHERE m."userId" = u.id AND m."organizationId" = :org)', { org: orgId })
        .orWhere('EXISTS (SELECT 1 FROM team_memberships m WHERE m."userId" = u.id AND m."teamId" = :org)', { org: orgId }))).getMany();
    return users.map(exports.publicUser);
}
async function listProjects(userId, orgId) {
    const org = await (0, ProjectAccess_1.organizationAccess)(userId, orgId);
    const q = data_source_1.AppDataSource.getRepository(Project_1.Project).createQueryBuilder('p').where('p."teamId" = :org', { org: orgId });
    if (!org.admin)
        q.andWhere('(p."managerId" = :uid OR p."teamLeadId" = :uid OR EXISTS (SELECT 1 FROM project_members pm WHERE pm."projectId"=p.id AND pm."userId"=:uid))', { uid: userId });
    return q.orderBy('p.createdAt', 'DESC').getMany();
}
async function createProject(userId, orgId, input) {
    const org = await (0, ProjectAccess_1.organizationAccess)(userId, orgId);
    if (!org.admin)
        throw new errorHandler_1.ApiError('Organization owner or admin required', 403);
    const data = zod_1.z.object({ name: zod_1.z.string().trim().min(1).max(150), description: zod_1.z.string().max(10000).optional(), color: zod_1.z.string().max(30).optional(), startDate: exports.day.optional(), endDate: exports.day.optional(), teamLeadId: zod_1.z.uuid().optional(), memberIds: zod_1.z.array(zod_1.z.uuid()).max(500).optional() }).parse(input);
    if (data.startDate && data.endDate && data.startDate > data.endDate)
        throw new errorHandler_1.ApiError('End date precedes start date', 400);
    for (const id of new Set([...(data.memberIds || []), ...(data.teamLeadId ? [data.teamLeadId] : [])]))
        await (0, ProjectAccess_1.organizationAccess)(id, orgId);
    return data_source_1.AppDataSource.transaction(async (m) => {
        // The legacy project FK uses a team with the organization's ID.
        const team = await m.query('SELECT id FROM teams WHERE id=$1', [orgId]);
        if (!team.length)
            throw new errorHandler_1.ApiError('Organization has no linked team; repair its legacy organization mapping first', 409);
        const workflow = await m.save(Workflow_1.Workflow, m.create(Workflow_1.Workflow, { name: `${data.name} Workflow`, organizationId: orgId, createdById: userId, settings: { allowBackwardTransition: true } }));
        const stages = await m.save(WorkflowStage_1.WorkflowStage, workflow_stages_1.PROJECT_WORKFLOW_STAGES.map(s => m.create(WorkflowStage_1.WorkflowStage, { workflowId: workflow.id, name: s.name, order: s.order, color: s.color, isDefault: s.isDefault, isFinal: s.isFinal, settings: { category: s.category, assignedRole: s.assignedRole, visibleToRoles: s.visibleToRoles } })));
        workflow.transitions = stages.slice(0, -1).flatMap((s, i) => [{ fromStageId: s.id, toStageId: stages[i + 1].id }, { fromStageId: stages[i + 1].id, toStageId: s.id }]);
        await m.save(workflow);
        const p = await m.save(Project_1.Project, m.create(Project_1.Project, { name: data.name, description: data.description, color: data.color, managerId: userId, teamId: orgId, teamLeadId: data.teamLeadId, workflowId: workflow.id, startDate: data.startDate ? new Date(data.startDate) : undefined, endDate: data.endDate ? new Date(data.endDate) : undefined }));
        for (const id of new Set([userId, ...(data.memberIds || []), ...(data.teamLeadId ? [data.teamLeadId] : [])]))
            await m.save(ProjectMember_1.ProjectMember, m.create(ProjectMember_1.ProjectMember, { projectId: p.id, userId: id, role: id === userId ? ProjectMember_1.ProjectMemberRole.PROJECT_MANAGER : id === data.teamLeadId ? ProjectMember_1.ProjectMemberRole.TEAM_LEAD : ProjectMember_1.ProjectMemberRole.MEMBER }));
        return p;
    });
}
async function projectDetail(userId, orgId, id) {
    const a = await (0, ProjectAccess_1.projectAccess)(userId, id, orgId);
    const members = await data_source_1.AppDataSource.getRepository(ProjectMember_1.ProjectMember).find({ where: { projectId: id }, relations: ['user'] });
    const tasks = await (0, ProjectAccess_1.projectTasks)(a, userId);
    const stages = await (0, ProjectAccess_1.visibleStages)(a, userId);
    const logs = await data_source_1.AppDataSource.getRepository(Worklog_1.Worklog).createQueryBuilder('w').where('(w."projectId"=:id OR w."workflowId"=:wid OR w."taskId" IN (:...ids))', { id, wid: a.project.workflowId || null, ids: tasks.length ? tasks.map(t => t.id) : ['00000000-0000-0000-0000-000000000000'] }).getMany();
    const permittedLogs = logs.filter(w => (!w.projectId || w.projectId === id) && (w.taskId ? tasks.some(t => t.id === w.taskId) : a.manage || w.userId === userId));
    return { project: a.project, members: members.map(x => ({ id: x.id, userId: x.userId, role: x.role, user: (0, exports.publicUser)(x.user) })), tasks, stages, summary: taskSummary(tasks), loggedHours: permittedLogs.reduce((s, w) => s + Number(w.hours), 0), worklogs: permittedLogs, permissions: { manage: a.manage, manageMembers: a.manageMembers, manageCatalog: a.admin }, viewerRole: a.role };
}
async function updateMember(userId, orgId, id, input) {
    const data = zod_1.z.object({ userId: zod_1.z.uuid(), role: zod_1.z.nativeEnum(ProjectMember_1.ProjectMemberRole) }).parse(input);
    return data_source_1.AppDataSource.transaction(async (m) => {
        await m.getRepository(Project_1.Project).findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
        const a = await (0, ProjectAccess_1.projectAccess)(userId, id, orgId, m);
        if (!a.manageMembers)
            throw new errorHandler_1.ApiError('Membership management permission required', 403);
        await (0, ProjectAccess_1.organizationAccess)(data.userId, orgId, m);
        if (data.userId === a.project.managerId && data.role !== ProjectMember_1.ProjectMemberRole.PROJECT_MANAGER)
            throw new errorHandler_1.ApiError('The project manager must retain their role', 409);
        if (data.role === ProjectMember_1.ProjectMemberRole.TEAM_LEAD) {
            await m.getRepository(ProjectMember_1.ProjectMember).update({ projectId: id, role: ProjectMember_1.ProjectMemberRole.TEAM_LEAD }, { role: ProjectMember_1.ProjectMemberRole.MEMBER });
            await m.update(Project_1.Project, { id }, { teamLeadId: data.userId });
        }
        else if (a.project.teamLeadId === data.userId)
            await m.query('UPDATE projects SET "teamLeadId"=NULL WHERE id=$1', [id]);
        const existing = await m.findOneBy(ProjectMember_1.ProjectMember, { projectId: id, userId: data.userId });
        return m.save(ProjectMember_1.ProjectMember, m.create(ProjectMember_1.ProjectMember, { ...existing, projectId: id, ...data }));
    });
}
async function saveTask(userId, orgId, id, taskId, input) {
    const a = await (0, ProjectAccess_1.projectAccess)(userId, id, orgId);
    (0, ProjectAccess_1.requireManagement)(a);
    const data = zod_1.z.object({ name: zod_1.z.string().trim().min(1).max(250).optional(), description: zod_1.z.string().max(20000).optional(), assigneeId: zod_1.z.uuid().nullable().optional(), dueDate: exports.day.nullable().optional(), priority: zod_1.z.nativeEnum(Task_1.TaskPriority).optional(), stageId: zod_1.z.uuid().optional(), isArchived: zod_1.z.boolean().optional() }).parse(input);
    const stages = await (0, ProjectAccess_1.visibleStages)(a, userId);
    const existing = taskId ? (await (0, ProjectAccess_1.projectTasks)(a, userId)).find(t => t.id === taskId) : undefined;
    if (taskId && !existing)
        throw new errorHandler_1.ApiError('Task not found', 404);
    if (!existing && !data.name)
        throw new errorHandler_1.ApiError('Task name required', 400);
    if (data.assigneeId) {
        if (!await data_source_1.AppDataSource.getRepository(ProjectMember_1.ProjectMember).findOneBy({ projectId: id, userId: data.assigneeId }))
            throw new errorHandler_1.ApiError('Assignee must be a project member', 400);
        await (0, ProjectAccess_1.organizationAccess)(data.assigneeId, orgId);
    }
    if (data.stageId && !stages.some(s => s.id === data.stageId))
        throw new errorHandler_1.ApiError('Invalid project stage', 400);
    if (existing && data.stageId && existing.stageId !== data.stageId) {
        if (!existing.stageId || !existing.workflowId)
            throw new errorHandler_1.ApiError('Legacy task must be linked to a workflow stage first', 409);
        await WorkflowEngine_1.workflowEngine.transitionTask(existing.id, data.stageId, userId);
    }
    const task = existing ? await data_source_1.AppDataSource.getRepository(Task_1.Task).findOneByOrFail({ id: existing.id }) : data_source_1.AppDataSource.getRepository(Task_1.Task).create({ projectId: id, teamId: orgId, workflowId: a.project.workflowId, createdById: userId, stageId: stages.find(s => s.isDefault)?.id });
    if (data.name !== undefined)
        task.name = data.name;
    if (data.description !== undefined)
        task.description = data.description;
    if (data.priority !== undefined)
        task.priority = data.priority;
    if (data.isArchived !== undefined)
        task.isArchived = data.isArchived;
    if (!existing && data.stageId)
        task.stageId = data.stageId;
    const stage = stages.find(s => s.id === task.stageId);
    if (!existing && stage) {
        task.status = stage.isFinal ? Task_1.TaskStatus.DONE : stage.isDefault ? Task_1.TaskStatus.TODO : Task_1.TaskStatus.IN_PROGRESS;
        task.completionPercentage = stage.isFinal ? 100 : 0;
        if (stage.isFinal)
            task.completedAt = new Date();
    }
    return data_source_1.AppDataSource.transaction(async (m) => {
        const saved = await m.save(task);
        if (data.assigneeId !== undefined)
            await m.query('UPDATE tasks SET "assigneeId"=$1 WHERE id=$2', [data.assigneeId, saved.id]);
        if (data.dueDate !== undefined)
            await m.query('UPDATE tasks SET "dueDate"=$1 WHERE id=$2', [data.dueDate ? `${data.dueDate}T23:59:59.999Z` : null, saved.id]);
        await m.save(TaskActivity_1.TaskActivity, m.create(TaskActivity_1.TaskActivity, { taskId: saved.id, userId, type: existing ? data.assigneeId !== undefined ? TaskActivity_1.TaskActivityType.ASSIGNED : TaskActivity_1.TaskActivityType.UPDATED : TaskActivity_1.TaskActivityType.CREATED, description: existing ? 'Task updated from project workspace' : 'Task created in project workspace' }));
        return m.findOneBy(Task_1.Task, { id: saved.id });
    });
}
async function resourceList(userId, orgId, id) {
    const a = await (0, ProjectAccess_1.projectAccess)(userId, id, orgId);
    const resources = await data_source_1.AppDataSource.getRepository(ProjectAssets_1.OrganizationResource).find({ where: { organizationId: orgId }, relations: ['owner'], order: { name: 'ASC' } });
    const allocations = resources.length ? await data_source_1.AppDataSource.getRepository(ProjectAssets_1.ResourceAllocation).find({ where: { resourceId: (0, typeorm_1.In)(resources.map(r => r.id)), releasedAt: (0, typeorm_1.IsNull)() } }) : [];
    return resources.map(r => ({ ...r, owner: (0, exports.publicUser)(r.owner), allocations: allocations.filter(x => x.resourceId === r.id).map(x => ({ id: x.projectId === id ? x.id : undefined, projectId: x.projectId === id ? id : undefined, startDate: x.startDate, endDate: x.endDate, selectedProject: x.projectId === id })), canManage: a.manage }));
}
async function createResource(userId, orgId, input) {
    const a = await (0, ProjectAccess_1.organizationAccess)(userId, orgId);
    if (!a.admin)
        throw new errorHandler_1.ApiError('Organization owner or admin required', 403);
    const data = zod_1.z.object({ name: zod_1.z.string().trim().min(1).max(200), kind: zod_1.z.enum(['asset', 'link']), url: zod_1.z.url().refine(x => /^https?:\/\//i.test(x)).optional(), ownerId: zod_1.z.uuid().optional() }).parse(input);
    if (data.kind === 'link' && !data.url)
        throw new errorHandler_1.ApiError('Link URL required', 400);
    await (0, ProjectAccess_1.organizationAccess)(data.ownerId || userId, orgId);
    return data_source_1.AppDataSource.getRepository(ProjectAssets_1.OrganizationResource).save({ organizationId: orgId, ...data, ownerId: data.ownerId || userId });
}
function overlaps(a, b) { return a.startDate <= b.endDate && a.endDate >= b.startDate; }
async function allocateResource(userId, orgId, id, input) {
    const data = zod_1.z.object({ resourceId: zod_1.z.uuid(), startDate: exports.day, endDate: exports.day }).refine(x => x.startDate <= x.endDate, 'End date precedes start date').parse(input);
    return data_source_1.AppDataSource.transaction(async (m) => {
        const a = await (0, ProjectAccess_1.projectAccess)(userId, id, orgId, m);
        (0, ProjectAccess_1.requireManagement)(a);
        const r = await m.getRepository(ProjectAssets_1.OrganizationResource).findOne({ where: { id: data.resourceId, organizationId: orgId }, lock: { mode: 'pessimistic_write' } });
        if (!r)
            throw new errorHandler_1.ApiError('Resource not found', 404);
        const allocations = await m.find(ProjectAssets_1.ResourceAllocation, { where: { resourceId: r.id, releasedAt: (0, typeorm_1.IsNull)() } });
        if (r.kind === 'asset' && allocations.some(x => overlaps(x, data)))
            throw new errorHandler_1.ApiError('Resource is already allocated for these dates', 409);
        return m.save(ProjectAssets_1.ResourceAllocation, m.create(ProjectAssets_1.ResourceAllocation, { ...data, projectId: id, allocatedById: userId }));
    });
}
async function releaseResource(userId, orgId, id, allocationId) {
    (0, ProjectAccess_1.requireManagement)(await (0, ProjectAccess_1.projectAccess)(userId, id, orgId));
    const r = await data_source_1.AppDataSource.getRepository(ProjectAssets_1.ResourceAllocation).update({ id: allocationId, projectId: id, releasedAt: (0, typeorm_1.IsNull)() }, { releasedAt: new Date() });
    if (!r.affected)
        throw new errorHandler_1.ApiError('Active allocation not found', 404);
}
async function report(userId, orgId, id, input) {
    const range = exports.rangeSchema.parse(input);
    const detail = await projectDetail(userId, orgId, id);
    const inRange = (date) => { const d = new Date(date).toISOString().slice(0, 10); return d >= range.from && d <= range.to; };
    const docs = (await (0, ProjectDocumentService_1.documentList)(userId, orgId, id, false)).filter(d => inRange(d.createdAt));
    const projectMessages = await data_source_1.AppDataSource.getRepository(ProjectMessage_1.ProjectMessage).find({ where: { projectId: id, isDeleted: false } });
    const taskMessages = detail.tasks.length ? await data_source_1.AppDataSource.getRepository(TaskComment_1.TaskComment).find({ where: { taskId: (0, typeorm_1.In)(detail.tasks.map(t => t.id)), isDeleted: false } }) : [];
    const meetings = await data_source_1.AppDataSource.getRepository(Meeting_1.Meeting).find({ where: { projectId: id, organizationId: orgId }, relations: ['participants'] });
    const allocations = await data_source_1.AppDataSource.getRepository(ProjectAssets_1.ResourceAllocation).find({ where: { projectId: id }, relations: ['resource'] });
    const activities = detail.tasks.length ? await data_source_1.AppDataSource.getRepository(TaskActivity_1.TaskActivity).find({ where: { taskId: (0, typeorm_1.In)(detail.tasks.map(t => t.id)) } }) : [];
    return { range, generatedAt: new Date().toISOString(), snapshot: 'Task progress and assignments are current; activity is filtered by date.', project: detail.project, summary: detail.summary, tasks: detail.tasks, stages: detail.stages, members: detail.members,
        worklogs: detail.worklogs.filter(w => inRange(w.logDate)), documents: docs.map(d => ({ id: d.id, name: d.name, createdAt: d.createdAt })),
        discussions: [...projectMessages.map(m => ({ conversation: 'Project', createdAt: m.createdAt })), ...taskMessages.map(m => ({ conversation: detail.tasks.find(t => t.id === m.taskId)?.name, createdAt: m.createdAt }))].filter(m => inRange(m.createdAt)),
        meetings: meetings.filter(m => inRange(m.scheduledAt) && (m.visibility === 'PUBLIC' || m.createdById === userId || m.participants.some(p => p.userId === userId))).map(m => ({ id: m.id, title: m.title, status: m.status, scheduledAt: m.scheduledAt })),
        resources: allocations.filter(x => x.resource.organizationId === orgId && overlaps(x, { startDate: range.from, endDate: range.to }) && (!x.releasedAt || new Date(x.releasedAt).toISOString().slice(0, 10) >= range.from)).map(x => ({ name: x.resource.name, startDate: x.startDate, endDate: x.endDate, releasedAt: x.releasedAt })),
        activity: activities.filter(x => inRange(x.createdAt)).map(x => ({ task: detail.tasks.find(t => t.id === x.taskId)?.name, type: x.type, createdAt: x.createdAt })) };
}
