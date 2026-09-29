import {readFile} from 'node:fs/promises';
import pg from 'pg';
import {createClient} from '@supabase/supabase-js';
import {bucketName} from '../server/media.js';

for(const key of ['DATABASE_URL','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'])if(!process.env[key])throw new Error(`Set ${key} in .env.cloud first`);
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1,ssl:{rejectUnauthorized:true}});
try{
  const client=await pool.connect();
  try{
    await client.query(await readFile(new URL('../supabase/migrations/202609080001_meongback.sql',import.meta.url),'utf8'));
  }finally{client.release();}
  const supabase=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false}});
  const options={public:false,fileSizeLimit:2000000,allowedMimeTypes:['image/webp']};
  const existing=await supabase.storage.getBucket(bucketName);
  const result=existing.data?await supabase.storage.updateBucket(bucketName,options):await supabase.storage.createBucket(bucketName,options);
  if(result.error)throw new Error('Could not configure the private photo bucket');
  console.log('Application schema and private photo storage are ready. No example reports were inserted.');
}catch{
  console.error('Supabase setup failed. Check the project connection, credentials and Storage permissions. Secret values are not logged.');
  process.exitCode=1;
}finally{await pool.end();}
