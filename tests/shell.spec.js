import { test, expect } from "@playwright/test";
test("React shell hosts the legacy app", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#app [data-shell=react]")).toHaveCount(1);
  await expect(page.locator("#legacy-root main#main")).toHaveCount(1);
});
