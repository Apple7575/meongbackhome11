import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {createApp} from '../server/app.js';
import {shareText} from '../server/share.js';

test('share link pages carry a dog preview card, redirect to the detail screen and escape user text',async()=>{
  const service=createApp({databasePath:':memory:',examples:false,publicOrigin:'https://meong.test'});
  const server=service.app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const origin=`http://127.0.0.1:${server.address().port}`;
  try{
    const png=await sharp({create:{width:900,height:1200,channels:3,background:'#f0c080'}}).png().toBuffer();
    const dog={id:'dog-share',name:'보리',breed:'말티즈',color:'흰색',region:'서울',location:'서울 송파구 석촌호수',time:'2026-09-29T14:27:00.000Z',status:'missing',image:`data:image/png;base64,${png.toString('base64')}`};
    service.db.prepare('INSERT INTO docs VALUES(?,?,?,?,?)').run('dogs',dog.id,'owner',1,JSON.stringify(dog));
    service.db.prepare('INSERT INTO docs VALUES(?,?,?,?,?)').run('dogs','dog-xss','owner',1,JSON.stringify({...dog,id:'dog-xss',name:'<script>alert(1)</script>'}));
    const page=await fetch(`${origin}/d/dog-share`);
    assert.equal(page.status,200);
    const html=await page.text();
    assert.match(html,/og:title" content="보리를 찾고 있어요"/);
    assert.match(html,/말티즈 · 흰색 · 서울 송파구 석촌호수 · 9월 29일 오후 11:27에 잃어버렸어요/);
    assert.match(html,/og:image" content="[^"]+\/api\/og\/dog\/dog-share\.jpg"/);
    assert.match(html,/location\.replace\("\/#\/dog\/dog-share"\)/);
    const og=await fetch(`${origin}/api/og/dog/dog-share.jpg`);
    assert.equal(og.headers.get('content-type'),'image/jpeg');
    const meta=await sharp(Buffer.from(await og.arrayBuffer())).metadata();
    assert.deepEqual([meta.width,meta.height],[1200,630]);
    const xss=await (await fetch(`${origin}/d/dog-xss`)).text();
    assert.ok(!xss.includes('<script>alert(1)</script>'));
    assert.match(xss,/&lt;script&gt;/);
    // 모르는 신고·이상한 주소도 앱으로 보내고, 사진 주소는 없다고 답한다.
    const unknown=await (await fetch(`${origin}/d/nope`)).text();
    assert.match(unknown,/location\.replace\("\/#\/dog\/nope"\)/);
    assert.equal((await fetch(`${origin}/api/og/dog/nope.jpg`)).status,404);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));service.close();}
});

test('share text uses the right particle and a reunion message',()=>{
  assert.equal(shareText({name:'초코',status:'missing'}).title,'초코를 찾고 있어요');
  assert.equal(shareText({name:'감자탕',status:'missing'}).title,'감자탕을 찾고 있어요');
  assert.equal(shareText({name:'코코',status:'reunited',breed:'치와와'}).title,'코코, 집에 돌아왔어요');
});
