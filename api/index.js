import {waitUntil,attachDatabasePool} from '@vercel/functions';
import {createApp} from '../server/cloud-app.js';
import {createPostgres} from '../server/postgres.js';
import {cloudConfig} from '../server/cloud-config.js';

let service;
async function initialize(){
  const config=cloudConfig(process.env);
  const database=createPostgres();
  attachDatabasePool(database.pool);
  try{return await createApp({database,examples:false,secure:true,requireVerification:true,publicOrigin:config.origin,defer:waitUntil});}
  catch(error){await database.close();throw error;}
}
export default async function handler(req,res){
  try{
    service ||= initialize().catch(error=>{service=undefined;throw error;});
    const {app}=await service;
    return app(req,res);
  }catch(error){
    // Never log database URLs, service keys, or provider response bodies.
    res.statusCode=503;
    res.setHeader('Content-Type','application/json; charset=utf-8');
    res.setHeader('Cache-Control','no-store');
    const unconfigured=error.code==='SERVICE_NOT_CONFIGURED';
    console.error('API initialization failed',{code:unconfigured?error.code:'SERVICE_UNAVAILABLE',...(unconfigured?{missing:error.missing}:{})});
    res.end(JSON.stringify({code:unconfigured?'SERVICE_NOT_CONFIGURED':'SERVICE_UNAVAILABLE',error:unconfigured?'서비스 저장소 연결을 준비 중이에요. 지금은 예시만 볼 수 있으며 회원가입·신고·제보 저장은 아직 사용할 수 없어요.':'서비스에 일시적으로 연결하지 못했어요. 잠시 후 다시 시도해주세요.'}));
  }
}
