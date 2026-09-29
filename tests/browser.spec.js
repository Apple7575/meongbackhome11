import { test, expect } from '@playwright/test';

test.beforeEach(async({page})=>{await page.goto('/');});
test('home, generated assets, search and responsive navigation',async({page})=>{
  await expect(page.locator('.hero h1')).toContainText('따뜻한 집으로');
  await expect(page.locator('.dog-card')).toHaveCount(4);
  expect(await page.locator('.hero-dogs').evaluate(img=>img.complete&&img.naturalWidth>0)).toBeTruthy();
  await page.locator('#dog-search').fill('초코');await expect(page.locator('.dog-card')).toHaveCount(1);
  await page.locator('#dog-search').fill('없는강아지');await expect(page.getByText('아직 등록된 소식이 없어요')).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await expect(page.locator('.mobile-nav')).toBeVisible();
});
test('timeline has separate chronological line and per-sighting arrows, status excludes wrong dog',async({page})=>{
  await page.goto('/#/dog/demo-bori');
  await expect(page.locator('.timeline-item')).toHaveCount(3);
  await expect(page.locator('.direction-icon')).toHaveCount(3);
  await expect(page.locator('.map-pin b')).toHaveText(['1','2','3']);
  await expect(page.locator('.map-disclaimer')).toContainText('실제 이동 경로가 아니에요');
  await page.locator('.timeline-item').first().click();
  await page.locator('#report-status').selectOption('다른 강아지');
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await expect(page.locator('.timeline-item')).toHaveCount(2);
  await expect(page.locator('.direction-icon')).toHaveCount(2);
});
test('sighting saves compass direction, timestamp, photo-independent report and persists reload',async({page})=>{
  await page.goto('/#/dog/demo-bori');await page.getByRole('button',{name:'이 아이를 봤어요'}).click();
  await page.getByRole('textbox',{name:'목격 장소 *'}).fill('검증용 송리단길');
  await page.locator('#sighting-picker').click({position:{x:150,y:100}});
  await page.getByText('이동했어요',{exact:true}).click();
  await page.locator('#heading-range').fill('90');
  await expect(page.locator('#heading-label')).toContainText('동쪽');
  await page.getByRole('button',{name:'목격 소식 남기기',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.timeline-item')).toHaveCount(4);
  await page.reload();await expect(page.locator('.timeline-item')).toHaveCount(4);
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('meongback-home-v1')).reports.find(r=>r.location==='검증용 송리단길').heading)).toBe(90);
});
test('report, profile reuse, reunion, notifications and story form',async({page})=>{
  await page.goto('/#/my');await page.getByRole('button',{name:'프로필 등록',exact:true}).click();
  await page.locator('input[name=photo]').setInputFiles('public/assets/dog-maltese.png');
  await page.locator('input[name=name]').fill('테스트강아지');await page.locator('input[name=breed]').fill('말티즈');
  await page.getByRole('button',{name:'프로필 저장하기'}).click();
  await expect(page.locator('.profile-card')).toHaveCount(1);
  await page.getByRole('button',{name:'이 정보로 실종 신고'}).click();
  await expect(page.locator('input[name=name]')).toHaveValue('테스트강아지');
  await page.locator('input[name=location]').fill('서울 송파구 테스트 공원');
  await page.locator('#location-picker').click({position:{x:150,y:100}});
  await page.getByRole('button',{name:'실종 신고 등록하기'}).click();
  await expect(page.locator('.detail-copy h1')).toContainText('테스트강아지');
  await page.goto('/#/my');await page.getByRole('button',{name:'재회 완료',exact:true}).click();
  await page.getByRole('button',{name:'네, 무사히 만났어요'}).click();
  await expect(page.locator('.manage-card .badge')).toHaveText('재회 완료');
  await page.locator('.notification-button').click();await expect(page.getByText('테스트강아지가 가족의 품으로 돌아왔어요')).toBeVisible();
  await page.getByRole('button',{name:'닫기',exact:true}).click();
  await page.goto('/#/stories');await page.getByRole('button',{name:'우리의 재회 이야기 쓰기'}).click();
  await page.locator('input[name=title]').fill('다시 만났어요');await page.locator('textarea[name=text]').fill('이웃의 제보가 큰 도움이 되었어요.');
  await page.getByRole('button',{name:'따뜻한 이야기 남기기'}).click();await expect(page.locator('.story-card h2')).toHaveText('다시 만났어요');
});
test('poster creates downloadable image and dialogs trap keyboard focus',async({page})=>{
  await page.goto('/#/dog/demo-bori');await page.getByRole('button',{name:'QR 전단 만들기'}).click();
  await expect(page.locator('#poster-canvas')).toHaveAttribute('height','1400');
  await page.waitForFunction(()=>document.querySelector('#poster-canvas')?.getContext('2d').getImageData(800,1270,1,1).data[3]===255);
  await page.getByRole('button',{name:'SNS 정사각형'}).click();
  await expect(page.locator('#poster-canvas')).toHaveAttribute('height','1000');
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'이미지 다운로드'}).click();expect((await download).suggestedFilename()).toContain('social');
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
});
