import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { startTestServer } from "./e2e-server.mjs";
// 옛 CSS를 줄인 뒤에도 남은 옛 팝업이 깨지지 않았는지 눈으로 확인하는 캡처.
mkdirSync("artifacts/redesign", { recursive: true });
const fx = await startTestServer();
await new Promise((r) => fx.server.once("listening", r));
const browser = await chromium.launch({ channel: "msedge" });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
const shots = [
  ["legacy-flag", "/dog/demo-bori", "문제 신고"],
  ["legacy-share", "/dog/demo-bori", "공유"],
  ["legacy-poster", "/dog/demo-bori", "QR 전단"],
  ["legacy-about", "/my/settings", "서비스 안내"],
  ["legacy-device", "/my/settings", "이 휴대폰에서 기능 확인"],
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
