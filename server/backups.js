import {DatabaseSync,backup} from 'node:sqlite';
import {mkdir,readdir,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
export async function backupDatabase(db,directory,{keep=7}={}){
  if(!Number.isInteger(keep)||keep<1||keep>90)throw new Error('백업 보관 개수는 1~90개여야 합니다.');
  const root=path.resolve(directory);
  await mkdir(root,{recursive:true});
  const name=`meongback-${new Date().toISOString().replace(/[:.]/g,'-')}-${randomUUID()}.sqlite`;
  const file=path.join(root,name),partial=file+'.partial';
  await backup(db,partial);
  const verify=new DatabaseSync(partial,{readOnly:true});
  try{if(verify.prepare('PRAGMA quick_check').get().quick_check!=='ok')throw new Error('백업 무결성 검사 실패');}finally{verify.close();}
  await rename(partial,file);
  const files=(await readdir(root)).filter(name=>/^meongback-\d{4}-\d{2}-\d{2}T[\dTZ-]+-[a-f0-9-]{36}\.sqlite$/.test(name)).sort().reverse();
  for(const name of files.slice(keep)){
    const target=path.resolve(root,name);
    if(path.dirname(target)!==root)throw new Error('허용되지 않은 백업 경로');
    await unlink(target);
  }
  return file;
}
export function scheduleBackups(db,directory,{hours=24,keep=7}={}){
  if(!Number.isFinite(hours)||hours<1||hours>168)throw new Error('백업 간격은 1~168시간이어야 합니다.');
  let pending=null;
  const run=()=>{
    if(pending)return;
    pending=backupDatabase(db,directory,{keep}).then(()=>console.log('DB backup verified')).catch(()=>console.error('DB backup failed; inspect persistent disk capacity and permissions')).finally(()=>{pending=null;});
  };
  const timer=setInterval(run,hours*3600000);timer.unref();run();
  return async()=>{clearInterval(timer);await pending;};
}
