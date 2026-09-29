import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';

test('unconfigured API does not start a failing events stream or endlessly poll',async({page})=>{
  let events=0,states=0;
  await page.clock.install();
  await page.route('**/api/events',route=>{events++;return route.fulfill({status:503,json:{error:'Unavailable'}});});
  await page.route('**/api/state',route=>{states++;return route.fulfill({status:503,json:{code:'SERVICE_NOT_CONFIGURED',error:'Not configured'}});});
  await page.goto('/');
  await expect(page.locator('#connection-banner')).toContainText('지금은 예시만');
  await page.clock.fastForward(45000);
  expect(events).toBe(0);expect(states).toBe(1);
});

test('temporary API outage recovers by polling without creating an events stream',async({page})=>{
  const state=await (await page.request.get('/api/state')).json();
  let events=0,states=0;
  await page.clock.install();
  await page.route('**/api/events',route=>{events++;return route.fulfill({status:503,json:{error:'Unavailable'}});});
  await page.route('**/api/state',route=>{states++;return route.fulfill(states===1?{status:503,json:{code:'SERVICE_UNAVAILABLE',error:'Temporary'}}:{json:{...state,realtimeMode:'poll'}});});
  await page.goto('/');
  await expect(page.locator('#connection-banner')).toContainText('서버에 연결하지 못했어요');
  await page.clock.fastForward(15000);
  await expect(page.locator('#connection-banner')).toBeHidden();
  expect(events).toBe(0);expect(states).toBeGreaterThan(1);
});
test('email verification and password recovery work through delivered links on mobile and desktop',async({page})=>{
  const email=`${randomUUID()}@example.com`,password='initial-password-123';
  await page.goto('/');
  await page.request.post('/api/auth/register',{data:{email,password,name:'인증테스트'}});
  const mails=await (await page.request.get('/__test/mail',{params:{to:email}})).json();
  const link=mails[0].text.match(/http[^\s]+/)[0];
  await page.goto(link);
  await expect(page).not.toHaveURL(/token=/);
  await page.getByRole('button',{name:'이메일 인증 완료하기'}).click();
  await expect(page.locator('.recovery-status')).toContainText('인증이 완료');
  // 인증 링크를 연 기기는 다시 로그인하지 않아도 바로 인증된 상태로 로그인된다.
  await expect.poll(async()=>(await (await page.request.get('/api/state')).json()).user?.verified).toBe(true);
  await page.getByRole('link',{name:'마이홈으로',exact:true}).first().click();
  await expect(page.getByRole('heading',{name:'인증테스트 님'})).toBeVisible();
  await page.goto('/#/account/forgot');
  await page.locator('#recovery-form input').fill(email);
  await page.getByRole('button',{name:'재설정 링크 받기'}).click();
  await expect(page.locator('.recovery-status')).toContainText('가입된 이메일이라면');
  const resetMails=await (await page.request.get('/__test/mail',{params:{to:email}})).json();
  await page.goto(resetMails.at(-1).text.match(/http[^\s]+/)[0]);
  await page.locator('input[name=password]').fill('changed-password-456');
  await page.locator('input[name=confirm]').fill('different-password-456');
  await page.getByRole('button',{name:'새 비밀번호 저장하기'}).click();
  await expect(page.locator('.recovery-status')).toContainText('두 비밀번호가 달라요');
  await page.locator('input[name=confirm]').fill('changed-password-456');
  await page.getByRole('button',{name:'새 비밀번호 저장하기'}).click();
  await expect(page.locator('.recovery-status')).toContainText('비밀번호를 바꿨어요');
  const result=await page.request.post('/api/auth/login',{data:{email,password:'changed-password-456'}});
  expect(result.ok()).toBe(true);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('web app manifest, touch icons and offline fallback work without caching private API data',async({page,context})=>{
  await page.goto('/');
  const manifest=await(await page.request.get('/manifest.webmanifest')).json();
  expect(manifest.display).toBe('standalone');
  for(const icon of manifest.icons)expect((await page.request.get(icon.src)).ok()).toBe(true);
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.reload();
  await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading',{name:'잠시 연결이 끊겼어요'})).toBeVisible();
  const cached=await page.evaluate(async()=>{const keys=await caches.keys();return (await Promise.all(keys.map(async key=>(await(await caches.open(key)).keys()).map(r=>r.url)))).flat();});
  expect(cached.every(url=>url.endsWith('/offline.html'))).toBe(true);
  await context.setOffline(false);
});
