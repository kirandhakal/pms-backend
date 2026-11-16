const {test}=require('node:test');
const assert=require('node:assert/strict');
const {AppDataSource:db}=require('../dist/config/data-source');
const {organizationAccess,projectAccess,visibleStages,taskAccess}=require('../dist/services/ProjectAccess');
const {taskSummary,overlaps,rangeSchema,updateMember,allocateResource,saveTask,report}=require('../dist/services/ProjectManagementService');
const {validateDocumentBytes,canReadDocument,documentContent,linkDocument}=require('../dist/services/ProjectDocumentService');
const {User}=require('../dist/entities/User');
const {Team}=require('../dist/entities/Team');
const {Organization}=require('../dist/entities/Organization');
const {UserOrganization}=require('../dist/entities/UserOrganization');
const {Project}=require('../dist/entities/Project');
const {ProjectMember}=require('../dist/entities/ProjectMember');
const {Task}=require('../dist/entities/Task');
const {WorkflowStage}=require('../dist/entities/WorkflowStage');
const {WorkflowStageMember}=require('../dist/entities/WorkflowStageMember');
const {ProjectDocument,ProjectDocumentLink,OrganizationResource,ResourceAllocation}=require('../dist/entities/ProjectAssets');
const {Worklog}=require('../dist/entities/Worklog');
const {ProjectMessage}=require('../dist/entities/ProjectMessage');
const {TaskComment}=require('../dist/entities/TaskComment');
const {Meeting}=require('../dist/entities/Meeting');
const {TaskActivity}=require('../dist/entities/TaskActivity');
const {chatStorageService:storage}=require('../dist/services/ChatStorageService');
const uid='11111111-1111-4111-8111-111111111111', other='22222222-2222-4222-8222-222222222222', pid='33333333-3333-4333-8333-333333333333', org='44444444-4444-4444-8444-444444444444', rid='55555555-5555-4555-8555-555555555555';
function manager({member='MEMBER',admin=false,managerId=other,belongs=true}={}) {
 const p={id:pid,teamId:org,managerId,workflowId:rid};
 return {findOne:async entity=>entity===User?{id:uid,isActive:true,team:belongs?{id:org}:undefined}:null,
 findOneBy:async(entity,where)=>entity===Project?p:entity===Organization?{id:org}:entity===Team?{id:org}:entity===UserOrganization&&admin?{role:'ADMIN'}:entity===ProjectMember&&member?{projectId:pid,userId:uid,role:member}:null,
 find:async()=>[],getRepository:()=>({findOne:async()=>p}),query:async()=>[],create:(_e,v)=>v,save:async(_e,v)=>v,update:async()=>({affected:1})};
}
async function useManager(m,fn){const old=db.manager;db.manager=m;try{return await fn();}finally{db.manager=old;}}
test('organization membership is required even for a project manager',async()=>{await assert.rejects(projectAccess(uid,pid,org,manager({managerId:uid,belongs:false})),e=>e.statusCode===403);});
test('project read denies outsiders and mismatched workspace IDs',async()=>{await assert.rejects(projectAccess(uid,pid,org,manager({member:null})),e=>e.statusCode===403);await assert.rejects(projectAccess(uid,pid,other,manager()),e=>e.statusCode===404);});
test('project roles distinguish lead actions from membership administration',async()=>{const lead=await projectAccess(uid,pid,org,manager({member:'TEAM_LEAD'}));assert.equal(lead.manage,true);assert.equal(lead.manageMembers,false);const admin=await projectAccess(uid,pid,org,manager({member:null,admin:true}));assert.equal(admin.manageMembers,true);assert.equal(admin.role,'ORG_CREATOR');});
test('stage membership and role visibility are both enforced',async()=>{const m=manager({member:'TESTER'});m.find=async entity=>entity===WorkflowStage?[{id:'dev',visibility:'PROJECT_WIDE',settings:{category:'development',visibleToRoles:['BACKEND']}},{id:'test',visibility:'TEAM_ONLY',settings:{category:'testing',visibleToRoles:['TESTER']}},{id:'done',visibility:'PROJECT_WIDE',settings:{category:'done',visibleToRoles:['TESTER']}}]:[];const a=await projectAccess(uid,pid,org,m);assert.deepEqual((await visibleStages(a,uid,m)).map(s=>s.id),['done']);m.find=async entity=>entity===WorkflowStage?[{id:'test',visibility:'TEAM_ONLY',settings:{category:'testing',visibleToRoles:['TESTER']}}]:[{stageId:'test',userId:uid}];assert.equal((await visibleStages(a,uid,m)).length,1);});
test('task assignee cannot bypass revoked project membership',async()=>{const m=manager({member:null});const find=m.findOneBy;m.findOneBy=async(e,w)=>e===Task?{id:rid,projectId:pid,assigneeId:uid}:find(e,w);await assert.rejects(taskAccess(uid,rid,m),e=>e.statusCode===403);});
test('progress uses Done, not arbitrary percentages, and handles no tasks',()=>{assert.equal(taskSummary([]).progress,0);const now=new Date('2026-11-16T12:00:00Z');const result=taskSummary([{id:'a',status:'Done',completionPercentage:0,dueDate:new Date('2026-11-01')},{id:'b',status:'Todo',completionPercentage:100,dueDate:new Date('2026-11-15')},{id:'c',status:'In Progress',dueDate:new Date('2026-11-19')}],now);assert.equal(result.progress,33);assert.deepEqual(result.overdue.map(t=>t.id),['b']);assert.deepEqual(result.upcoming.map(t=>t.id),['c']);});
test('date ranges reject reversed and impossible dates',()=>{assert.equal(rangeSchema.safeParse({from:'2026-02-30',to:'2026-03-01'}).success,false);assert.equal(rangeSchema.safeParse({from:'2026-11-17',to:'2026-11-16'}).success,false);assert.equal(rangeSchema.safeParse({from:'2026-11-16',to:'2026-11-16'}).success,true);assert.equal(overlaps({startDate:'2026-11-16',endDate:'2026-11-20'},{startDate:'2026-11-20',endDate:'2026-11-23'}),true);});
test('document uploads validate bytes, lengths and safe supported formats',async()=>{const pdf=Buffer.from('%PDF-1.4\n%%EOF');await validateDocumentBytes(pdf,'test.pdf','application/pdf',pdf.length);const bad=Buffer.from('<script>bad</script>');await assert.rejects(validateDocumentBytes(bad,'test.pdf','application/pdf',bad.length));await assert.rejects(validateDocumentBytes(pdf,'test.pdf','application/pdf',pdf.length+1));await assert.rejects(validateDocumentBytes(Buffer.from([0xff]),'test.txt','text/plain',1));await assert.rejects(validateDocumentBytes(Buffer.from('a\0b'),'test.csv','text/csv',3));await validateDocumentBytes(Buffer.from('a,b\n1,2'),'test.csv','text/csv',7);});
test('document restrictions apply to admins and cross-organization access',async()=>{await useManager(manager({admin:true}),async()=>{const d={organizationId:org,projectId:pid,status:'ready',roles:['TESTER']};assert.equal(await canReadDocument(uid,org,d),false);assert.equal(await canReadDocument(uid,other,{...d,roles:[]}),false);assert.equal(await canReadDocument(uid,org,{...d,roles:[]}),true);assert.equal(await canReadDocument(uid,org,{...d,status:'pending',roles:[]}),false);});});
test('direct document download denies before contacting storage',async()=>{const original=db.getRepository, get=storage.get;let contacted=false;const d={id:rid,organizationId:org,projectId:pid,status:'ready',roles:['TESTER']};const query={addSelect(){return this},where(){return this},getOne:async()=>d};db.getRepository=()=>({createQueryBuilder:()=>query});storage.get=async()=>{contacted=true;};try{await useManager(manager(),()=>assert.rejects(documentContent(uid,org,rid),e=>e.statusCode===403));assert.equal(contacted,false);}finally{db.getRepository=original;storage.get=get;}});
test('member updates reject regular members and leads before writing',async()=>{const tx=db.transaction;let writes=0;try{for(const role of ['MEMBER','TEAM_LEAD']){const m=manager({member:role});m.save=async()=>{writes++;};db.transaction=fn=>fn(m);await assert.rejects(updateMember(uid,org,pid,{userId:other,role:'PROJECT_MANAGER'}),e=>e.statusCode===403);}assert.equal(writes,0);}finally{db.transaction=tx;}});
test('exclusive reservations are checked while holding the resource lock',async()=>{const tx=db.transaction;let locked=false,saved=false;const m=manager({member:'TEAM_LEAD'});m.getRepository=()=>({findOne:async options=>{locked=options.lock.mode==='pessimistic_write';return {id:rid,kind:'asset'};}});m.find=async()=>{assert.equal(locked,true);return [{startDate:'2026-11-16',endDate:'2026-11-20'}];};m.save=async()=>{saved=true;};db.transaction=fn=>fn(m);try{await assert.rejects(allocateResource(uid,org,pid,{resourceId:rid,startDate:'2026-11-20',endDate:'2026-11-21'}),e=>e.statusCode===409);assert.equal(saved,false);}finally{db.transaction=tx;}});
test('reusable links permit overlapping allocations',async()=>{const tx=db.transaction;const m=manager({member:'TEAM_LEAD'});m.getRepository=()=>({findOne:async()=>({id:rid,kind:'link'})});m.find=async()=>[{startDate:'2026-11-16',endDate:'2026-11-20'}];db.transaction=fn=>fn(m);try{const r=await allocateResource(uid,org,pid,{resourceId:rid,startDate:'2026-11-20',endDate:'2026-11-21'});assert.equal(r.projectId,pid);}finally{db.transaction=tx;}});
test('project document linking cannot widen restricted library visibility',async()=>{const get=db.getRepository;let write=false;db.getRepository=e=>({findOneBy:async()=>({id:rid,projectId:null,organizationId:org,status:'ready',roles:['OWNER']}),upsert:async()=>{write=true;}});try{await useManager(manager({member:'TEAM_LEAD'}),()=>assert.rejects(linkDocument(uid,org,pid,rid),e=>e.statusCode===403));assert.equal(write,false);}finally{db.getRepository=get;}});
test('reports filter hidden documents, private meetings, and out-of-range activity',async()=>{const get=db.getRepository;const m=manager({member:'TEAM_LEAD'});m.getRepository=()=>({createQueryBuilder:()=>({where(){return this},andWhere(){return this},orderBy(){return this},getMany:async()=>[]})});const current='2026-11-16T12:00:00Z';db.getRepository=e=>({find:async()=>e===ProjectMember?[]:e===ProjectDocument?[{id:rid,name:'secret',projectId:pid,organizationId:org,status:'ready',roles:['TESTER'],createdAt:new Date(current)}]:e===ProjectMessage?[{createdAt:current},{createdAt:'2020-01-01'}]:e===Meeting?[{id:'private',title:'Secret',visibility:'PRIVATE',createdById:other,participants:[],scheduledAt:current},{id:'public',title:'Visible',visibility:'PUBLIC',participants:[],scheduledAt:current}]:[],findBy:async()=>[],createQueryBuilder:()=>({where(){return this},getMany:async()=>[]})});try{const r=await useManager(m,()=>report(uid,org,pid,{from:'2026-11-16',to:'2026-11-16'}));assert.equal(r.documents.length,0);assert.equal(r.discussions.length,1);assert.deepEqual(r.meetings.map(x=>x.title),['Visible']);}finally{db.getRepository=get;}});
test('report HTTP preview and XLSX export use identical scoped service inputs',async()=>{
 const pm=require('../dist/services/ProjectManagementService');const ExcelJS=require('exceljs');const {PassThrough}=require('stream');
 const original=pm.report;const calls=[];
 const data={range:{from:'2026-11-01',to:'2026-11-16'},project:{name:'Permitted project'},summary:{total:1,done:0,progress:0,overdue:[]},snapshot:'Current snapshot',tasks:[{id:rid,name:'Visible task',status:'Todo'}],stages:[],members:[],worklogs:[],resources:[],documents:[{name:'Visible document'}],discussions:[],meetings:[],activity:[]};
 pm.report=async(...args)=>{calls.push(args);return data;};
 try {
  const router=require('../dist/routes/project.routes').default;
  const req={user:{id:uid},params:{id:pid},query:data.range,get:()=>org};let preview;
  const previewRoute=router.stack.find(l=>l.route?.path==='/:id/reports').route.stack[0].handle;
  await previewRoute(req,{json:value=>{preview=value;}},e=>{throw e;});
  const res=new PassThrough();const chunks=[];const headers={};res.set=values=>Object.assign(headers,values);res.on('data',c=>chunks.push(c));
  const exportRoute=router.stack.find(l=>l.route?.path==='/:id/reports/export').route.stack[0].handle;
  await exportRoute(req,res,e=>{throw e;});
  assert.deepEqual(calls,[[uid,org,pid,data.range],[uid,org,pid,data.range]]);
  const workbook=new ExcelJS.Workbook();await workbook.xlsx.load(Buffer.concat(chunks));
  assert.equal(workbook.getWorksheet('Summary').getCell('A2').value,preview.project.name);
  assert.equal(workbook.getWorksheet('Tasks').getCell('A2').value,'Visible task');
  assert.equal(workbook.getWorksheet('Documents').getCell('A2').value,'Visible document');
  assert.match(headers['Content-Type'],/spreadsheetml/);assert.equal(headers['Cache-Control'],'private, no-store');
 }finally{pm.report=original;}
});
test('Office uploads accept real XLSX bytes and reject a renamed spreadsheet',async()=>{
 const ExcelJS=require('exceljs');const workbook=new ExcelJS.Workbook();workbook.addWorksheet('Data').addRow(['Hello']);const bytes=Buffer.from(await workbook.xlsx.writeBuffer());
 await validateDocumentBytes(bytes,'data.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',bytes.length);
 await assert.rejects(validateDocumentBytes(bytes,'data.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document',bytes.length));
});
