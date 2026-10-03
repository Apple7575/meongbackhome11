// 운영 안전장치: IP별 쓰기 제한, 손님 읽기(계정 안 만듦), 글 삭제·운영자 숨김, 같은 글 다시 보내기, 직렬화 실패 재시도
import test from 'node:test';
import assert from 'node:assert/strict';
import {createCloudFixture} from './cloud-fixture.js';
import {createPostgres} from '../server/postgres.js';
import {clientIp} from '../server/cloud-app.js';

async function fixture(options={}){
  const service=await createCloudFixture({secure:false,requireVerification:false,publicOrigin:'https://example.com',mailer:{configured:true,async send(){}},...options});
  const server=service.app.listen(0,'127.0.0.1');
  await new Promise(r=>server.once('listening',r));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const client=()=>{let cookie='';const call=async(path,body)=>{
    const res=await fetch(origin+path,{method:body?'POST':'GET',headers:{Cookie:cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    const set=res.headers.getSetCookie();
    if(set.length)cookie=set.at(-1).split(';')[0];
    const data=res.headers.get('content-type')?.includes('application/json')?await res.json():await res.text();
    return {status:res.status,data,setCookie:set.length>0};
  };return call;};
  const count=async table=>Number((await service.db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get()).n);
  return {...service,origin,client,count,async stop(){await new Promise(r=>server.close(r));await service.close();}};
}
const password='test-password-123';
const dog={id:'dog-a',name:'보리',breed:'말티즈',color:'흰색',size:'소형',image:'/assets/mascot-home.webp',region:'서울',location:'석촌호수',coords:[37.51,127.1],time:new Date().toISOString()};
const sighting=(id,extra={})=>({id,dogId:null,kind:'목격',region:'서울',coords:[37.51,127.1],location:'석촌호수 산책로',time:new Date().toISOString(),...extra});
const create=(c,collection,value,revision)=>c('/api/changes',{operations:[{collection,value,revision}]});
async function owner(f,email='owner@example.com'){
  const c=f.client();
  assert.equal((await c('/api/auth/register',{email,password})).status,200);
  return c;
}

test('cookie-less reads stay guests: no users or sessions are written', async()=>{
  const f=await fixture();
  try{
    const before=[await f.count('users'),await f.count('sessions')];
    for(let i=0;i<3;i++){
      const res=await f.client()('/api/state');
      assert.equal(res.status,200);
      assert.equal(res.setCookie,false);
      assert.equal(res.data.user.id,'');
      assert.equal(res.data.user.registered,false);
      assert.deepEqual(res.data.notifications,[]);
    }
    assert.deepEqual([await f.count('users'),await f.count('sessions')],before);
    // 첫 쓰기에서야 익명 계정이 생기고, 같은 쿠키로 다시 오면 그 계정을 쓴다.
    const guest=f.client();
    assert.equal((await guest('/api/session',{})).status,200);
    assert.equal((await create(guest,'reports',sighting('sighting-g'))).status,200);
    const me=(await guest('/api/state')).data;
    assert.ok(me.user.id);
    assert.equal(me.reports.find(r=>r.id==='sighting-g').canDelete,true);
    assert.equal(await f.count('users'),before[0]+1);
  }finally{await f.stop();}
});

test('public writes are limited per IP even when every request comes with a fresh cookie', async()=>{
  const f=await fixture();
  try{
    for(let i=0;i<10;i++)assert.equal((await create(f.client(),'reports',sighting(`sighting-${i}`))).status,200);
    const blocked=await create(f.client(),'reports',sighting('sighting-x'));
    assert.equal(blocked.status,429);
    assert.equal(blocked.data.error,'잠시 후 다시 시도해주세요.');
    for(let i=0;i<5;i++)assert.equal((await create(f.client(),'moderation',{id:`flag-${i}`,target:'dog-a',reason:'기타'})).status,200);
    assert.equal((await create(f.client(),'moderation',{id:'flag-x',target:'dog-a',reason:'기타'})).status,429);
    // 끄면(브라우저 테스트용) 제한하지 않는다.
    const open=await fixture({ipRateLimit:false});
    try{for(let i=0;i<12;i++)assert.equal((await create(open.client(),'reports',sighting(`s-${i}`))).status,200);}
    finally{await open.stop();}
  }finally{await f.stop();}
});

test('client IP: trusts Vercel forwarding headers only on Vercel', ()=>{
  const req=headers=>({ip:'10.0.0.1',get:name=>headers[name]});
  assert.equal(clientIp(req({'x-forwarded-for':'1.2.3.4, 10.0.0.1'}),{VERCEL:'1'}),'1.2.3.4');
  assert.equal(clientIp(req({'x-real-ip':'5.6.7.8','x-forwarded-for':'1.2.3.4'}),{VERCEL:'1'}),'5.6.7.8');
  assert.equal(clientIp(req({'x-forwarded-for':'1.2.3.4'}),{}),'10.0.0.1');
});

test('authors delete their own reports and sightings; others cannot', async()=>{
  const f=await fixture();
  try{
    const guardian=await owner(f),witness=f.client(),stranger=f.client();
    assert.equal((await create(guardian,'dogs',dog)).status,200);
    assert.equal((await create(guardian,'updates',{id:'update-a',dogId:'dog-a',text:'공원 확인'})).status,200);
    assert.equal((await create(witness,'reports',sighting('sighting-a',{dogId:'dog-a'}))).status,200);
    assert.equal((await create(witness,'reports',sighting('sighting-b'))).status,200);
    assert.equal((await stranger('/api/docs/delete',{collection:'reports',id:'sighting-b'})).status,403);
    assert.equal((await guardian('/api/docs/delete',{collection:'reports',id:'sighting-b'})).status,403);
    assert.equal((await f.client()('/api/docs/delete',{collection:'reports',id:'sighting-b'})).status,403);
    assert.equal((await witness('/api/docs/delete',{collection:'users',id:'x'})).status,400);
    const after=await witness('/api/docs/delete',{collection:'reports',id:'sighting-b'});
    assert.equal(after.status,200);
    assert.equal(after.data.reports.some(r=>r.id==='sighting-b'),false);
    assert.equal((await witness('/api/docs/delete',{collection:'reports',id:'sighting-b'})).status,404);
    // 실종 신고를 지우면 수색 상황도 지워지고, 이웃의 제보는 남되 연결이 끊긴다.
    assert.equal((await witness('/api/docs/delete',{collection:'dogs',id:'dog-a'})).status,403);
    assert.equal((await guardian('/api/docs/delete',{collection:'dogs',id:'dog-a'})).status,200);
    const state=(await stranger('/api/state')).data;
    assert.equal(state.dogs.length,0);
    assert.equal(state.updates.length,0);
    assert.equal(state.reports.find(r=>r.id==='sighting-a').dogId,null);
  }finally{await f.stop();}
});

test('admin hide removes a report from everyone else, share pages and the sitemap, and survives edits', async()=>{
  const f=await fixture();
  try{
    const guardian=await owner(f),admin=await owner(f,'admin@example.com'),stranger=f.client();
    await f.db.prepare("UPDATE users SET role='admin' WHERE email=?").run('admin@example.com');
    assert.equal((await create(guardian,'dogs',dog)).status,200);
    assert.equal((await guardian('/api/admin/hide',{collection:'dogs',id:'dog-a',hidden:true})).status,403);
    const hidden=await admin('/api/admin/hide',{collection:'dogs',id:'dog-a',hidden:true});
    assert.equal(hidden.status,200);
    assert.equal(hidden.data.dogs.find(d=>d.id==='dog-a').hidden,true);
    assert.equal((await stranger('/api/state')).data.dogs.length,0);
    assert.equal((await guardian('/api/state')).data.dogs.length,0);
    assert.doesNotMatch((await stranger('/d/dog-a')).data,/보리/);
    assert.doesNotMatch((await stranger('/sitemap.xml')).data,/dog-a/);
    // 글쓴이가 고쳐도 숨김은 풀리지 않는다.
    const revision=(await admin('/api/state')).data.dogs[0].revision;
    assert.equal((await create(guardian,'dogs',{id:'dog-a',name:'보리2'},revision)).status,200);
    assert.equal((await stranger('/api/state')).data.dogs.length,0);
    assert.equal((await admin('/api/admin/hide',{collection:'dogs',id:'dog-a',hidden:false})).status,200);
    assert.equal((await stranger('/api/state')).data.dogs[0].name,'보리2');
    assert.match((await stranger('/sitemap.xml')).data,/dog-a/);
  }finally{await f.stop();}
});

test('re-sending the same new sighting (timeout retry) is saved once and notifies the owner once', async()=>{
  const f=await fixture();
  try{
    const guardian=await owner(f),witness=f.client();
    assert.equal((await create(guardian,'dogs',dog)).status,200);
    assert.equal((await witness('/api/session',{})).status,200);
    const report=sighting('sighting-retry',{dogId:'dog-a'});
    assert.equal((await create(witness,'reports',report)).status,200);
    const again=await create(witness,'reports',report);
    assert.equal(again.status,200);
    assert.equal(again.data.reports.filter(r=>r.id==='sighting-retry').length,1);
    const notices=(await guardian('/api/state')).data.notifications.filter(n=>n.title==='새로운 목격 제보가 도착했어요');
    assert.equal(notices.length,1);
    // 다른 사람이 같은 id로 보내면 덮어쓰지 않는다.
    assert.equal((await create(f.client(),'reports',report)).status,409);
  }finally{await f.stop();}
});

test('daily maintenance removes idle anonymous users but keeps ones with posts or sessions', async()=>{
  const f=await fixture();
  const previous=process.env.CRON_SECRET;process.env.CRON_SECRET='test-cron';
  try{
    const idle=f.client(),active=f.client(),poster=f.client();
    await idle('/api/session',{});await active('/api/session',{});
    assert.equal((await create(poster,'reports',sighting('sighting-keep'))).status,200);
    const registered=await owner(f);
    // idle·poster의 세션이 끝났다고 친다.
    const ids=(await f.db.prepare('SELECT user_id FROM sessions').all()).map(r=>r.user_id);
    const activeId=(await active('/api/state')).data.user.id,registeredId=(await registered('/api/state')).data.user.id;
    for(const id of ids)if(id!==activeId&&id!==registeredId)await f.db.prepare('DELETE FROM sessions WHERE user_id=?').run(id);
    const before=await f.count('users');
    const result=await (await fetch(`${f.origin}/api/maintenance`,{headers:{authorization:'Bearer test-cron'}})).json();
    assert.equal(result.anonymous,1);
    assert.equal(await f.count('users'),before-1);
    assert.equal((await f.client()('/api/state')).data.reports.some(r=>r.id==='sighting-keep'),true);
  }finally{process.env.CRON_SECRET=previous;if(previous===undefined)delete process.env.CRON_SECRET;await f.stop();}
});

test('serialization failures (40001) are retried server-side before giving up', async()=>{
  let commits=0;const statements=[];
  const client={async query(sql){statements.push(sql);if(sql==='COMMIT'&&++commits===1)throw Object.assign(new Error('could not serialize'),{code:'40001'});return {rows:[],rowCount:0};},release(){}};
  const db=createPostgres({pool:{connect:async()=>client,query:client.query,end:async()=>{}}});
  let runs=0;
  const result=await new Promise((resolve,reject)=>db.middleware({}, {once(){}},()=>db.transaction(async()=>{runs++;return 'ok';}).then(resolve,reject)));
  assert.equal(result,'ok');
  assert.equal(runs,2);
  assert.equal(statements.filter(s=>s.startsWith('BEGIN')).length,2);
  // 다른 오류나 계속되는 실패는 그대로 올린다.
  const failing={async query(sql){if(sql==='COMMIT')throw Object.assign(new Error('x'),{code:'40001'});return {rows:[]};},release(){}};
  const db2=createPostgres({pool:{connect:async()=>failing,query:failing.query,end:async()=>{}}});
  await assert.rejects(new Promise((resolve,reject)=>db2.middleware({}, {once(){}},()=>db2.transaction(async()=>1).then(resolve,reject))),{code:'40001'});
});

test('local SQLite server: same delete, hide and retry rules as the cloud server', async()=>{
  const {createApp}=await import('../server/app.js');
  const service=createApp({databasePath:':memory:',examples:false,requireVerification:false,mailer:{configured:false}});
  const server=service.app.listen(0,'127.0.0.1');
  await new Promise(r=>server.once('listening',r));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const client=()=>{let cookie='';return async(path,body)=>{
    const res=await fetch(origin+path,{method:body?'POST':'GET',headers:{Cookie:cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    if(res.headers.getSetCookie().length)cookie=res.headers.getSetCookie().at(-1).split(';')[0];
    return {status:res.status,data:await res.json()};
  };};
  try{
    const guardian=client(),admin=client(),witness=client(),stranger=client();
    assert.equal((await guardian('/api/auth/register',{email:'owner@example.com',password})).status,200);
    assert.equal((await admin('/api/auth/register',{email:'admin@example.com',password})).status,200);
    service.db.prepare("UPDATE users SET role='admin' WHERE email=?").run('admin@example.com');
    assert.equal((await create(guardian,'dogs',dog)).status,200);
    const report=sighting('sighting-a',{dogId:'dog-a'});
    assert.equal((await create(witness,'reports',report)).status,200);
    assert.equal((await create(witness,'reports',report)).status,200);
    assert.equal((await guardian('/api/state')).data.notifications.filter(n=>n.title==='새로운 목격 제보가 도착했어요').length,1);
    assert.equal((await admin('/api/admin/hide',{collection:'dogs',id:'dog-a',hidden:true})).status,200);
    assert.equal((await stranger('/api/state')).data.dogs.length,0);
    assert.equal((await admin('/api/admin/hide',{collection:'dogs',id:'dog-a',hidden:false})).status,200);
    assert.equal((await stranger('/api/state')).data.dogs[0].id,'dog-a');
    assert.equal((await stranger('/api/docs/delete',{collection:'reports',id:'sighting-a'})).status,403);
    assert.equal((await witness('/api/docs/delete',{collection:'reports',id:'sighting-a'})).status,200);
    assert.equal((await guardian('/api/docs/delete',{collection:'dogs',id:'dog-a'})).status,200);
    assert.equal((await stranger('/api/state')).data.dogs.length,0);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));service.close();}
});
