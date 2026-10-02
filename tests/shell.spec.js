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
  // 전국은 한 장의 지도로 열지 않고, 지역을 고르면 그 지역 지도를 연다.
  await expect(page.locator(".leaflet-container")).toHaveCount(0);
  await page.getByRole("button", { name: "지역 고르기" }).click();
  await pickRegion(page, "서울", "서울 전체");
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await page.getByRole("button", { name: "목록으로 보기" }).click();
  await expect(page.locator(".leaflet-container")).toHaveCount(0);
});
// 지역 시트: 시·도를 고르면 이어서 시·군·구를 고른다.
async function pickRegion(page, province, district) {
  await page.getByRole("dialog", { name: "지역 선택" }).getByRole("button", { name: province, exact: true }).click();
  await page.getByRole("dialog", { name: `${province} 시·군·구` }).getByRole("button", { name: district, exact: true }).click();
}
// 핀 하나를 누른다. 가까이 모인 핀은 숫자 묶음이라, 묶음을 눌러 확대한 뒤 다시 찾는다.
async function openOnePin(page) {
  const single = page.locator(".leaflet-marker-icon:has(.map-pin:not(.cluster-pin):not(.here-pin))");
  for (let i = 0; i < 6 && !(await single.count()); i++) {
    await page.locator(".leaflet-marker-icon:has(.cluster-pin)").first().dispatchEvent("click");
    await page.waitForTimeout(400);
  }
  await single.first().dispatchEvent("click");
}
test("sightings open near me when location is already allowed, sorted by distance and on a map", async ({ page, context }) => {
  // 서울 송파구 근처에 있다고 가정한다(예시 목격 소식이 이 근처에 있다).
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 37.5145, longitude: 127.1059 });
  await ready(page, "/#/sightings");
  await expect(page.getByRole("button", { name: "내 근처 5km" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("main").getByRole("heading", { name: "내 근처 5km" })).toBeVisible();
  const first = page.locator("[data-sighting-row]").first();
  await expect(first).toContainText(/^.*?(\d+m|\d+\.\dkm|\d+km) ·/);
  await page.getByRole("button", { name: "지도로 보기" }).click();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await openOnePin(page);
  await expect(page.getByRole("dialog", { name: "목격 제보" })).toBeVisible();
  await page.keyboard.press("Escape");
  // 지역 칩은 내 근처에서도 보이고, 지역을 고르면 내 근처가 꺼진다.
  await page.getByRole("button", { name: "지역", exact: true }).click();
  await pickRegion(page, "서울", "송파구");
  await expect(page.getByRole("button", { name: "내 근처", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.getByRole("button", { name: "서울 송파구" })).toBeVisible();
});
test("sightings never open a whole-country map: pick an area or use my location first", async ({ page, context }) => {
  await ready(page, "/#/sightings");
  await page.getByRole("button", { name: "지도로 보기" }).click();
  await expect(page.getByRole("heading", { name: "어느 동네를 지도로 볼까요?" })).toBeVisible();
  await expect(page.locator(".leaflet-container")).toHaveCount(0);
  await page.getByRole("button", { name: "지역 고르기" }).click();
  await pickRegion(page, "서울", "서울 전체");
  await expect(page.locator(".leaflet-container")).toBeVisible();
  // 서울 지도는 한반도 전체가 아니라 도시 단위로 열린다.
  const zoom = await page.locator(".leaflet-container").evaluate((el) => Number(el.querySelector(".leaflet-tile")?.getAttribute("src")?.split("/").at(-3)));
  expect(zoom).toBeGreaterThanOrEqual(10);
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 37.5145, longitude: 127.1059 });
  await page.getByRole("button", { name: "서울", exact: true }).click();
  await page.getByRole("dialog", { name: "지역 선택" }).getByRole("button", { name: "전국" }).click();
  await page.getByRole("button", { name: "내 위치로 보기" }).click();
  await expect(page.getByRole("button", { name: "내 근처 5km" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".leaflet-container")).toBeVisible();
});
test("an empty near-me map stays on screen and offers to widen to the nearest sighting", async ({ page, context }) => {
  // 예시 목격 소식(송파)에서 북쪽으로 약 16km: 5km 안에는 없고 20km 안에는 있다.
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 37.66, longitude: 127.1 });
  await ready(page, "/#/sightings");
  await expect(page.getByRole("button", { name: "내 근처 5km" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "지도로 보기" }).click();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  const notice = page.getByRole("status").filter({ hasText: "내 근처 5km 안에는 목격 소식이 없어요" });
  await expect(notice).toContainText(/가장 가까운 소식은 \d+(\.\d)?km 떨어져 있어요/);
  await expect(page.locator(".range-circle")).toHaveCount(1);
  await notice.getByRole("button", { name: "20km까지 넓혀 보기" }).click();
  await expect(page.getByRole("button", { name: "내 근처 20km" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".leaflet-marker-icon:not(:has(.here-pin))").first()).toBeVisible();
  await page.getByRole("button", { name: "목록으로 보기" }).click();
  await expect(page.locator("[data-sighting-row]").first()).toBeVisible();
});
test("denied location leaves an in-page guide with retry and region picking", async ({ page }) => {
  await ready(page, "/#/sightings");
  // 권한 거절을 흉내 낸다(브라우저마다 거절 창이 달라 위치 함수를 바꿔 끼운다).
  await page.evaluate(() => {
    navigator.geolocation.getCurrentPosition = (_ok, fail) => fail({ code: 1, PERMISSION_DENIED: 1 });
  });
  await page.getByRole("button", { name: "내 근처", exact: true }).click();
  const guide = page.getByRole("alert").filter({ hasText: "위치 권한이 꺼져 있어요" });
  await expect(guide).toBeVisible();
  await guide.getByRole("button", { name: "지역 고르기" }).click();
  await expect(guide).toHaveCount(0);
  await pickRegion(page, "서울", "송파구");
  await expect(page.getByRole("button", { name: "서울 송파구" })).toBeVisible();
  expect(await page.locator("[data-sighting-row]").count()).toBeGreaterThan(0);
  // 다른 구를 고르면 송파 예시 소식은 빠진다.
  await page.getByRole("button", { name: "서울 송파구" }).click();
  await pickRegion(page, "서울", "도봉구");
  await expect(page.getByRole("button", { name: "서울 도봉구" })).toBeVisible();
  await expect(page.locator("[data-sighting-row]", { hasText: "동호 산책로" })).toHaveCount(0);
});
test("the period filter narrows sightings to recent days", async ({ page }) => {
  await ready(page, "/#/sightings");
  const all = await page.locator("[data-sighting-row]").count();
  await page.getByRole("button", { name: "전체 기간" }).click();
  await page.getByRole("dialog", { name: "기간" }).getByRole("button", { name: "최근 3일" }).click();
  await expect(page.getByRole("button", { name: "최근 3일" })).toBeVisible();
  const recent = await page.locator("[data-sighting-row]").count();
  expect(recent).toBeLessThanOrEqual(all);
  for (const g of await page.getByRole("main").getByRole("heading", { level: 2 }).allInnerTexts()) expect(["오늘", "어제", "이번 주"]).toContain(g);
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
// 휴대폰처럼: 터치 화면 + 파일 공유 가능
const phone = () => () => {
  Object.defineProperty(Navigator.prototype, "canShare", { configurable: true, value: () => true });
  Object.defineProperty(Navigator.prototype, "share", { configurable: true, value(data) { window.__shared = data; return Promise.resolve(); } });
  const original = window.matchMedia.bind(window);
  window.matchMedia = (q) => (q === "(pointer: coarse)" ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : original(q));
};
test.describe("iPhone", () => {
  test.use({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" });
test("on iPhone the poster button says save or send, matching the share sheet it opens", async ({ page }) => {
  await page.addInitScript(phone());
  await ready(page, "/#/dog/demo-bori");
  await page.getByRole("button", { name: /^QR 전단/ }).click();
  const sheet = page.getByRole("dialog", { name: "QR 전단 만들기" });
  await expect(sheet.getByRole("img", { name: "보리 실종 전단" })).toBeVisible({ timeout: 15000 });
  await expect(sheet.getByText(/공유 창에서 '이미지 저장'을 누르면 사진 앱에 들어가요/)).toBeVisible();
  await sheet.getByRole("button", { name: "저장하거나 보내기" }).click();
  await expect.poll(() => page.evaluate(() => window.__shared?.files?.[0]?.type), { timeout: 15000 }).toBe("image/png");
});
});
test("on Android the poster has separate save and send buttons", async ({ page }) => {
  await page.addInitScript(phone());
  await ready(page, "/#/dog/demo-bori");
  await page.getByRole("button", { name: /^QR 전단/ }).click();
  const sheet = page.getByRole("dialog", { name: "QR 전단 만들기" });
  // 다 그려지면 길게 눌러 저장할 수 있는 이미지로 보인다.
  await expect(sheet.getByRole("img", { name: "보리 실종 전단" })).toBeVisible({ timeout: 15000 });
  const download = page.waitForEvent("download");
  await sheet.getByRole("button", { name: "이미지 저장", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("멍백홈-보리-print.png");
  await sheet.getByRole("button", { name: "카톡 등으로 보내기" }).click();
  await expect.poll(() => page.evaluate(() => window.__shared?.files?.[0]?.type), { timeout: 15000 }).toBe("image/png");
  expect(await page.evaluate(() => window.__shared.files[0].name)).toBe("멍백홈-보리-print.png");
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
  // 보호소 공고는 우리 앱의 보호소 화면(그 지역)으로 간다.
  await expect(page.getByRole("link", { name: /서울 보호소 공고 모두 보기/ })).toHaveAttribute("href", "#/shelter?region=%EC%84%9C%EC%9A%B8");
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
  // 알림 줄은 켜짐/꺼짐 상태를 보여준다.
  await expect(page.getByRole("button", { name: /새 목격 소식 알림.*(켜짐|꺼짐)/ })).toBeVisible();
  // 로그아웃은 바로 실행되지 않고 한 번 확인한다.
  await page.getByRole("button", { name: "로그아웃" }).click();
  const confirm = page.getByRole("dialog", { name: "로그아웃할까요?" });
  await expect(confirm).toBeVisible();
  await confirm.getByRole("button", { name: "로그아웃" }).click();
  await expect.poll(() => page.evaluate(async () => (await (await fetch("/api/state")).json()).user?.registered)).toBeFalsy();
});
test("saving a dog fills the heart in coral", async ({ page }) => {
  await ready(page, "/#/dog/demo-bori");
  const save = page.getByRole("button", { name: /^저장/ });
  if ((await save.getAttribute("aria-pressed")) === "true") await save.click();
  await expect(save).toHaveAttribute("aria-pressed", "false");
  expect(await save.locator("svg").getAttribute("fill")).toBe("none");
  await save.click();
  await expect(save).toHaveAttribute("aria-pressed", "true");
  await expect(save).toContainText("저장됨");
  expect(await save.locator("svg").getAttribute("fill")).toBe("currentColor");
  await expect(save.locator("svg")).toHaveCSS("color", "rgb(232, 128, 95)");
});
