import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdir,writeFile,readdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {backupDatabase} from '../server/backups.js';
import {runtimeConfig} from '../server/runtime-config.js';
test('hosting port and public URL use provider configuration and reject unsafe production defaults',()=>{
  const env={NODE_ENV:'production',RENDER_EXTERNAL_URL:'https://meongback.example.org',PORT:'10000',DATABASE_PATH:'/var/data/meongback.sqlite',SEED_EXAMPLES:'false',RESEND_API_KEY:'test',MAIL_FROM:'test@example.org',PUSH_SUBJECT:'mailto:test@example.org'};
  assert.equal(runtimeConfig(env).port,10000);
  assert.equal(runtimeConfig(env).origin,env.RENDER_EXTERNAL_URL);
  assert.throws(()=>runtimeConfig({...env,DATABASE_PATH:''}));
  assert.throws(()=>runtimeConfig({...env,SEED_EXAMPLES:'true'}));
  assert.throws(()=>runtimeConfig({...env,RENDER_EXTERNAL_URL:'http://insecure.example'}));
});
test('verified SQLite backups survive restart and rotation preserves unrelated files',async()=>{
  const directory=path.resolve('test-results',`backup-${randomUUID()}`);
  await mkdir(directory,{recursive:true});
  await writeFile(path.join(directory,'keep-me.txt'),'preserve');
  const db=new DatabaseSync(':memory:');
  db.exec('CREATE TABLE reports(id TEXT PRIMARY KEY,body TEXT)');
  db.prepare('INSERT INTO reports VALUES(?,?)').run('witness','persisted sighting');
  let file;
  try{for(let i=0;i<3;i++)file=await backupDatabase(db,directory,{keep:2});}finally{db.close();}
  const files=await readdir(directory);
  assert.equal(files.filter(f=>f.endsWith('.sqlite')).length,2);
  assert.equal(await readFile(path.join(directory,'keep-me.txt'),'utf8'),'preserve');
  const restored=new DatabaseSync(file,{readOnly:true});
  try{assert.equal(restored.prepare('SELECT body FROM reports WHERE id=?').get('witness').body,'persisted sighting');}finally{restored.close();}
});
