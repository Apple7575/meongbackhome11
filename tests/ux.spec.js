import { test, expect } from "@playwright/test";
import { ready, registerByApi, nextStep, openLogin } from "./helpers.js";

// 휴대폰 화면(390x844) 기준으로 확인한다. 데스크톱 프로젝트에서도 같은 크기로 맞춘다.
test.use({ viewport: { width: 390, height: 844 } });

test("a failed step shows its reason right above the button, never hidden under it", async ({ page }) => {
  await ready(page, "/#/report/new");
  await page.locator("input[name=photo]").setInputFiles("public/assets/dog-maltese.png");
  await expect(page.getByAltText("고른 사진")).toBeVisible();
  await nextStep(page);
  await page.locator("input[name=name]").fill("보리");
  await page.locator("input[name=breed]").fill("말티즈");
  await nextStep(page);
  // 털 색을 고르지 않고 다음: 긴 단계라도 안내가 화면 안에 보여야 한다.
  await nextStep(page);
  const alert = page.getByRole("alert").filter({ hasText: "털 색을 하나 이상 골라주세요." });
  await expect(alert).toBeInViewport({ ratio: 1 });
  const button = await page.getByRole("button", { name: "다음", exact: true }).boundingBox();
  expect((await alert.boundingBox()).y + 1).toBeLessThan(button.y);
  // 고치면 안내가 사라지고 다음으로 넘어간다.
  await page.getByRole("group", { name: "털 색" }).getByRole("button", { name: "흰색" }).click();
  await nextStep(page);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("the sighting map step explains a missing pin inside the viewport", async ({ page }) => {
  await ready(page, "/#/sighting/new");
  await nextStep(page);
  await expect(page.getByRole("alert").filter({ hasText: "핀을 맞춰주세요" })).toBeInViewport({ ratio: 1 });
});

test("guests learn at the first report step that login comes at the end; members do not", async ({ page }) => {
  await ready(page, "/#/report/new");
  await expect(page.locator("[data-login-note]")).toContainText("쓰던 내용은 저장돼요");
  await expect(page.locator("[data-login-note]")).toContainText("등록할 때");
  // 목격 제보는 로그인 없이 하므로 안내가 없다.
  await page.goto("/#/sighting/new");
  await expect(page.getByRole("heading", { name: "강아지를 본 곳은 어디인가요?" })).toBeVisible();
  await expect(page.locator("[data-login-note]")).toHaveCount(0);
  await registerByApi(page);
  await page.goto("/#/report/new");
  await expect(page.getByRole("heading", { name: "잃어버린 아이의 사진을 올려주세요" })).toBeVisible();
  await expect(page.locator("[data-login-note]")).toHaveCount(0);
});

test("login points at each empty field before asking the server", async ({ page }) => {
  await ready(page);
  await openLogin(page);
  let asked = false;
  await page.route("**/api/auth/login", (route) => { asked = true; return route.continue(); });
  await page.locator("#account-form button[type=submit]").click();
  await expect(page.locator("#account-form")).toContainText("이메일을 적어주세요.");
  await expect(page.locator("#account-form")).toContainText("비밀번호를 적어주세요.");
  await expect(page.locator("#account-form input[name=email]")).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#account-form input[name=email]")).toBeFocused();
  await page.locator("#account-form input[name=email]").fill("bori");
  await expect(page.locator("#account-form")).not.toContainText("이메일을 적어주세요.");
  await page.locator("#account-form button[type=submit]").click();
  await expect(page.locator("#account-form")).toContainText("이메일 주소 형식을 확인해주세요");
  expect(asked).toBe(false);
});

test("filter chips scroll while the list/map switch stays fully visible, even at 320px", async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 700 });
    for (const route of ["/#/explore", "/#/sightings"]) {
      await ready(page, route);
      const toggle = page.getByRole("button", { name: "지도로 보기" });
      await expect(toggle).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});

test("shelter and stories have a way back, and empty screens offer a next step", async ({ page }) => {
  await ready(page, "/");
  await page.getByRole("link", { name: /집에 돌아온 아이들/ }).click();
  await expect(page.getByRole("heading", { name: "집에 돌아온 아이들" })).toBeVisible();
  // 0을 그대로 보여주지 않는다.
  await expect(page.getByRole("main")).not.toContainText(/돌아온 아이들 0|0마리/);
  await expect(page.getByRole("navigation", { name: "하단 메뉴" }).getByRole("link", { name: "홈", exact: true })).toHaveAttribute("aria-current", "page");
  await page.getByRole("button", { name: "뒤로" }).click();
  await expect(page.getByRole("heading", { name: /에서 찾고 있어요/ })).toBeVisible();
  // 보호소: 두 칸 탭은 글자가 잘리지 않고, 비어 있으면 지역을 바로 바꿀 수 있다.
  await page.route("**/api/public/**", (route) => route.fulfill({ json: { total: 0, items: [] } }));
  await ready(page, "/#/shelter");
  const tabs = page.getByRole("group", { name: "공고 종류" });
  for (const tab of await tabs.getByRole("button").all())
    expect(await tab.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.getByRole("main").getByRole("button", { name: "지역 바꾸기" }).click();
  await expect(page.getByRole("dialog", { name: "지역 선택" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "뒤로" })).toBeVisible();
});

test("an empty my home offers to report or browse", async ({ page }) => {
  await ready(page);
  await registerByApi(page);
  await page.goto("/#/my");
  await expect(page.getByRole("main").getByRole("button", { name: "신고하기" })).toBeVisible();
  await page.getByRole("main").getByRole("link", { name: "강아지 찾아보기" }).click();
  await expect(page).toHaveURL(/#\/explore$/);
});

test("the bell hides while writing, and settings show the alert row as a switch", async ({ page }) => {
  await ready(page, "/#/report/new");
  await expect(page.getByRole("button", { name: /^알림 \d+개$/ })).toHaveCount(0);
  await page.goto("/#/my/settings");
  await expect(page.getByRole("button", { name: /^알림 \d+개$/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /새 목격 소식 알림.*(켜짐|꺼짐)/ })).toBeVisible();
});

test("losing the internet shows a banner that clears when it comes back", async ({ page, context }) => {
  await ready(page, "/#/explore");
  await context.setOffline(true);
  const banner = page.locator("#connection-banner");
  await expect(banner).toContainText("인터넷 연결이 끊겼어요");
  await context.setOffline(false);
  await expect(banner).toBeHidden();
});
