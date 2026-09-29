import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
test('small phone layouts, keyboard inputs, and location permission feedback',async({page,context},testInfo)=>{
  test.skip(testInfo.project.name!=='mobile','Phone-only coverage');
  await page.goto('/');
  await expect(page.locator('.account-button')).toBeVisible();
  for(const width of [320,360,430]){
    await page.setViewportSize({width,height:740});
    for(const route of ['/#/','/#/explore','/#/sightings','/#/my']){
      await page.goto(route);
      await expect(page.locator('.mobile-nav')).toBeVisible();
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width} ${route}`).toBe(true);
    }
  }
  await page.request.post('/api/auth/register',{data:{name:'기기확인',email:`${randomUUID()}@example.com`,password:'test-phone-password'}});
  await page.reload();
  await expect(page.locator('.account-button')).toContainText('기기확인');
  await page.locator('.account-button').click();
  await page.getByRole('button',{name:'이 휴대폰에서 기능 확인'}).click();
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({latitude:37.51,longitude:127.1,accuracy:20});
  await page.getByRole('button',{name:'현재 위치 확인',exact:true}).click();
  await expect(page.locator('#gps-status')).toContainText('약 20m');
  await context.clearPermissions();
  await page.evaluate(()=>Object.defineProperty(navigator,'geolocation',{configurable:true,value:{getCurrentPosition:(_ok,error)=>error({code:1})}}));
  await page.getByRole('button',{name:'현재 위치 확인',exact:true}).click();
  await expect(page.locator('#gps-status')).toContainText('위치 권한이 꺼져');
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await page.goto('/#/account/forgot');
  expect(await page.locator('input').evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  await page.screenshot({path:'artifacts/account-phone.png',fullPage:true});
});
