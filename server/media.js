import {createClient} from '@supabase/supabase-js';
import sharp from 'sharp';
import {randomUUID} from 'node:crypto';

export const bucketName='meongback-photos';
export function createStorage(){
  const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  return client.storage.from(bucketName);
}
export function installMedia({app,db,storage,rate}){
  const reject=(status,message)=>{throw Object.assign(new Error(message),{status});};
  app.post('/api/photos',async(req,res)=>{
    await rate(`photo:${req.user.id}`,20);
    const raw=req.body.image;
    if(typeof raw!=='string'||raw.length>1800000||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(raw))reject(400,'사진 형식이나 크기를 확인해주세요.');
    let bytes;
    try{bytes=await sharp(Buffer.from(raw.split(',')[1],'base64'),{limitInputPixels:20000000}).rotate().resize(1280,1280,{fit:'inside',withoutEnlargement:true}).webp({quality:80}).toBuffer();}
    catch{reject(400,'읽을 수 없는 사진이에요. 다른 사진을 선택해주세요.');}
    const id=randomUUID(),path=`${req.user.id}/${id}.webp`;
    const result=await storage.upload(path,bytes,{contentType:'image/webp',upsert:false});
    if(result.error)reject(503,'사진을 저장하지 못했어요. 다시 시도해주세요.');
    try{await db.prepare('INSERT INTO media(id,owner,path,created_at) VALUES(?,?,?,?)').run(id,req.user.id,path,Date.now());}
    catch(e){await storage.remove([path]);throw e;}
    res.json({image:`/api/media/${id}`});
  });
  app.get('/api/media/:id',async(req,res)=>{
    const media=await db.prepare('SELECT * FROM media WHERE id=?').get(req.params.id);
    if(!media)return res.sendStatus(404);
    const uri=`/api/media/${media.id}`;
    let permitted=media.owner===req.user.id;
    if(!permitted){
      const refs=await db.prepare("SELECT * FROM docs WHERE json::jsonb->>'image'=?").all(uri);
      for(const row of refs){
        const value=JSON.parse(row.json);
        if(['dogs','stories'].includes(row.collection)||row.owner===req.user.id||(row.collection==='reports'&&value.kind==='목격'))permitted=true;
        if(row.collection==='reports'&&value.dogId){
          const dog=await db.prepare("SELECT owner FROM docs WHERE collection='dogs' AND id=?").get(value.dogId);
          if(dog?.owner===req.user.id)permitted=true;
        }
      }
    }
    if(!permitted)return res.sendStatus(404);
    const {data,error}=await storage.download(media.path);
    if(error)return res.sendStatus(404);
    let bytes=Buffer.from(await data.arrayBuffer());
    // 목록 썸네일용 작은 사진(허용한 크기만)
    const width=Number(req.query.w);
    if([192,640].includes(width))bytes=await sharp(bytes).resize(width,width,{fit:'inside',withoutEnlargement:true}).webp({quality:72}).toBuffer();
    // 사진 주소는 한 번 정해지면 내용이 바뀌지 않는다. 권한이 있는 사람의 기기에만 보관한다(private).
    res.set('Cache-Control','private, max-age=86400');
    res.type('image/webp').send(bytes);
  });
  return {
    async validate(image,uid,previous){
      if(!image||image===previous||/^\/assets\/[\w.-]+\.(png|webp|jpg)$/.test(image))return;
      const id=/^\/api\/media\/([a-f0-9-]{36})$/.exec(image)?.[1];
      if(!id||!(await db.prepare('SELECT 1 FROM media WHERE id=? AND owner=?').get(id,uid)))reject(400,'사진을 다시 선택해주세요.');
    },
    async cleanup(){
      const rows=await db.prepare("SELECT * FROM media WHERE created_at<? AND NOT EXISTS (SELECT 1 FROM docs WHERE json::jsonb->>'image'='/api/media/'||media.id) LIMIT 50").all(Date.now()-86400000);
      if(!rows.length)return;
      const {error}=await storage.remove(rows.map(r=>r.path));
      if(error)throw new Error('Photo cleanup failed');
      for(const row of rows)await db.prepare('DELETE FROM media WHERE id=?').run(row.id);
    }
  };
}
