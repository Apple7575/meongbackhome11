import { test, expect } from "@playwright/test";
import { ready } from "./helpers.js";

// 테스트 서버는 공공데이터 API 대신 정해진 답(서울 송파 보호소의 흰색 말티즈, 서울 분실 신고 하나)을 준다.
test.beforeEach(async ({ page }) => {
  expect((await page.request.get("/__test/public-sync")).ok()).toBe(true);
});

test("shelter dogs and outside lost reports are listed by region without the reporter's contact", async ({ page }) => {
  await ready(page, "/");
  await page.getByRole("link", { name: /보호소에 들어온 아이/ }).click();
  await expect(page.getByRole("heading", { name: "보호소·분실 신고" })).toBeVisible();
  const row = page.locator("[data-public-row]").filter({ hasText: "말티즈 · 흰색 · 암컷" }).first();
  await expect(row).toBeVisible();
  await row.click();
  const sheet = page.getByRole("dialog", { name: "보호소에 들어온 아이" });
  await expect(sheet.getByText("송파구 동물보호센터 · 서울특별시 송파구")).toBeVisible();
  await expect(sheet.getByRole("link", { name: "보호소에 전화하기" })).toHaveAttribute("href", "tel:020000000");
  await expect(sheet.getByText(/출처: 국가동물보호정보시스템/)).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "다른 곳의 분실 신고" }).click();
  await expect(page.locator("[data-public-row]").filter({ hasText: "푸들 · 갈색 · 수컷" }).first()).toBeVisible();
  await expect(page.getByText("010-0000-0000")).toHaveCount(0);
});

test("a missing report shows similar dogs that came into a shelter", async ({ page, browser }) => {
  const owner = await browser.newContext({ baseURL: "http://127.0.0.1:5174" });
  await owner.request.post("/api/auth/register", { data: { email: `${Date.now()}-p@example.com`, password: "browser-test-password", name: "보호자" } });
  const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aD1sAAAAASUVORK5CYII=";
  const id = `dog-public-${Date.now()}`;
  const created = await owner.request.post("/api/changes", { data: { operations: [{ collection: "dogs", value: { id, name: "솜이", breed: "말티즈", color: "흰색", sex: "암컷", size: "소형", image: png, region: "서울", location: "송파구", coords: [37.51, 127.1], time: new Date(Date.now() - 2 * 86400000).toISOString(), accessory: "없음", status: "missing" } }] } });
  expect(created.ok()).toBe(true);
  await ready(page, `/#/dog/${id}`);
  await expect(page.getByRole("heading", { name: "보호소에 들어온 비슷한 아이 1" })).toBeVisible();
  await page.locator("[data-public-row]").first().click();
  await expect(page.getByRole("dialog", { name: "보호소에 들어온 아이" })).toBeVisible();
  await owner.close();
});
