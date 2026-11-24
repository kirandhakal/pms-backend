const {test}=require('node:test');
const assert=require('node:assert/strict');
const {AppDataSource:db}=require('../dist/config/data-source');
const {ChatAttachment}=require('../dist/entities/ChatAttachment');
const {Channel}=require('../dist/entities/Channel');
const {mediaLimits,validateFileMetadata,validateFileBytes,claimAttachments,mediaPolicy,updateMediaPolicy,uploadAttachment,cancelAttachment}=require('../dist/services/ChatAttachmentService');
const {chatStorageService:storage}=require('../dist/services/ChatStorageService');
const {sendSchema,changeMessage}=require('../dist/realtime/chat');
const a='11111111-1111-4111-8111-111111111111';
const b='22222222-2222-4222-8222-222222222222';
const c='33333333-3333-4333-8333-333333333333';
const target={kind:'friend',id:b};
const key=`friend:${a}:${b}`;
const pdf=Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF');
const file=()=>({id:c,uploaderId:a,conversationKey:key,name:'report.pdf',mimeType:'application/pdf',size:pdf.length,objectKey:'chat/test',status:'ready',messageId:null,expiresAt:new Date(Date.now()+60000)});

test('environment limits reject unsafe values and enforce size',()=>{
 const original=process.env.CHAT_MAX_FILE_SIZE_MB;
 try {
  process.env.CHAT_MAX_FILE_SIZE_MB='1';
  assert.equal(mediaLimits().maxFileSizeBytes,1048576);
  assert.throws(()=>validateFileMetadata('file.pdf','application/pdf',1048577,['application/pdf']),e=>e.statusCode===413);
  process.env.CHAT_MAX_FILE_SIZE_MB='0';assert.throws(mediaLimits);
  process.env.CHAT_MAX_FILE_SIZE_MB='invalid';assert.throws(mediaLimits);
 } finally {if(original===undefined)delete process.env.CHAT_MAX_FILE_SIZE_MB;else process.env.CHAT_MAX_FILE_SIZE_MB=original;}
});
test('server validates actual file bytes, not browser MIME claims',async()=>{
 await validateFileBytes(pdf,file(),['application/pdf']);
 const html=Buffer.from('<script>alert(1)</script>');
 await assert.rejects(validateFileBytes(html,{...file(),size:html.length},['application/pdf']),e=>e.statusCode===400);
 await assert.rejects(validateFileBytes(pdf,{...file(),size:pdf.length+1},['application/pdf']),e=>e.statusCode===400);
 assert.throws(()=>validateFileMetadata('payload.svg','image/svg+xml',100,['image/svg+xml']),e=>e.statusCode===400);
 assert.throws(()=>validateFileMetadata('report.png','application/pdf',100,['application/pdf']),e=>e.statusCode===400);
});
test('empty text is allowed only with attachments; attachment IDs must be distinct',()=>{
 assert.equal(sendSchema.safeParse({...target,clientMessageId:a,attachmentIds:[c]}).success,true);
 assert.equal(sendSchema.safeParse({...target,clientMessageId:a,attachmentIds:[]}).success,false);
 assert.equal(sendSchema.safeParse({...target,clientMessageId:a,attachmentIds:[c,c]}).success,false);
});
test('attachment claim rejects theft, cross-conversation reuse, expiry, incomplete upload and reused attachments',async()=>{
 let files=[file()],linked=false;
 const q={setLock(){return this},where(){return this},orderBy(){return this},getMany:async()=>files};
 const m={findOneBy:async()=>({}),getRepository:()=>({createQueryBuilder:()=>q}),update:async()=>{linked=true;}};
 for(const patch of [{uploaderId:b},{conversationKey:'project:other'},{expiresAt:new Date(0)},{status:'pending'},{messageId:b}]){
  files=[{...file(),...patch}];linked=false;
  await assert.rejects(claimAttachments(m,a,target,[c],b),e=>e.statusCode===403);assert.equal(linked,false);
 }
 files=[file()];await claimAttachments(m,a,target,[c],b);assert.equal(linked,true);
});
test('channel owner controls types and restricted types are enforced again at send time',async()=>{
 const originalFindBy=db.manager.findOneBy,originalFind=db.manager.findOne;
 db.manager.findOneBy=async entity=>entity===Channel?{id:b,teamId:'team',type:'public',createdById:a,allowedFileTypes:['image/png']}:{userId:a};
 db.manager.findOne=async()=>({team:{id:'team'}});
 try {
  const owner=await mediaPolicy(a,{kind:'channel',id:b});assert.equal(owner.canManage,true);assert.equal(owner.canPin,true);
  const member=await mediaPolicy(c,{kind:'channel',id:b});assert.equal(member.canManage,false);assert.equal(member.canPin,false);
  await assert.rejects(updateMediaPolicy(c,{kind:'channel',id:b},{allowedTypes:['application/pdf']}),e=>e.statusCode===403);
  const q={setLock(){return this},where(){return this},orderBy(){return this},getMany:async()=>[{...file(),conversationKey:`channel:${b}`} ]};
  const m={findOneBy:db.manager.findOneBy,findOne:db.manager.findOne,getRepository:()=>({createQueryBuilder:()=>q})};
  await assert.rejects(claimAttachments(m,a,{kind:'channel',id:b},[c],b),e=>e.statusCode===400);
 }finally{db.manager.findOneBy=originalFindBy;db.manager.findOne=originalFind;}
});
test('cancelled upload cannot become ready after its storage write finishes',async()=>{
 const originalGet=db.getRepository,originalAccess=db.manager.findOneBy,originalPut=storage.put,originalRemove=storage.remove;
 let status='pending',removed=0;
 db.manager.findOneBy=async()=>({});
 db.getRepository=()=>({findOneBy:async()=>({...file(),status}),update:async(criteria,values)=>{if(criteria.status&&criteria.status!==status)return {affected:0};status=values.status;return {affected:1};}});
 storage.put=async()=>{status='deleted';};storage.remove=async()=>{removed++;};
 try {
  await assert.rejects(uploadAttachment(a,target,c,pdf),e=>e.statusCode===409);
  assert.equal(status,'deleted');assert.equal(removed,1);
 }finally{db.getRepository=originalGet;db.manager.findOneBy=originalAccess;storage.put=originalPut;storage.remove=originalRemove;}
});
test('linked attachments cannot be cancelled',async()=>{
 const originalGet=db.getRepository,originalAccess=db.manager.findOneBy;
 db.manager.findOneBy=async()=>({});db.getRepository=()=>({update:async()=>({affected:0})});
 try{await assert.rejects(cancelAttachment(a,target,c),e=>e.statusCode===409);}
 finally{db.getRepository=originalGet;db.manager.findOneBy=originalAccess;}
});
test('other members cannot remove someone else\'s message or pin in a channel',async()=>{
 const original=db.transaction;
 const message={id:c,senderId:b,body:'private',isDeleted:false};
 const q={where(){return this},andWhere(){return this},getOne:async()=>message};
 const m={query:async()=>{},findOneBy:async entity=>entity===Channel?{teamId:'team',type:'public',createdById:b}:{},findOne:async()=>({team:{id:'team'}}),getRepository:()=>({createQueryBuilder:()=>q})};
 db.transaction=async fn=>fn(m);
 try{
  await assert.rejects(changeMessage(a,{...target,messageId:c,action:'remove'}),e=>e.statusCode===403);
  await assert.rejects(changeMessage(a,{kind:'channel',id:b,messageId:c,action:'pin'}),e=>e.statusCode===403);
 }finally{db.transaction=original;}
});
test('removal scrubs content, revokes attachments and records a new catch-up version',async()=>{
 const {ChatEvent}=require('../dist/entities/ChatEvent');
 const original=db.transaction;let revoked=false,eventCount=0;
 const message={id:c,senderId:a,body:'remove me',isDeleted:false,pinnedAt:new Date(),chatSequence:'1',createdAt:new Date()};
 const q={where(){return this},andWhere(){return this},getOne:async()=>message};
 const manager={query:async()=>{},findOneBy:async()=>({}),
  getRepository:()=>({createQueryBuilder:()=>q,update:async(_id,value)=>Object.assign(message,value)}),
  update:async entity=>{if(entity===ChatAttachment)revoked=true;},create:(_entity,value)=>value,
  save:async(entity,value)=>{if(entity===ChatEvent){eventCount++;return {...value,sequence:'44'};}return value;}};
 db.transaction=async fn=>fn(manager);
 try{
  const result=await changeMessage(a,{...target,messageId:c,action:'remove'});
  assert.equal(result.body,'');assert.equal(result.isDeleted,true);assert.equal(result.pinnedAt,null);
  assert.equal(result.attachments.length,0);assert.equal(result.version,'44');assert.equal(eventCount,1);assert.equal(revoked,true);
 }finally{db.transaction=original;}
});
