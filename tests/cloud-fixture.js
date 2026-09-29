import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {createPostgres} from '../server/postgres.js';
import {createApp} from '../server/cloud-app.js';

export async function createCloudFixture(options={}){
  const pg=new PGlite();
  await pg.exec(readFileSync(new URL('../supabase/migrations/202609080001_meongback.sql',import.meta.url),'utf8'));
  let queue=Promise.resolve();
  const lock=async()=>{let release;const previous=queue;queue=new Promise(r=>release=r);await previous;return release;};
  const pool={
    async query(sql,args){const release=await lock();try{return await pg.query(sql,args);}finally{release();}},
    async connect(){const release=await lock();return {query:(sql,args)=>pg.query(sql,args),release};},
    end:()=>pg.close(),
  };
  const blobs=new Map(),jobs=[];
  const storage={async upload(path,bytes){blobs.set(path,bytes);return {};},async download(path){return blobs.has(path)?{data:new Blob([blobs.get(path)])}:{error:true};},async remove(paths){paths.forEach(p=>blobs.delete(p));return {};}};
  const service=await createApp({database:createPostgres({pool}),storage,defer:p=>jobs.push(p),...options});
  return {...service,blobs,async close(){await Promise.allSettled(jobs);await service.close();}};
}
