import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudConfig} from '../server/cloud-config.js';
test('database configuration is required; absent email and push settings do not disable unrelated API routes',()=>{
  const env={DATABASE_URL:'postgresql://postgres.test:dummy@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres',SUPABASE_URL:'https://test.supabase.co',SUPABASE_SERVICE_ROLE_KEY:'test-only',PUBLIC_ORIGIN:'https://meongback-home.vercel.app'};
  assert.equal(cloudConfig(env).origin,env.PUBLIC_ORIGIN);
  assert.throws(()=>cloudConfig({}),error=>error.code==='SERVICE_NOT_CONFIGURED'&&error.missing.includes('DATABASE_URL'));
  assert.throws(()=>cloudConfig({...env,PUBLIC_ORIGIN:'http://unsafe.example'}));
});
