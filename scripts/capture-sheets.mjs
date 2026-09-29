import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { startTestServer } from "./e2e-server.mjs";
mkdirSync("artifacts/redesign", { recursive: true });
const fx = await startTestServer();
await new Promise((r) => fx.server.once("listening", r));
const browser = await chromium.launch({ channel: "msedge" });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
const shots = [
  ["sheet-login", "/my", (p) => p.getByRole("main").getByRole("button", { name: /^로그인/ }).first().click()],
  ["sheet-report", "/", (p) => p.getByRole("button", { name: "실종 신고", exact: true }).click()],
  ["sheet-sighting", "/", (p) => p.getByRole("button", { name: /강아지를 발견했어요/ }).click()],
];
for (const [name, route, open] of shots) {
  await page.goto(`http://127.0.0.1:5174/#${route}`, { waitUntil: "networkidle" });
  await open(page);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `artifacts/redesign/${name}.png` });
  await page.keyboard.press("Escape");
}
await browser.close();
await fx.close();
