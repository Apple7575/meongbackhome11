const raw=process.argv[2];
if(!raw||!/^https:\/\//.test(raw))throw new Error('Usage: node scripts/smoke-public.mjs https://your-domain');
const origin=new URL(raw).origin;
const checks=[];
async function check(path,validate){
  try{const response=await fetch(origin+path,{signal:AbortSignal.timeout(15000),redirect:'error'});checks.push({path,status:response.status,ok:response.ok&&await validate(response)});}
  catch{checks.push({path,ok:false});}
}
await check('/api/health',async r=>(await r.json()).ok===true);
await check('/',async r=>(await r.text()).includes('manifest.webmanifest')&&!!r.headers.get('strict-transport-security'));
await check('/manifest.webmanifest',async r=>(await r.json()).display==='standalone');
await check('/sw.js',async r=>(r.headers.get('cache-control')||'').includes('no-cache'));
await check('/api/state',async r=>{const state=await r.json();return state.user.verificationRequired===true&&state.dogs.every(d=>!d.demo)&&(r.headers.get('set-cookie')||'').includes('Secure')&&(r.headers.get('cache-control')||'').includes('no-store');});
for(const check of checks)console.log(`${check.ok?'PASS':'FAIL'} ${check.path} (HTTP ${check.status||'unreachable'})`);
console.log('메일 도착, DNS 발신 인증, GPS/나침반 및 실제 푸시 도착은 이 검사에 포함되지 않습니다.');
if(checks.some(c=>!c.ok))process.exitCode=1;
