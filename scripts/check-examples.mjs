import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import express from 'express';
let server;
if(process.argv.includes('--local')){
  const app=express();app.use('/api',(req,res)=>res.status(503).json({error:'Local preview'}));app.use(express.static('dist'));
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
}
const origin=server?`http://127.0.0.1:${server.address().port}`:'https://meongback-home.vercel.app';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${origin}/#/explore`);
  await page.waitForFunction(()=>document.querySelectorAll('.dog-card').length===8);
  await page.locator('[data-status="missing"]').click();
  assert.equal(await page.locator('.dog-card').count(),8);
  assert.equal(await page.locator('.dog-card .sample-label').count(),8);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('.dog-photo img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  await page.screenshot({path:'artifacts/examples-mobile.png',fullPage:true});
  await page.locator('#dog-search').fill('라떼');
  assert.equal(await page.locator('.dog-card').count(),1);
  await page.locator('.dog-photo').click();
  await page.getByText('체험용 예시 신고',{exact:true}).waitFor();
  for(const id of ['bori','choco','dubu','gamja','mochi','latte','haneul','cookie']){
    await page.goto(`${origin}/#/dog/demo-${id}`);
    await page.locator('.example-overview').waitFor();
    assert.equal(await page.locator('.example-metrics>div').count(),4);
    assert.equal(await page.locator('.sighting-slide').count(),5);
    assert.equal(await page.locator('.update-item').count(),3);
    assert.equal(await page.locator('.candidate').count(),1);
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.locator('.track-dot').nth(1).click();
  await page.locator('.open-sighting').nth(1).click();
  await page.getByText('추가 확인 대화 · 가상 예시',{exact:true}).waitFor();
  assert.equal(await page.locator('.chat-bubble').count(),3);
  assert.ok(await page.locator('#report-status').isDisabled());
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await page.screenshot({path:'artifacts/example-detail-mobile.png',fullPage:true});
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:'artifacts/example-detail-desktop.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS: 8 detailed examples, each with 5 sightings, 3 updates, 1 candidate, 4 metrics; read-only example chat; mobile layout, images and search');
}finally{await browser.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r));}}
