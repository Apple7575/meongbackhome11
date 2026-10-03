import pg from 'pg';
import {AsyncLocalStorage} from 'node:async_hooks';
const tables=['users','sessions','docs','prefs','notices','subscriptions','config','outbox','account_tokens','rate_limits','media'];
export function sqlForPostgres(sql){
  let index=0;
  return sql.replace(/\?/g,()=>`$${++index}`).replace(/\b(FROM|INTO|UPDATE|JOIN)\s+([a-z_]+)\b/gi,(match,keyword,table)=>tables.includes(table)?`${keyword} meongback.${table}`:match).replace(/ORDER BY rowid DESC/g,'ORDER BY sequence DESC');
}
export function createPostgres({pool}={}){
  // Supabase's transaction pooler can present an incomplete intermediate chain
  // in serverless environments. TLS is still used; allow the platform chain.
  pool ||= new pg.Pool({connectionString:process.env.DATABASE_URL,max:3,idleTimeoutMillis:10000,connectionTimeoutMillis:10000,ssl:{rejectUnauthorized:false}});
  const scope=new AsyncLocalStorage();
  const query=(sql,params=[])=>{const client=scope.getStore()?.client||pool;return client.query(sqlForPostgres(sql),params);};
  return {
    pool,query,
    middleware(req,res,next){
      const context={client:null};
      const cleanup=()=>{if(context.client){const client=context.client;context.client=null;void client.query('ROLLBACK').finally(()=>client.release());}};
      res.once('finish',cleanup);res.once('close',cleanup);
      scope.run(context,next);
    },
    prepare(sql){return {
      async get(...params){return (await query(sql,params)).rows[0];},
      async all(...params){return (await query(sql,params)).rows;},
      async run(...params){const result=await query(sql,params);return {changes:result.rowCount};},
    };},
    async exec(sql){
      const context=scope.getStore();
      if(/^BEGIN/.test(sql)){
        if(!context||context.client)throw new Error('Invalid transaction scope');
        context.client=await pool.connect();
        await context.client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      }else if(/^(COMMIT|ROLLBACK)$/.test(sql)){
        if(!context?.client)return;
        const client=context.client;
        try{await client.query(sql);}finally{context.client=null;client.release();}
      }else return query(sql);
    },
    // SERIALIZABLE 거래는 동시에 쓰면 40001(직렬화 실패)로 끝날 수 있다. 사용자에게 409를 돌려주기 전에
    // 서버에서 두 번까지 다시 해 본다. fn은 다시 불려도 같은 결과가 나오게(요청 값을 고치지 않게) 써야 한다.
    async transaction(fn,{retries=2}={}){
      for(let attempt=0;;attempt++){
        await this.exec('BEGIN');
        try{const result=await fn();await this.exec('COMMIT');return result;}
        catch(error){
          await this.exec('ROLLBACK');
          if(error.code!=='40001'||attempt>=retries)throw error;
          await new Promise(r=>setTimeout(r,20*(attempt+1)+Math.random()*30));
        }
      }
    },
    close(){return pool.end();},
  };
}
