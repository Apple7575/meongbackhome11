import path from 'node:path';
export function runtimeConfig(env=process.env){
  const origin=env.PUBLIC_ORIGIN||env.RENDER_EXTERNAL_URL||'';
  const port=Number(env.PORT||env.API_PORT||3001);
  if(!Number.isInteger(port)||port<1||port>65535)throw new Error('서버 포트 설정을 확인해주세요.');
  if(env.NODE_ENV==='production'){
    let url;
    try{url=new URL(origin);}catch{throw new Error('운영 HTTPS 주소를 설정해주세요.');}
    if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('PUBLIC_ORIGIN에는 HTTPS 도메인만 입력해주세요.');
    if(!env.DATABASE_PATH)throw new Error('운영 DB의 영구 저장 경로를 설정해주세요.');
    if(env.SEED_EXAMPLES!=='false')throw new Error('운영 서버에서는 예시 데이터를 비활성화해주세요.');
    if(!env.MAIL_FROM||!env.RESEND_API_KEY||!env.PUSH_SUBJECT)throw new Error('운영 메일과 알림 발신 설정이 필요해요.');
  }
  return {origin:origin.replace(/\/$/,''),port,databasePath:env.DATABASE_PATH||'data/meongback.sqlite',backupDir:env.BACKUP_DIR||path.join(path.dirname(env.DATABASE_PATH||'data/meongback.sqlite'),'backups')};
}
