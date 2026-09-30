import { test, expect } from "@playwright/test";
import { ready, registerByApi } from "./helpers.js";
test("React shell draws top bar and bottom navigation around every screen", async ({ page }) => {
  await ready(page, "/#/stories");
  await expect(page.locator("#app [data-shell=react]")).toHaveCount(1);
  const nav = page.getByRole("navigation", { name: "하단 메뉴" });
  await expect(nav.getByRole("link")).toHaveCount(4);
  await expect(nav.getByRole("button", { name: "실종 신고", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^알림 \d+개$/ })).toBeVisible();
  await expect(page.locator(".site-header, .site-footer, .mobile-nav")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "집에 돌아온 아이들" })).toBeVisible();
});
test("home shows missing dogs first and lets people change the region in a bottom sheet", async ({ page }) => {
  await ready(page);
  await expect(page.getByRole("button", { name: /강아지를 잃어버렸어요/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /강아지를 발견했어요/ })).toBeVisible();
  const first = page.locator("[data-dog-row]").first();
  await expect(first).toBeVisible();
  expect((await first.boundingBox()).y).toBeLessThan(600);
  expect(await page.locator("[data-dog-row]").count()).toBeLessThanOrEqual(5);
  await page.getByRole("button", { name: "전국" }).click();
  const sheet = page.getByRole("dialog", { name: "지역 선택" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "부산" }).click();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /^부산에서 찾고 있어요/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /집에 돌아온 아이들/ })).toBeVisible();
});
test("explore can sort by distance from the phone's location", async ({ page, context }) => {
  // 부산 수영구 근처에 있다고 가정하면 부산 신고가 맨 위로 온다.
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 35.1532, longitude: 129.1186 });
  await ready(page, "/#/explore");
  await page.getByRole("button", { name: "최신순" }).click();
  await page.getByRole("dialog", { name: "정렬" }).getByRole("button", { name: "가까운 순" }).click();
  await expect(page.getByRole("button", { name: "가까운 순" })).toBeVisible();
  const first = page.locator("[data-dog-row]").first();
  await expect(first).toContainText("부산");
  await expect(first).toContainText(/\d+(m|\.\dkm|km) ·/);
});
test("explore filters with easy-to-answer sheets and pages 20 at a time", async ({ page }) => {
  await ready(page, "/#/explore");
  await expect(page.getByRole("heading", { name: "찾기" })).toBeVisible();
  const total = await page.locator("[data-dog-row]").count();
  expect(total).toBeGreaterThan(0);
  expect(total).toBeLessThanOrEqual(20);
  await page.getByRole("button", { name: "필터" }).click();
  const sheet = page.getByRole("dialog", { name: "필터" });
  await sheet.getByRole("button", { name: "소형" }).click();
  await sheet.getByRole("button", { name: /마리 보기$/ }).click();
  await expect(page.getByRole("button", { name: "필터 1" })).toBeVisible();
  for (const row of await page.locator("[data-dog-row]").all()) await expect(row).toBeVisible();
  await page.getByRole("button", { name: "지도로 보기" }).click();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await page.getByRole("button", { name: "목록으로 보기" }).click();
  await expect(page.locator(".leaflet-container")).toHaveCount(0);
});
test("sightings are grouped by day, paged, and have one thumb-reach action", async ({ page }) => {
  await ready(page, "/#/sightings");
  await expect(page.getByRole("heading", { name: "목격 소식" })).toBeVisible();
  const rows = page.locator("[data-sighting-row]");
  expect(await rows.count()).toBeGreaterThan(0);
  expect(await rows.count()).toBeLessThanOrEqual(20);
  const groups = await page.getByRole("main").getByRole("heading", { level: 2 }).allInnerTexts();
  for (const g of groups) expect(["오늘", "어제", "이번 주", "이전"]).toContain(g);
  await expect(page.getByRole("button", { name: "강아지를 봤어요" })).toBeVisible();
  await rows.first().click();
  const sheet = page.getByRole("dialog", { name: "목격 제보" });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByText("보호자와 이 제보를 작성한 이웃만 대화할 수 있어요").or(sheet.locator("[data-chat-bubble]").first())).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet).toHaveCount(0);
});
test("notification and area sheets: saving an area makes it the home default", async ({ page }) => {
  await ready(page);
  await registerByApi(page);
  await page.getByRole("button", { name: /^알림 \d+개$/ }).click();
  const alerts = page.getByRole("dialog", { name: "알림" });
  await expect(alerts).toBeVisible();
  await alerts.getByRole("button", { name: "관심 지역 고르기" }).click();
  const areas = page.getByRole("dialog", { name: "관심 지역" });
  await areas.getByRole("button", { name: "부산" }).click();
  await areas.getByRole("button", { name: "1곳 저장하기" }).click();
  await expect(areas).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /^부산에서 찾고 있어요/ })).toBeVisible();
});
test("members can leave a reunion story from the stories screen", async ({ page }) => {
  await ready(page);
  await registerByApi(page);
  await page.goto("/#/stories");
  await page.getByRole("button", { name: "우리의 재회 이야기 쓰기" }).click();
  const sheet = page.getByRole("dialog", { name: "다시 만난 이야기" });
  const title = "이웃 덕분에 만났어요 " + Date.now();
  await sheet.locator("input[name=title]").fill(title);
  await sheet.locator("textarea[name=text]").fill("제보 덕분에 하루 만에 찾았어요.");
  await sheet.getByRole("button", { name: "이야기 남기기" }).click();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
});
test("phones open the native share sheet first with the preview link", async ({ page }) => {
  // 테스트 브라우저의 실제 공유창 대신 어떤 내용으로 불렸는지만 기록한다.
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, "share", { configurable: true, value(data) { window.__shared = data; return Promise.resolve(); } });
    const original = window.matchMedia.bind(window);
    window.matchMedia = (q) => (q === "(pointer: coarse)" ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : original(q));
  });
  await ready(page, "/#/dog/demo-bori");
  await page.getByRole("button", { name: /^공유/ }).click();
  await expect.poll(() => page.evaluate(() => window.__shared?.url)).toMatch(/\/d\/demo-bori$/);
  expect(await page.evaluate(() => window.__shared.title)).toBe("보리를 찾고 있어요 · 멍백홈");
  await expect(page.getByRole("dialog", { name: "소식을 함께 나눠주세요" })).toHaveCount(0);
});
test("share, flag and info open as React bottom sheets with no legacy modal root", async ({ page }) => {
  // 기본 공유창이 없는 환경(컴퓨터)에서는 앱의 공유 시트가 열린다.
  await page.addInitScript(() => { Object.defineProperty(Navigator.prototype, "share", { configurable: true, value: undefined }); });
  await ready(page, "/#/dog/demo-bori");
  await expect(page.locator("#modal-root")).toHaveCount(0);
  await page.getByRole("button", { name: /^공유/ }).click();
  const share = page.getByRole("dialog", { name: "소식을 함께 나눠주세요" });
  await expect(share.locator("#share-url")).toHaveValue(/\/d\/demo-bori$/);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: /^문제 신고/ }).click();
  const flag = page.getByRole("dialog", { name: "문제 신고하기" });
  await flag.getByRole("button", { name: "중복 신고" }).click();
  await expect(flag.getByRole("button", { name: "중복 신고" })).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await page.goto("/#/my/settings");
  await page.getByRole("button", { name: /서비스 안내/ }).click();
  await expect(page.getByRole("dialog", { name: "멍백홈 안내" })).toBeVisible();
});
test("unknown addresses show a friendly not-found screen", async ({ page }) => {
  await ready(page, "/#/no-such-page");
  await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없어요" })).toBeVisible();
});
test("my home puts reports first and keeps logout in settings", async ({ page }) => {
  await ready(page, "/#/my");
  await expect(page.getByRole("heading", { name: "마이홈" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("button", { name: "로그인", exact: true })).toBeVisible();
  const c = await registerByApi(page);
  await page.goto("/#/my");
  await expect(page.getByRole("heading", { name: `${c.name} 님` })).toBeVisible();
  const headers = await page.getByRole("main").getByRole("heading", { level: 2 }).allInnerTexts();
  expect(headers.slice(0, 2)).toEqual(["내 신고", "우리 집 강아지"]);
  await expect(page.getByRole("main").getByRole("button", { name: "로그아웃" })).toHaveCount(0);
  await page.getByRole("link", { name: "설정" }).click();
  await expect(page).toHaveURL(/#\/my\/settings$/);
  await expect(page.getByRole("button", { name: /새 목격 소식 알림 받기/ })).toBeVisible();
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect.poll(() => page.evaluate(async () => (await (await fetch("/api/state")).json()).user?.registered)).toBeFalsy();
});
