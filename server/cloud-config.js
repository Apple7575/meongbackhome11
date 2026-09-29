export function cloudConfig(env){
  const required=['DATABASE_URL','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','PUBLIC_ORIGIN'];
  const missing=required.filter(key=>!env[key]);
  if(missing.length)throw Object.assign(new Error(`Missing configuration: ${missing.join(', ')}`),{code:'SERVICE_NOT_CONFIGURED',missing});
  const origin=new URL(env.PUBLIC_ORIGIN);
  if(origin.protocol!=='https:'||origin.pathname!=='/'||origin.search||origin.hash)throw new Error('PUBLIC_ORIGIN must be an HTTPS origin');
  const db=new URL(env.DATABASE_URL);
  if(!['postgres:','postgresql:'].includes(db.protocol)||!db.hostname.endsWith('.pooler.supabase.com')||db.port!=='6543')throw new Error('Use the Supabase transaction pooler URL (port 6543)');
  const storage=new URL(env.SUPABASE_URL);
  if(storage.protocol!=='https:'||!storage.hostname.endsWith('.supabase.co'))throw new Error('Invalid SUPABASE_URL');
  return {origin:origin.origin};
}
