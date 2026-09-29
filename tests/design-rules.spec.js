import { test, expect } from "@playwright/test";
import { ready, registerByApi } from "./helpers.js";
const SCREENS = ["/", "/explore", "/sightings", "/my", "/my/settings", "/dog/demo-bori"];
async function audit(page) {
  return page.evaluate(() => {
    const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden"; };
    const small = [...document.querySelectorAll("#app a, #app button, #app input, #app select")]
      .filter((el) => visible(el) && !el.closest(".leaflet-container"))
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width < 44 || r.height < 44; })
      .map((el) => `${el.tagName} ${(el.getAttribute("aria-label") || el.textContent).trim().slice(0, 20)}`);
    const tiny = [...document.querySelectorAll("#app *")]
      .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && visible(el) && !el.closest(".leaflet-container"))
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 13)
      .map((el) => el.textContent.trim().slice(0, 20));
    const fills = [...document.querySelectorAll('main [data-variant="fill"]')].filter(visible).length;
    return { small, tiny, fills, overflow: document.documentElement.scrollWidth > innerWidth };
  });
}
test("toss rules hold on every redesigned screen (guest and member)", async ({ page }) => {
  await ready(page);
  for (const pass of ["guest", "member"]) {
    if (pass === "member") await registerByApi(page);
    for (const route of SCREENS) {
      await page.goto(`/#${route}`);
      await expect(page.getByRole("main")).toBeVisible();
      const r = await audit(page);
      expect(r.fills, `${pass} ${route} coral buttons`).toBeLessThanOrEqual(1);
      expect(r.small, `${pass} ${route} small targets`).toEqual([]);
      expect(r.tiny, `${pass} ${route} tiny text`).toEqual([]);
      expect(r.overflow, `${pass} ${route} overflow`).toBe(false);
    }
  }
});
test("logout lives in settings, not on my home", async ({ page }) => {
  await ready(page);
  await registerByApi(page);
  await page.goto("/#/my");
  await expect(page.getByRole("button", { name: "로그아웃" })).toHaveCount(0);
  await page.goto("/#/my/settings");
  await expect(page.getByRole("button", { name: "로그아웃" })).toBeVisible();
});
test("legacy pages still render inside the React frame", async ({ page }) => {
  for (const [path, check] of [
    ["/#/dog/demo-bori", () => page.getByRole("heading", { name: /보리/ }).first()],
    ["/#/stories", () => page.getByRole("button", { name: "우리의 재회 이야기 쓰기" })],
    ["/#/account/forgot", () => page.locator("#legacy-root input").first()],
  ]) {
    await ready(page, path);
    await expect(check()).toBeVisible();
    await expect(page.getByRole("navigation", { name: "하단 메뉴" })).toBeVisible();
  }
});
test("desktop shows redesigned screens in a centered 480px column", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Desktop-only layout");
  await ready(page, "/#/my");
  expect(Math.round((await page.locator("#app").boundingBox()).width)).toBe(480);
});
