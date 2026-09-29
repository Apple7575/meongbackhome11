import { test, expect } from "@playwright/test";
import { ready, registerByApi } from "./helpers.js";
test("React shell draws top bar and bottom navigation around legacy pages", async ({ page }) => {
  await ready(page);
  await expect(page.locator("#app [data-shell=react]")).toHaveCount(1);
  const nav = page.getByRole("navigation", { name: "하단 메뉴" });
  await expect(nav.getByRole("link")).toHaveCount(4);
  await expect(nav.getByRole("button", { name: "실종 신고", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^알림 \d+개$/ })).toBeVisible();
  await expect(page.locator(".site-header, .site-footer, .mobile-nav")).toHaveCount(0);
  await expect(page.locator("#legacy-root")).toBeVisible();
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
