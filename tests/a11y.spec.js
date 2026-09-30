import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { ready } from "./helpers.js";

// 스크린리더·키보드 사용자를 위한 자동 점검. 심각(serious)·치명(critical) 문제는 없어야 한다.
// 지도(Leaflet) 내부는 외부 라이브러리라 제외한다.
const SCREENS = ["/#/", "/#/explore", "/#/sightings", "/#/stories", "/#/my", "/#/dog/demo-bori", "/#/report/new", "/#/sighting/new"];
for (const path of SCREENS) {
  test(`accessibility: ${path}`, async ({ page }) => {
    await ready(page, path);
    await page.waitForTimeout(500);
    const result = await new AxeBuilder({ page }).exclude(".leaflet-container").analyze();
    const serious = result.violations
      .filter((v) => ["serious", "critical"].includes(v.impact))
      .map((v) => `${v.id}: ${v.help} → ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(", ")}`);
    expect(serious, serious.join("\n")).toEqual([]);
  });
}
