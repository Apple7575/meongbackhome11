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
export const nextStep = (page) => page.getByRole("button", { name: "다음", exact: true }).click();
// 새 실종 신고 흐름(사진 → 이름·견종 → 특징 → 언제 → 어디서 → 설명)을 확인 단계 직전까지 채운다.
export async function fillReport(page, { name, breed = "말티즈", photo = "public/assets/dog-maltese.png" }) {
  await page.locator("input[name=photo]").setInputFiles(photo);
  await expect(page.getByAltText("고른 사진")).toBeVisible();
  await nextStep(page);
  await page.locator("input[name=name]").fill(name);
  await page.locator("input[name=breed]").fill(breed);
  await nextStep(page);
  await page.getByRole("group", { name: "털 색" }).getByRole("button", { name: "흰색" }).click();
  await nextStep(page);
  await nextStep(page);
  await page.locator("input[name=location]").fill("서울 송파구 석촌호수");
  // 지도는 필요할 때 불러오므로 준비된 뒤 누른다.
  await expect(page.locator("#location-picker.leaflet-container")).toBeVisible();
  await page.locator("#location-picker").click({ position: { x: 140, y: 110 } });
  await nextStep(page);
  await nextStep(page);
}
// 목격 제보 흐름(어디서 → 언제·상황 → 방향 → 사진·특징)을 확인 단계 직전까지 채운다.
export async function fillSighting(page, { place }) {
  await page.locator("input[name=location]").fill(place);
  await expect(page.locator("#sighting-picker.leaflet-container")).toBeVisible();
  await page.locator("#sighting-picker").click({ position: { x: 140, y: 100 } });
  for (let i = 0; i < 4; i++) await nextStep(page);
}
