import { expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
export const unique = () => randomUUID().slice(0, 8);
export const credentials = () => ({
  email: `${unique()}@example.com`,
  password: "browser-test-password",
  name: "테스트 보호자",
});
export async function ready(page, path = "/") {
  await page.goto(path);
  await expect(page.getByRole("navigation", { name: "하단 메뉴" })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.querySelector("#connection-banner")?.hidden))
    .toBe(true);
}
export async function currentUserName(page) {
  return page.evaluate(async () => (await (await fetch("/api/state")).json()).user?.name ?? null);
}
export async function registerByApi(page, c = credentials()) {
  await page.request.post("/api/auth/register", { data: c });
  await page.reload();
  await expect.poll(() => currentUserName(page)).toBe(c.name);
  return c;
}
export async function openLogin(page) {
  await page.goto("/#/my");
  await page.getByRole("main").getByRole("button", { name: /^로그인/ }).first().click();
  await expect(page.locator("#account-form")).toBeVisible();
}
// 기존 data-action 처리기를 화면 위치와 무관하게 호출한다(설정 화면이 생기기 전 임시).
export async function trigger(page, action) {
  await page.evaluate((a) => {
    const b = document.createElement("button");
    b.dataset.action = a;
    document.body.append(b);
    b.click();
    b.remove();
  }, action);
}
