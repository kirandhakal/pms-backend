import { Brackets, In, IsNull } from 'typeorm';
import { z } from 'zod';
import { AppDataSource as db } from '../config/data-source';
import { projectAccess, organizationAccess, projectTasks, visibleStages, requireManagement } from './ProjectAccess';
import { Project } from '../entities/Project';
import { ProjectMember, ProjectMemberRole } from '../entities/ProjectMember';
import { User } from '../entities/User';
import { Workflow } from '../entities/Workflow';
import { WorkflowStage } from '../entities/WorkflowStage';
import { Task, TaskStatus, TaskPriority } from '../entities/Task';
import { Worklog } from '../entities/Worklog';
import { TaskActivity, TaskActivityType } from '../entities/TaskActivity';
import { ProjectMessage } from '../entities/ProjectMessage';
import { TaskComment } from '../entities/TaskComment';
import { Meeting } from '../entities/Meeting';
import { OrganizationResource, ResourceAllocation } from '../entities/ProjectAssets';
import { ApiError } from '../middlewares/errorHandler';
import { PROJECT_WORKFLOW_STAGES } from '../constants/workflow-stages';
import { workflowEngine } from './WorkflowEngine';
import { documentList } from './ProjectDocumentService';

export const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s, 'Invalid date');
export const rangeSchema = z.object({from:day, to:day}).refine(x=>x.from<=x.to, 'End date precedes start date');
export const publicUser = (u: User) => ({id:u.id, name:u.fullName || u.username || u.email, email:u.email});
export function taskSummary(tasks: Task[], now = new Date()) {
 const done = tasks.filter(t=>t.status === TaskStatus.DONE).length;
 const upcoming = new Date(now.getTime()+7*86400000);
 return { total:tasks.length, done, progress:tasks.length ? Math.round(done/tasks.length*100) : 0,
  overdue:tasks.filter(t=>t.status!==TaskStatus.DONE && t.dueDate && new Date(t.dueDate)<now),
  upcoming:tasks.filter(t=>t.status!==TaskStatus.DONE && t.dueDate && new Date(t.dueDate)>=now && new Date(t.dueDate)<=upcoming) };
}
export async function eligibleMembers(userId:string, orgId:string) {
 await organizationAccess(userId,orgId);
 const users = await db.getRepository(User).createQueryBuilder('u').leftJoin('u.team','team')
 .where('u."isActive" = true').andWhere(new Brackets(q=>q.where('u."organizationId" = :org OR team.id = :org',{org:orgId})
 .orWhere('EXISTS (SELECT 1 FROM user_organizations m WHERE m."userId" = u.id AND m."organizationId" = :org)',{org:orgId})
 .orWhere('EXISTS (SELECT 1 FROM team_memberships m WHERE m."userId" = u.id AND m."teamId" = :org)',{org:orgId}))).getMany();
 return users.map(publicUser);
}
export async function listProjects(userId:string, orgId:string) {
 const org=await organizationAccess(userId,orgId);
 const q=db.getRepository(Project).createQueryBuilder('p').where('p."teamId" = :org',{org:orgId});
 if (!org.admin) q.andWhere('(p."managerId" = :uid OR p."teamLeadId" = :uid OR EXISTS (SELECT 1 FROM project_members pm WHERE pm."projectId"=p.id AND pm."userId"=:uid))',{uid:userId});
 return q.orderBy('p.createdAt','DESC').getMany();
}
export async function createProject(userId:string, orgId:string, input:unknown) {
 const org=await organizationAccess(userId,orgId);
 if(!org.admin) throw new ApiError('Organization owner or admin required',403);
 const data=z.object({name:z.string().trim().min(1).max(150), description:z.string().max(10000).optional(),color:z.string().max(30).optional(),startDate:day.optional(),endDate:day.optional(),teamLeadId:z.uuid().optional(),memberIds:z.array(z.uuid()).max(500).optional()}).parse(input);
 if(data.startDate && data.endDate && data.startDate>data.endDate) throw new ApiError('End date precedes start date',400);
 for(const id of new Set([...(data.memberIds || []),...(data.teamLeadId?[data.teamLeadId]:[])])) await organizationAccess(id,orgId);
 return db.transaction(async m=>{
  // The legacy project FK uses a team with the organization's ID.
  const team=await m.query('SELECT id FROM teams WHERE id=$1',[orgId]);
  if(!team.length) throw new ApiError('Organization has no linked team; repair its legacy organization mapping first',409);
  const workflow=await m.save(Workflow,m.create(Workflow,{name:`${data.name} Workflow`,organizationId:orgId,createdById:userId,settings:{allowBackwardTransition:true}}));
  const stages=await m.save(WorkflowStage,PROJECT_WORKFLOW_STAGES.map(s=>m.create(WorkflowStage,{workflowId:workflow.id,name:s.name,order:s.order,color:s.color,isDefault:s.isDefault,isFinal:s.isFinal,settings:{category:s.category,assignedRole:s.assignedRole,visibleToRoles:s.visibleToRoles}})));
  workflow.transitions=stages.slice(0,-1).flatMap((s,i)=>[{fromStageId:s.id,toStageId:stages[i+1].id},{fromStageId:stages[i+1].id,toStageId:s.id}]); await m.save(workflow);
  const p=await m.save(Project,m.create(Project,{name:data.name,description:data.description,color:data.color,managerId:userId,teamId:orgId,teamLeadId:data.teamLeadId,workflowId:workflow.id,startDate:data.startDate?new Date(data.startDate):undefined,endDate:data.endDate?new Date(data.endDate):undefined}));
  for(const id of new Set([userId,...(data.memberIds||[]),...(data.teamLeadId?[data.teamLeadId]:[])])) await m.save(ProjectMember,m.create(ProjectMember,{projectId:p.id,userId:id,role:id===userId?ProjectMemberRole.PROJECT_MANAGER:id===data.teamLeadId?ProjectMemberRole.TEAM_LEAD:ProjectMemberRole.MEMBER}));
  return p;
 });
}
export async function projectDetail(userId:string, orgId:string, id:string) {
 const a=await projectAccess(userId,id,orgId);
 const members=await db.getRepository(ProjectMember).find({where:{projectId:id},relations:['user']});
 const tasks=await projectTasks(a,userId);
 const stages=await visibleStages(a,userId);
 const logs=await db.getRepository(Worklog).createQueryBuilder('w').where('(w."projectId"=:id OR w."workflowId"=:wid OR w."taskId" IN (:...ids))',{id,wid:a.project.workflowId||null,ids:tasks.length?tasks.map(t=>t.id):['00000000-0000-0000-0000-000000000000']}).getMany();
 const permittedLogs=logs.filter(w=>(!w.projectId || w.projectId===id) && (w.taskId ? tasks.some(t=>t.id===w.taskId) : a.manage || w.userId===userId));
 return {project:a.project, members:members.map(x=>({id:x.id,userId:x.userId,role:x.role,user:publicUser(x.user)})),tasks,stages,summary:taskSummary(tasks),loggedHours:permittedLogs.reduce((s,w)=>s+Number(w.hours),0),worklogs:permittedLogs,permissions:{manage:a.manage,manageMembers:a.manageMembers,manageCatalog:a.admin},viewerRole:a.role};
}
export async function updateMember(userId:string,orgId:string,id:string,input:unknown) {
 const data=z.object({userId:z.uuid(),role:z.nativeEnum(ProjectMemberRole)}).parse(input);
 return db.transaction(async m=>{
  await m.getRepository(Project).findOne({where:{id},lock:{mode:'pessimistic_write'}});
  const a=await projectAccess(userId,id,orgId,m);
  if(!a.manageMembers) throw new ApiError('Membership management permission required',403);
  await organizationAccess(data.userId,orgId,m);
  if(data.userId===a.project.managerId && data.role!==ProjectMemberRole.PROJECT_MANAGER) throw new ApiError('The project manager must retain their role',409);
  if(data.role===ProjectMemberRole.TEAM_LEAD) {
   await m.getRepository(ProjectMember).update({projectId:id,role:ProjectMemberRole.TEAM_LEAD},{role:ProjectMemberRole.MEMBER});
   await m.update(Project,{id},{teamLeadId:data.userId});
  } else if(a.project.teamLeadId===data.userId) await m.query('UPDATE projects SET "teamLeadId"=NULL WHERE id=$1',[id]);
  const existing=await m.findOneBy(ProjectMember,{projectId:id,userId:data.userId});
  return m.save(ProjectMember,m.create(ProjectMember,{...existing,projectId:id,...data}));
 });
}
export async function saveTask(userId:string,orgId:string,id:string,taskId:string|undefined,input:unknown) {
 const a=await projectAccess(userId,id,orgId); requireManagement(a);
 const data=z.object({name:z.string().trim().min(1).max(250).optional(),description:z.string().max(20000).optional(),assigneeId:z.uuid().nullable().optional(),dueDate:day.nullable().optional(),priority:z.nativeEnum(TaskPriority).optional(),stageId:z.uuid().optional(),isArchived:z.boolean().optional()}).parse(input);
 const stages=await visibleStages(a,userId);
 const existing=taskId?(await projectTasks(a,userId)).find(t=>t.id===taskId):undefined;
 if(taskId && !existing) throw new ApiError('Task not found',404);
 if(!existing && !data.name) throw new ApiError('Task name required',400);
 if(data.assigneeId) {
  if(!await db.getRepository(ProjectMember).findOneBy({projectId:id,userId:data.assigneeId})) throw new ApiError('Assignee must be a project member',400);
  await organizationAccess(data.assigneeId,orgId);
 }
 if(data.stageId && !stages.some(s=>s.id===data.stageId)) throw new ApiError('Invalid project stage',400);
 if(existing && data.stageId && existing.stageId!==data.stageId) {
  if(!existing.stageId || !existing.workflowId) throw new ApiError('Legacy task must be linked to a workflow stage first',409);
  await workflowEngine.transitionTask(existing.id,data.stageId,userId);
 }
 const task=existing?await db.getRepository(Task).findOneByOrFail({id:existing.id}):db.getRepository(Task).create({projectId:id,teamId:orgId,workflowId:a.project.workflowId,createdById:userId,stageId:stages.find(s=>s.isDefault)?.id});
 if(data.name!==undefined) task.name=data.name;
 if(data.description!==undefined) task.description=data.description;
 if(data.priority!==undefined) task.priority=data.priority;
 if(data.isArchived!==undefined) task.isArchived=data.isArchived;
 if(!existing && data.stageId) task.stageId=data.stageId;
 const stage=stages.find(s=>s.id===task.stageId);
 if(!existing && stage) {task.status=stage.isFinal?TaskStatus.DONE:stage.isDefault?TaskStatus.TODO:TaskStatus.IN_PROGRESS; task.completionPercentage=stage.isFinal?100:0; if(stage.isFinal)task.completedAt=new Date();}
 return db.transaction(async m=>{
  const saved=await m.save(task);
  if(data.assigneeId!==undefined) await m.query('UPDATE tasks SET "assigneeId"=$1 WHERE id=$2',[data.assigneeId,saved.id]);
  if(data.dueDate!==undefined) await m.query('UPDATE tasks SET "dueDate"=$1 WHERE id=$2',[data.dueDate?`${data.dueDate}T23:59:59.999Z`:null,saved.id]);
  await m.save(TaskActivity,m.create(TaskActivity,{taskId:saved.id,userId,type:existing?data.assigneeId!==undefined?TaskActivityType.ASSIGNED:TaskActivityType.UPDATED:TaskActivityType.CREATED,description:existing?'Task updated from project workspace':'Task created in project workspace'}));
  return m.findOneBy(Task,{id:saved.id});
 });
}
export async function resourceList(userId:string,orgId:string,id:string) {
 const a=await projectAccess(userId,id,orgId);
 const resources=await db.getRepository(OrganizationResource).find({where:{organizationId:orgId},relations:['owner'],order:{name:'ASC'}});
 const allocations=resources.length?await db.getRepository(ResourceAllocation).find({where:{resourceId:In(resources.map(r=>r.id)),releasedAt:IsNull()}}):[];
 return resources.map(r=>({...r,owner:publicUser(r.owner),allocations:allocations.filter(x=>x.resourceId===r.id).map(x=>({id:x.projectId===id?x.id:undefined,projectId:x.projectId===id?id:undefined,startDate:x.startDate,endDate:x.endDate,selectedProject:x.projectId===id})),canManage:a.manage}));
}
export async function createResource(userId:string,orgId:string,input:unknown) {
 const a=await organizationAccess(userId,orgId);if(!a.admin)throw new ApiError('Organization owner or admin required',403);
 const data=z.object({name:z.string().trim().min(1).max(200),kind:z.enum(['asset','link']),url:z.url().refine(x=>/^https?:\/\//i.test(x)).optional(),ownerId:z.uuid().optional()}).parse(input);
 if(data.kind==='link'&&!data.url)throw new ApiError('Link URL required',400);
 await organizationAccess(data.ownerId||userId,orgId);
 return db.getRepository(OrganizationResource).save({organizationId:orgId,...data,ownerId:data.ownerId||userId});
}
export function overlaps(a:{startDate:string,endDate:string},b:{startDate:string,endDate:string}) {return a.startDate<=b.endDate&&a.endDate>=b.startDate;}
export async function allocateResource(userId:string,orgId:string,id:string,input:unknown) {
 const data=z.object({resourceId:z.uuid(),startDate:day,endDate:day}).refine(x=>x.startDate<=x.endDate,'End date precedes start date').parse(input);
 return db.transaction(async m=>{
  const a=await projectAccess(userId,id,orgId,m);requireManagement(a);
  const r=await m.getRepository(OrganizationResource).findOne({where:{id:data.resourceId,organizationId:orgId},lock:{mode:'pessimistic_write'}});
  if(!r)throw new ApiError('Resource not found',404);
  const allocations=await m.find(ResourceAllocation,{where:{resourceId:r.id,releasedAt:IsNull()}});
  if(r.kind==='asset'&&allocations.some(x=>overlaps(x,data)))throw new ApiError('Resource is already allocated for these dates',409);
  return m.save(ResourceAllocation,m.create(ResourceAllocation,{...data,projectId:id,allocatedById:userId}));
 });
}
export async function releaseResource(userId:string,orgId:string,id:string,allocationId:string) {
 requireManagement(await projectAccess(userId,id,orgId));
 const r=await db.getRepository(ResourceAllocation).update({id:allocationId,projectId:id,releasedAt:IsNull()},{releasedAt:new Date()});
 if(!r.affected)throw new ApiError('Active allocation not found',404);
}
export async function report(userId:string,orgId:string,id:string,input:unknown) {
 const range=rangeSchema.parse(input);const detail=await projectDetail(userId,orgId,id);
 const inRange=(date:Date|string)=>{const d=new Date(date).toISOString().slice(0,10);return d>=range.from&&d<=range.to;};
 const docs=(await documentList(userId,orgId,id,false)).filter(d=>inRange(d.createdAt));
 const projectMessages=await db.getRepository(ProjectMessage).find({where:{projectId:id,isDeleted:false}});
 const taskMessages=detail.tasks.length?await db.getRepository(TaskComment).find({where:{taskId:In(detail.tasks.map(t=>t.id)),isDeleted:false}}):[];
 const meetings=await db.getRepository(Meeting).find({where:{projectId:id,organizationId:orgId},relations:['participants']});
 const allocations=await db.getRepository(ResourceAllocation).find({where:{projectId:id},relations:['resource']});
 const activities=detail.tasks.length?await db.getRepository(TaskActivity).find({where:{taskId:In(detail.tasks.map(t=>t.id))}}):[];
 return {range,generatedAt:new Date().toISOString(),snapshot:'Task progress and assignments are current; activity is filtered by date.',project:detail.project,summary:detail.summary,tasks:detail.tasks,stages:detail.stages,members:detail.members,
 worklogs:detail.worklogs.filter(w=>inRange(w.logDate)), documents:docs.map(d=>({id:d.id,name:d.name,createdAt:d.createdAt})),
 discussions:[...projectMessages.map(m=>({conversation:'Project',createdAt:m.createdAt})),...taskMessages.map(m=>({conversation:detail.tasks.find(t=>t.id===m.taskId)?.name,createdAt:m.createdAt}))].filter(m=>inRange(m.createdAt)),
 meetings:meetings.filter(m=>inRange(m.scheduledAt)&&(m.visibility==='PUBLIC'||m.createdById===userId||m.participants.some(p=>p.userId===userId))).map(m=>({id:m.id,title:m.title,status:m.status,scheduledAt:m.scheduledAt})),
 resources:allocations.filter(x=>x.resource.organizationId===orgId&&overlaps(x,{startDate:range.from,endDate:range.to})&&(!x.releasedAt||new Date(x.releasedAt).toISOString().slice(0,10)>=range.from)).map(x=>({name:x.resource.name,startDate:x.startDate,endDate:x.endDate,releasedAt:x.releasedAt})),
 activity:activities.filter(x=>inRange(x.createdAt)).map(x=>({task:detail.tasks.find(t=>t.id===x.taskId)?.name,type:x.type,createdAt:x.createdAt}))};
}
