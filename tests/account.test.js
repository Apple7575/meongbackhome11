import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createApp} from '../server/app.js';
import {createMailer} from '../server/mail.js';
import {seed} from '../src/seed.js';
async function fixture(options={}) {
  const mails=[];
  const service=createApp({databasePath:':memory:',examples:false,requireVerification:true,publicOrigin:'https://meong.test',mailer:{configured:true,send:async mail=>{mails.push(mail);}},...options});
  const server=service.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const client=()=>{let cookie='';return async(path,body)=>{const res=await fetch(origin+path,{method:body?'POST':'GET',headers:{cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});const cookies=res.headers.getSetCookie();if(cookies.length)cookie=cookies.at(-1).split(';')[0];return {status:res.status,data:await res.json()};};};
  return {...service,mails,client,async stop(){service.close();server.closeAllConnections();await new Promise(r=>server.close(r));}};
}
const signup={email:'owner@example.com',name:'보호자',password:'original-password-123'};
const token=mail=>mail.text.match(/token=([a-f0-9]{64})/)[1];
test('verification delivers hash-only expiring token, confirms email, revokes old sessions, rejects reuse and wrong purpose',async()=>{
  const f=await fixture();try{
    const owner=f.client(),other=f.client();
    assert.equal((await owner('/api/auth/register',signup)).data.emailDelivery,'sent');
    assert.equal((await owner('/api/state')).data.user.verified,false);
    const dog={...seed().dogs[0],id:'verification-dog'};
    const changes={operations:[{collection:'dogs',value:dog}]};
    assert.equal((await owner('/api/changes',changes)).status,403);
    const raw=token(f.mails[0]);
    assert.notEqual(f.db.prepare('SELECT token FROM account_tokens').get().token,raw);
    assert.equal((await other('/api/auth/reset',{token:raw,password:'replacement-password'})).status,400);
    assert.equal((await other('/api/auth/verify',{token:raw})).status,200);
    // 이전 기기의 로그인은 끊기고, 링크를 연 기기는 바로 인증된 상태로 로그인된다.
    assert.equal((await owner('/api/state')).data.user.registered,false);
    assert.equal((await other('/api/state')).data.user.verified,true);
    assert.equal((await other('/api/auth/verify',{token:raw})).status,400);
    await owner('/api/auth/login',signup);
    assert.equal((await owner('/api/state')).data.user.verified,true);
    assert.equal((await owner('/api/changes',changes)).status,200);
  }finally{await f.stop();}
});
test('password reset is single use, expires, invalidates all tokens and sessions, and does not disclose absent accounts',async()=>{
  const f=await fixture();try{
    const owner=f.client(),other=f.client();await owner('/api/auth/register',signup);await other('/api/auth/login',signup);
    const known=await owner('/api/auth/forgot',{email:signup.email});
    const missing=await owner('/api/auth/forgot',{email:'absent@example.com'});
    assert.deepEqual(known,missing);
    const raw=token(f.mails.at(-1));
    assert.equal((await other('/api/auth/reset',{token:raw,password:'new-password-456'})).status,200);
    assert.equal((await owner('/api/state')).data.user.registered,false);
    assert.equal((await other('/api/state')).data.user.registered,false);
    assert.equal((await other('/api/auth/reset',{token:raw,password:'another-password'})).status,400);
    assert.equal((await owner('/api/auth/login',signup)).status,401);
    assert.equal((await owner('/api/auth/login',{...signup,password:'new-password-456'})).status,200);
    await owner('/api/auth/forgot',{email:signup.email});
    const expired=token(f.mails.at(-1));
    f.db.prepare('UPDATE account_tokens SET expires=0 WHERE token=?').run(createHash('sha256').update(expired).digest('hex'));
    assert.equal((await other('/api/auth/reset',{token:expired,password:'another-password'})).status,400);
  }finally{await f.stop();}
});
test('unconfigured mail fails explicitly and account deletion requires password and removes photos',async()=>{
  const f=await fixture({mailer:{configured:false}});try{
    const owner=f.client();await owner('/api/auth/register',signup);
    assert.equal((await owner('/api/auth/resend',{})).status,503);
    assert.equal((await owner('/api/auth/forgot',{email:signup.email})).status,503);
    const uid=(await owner('/api/state')).data.user.id;
    f.db.prepare('INSERT INTO docs VALUES(?,?,?,?,?)').run('profiles','my-photo',uid,1,JSON.stringify({image:'private-photo'}));
    assert.equal((await owner('/api/auth/delete',{password:'wrong'})).status,401);
    assert.equal((await owner('/api/auth/delete',{password:signup.password})).status,200);
    assert.equal(f.db.prepare('SELECT count(*) n FROM docs WHERE owner=?').get(uid).n,0);
    assert.equal(f.db.prepare('SELECT count(*) n FROM users WHERE id=?').get(uid).n,0);
  }finally{await f.stop();}
});
test('Resend adapter uses verified configured sender, idempotency and refuses failed delivery',async()=>{
  let call;
  const mailer=createMailer({RESEND_API_KEY:'test-only',MAIL_FROM:'noreply@test.example',PUBLIC_ORIGIN:'https://test.example'},async(url,options)=>{call={url,...options};return {ok:true};});
  await mailer.send({to:'owner@test.example',subject:'인증',text:'link',id:'unique'});
  assert.equal(call.headers['Idempotency-Key'],'unique');assert.equal(JSON.parse(call.body).from,'noreply@test.example');
  await assert.rejects(createMailer({},()=>{}).send({}));
  await assert.rejects(createMailer({RESEND_API_KEY:'test',MAIL_FROM:'test@example.com',PUBLIC_ORIGIN:'https://test.example'},async()=>({ok:false})).send({id:'failure'}));
});
