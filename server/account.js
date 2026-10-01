import {randomBytes, createHash, scryptSync, timingSafeEqual} from 'node:crypto';
const hash = value => createHash('sha256').update(value).digest('hex');
const reject = (status,message) => {throw Object.assign(new Error(message),{status});};
import { accountEmail } from './email-template.js';

export function installAccount({app,db,rate,mailer,origin,invalidate,signIn=()=>{},changed=()=>{}}) {
  if (!db.prepare('PRAGMA table_info(users)').all().some(c=>c.name==='verified_at')) db.exec('ALTER TABLE users ADD COLUMN verified_at INTEGER');
  db.exec('CREATE TABLE IF NOT EXISTS account_tokens(token TEXT PRIMARY KEY,user_id TEXT NOT NULL,purpose TEXT NOT NULL,expires INTEGER NOT NULL); CREATE INDEX IF NOT EXISTS account_tokens_user ON account_tokens(user_id);');
  const configured = mailer.configured && !!origin;
  async function issue(user,purpose) {
    if (!configured) reject(503,'이메일 발송을 준비 중이에요. 잠시 후 다시 시도해주세요.');
    const token=randomBytes(32).toString('hex');
    const expires=Date.now()+(purpose==='verify'?86400000:1800000);
    db.prepare('DELETE FROM account_tokens WHERE expires<?').run(Date.now());
    // Store only the hash. The raw link exists only during delivery.
    db.prepare('INSERT INTO account_tokens VALUES(?,?,?,?)').run(hash(token),user.id,purpose,expires);
    try {
      await mailer.send({to:user.email,id:hash(token),subject:purpose==='verify'?'[멍백홈] 이메일 주소를 확인해주세요':'[멍백홈] 비밀번호 재설정',...accountEmail({origin,token,purpose})});
    } catch(e) {
      db.prepare('DELETE FROM account_tokens WHERE token=?').run(hash(token));
      reject(503,'메일을 발송하지 못했어요. 잠시 후 다시 시도해주세요.');
    }
  }
  const limited = req => rate(`account:${req.ip}`,10);
  const valid = (raw,purpose) => {
    if(typeof raw!=='string'||!/^[a-f0-9]{64}$/.test(raw)) reject(400,'유효하지 않거나 만료된 링크예요. 새 링크를 요청해주세요.');
    const record=db.prepare('SELECT * FROM account_tokens WHERE token=? AND purpose=? AND expires>?').get(hash(raw),purpose,Date.now());
    if(!record) reject(400,'유효하지 않거나 만료된 링크예요. 새 링크를 요청해주세요.');
    return record;
  };
  app.post('/api/auth/forgot',async(req,res)=>{
    limited(req);
    if(typeof req.body.email!=='string'||req.body.email.length>200) reject(400,'이메일을 입력해주세요.');
    if(!configured) reject(503,'이메일 발송을 준비 중이에요. 잠시 후 다시 시도해주세요.');
    const email=req.body.email.trim().toLowerCase();
    rate(`mail:${hash(email)}`,3);
    const user=db.prepare('SELECT * FROM users WHERE email=?').get(email);
    // Same response for existing and absent accounts, including provider failure.
    if(user&&!user.email.endsWith('@kakao.invalid')) void issue(user,'reset').catch(()=>{});
    res.json({ok:true,message:'가입된 이메일이라면 재설정 링크가 도착해요. 스팸함도 확인해주세요.'});
  });
  app.post('/api/auth/resend',async(req,res)=>{
    limited(req);
    if(!req.user.email) reject(401,'먼저 로그인해주세요.');
    if(req.user.verified_at) return res.json({ok:true});
    rate(`mail:${hash(req.user.email)}`,3);
    await issue(req.user,'verify');
    res.json({ok:true});
  });
  app.post('/api/auth/verify',(req,res)=>{
    limited(req);
    const record=valid(req.body.token,'verify');
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('UPDATE users SET verified_at=? WHERE id=?').run(Date.now(),record.user_id);
      db.prepare('DELETE FROM account_tokens WHERE user_id=?').run(record.user_id);
      invalidate(record.user_id);
      db.exec('COMMIT');
    } catch(e){db.exec('ROLLBACK');throw e;}
    // 다른 기기의 이전 로그인은 끊고, 링크를 연 이 기기만 새로 로그인한다.
    signIn(res,record.user_id);
    res.json({ok:true,signedIn:true});
  });
  app.post('/api/auth/reset',(req,res)=>{
    limited(req);
    const password=req.body.password;
    if(typeof password!=='string'||password.length<10||password.length>200) reject(400,'10~200자의 새 비밀번호를 입력해주세요.');
    const record=valid(req.body.token,'reset');
    const salt=randomBytes(16).toString('hex'),digest=scryptSync(password,salt,64).toString('hex');
    db.exec('BEGIN IMMEDIATE');
    try {
      db.prepare('UPDATE users SET password=?,verified_at=COALESCE(verified_at,?) WHERE id=?').run(`${salt}:${digest}`,Date.now(),record.user_id);
      db.prepare('DELETE FROM account_tokens WHERE user_id=?').run(record.user_id);
      invalidate(record.user_id);
      db.exec('COMMIT');
    } catch(e){db.exec('ROLLBACK');throw e;}
    res.json({ok:true});
  });
  app.post('/api/auth/delete',(req,res)=>{
    limited(req);
    if(!req.user.email) reject(401,'로그인 후 이용해주세요.');
    if(!req.user.password){
      // 카카오로만 로그인하는 계정은 비밀번호 대신 '삭제'를 입력해 확인한다.
      if(req.body.confirm!=='삭제') reject(400,"확인을 위해 '삭제'를 입력해주세요.");
    }else{
      const password=req.body.password;
      if(typeof password!=='string'||password.length>200) reject(400,'현재 비밀번호를 입력해주세요.');
      const [salt,digest]=req.user.password.split(':');
      if(!timingSafeEqual(scryptSync(password,salt,64),Buffer.from(digest,'hex'))) reject(401,'비밀번호를 확인해주세요.');
    }
    const uid=req.user.id;
    db.exec('BEGIN IMMEDIATE');
    try {
      const dogIds=new Set(db.prepare("SELECT id FROM docs WHERE owner=? AND collection='dogs'").all(uid).map(r=>r.id));
      db.prepare('DELETE FROM docs WHERE owner=?').run(uid);
      for(const row of db.prepare('SELECT * FROM docs').all()) {
        const data=JSON.parse(row.json);
        let changed=false;
        if(data.dogId&&dogIds.has(data.dogId)){data.dogId=null;changed=true;}
        if(Array.isArray(data.messages)) {const filtered=data.messages.filter(m=>m.senderId!==uid&&m.userId!==uid);if(filtered.length!==data.messages.length){data.messages=filtered;changed=true;}}
        if(changed) db.prepare('UPDATE docs SET json=?,revision=revision+1 WHERE collection=? AND id=?').run(JSON.stringify(data),row.collection,row.id);
      }
      db.prepare('DELETE FROM notices WHERE user_id=?').run(uid);
      db.prepare('DELETE FROM prefs WHERE user_id=?').run(uid);
      db.prepare('DELETE FROM account_tokens WHERE user_id=?').run(uid);
      invalidate(uid);
      db.prepare('DELETE FROM users WHERE id=?').run(uid);
      db.exec('COMMIT');
    }catch(e){db.exec('ROLLBACK');throw e;}
    res.clearCookie('mb_session',{path:'/'});
    changed();
    res.json({ok:true});
  });
  return {issue,configured};
}
