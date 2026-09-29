import { test, expect } from "@playwright/test";
import { ready } from "./helpers.js";
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
