import { test, expect } from "@playwright/test";
import { unique, credentials, ready, registerByApi as account, openLogin, fillReport, fillSighting, nextStep } from "./helpers.js";
async function submitDog(page, name) {
  await page.getByRole("button", { name: "실종 신고", exact: true }).click();
  await fillReport(page, { name });
  await page
    .getByRole("button", { name: "실종 신고 등록하기", exact: true })
    .click();
  await expect(page.locator(".success-next")).toBeVisible();
  await expect(page.getByRole("button", { name: "새 목격 제보 알림 받기" })).toBeVisible();
  await page.getByRole("button", { name: "신고 내용 먼저 확인하기" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
  return page.url().split("/dog/")[1];
}
test.beforeEach(async ({ page }) => ready(page));
test("home list, explore search and no horizontal overflow", async ({
  page,
}) => {
  await expect(page.locator("[data-dog-row]").first()).toBeVisible();
  await page.goto("/#/explore");
  await page.locator("#dog-search").fill("초코");
  await expect(page.locator("[data-dog-row]")).toHaveCount(1);
  await page.locator("#dog-search").fill("없는강아지XYZ");
  await expect(page.getByText("조건에 맞는 강아지가 없어요")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("detail lists sightings in time order and plays them on the map", async ({
  page,
}) => {
  await page.goto("/#/dog/demo-bori");
  const steps = page.locator("[data-sighting-step]");
  expect(await steps.count()).toBeGreaterThanOrEqual(3);
  // 지도는 필요할 때 불러오므로 방향 화살표가 그려질 때까지 기다린다.
  await expect(page.locator(".direction-icon").nth(2)).toBeAttached();
  await expect(page.getByText("실제 이동 경로가 아니에요")).toBeVisible();
  await page.getByRole("button", { name: "순서대로 보기" }).click();
  await expect(page.locator(".selected-pin b")).toHaveText("1");
  await expect(page.locator(".selected-pin b")).toHaveText("3", { timeout: 10000 });
  await expect(steps.nth(2)).toHaveAttribute("aria-current", "true");
});
test("saving from the detail updates my home immediately", async ({ page }) => {
  await account(page);
  const name = "저장확인" + unique();
  const dogId = await submitDog(page, name);
  await page.goto(`/#/dog/${dogId}`);
  const save = page.getByRole("button", { name: /^저장/ });
  await expect(save).toHaveAttribute("aria-pressed", "false");
  await save.click();
  await expect(save).toHaveAttribute("aria-pressed", "true");
  await page.goto("/#/my");
  await expect(page.getByRole("heading", { name: "저장한 소식 1" })).toBeVisible();
});
test("account registration, three-step report and personalized owner home", async ({
  page,
}) => {
  await openLogin(page);
  await expect(page.locator('#account-form input[name=name]')).toHaveCount(0);
  await page.locator('[data-auth-mode=register]').click();
  const c = credentials();
  await page.locator("#account-form input[name=name]").fill(c.name);
  await page.locator("#account-form input[name=email]").fill(c.email);
  await page.locator("#account-form input[name=password]").fill(c.password);
  await page.locator('#account-form input[name=passwordConfirm]').fill(c.password);
  await page.locator('#account-form button[type=submit]').click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const name = "단계신고" + unique();
  await submitDog(page, name);
  await page.goto("/#/");
  await expect(page.getByRole("heading", { name: new RegExp(`^${name}`) })).toBeVisible();
  await expect(page.getByRole("button", { name: /강아지를 잃어버렸어요/ })).toHaveCount(0);
});
test("sighting draft restores location and direction, survives close, then reaches server", async ({
  page,
}) => {
  await page.goto("/#/dog/demo-bori");
  await page.getByRole("button", { name: "이 아이를 봤어요" }).click();
  const place = "복원된 목격" + unique();
  await expect(page.getByRole("navigation", { name: "하단 메뉴" })).toHaveCount(0);
  await page.locator("input[name=location]").fill(place);
  await expect(page.locator("#sighting-picker.leaflet-container")).toBeVisible();
  await page
    .locator("#sighting-picker")
    .click({ position: { x: 130, y: 100 } });
  await nextStep(page);
  await nextStep(page);
  await page.getByRole("button", { name: /^이동했어요/ }).click();
  await page.locator("#heading-range").fill("90");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await expect(page).toHaveURL(/#\/dog\/demo-bori$/);
  await page.getByRole("button", { name: "이 아이를 봤어요" }).click();
  await expect(page.locator("input[name=location]")).toHaveValue(place);
  await expect(page.getByText("작성하던 내용을 불러왔어요.")).toBeVisible();
  await nextStep(page);
  await nextStep(page);
  await expect(page.locator("#heading-label")).toContainText("동쪽");
  await nextStep(page);
  await nextStep(page);
  await page
    .getByRole("button", { name: "목격 소식 남기기", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/dog\/demo-bori$/);
  const data = await (await page.request.get("/api/state")).json();
  expect(data.reports.find((r) => r.location === place)?.heading).toBe(90);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("meongback-draft-v2:sighting-demo-bori"),
    ),
  ).toBeNull();
});
test("two browsers share a dog, deliver live notice, private conversation and reunion", async ({
  page,
  browser,
}) => {
  await account(page);
  const name = "연결검증" + unique(),
    dogId = await submitDog(page, name);
  const other = await browser.newContext({ baseURL: "http://127.0.0.1:5174" });
  try {
    const witness = await other.newPage();
    await ready(witness);
    await witness.goto(`/#/dog/${dogId}`);
    await witness.getByRole("button", { name: "이 아이를 봤어요" }).click();
    await fillSighting(witness, { place: "제보자 기기에서 본 장소" });
    await witness
      .getByRole("button", { name: "목격 소식 남기기", exact: true })
      .click();
    await expect(witness).toHaveURL(new RegExp(`#/dog/${dogId}$`));
    await page.bringToFront();
    await expect(page.getByRole("button", { name: /^알림 [1-9]\d*개$/ })).toBeVisible({ timeout: 20000 });
    await expect(page.locator("[data-sighting-step]")).toHaveCount(1);
    await page.locator("[data-sighting-step]").first().click();
    await expect(page.getByRole("group", { name: "보호자 확인" })).toBeVisible();
    await page.locator("#message-form input").fill("보호자입니다. 감사합니다!");
    await page.locator("#message-form button").click();
    await expect(page.locator("[data-chat-bubble]")).toContainText("감사합니다");
    await witness.reload();
    await witness.locator("[data-sighting-step]").first().click();
    await expect(witness.locator("[data-chat-bubble]")).toContainText("감사합니다");
    await expect(witness.getByRole("group", { name: "보호자 확인" })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.goto("/#/my");
    await page.getByRole("button", { name: "찾았어요", exact: true }).click();
    await page.getByRole("button", { name: "네, 무사히 만났어요" }).click();
    await expect(page.getByRole("main").getByText("집에 돌아왔어요")).toBeVisible();
    await witness.keyboard.press("Escape");
    await witness.bringToFront();
    await expect(witness.getByRole("main").getByText("집에 돌아왔어요").first()).toBeVisible({ timeout: 20000 });
  } finally {
    await other.close();
  }
});
test("guest writes a report first and is asked to sign in only at submit, keeping the draft", async ({
  page,
}) => {
  await page.getByRole("button", { name: "실종 신고", exact: true }).click();
  await expect(page.locator("#account-form")).toHaveCount(0);
  const name = "먼저작성" + unique();
  await fillReport(page, { name });
  await page
    .getByRole("button", { name: "실종 신고 등록하기", exact: true })
    .click();
  await expect(page.locator("#account-form")).toBeVisible();
  await expect(page.locator(".auth-intro")).toContainText("작성한 신고는 이 기기에 저장돼 있어요");
  await page.locator("[data-auth-mode=register]").click();
  const c = credentials();
  await page.locator("#account-form input[name=name]").fill(c.name);
  await page.locator("#account-form input[name=email]").fill(c.email);
  await page.locator("#account-form input[name=password]").fill(c.password);
  await page.locator("#account-form input[name=passwordConfirm]").fill(c.password);
  await page.locator("#account-form button[type=submit]").click();
  // 가입이 끝나면 작성해 둔 신고가 그대로 등록된다.
  await expect(page.locator(".success-next")).toBeVisible();
  await page.getByRole("button", { name: "신고 내용 먼저 확인하기" }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
});
test("saved profile becomes a report and uploaded image can be exported as QR poster", async ({
  page,
}) => {
  // 전단 테스트는 다운로드 경로를 확인하므로, 테스트 브라우저의 파일 공유는 끈다.
  await page.addInitScript(() => { Object.defineProperty(Navigator.prototype, "canShare", { configurable: true, value: undefined }); });
  await account(page);
  await page.goto("/#/my");
  await page.getByRole("button", { name: /강아지 등록하기/ }).click();
  await page
    .locator("input[name=photo]")
    .setInputFiles("public/assets/dog-jindo.png");
  await expect(page.getByAltText("고른 사진")).toBeVisible();
  await nextStep(page);
  await page.locator("input[name=name]").fill("프로필" + unique());
  await page.locator("input[name=breed]").fill("진도 믹스");
  await nextStep(page);
  // 털 색은 여러 개 고를 수 있고, 목록에 없는 색은 기타로 적는다.
  await page.getByRole("group", { name: "털 색" }).getByRole("button", { name: "황색" }).click();
  await page.getByRole("group", { name: "털 색" }).getByRole("button", { name: "기타" }).click();
  await page.getByLabel("털 색 직접 적기").fill("은색");
  await page.getByRole("button", { name: "한 살 늘리기" }).click();
  await nextStep(page);
  await nextStep(page);
  await page.getByRole("button", { name: "프로필 저장하기" }).click();
  await expect(page.getByRole("button", { name: "이 정보로 신고" })).toHaveCount(1);
  await page.getByRole("button", { name: "이 정보로 신고" }).click();
  await nextStep(page);
  await expect(page.locator("input[name=breed]")).toHaveValue("진도 믹스");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.goto("/#/dog/demo-bori");
  await page.getByRole("button", { name: "QR 전단", exact: true }).click();
  await page.getByRole("button", { name: "SNS 정사각형" }).click();
  await expect(page.locator("#poster-canvas")).toHaveAttribute(
    "height",
    "1000",
  );
  const download = page.waitForEvent("download");
  // 터치 화면이면 "이미지 저장", 컴퓨터면 "이미지 다운로드"
  await page.getByRole("button", { name: /^이미지 (다운로드|저장)$/ }).click();
  expect((await download).suggestedFilename()).toContain("social");
});
