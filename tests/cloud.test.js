import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
import {createPostgres} from '../server/postgres.js';
import {createApp} from '../server/cloud-app.js';
import sharp from 'sharp';

async function fixture(options={}){
  const pg=new PGlite();
  await pg.exec(readFileSync(new URL('../supabase/migrations/202609080001_meongback.sql',import.meta.url),'utf8'));
  // PGlite has one connection. Serialize independent requests and transactions.
  let queue=Promise.resolve();
  const lock=async()=>{let release;const previous=queue;queue=new Promise(r=>release=r);await previous;return release;};
  const pool={
    async query(sql,args){const release=await lock();try{return await pg.query(sql,args);}finally{release();}},
    async connect(){const release=await lock();return {query:(sql,args)=>pg.query(sql,args),release};},
    end:()=>pg.close(),
  };
  const blobs=new Map(),mail=[],jobs=[];
  const storage={async upload(path,bytes){blobs.set(path,bytes);return {};},async download(path){return blobs.has(path)?{data:new Blob([blobs.get(path)])}:{error:true};},async remove(paths){paths.forEach(p=>blobs.delete(p));return {};}};
  const service=await createApp({database:createPostgres({pool}),storage,secure:false,requireVerification:true,publicOrigin:'https://example.com',mailer:{configured:true,async send(m){mail.push(m);}},defer:p=>jobs.push(p),...options});
  const server=service.app.listen(0,'127.0.0.1');
  await new Promise(r=>server.once('listening',r));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const client=()=>{let cookie='';return async(path,body)=>{
    const res=await fetch(origin+path,{method:body?'POST':'GET',headers:{Cookie:cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    if(res.headers.getSetCookie().length)cookie=res.headers.getSetCookie().at(-1).split(';')[0];
    const data=res.headers.get('content-type')?.includes('application/json')?await res.json():Buffer.from(await res.arrayBuffer());
    return {status:res.status,data};
  };};
  return {...service,client,mail,blobs,async stop(){await new Promise(r=>server.close(r));await Promise.allSettled(jobs);await service.close();}};
}
const password='test-password-123';
test('missing mail configuration leaves reads available and refuses registration before creating an unusable account',async()=>{
  const f=await fixture({mailer:{configured:false}});
  try{
    const client=f.client();
    assert.equal((await client('/api/health')).status,200);
    assert.equal((await client('/api/state')).status,200);
    assert.equal((await client('/api/auth/register',{email:'pending@example.com',password})).status,503);
    assert.equal((await client('/api/state')).data.user.registered,false);
  }finally{await f.stop();}
});
const token=mail=>/token=([a-f0-9]{64})/.exec(mail.text)[1];
const dog=image=>({id:'dog-a',name:'보리',breed:'말티즈',color:'흰색',size:'소형',image,region:'서울',location:'석촌호수',coords:[37.51,127.1],time:new Date().toISOString()});
const change=(c,collection,value,revision)=>c('/api/changes',{operations:[{collection,value,revision}]});

test('PostgreSQL: email verification, durable reports, photo access, revisions, reset and deletion',async()=>{
  const f=await fixture();
  try{
    const owner=f.client(),witness=f.client(),stranger=f.client();
    assert.equal((await owner('/api/auth/register',{email:'owner@example.com',password})).status,200);
    assert.equal((await change(owner,'dogs',dog('/assets/mascot-home.webp'))).status,403);
    const verify=token(f.mail[0]);
    assert.equal((await owner('/api/auth/verify',{token:verify})).status,200);
    // 링크를 연 기기는 바로 인증된 상태로 로그인된다.
    assert.equal((await owner('/api/state')).data.user.verified,true);
    assert.equal((await owner('/api/auth/verify',{token:verify})).status,400);
    assert.equal((await owner('/api/auth/login',{email:'owner@example.com',password})).status,200);
    const bytes=await sharp({create:{width:8,height:8,channels:3,background:'#fff'}}).png().toBuffer();
    const uploaded=await witness('/api/photos',{image:`data:image/png;base64,${bytes.toString('base64')}`});
    assert.equal(uploaded.status,200);
    assert.equal((await stranger(uploaded.data.image)).status,404);
    assert.equal((await change(owner,'dogs',dog(uploaded.data.image))).status,400);
    assert.equal((await change(owner,'dogs',dog('/assets/mascot-home.webp'))).status,200);
    // 공유 링크 미리보기는 로그인 없이 읽힌다.
    assert.match((await stranger('/d/dog-a')).data.toString(),/og:title" content="보리를 찾고 있어요"/);
    const report={id:'report-a',dogId:'dog-a',kind:'보호 중',region:'서울',coords:[37.51234,127.12345],location:'비공개 주소',time:new Date().toISOString(),image:uploaded.data.image,heading:90};
    assert.equal((await change(witness,'reports',report)).status,200);
    assert.equal((await owner(uploaded.data.image)).status,200);
    assert.equal((await stranger(uploaded.data.image)).status,404);
    const state=(await stranger('/api/state')).data;
    assert.equal(state.realtimeMode,'poll');assert.equal(state.storageMode,'supabase');
    assert.equal(state.reports[0].image,'');assert.equal(state.reports[0].heading,null);
    assert.equal((await change(stranger,'dogs',{id:'dog-a',status:'reunited'},1)).status,403);
    assert.equal((await change(owner,'dogs',{id:'dog-a',status:'reunited'},1)).status,200);
    assert.equal((await change(owner,'dogs',{id:'dog-a',status:'missing'},1)).status,409);
    assert.ok((await witness('/api/state')).data.notifications.length>0);
    assert.equal((await owner('/api/auth/forgot',{email:'owner@example.com'})).status,200);
    for(let i=0;i<30&&f.mail.length<2;i++)await new Promise(r=>setTimeout(r,10));
    const reset=token(f.mail.at(-1));
    assert.equal((await owner('/api/auth/reset',{token:reset,password:'changed-password-123'})).status,200);
    assert.equal((await owner('/api/auth/reset',{token:reset,password})).status,400);
    assert.equal((await owner('/api/auth/login',{email:'owner@example.com',password:'changed-password-123'})).status,200);
    assert.equal((await owner('/api/auth/delete',{password:'changed-password-123'})).status,200);
    assert.equal((await witness('/api/state')).data.dogs.length,0);
    assert.equal((await witness('/api/state')).data.reports[0].dogId,null);
  }finally{await f.stop();}
});
