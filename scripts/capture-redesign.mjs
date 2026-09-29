import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { startTestServer } from "./e2e-server.mjs";
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ["/", "/explore", "/sightings", "/my", "/my/settings"];
mkdirSync("artifacts/redesign", { recursive: true });
const fx = await startTestServer();
await new Promise((r) => fx.server.once("listening", r));
const browser = await chromium.launch({ channel: "msedge" });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
await page.goto("http://127.0.0.1:5174/#/my", { waitUntil: "networkidle" });
await page.screenshot({ path: "artifacts/redesign/my-guest.png", fullPage: true });
await page.request.post("http://127.0.0.1:5174/api/auth/register", { data: { name: "토토로", email: `capture-${Date.now()}@example.com`, password: "capture-password-1" } });
await page.reload({ waitUntil: "networkidle" });
for (const route of routes) {
  await page.goto(`http://127.0.0.1:5174/#${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const name = route === "/" ? "home" : route.slice(1).replaceAll("/", "-");
  await page.screenshot({ path: `artifacts/redesign/${name}.png`, fullPage: true });
}
await browser.close();
await fx.close();
