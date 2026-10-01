import { test, expect } from "@playwright/test";
import { ready, registerByApi } from "./helpers.js";
const SCREENS = ["/", "/explore", "/sightings", "/my", "/my/settings", "/dog/demo-bori", "/report/new", "/sighting/new", "/stories", "/admin", "/account/forgot"];
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
test("detail, stories and account pages render inside the React frame", async ({ page }) => {
  for (const [path, check] of [
    ["/#/dog/demo-bori", () => page.getByRole("heading", { name: /보리/ }).first()],
    ["/#/stories", () => page.getByRole("button", { name: "우리의 재회 이야기 쓰기" })],
    ["/#/account/forgot", () => page.locator("#main input").first()],
  ]) {
    await ready(page, path);
    await expect(check()).toBeVisible();
    // 상세 화면은 뒤로 가기가 있는 한 단계 깊은 화면이라 하단 메뉴를 숨긴다.
    const nav = page.getByRole("navigation", { name: "하단 메뉴" });
    if (path.startsWith("/#/dog/")) await expect(nav).toHaveCount(0);
    else await expect(nav).toBeVisible();
  }
});
test("desktop shows redesigned screens in a centered 480px column", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Desktop-only layout");
  await ready(page, "/#/my");
  expect(Math.round((await page.locator("#app").boundingBox()).width)).toBe(480);
});
test("phone dark mode gets the app's own dark theme (no browser inversion) and keeps the coral button", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await ready(page, "/#/report/new");
  // 앱이 다크 화면을 직접 제공한다고 알려서 브라우저가 색을 뒤집지 않게 한다.
  expect(await page.locator("meta[name=color-scheme]").getAttribute("content")).toBe("light dark");
  await expect(page.locator("#app")).toHaveCSS("background-color", "rgb(23, 23, 28)");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("color", "rgb(255, 255, 255)");
  await expect(page.getByRole("button", { name: "다음", exact: true })).toHaveCSS("background-color", "rgb(184, 85, 58)");
  // 밝은 모드는 그대로 흰 바탕
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("#app")).toHaveCSS("background-color", "rgb(255, 255, 255)");
});
test("settings let people pick light or dark regardless of the phone, remembered on this device", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await ready(page, "/#/my/settings");
  await expect(page.locator("#app")).toHaveCSS("background-color", "rgb(23, 23, 28)");
  await page.getByRole("button", { name: /화면 테마/ }).click();
  await page.getByRole("dialog", { name: "화면 테마" }).getByRole("button", { name: "라이트" }).click();
  await expect(page.locator("#app")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await page.reload();
  await expect(page.locator("#app")).toHaveCSS("background-color", "rgb(255, 255, 255)");
  await expect(page.getByRole("button", { name: /화면 테마/ })).toContainText("라이트");
  await page.getByRole("button", { name: /화면 테마/ }).click();
  await page.getByRole("dialog", { name: "화면 테마" }).getByRole("button", { name: "시스템 설정 따르기" }).click();
  await expect(page.locator("#app")).toHaveCSS("background-color", "rgb(23, 23, 28)");
});
test("the sightings tab reopens in the view used last (list by default)", async ({ page }) => {
  await ready(page, "/#/sightings");
  await expect(page.locator("[data-sighting-row]").first()).toBeVisible();
  await page.getByRole("button", { name: "지도로 보기" }).click();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await page.reload();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await page.getByRole("button", { name: "목록으로 보기" }).click();
  await page.reload();
  await expect(page.locator("[data-sighting-row]").first()).toBeVisible();
});
test("the privacy policy is reachable from settings and covers what we collect, keep and share", async ({ page }) => {
  await ready(page, "/#/my/settings");
  await page.getByRole("link", { name: /개인정보처리방침/ }).click();
  await expect(page.getByRole("heading", { name: "개인정보처리방침", level: 1 })).toBeVisible();
  for (const h of ["1. 모으는 정보", "3. 보관 기간과 지우는 방법", "6. 맡겨서 처리하는 곳(처리 위탁·국외 이전)", "13. 개인정보 보호책임자·문의"])
    await expect(page.getByRole("heading", { name: h })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
