import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { startTestServer } from "./e2e-server.mjs";
// 공유·전단·문제 신고·안내·기기 확인 시트를 폰 크기로 캡처해 눈으로 확인한다.
mkdirSync("artifacts/redesign", { recursive: true });
const fx = await startTestServer();
await new Promise((r) => fx.server.once("listening", r));
const browser = await chromium.launch({ channel: "msedge" });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
const shots = [
  ["sheet-flag", "/dog/demo-bori", "문제 신고"],
  ["sheet-share", "/dog/demo-bori", "공유"],
  ["sheet-poster", "/dog/demo-bori", "QR 전단"],
  ["sheet-about", "/my/settings", "서비스 안내"],
  ["sheet-device", "/my/settings", "이 휴대폰에서 기능 확인"],
];
for (const [name, route, button] of shots) {
  await page.goto(`http://127.0.0.1:5174/#${route}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: new RegExp(`^${button}`) }).first().click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `artifacts/redesign/${name}.png` });
  await page.keyboard.press("Escape");
  await page.goto("http://127.0.0.1:5174/#/");
}
await browser.close();
await fx.close();
