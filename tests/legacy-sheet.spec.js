import { test, expect } from "@playwright/test";
import { ready, openLogin } from "./helpers.js";
test("legacy modal is a bottom sheet on phones and closes when dragged down", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "Phone layout");
  await ready(page);
  await openLogin(page);
  const sheet = page.getByRole("dialog");
  const vh = page.viewportSize().height;
  // 등장 애니메이션이 끝난 뒤의 위치를 잰다.
  await expect.poll(async () => { const b = await sheet.boundingBox(); return Math.round(b.y + b.height); }).toBe(vh);
  const box = await sheet.boundingBox();
  expect(Math.round(box.width)).toBe(page.viewportSize().width);
  const handle = page.locator("#modal-root .sheet-handle");
  await expect(handle).toBeVisible();
  const h = await handle.boundingBox();
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2 + 120, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("controls inside legacy sheets follow touch and type rules", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "Phone layout");
  await ready(page);
  await openLogin(page);
  const r = await page.evaluate(() => {
    const root = document.querySelector("#modal-root");
    const vis = (el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
    const small = [...root.querySelectorAll("button, a, input, select, textarea")].filter(vis)
      .filter((el) => { const b = el.getBoundingClientRect(); return b.height < 44 || b.width < 44; })
      .map((el) => (el.getAttribute("aria-label") || el.textContent || el.name).trim().slice(0, 20));
    const inputs = [...root.querySelectorAll("input, select, textarea")].filter(vis)
      .map((el) => parseFloat(getComputedStyle(el).fontSize));
    const primary = getComputedStyle(root.querySelector(".button.primary")).backgroundColor;
    return { small, minInput: Math.min(...inputs), primary };
  });
  expect(r.small).toEqual([]);
  expect(r.minInput).toBeGreaterThanOrEqual(16);
  expect(r.primary).toBe("rgb(232, 128, 95)");
});
test("legacy modal is a centered 480px window on desktop", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Desktop layout");
  await ready(page);
  await openLogin(page);
  const box = await page.getByRole("dialog").boundingBox();
  expect(Math.round(box.width)).toBe(480);
  const vw = page.viewportSize().width;
  expect(Math.abs(box.x + box.width / 2 - vw / 2)).toBeLessThanOrEqual(1);
  await expect(page.locator("#modal-root .sheet-handle")).toBeHidden();
});
