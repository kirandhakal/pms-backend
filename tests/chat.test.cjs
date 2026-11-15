const {test}=require('node:test');
const assert=require('node:assert/strict');
const {access,room,targetSchema,send,history}=require('../dist/realtime/chat');
const {AppDataSource:db}=require('../dist/config/data-source');
const {Channel}=require('../dist/entities/Channel');
const {ChannelMember}=require('../dist/entities/ChannelMember');
const {Project}=require('../dist/entities/Project');
const a='11111111-1111-4111-8111-111111111111';
const b='22222222-2222-4222-8222-222222222222';
test('friend room is symmetric; scopes cannot collide',()=>{
 assert.equal(room(a,{kind:'friend',id:b}),room(b,{kind:'friend',id:a}));
 assert.notEqual(room(a,{kind:'channel',id:b}),room(a,{kind:'project',id:b}));
});
test('invalid targets and oversized text are rejected before persistence',async()=>{
 assert.equal(targetSchema.safeParse({kind:'friend',id:'bad'}).success,false);
 await assert.rejects(send(a,{kind:'friend',id:b,clientMessageId:a,body:'x'.repeat(4001)}),e=>e.statusCode===400);
 await assert.rejects(send(a,{kind:'friend',id:b,clientMessageId:a,body:'   '}),e=>e.statusCode===400);
});
test('nonfriend cannot read or join a friend conversation',async()=>{
 await assert.rejects(access(a,{kind:'friend',id:b},{findOneBy:async()=>null}),e=>e.statusCode===403);
});
test('public channel remains restricted to its team',async()=>{
 const m={findOneBy:async entity=>entity===Channel?{teamId:'other',type:'public'}:null,findOne:async()=>({team:{id:'mine'}})};
 await assert.rejects(access(a,{kind:'channel',id:b},m),e=>e.statusCode===403);
});
test('private channel requires explicit membership even within a team',async()=>{
 const m={findOneBy:async entity=>entity===Channel?{teamId:'mine',type:'private'}:null,findOne:async()=>({team:{id:'mine'}})};
 await assert.rejects(access(a,{kind:'channel',id:b},m),e=>e.statusCode===403);
 m.findOneBy=async entity=>entity===Channel?{teamId:'mine',type:'private'}:entity===ChannelMember?{userId:a}:null;
 await access(a,{kind:'channel',id:b},m);
});
test('project discussion rejects outsiders and permits project managers',async()=>{
 const m={findOneBy:async entity=>entity===Project?{managerId:b}:null};
 await assert.rejects(access(a,{kind:'project',id:b},m),e=>e.statusCode===403);
 await access(b,{kind:'project',id:b},m);
});
test('history rejects ambiguous and unbounded cursors',async()=>{
 await assert.rejects(history(a,{kind:'friend',id:b},{after:'1',before:'2'}));
 await assert.rejects(history(a,{kind:'friend',id:b},{limit:1000}));
 await assert.rejects(history(a,{kind:'friend',id:b},{after:'1 OR true'}));
});
test('lost ACK retry returns the original committed message without saving twice',async()=>{
 const original=db.transaction;let saved;let writes=0;
 const q={where(){return this},andWhere(){return this},async getOne(){return saved}};
 const manager={query:async()=>{},findOneBy:async()=>({}),getRepository:()=>({createQueryBuilder:()=>q}),create:(_entity,value)=>value,save:async(_entity,value)=>{writes++;saved={...value,id:b,chatSequence:'1',createdAt:new Date()};return saved}};
 db.transaction=async fn=>fn(manager);
 try {
  const request={kind:'friend',id:b,body:'hello',clientMessageId:a};
  const first=await send(a,request);const retry=await send(a,{...request,body:'changed retry'});
  assert.deepEqual(first,retry);assert.equal(writes,1);assert.equal(retry.body,'hello');
 } finally {db.transaction=original;}
});
