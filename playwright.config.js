import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: ["v2-browser.spec.js","account-browser.spec.js","mobile-browser.spec.js","shell.spec.js","design-rules.spec.js"],
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5174",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    launchOptions: { channel: "msedge" },
  },
  projects: [
    { name: "desktop" },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  reporter: "list",
  timeout: 60000,
});
