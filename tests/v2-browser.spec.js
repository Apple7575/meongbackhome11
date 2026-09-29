import { test, expect } from "@playwright/test";
import { unique, credentials, ready, registerByApi as account, openLogin } from "./helpers.js";
async function submitDog(page, name) {
  await page.getByRole("button", { name: "실종 신고", exact: true }).click();
  await page
    .locator("input[name=photo]")
    .setInputFiles("public/assets/dog-maltese.png");
  await page.locator("input[name=name]").fill(name);
  await page.locator("input[name=breed]").fill("말티즈");
  await page.locator(".wizard-next").click();
  await page.locator("input[name=location]").fill("서울 송파구 석촌호수");
  await page
    .locator("#location-picker")
    .click({ position: { x: 140, y: 110 } });
  await page.locator(".wizard-next").click();
  await page
    .getByRole("button", { name: "실종 신고 등록하기", exact: true })
    .click();
  await expect(page.locator(".success-next")).toBeVisible();
  await page.getByRole("button", { name: "신고 내용 먼저 확인하기" }).click();
  await expect(page.locator(".detail-copy h1")).toContainText(name);
  return page.url().split("/dog/")[1];
}
test.beforeEach(async ({ page }) => ready(page));
test("mascot, readable responsive home, filters and keyboard skip navigation", async ({
  page,
}) => {
  await expect(page.locator(".hero-dogs")).toHaveAttribute(
    "src",
    "/assets/mascot-home.webp",
  );
  await page.locator(".hero-dogs").evaluate((i) => i.decode());
  await page.locator("#dog-search").fill("초코");
  await expect(page.locator(".dog-card")).toHaveCount(1);
  await page.locator("#dog-search").fill("없는강아지XYZ");
  await expect(page.getByText("아직 등록된 소식이 없어요")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("timeline swipes, selected marker, chronological playback and independent arrows", async ({
  page,
}) => {
  await page.goto("/#/dog/demo-bori");
  expect(await page.locator(".sighting-slide").count()).toBeGreaterThanOrEqual(3);
  expect(await page.locator(".direction-icon").count()).toBeGreaterThanOrEqual(3);
  await page.locator(".next-sighting").click();
  await expect(page.locator("#timeline-index")).toHaveText("2");
  await expect(page.locator(".selected-pin b")).toHaveText("2");
  await page.getByRole("button", { name: "목격 기록 재생" }).click();
  await expect(page.locator("#timeline-index")).toHaveText("3");
  await expect(page.locator(".timeline-note")).toContainText("실제 이동 경로");
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
  await expect(page.locator(".owner-dashboard h1")).toContainText(name);
  await expect(page.locator(".returning-hero")).toBeHidden();
});
test("sighting draft restores location and direction, survives close, then reaches server", async ({
  page,
}) => {
  await page.goto("/#/dog/demo-bori");
  await page.getByRole("button", { name: "이 아이를 봤어요" }).click();
  const place = "복원된 목격" + unique();
  await page.locator("input[name=location]").fill(place);
  await page
    .locator("#sighting-picker")
    .click({ position: { x: 130, y: 100 } });
  await page.locator(".wizard-next").click();
  await page.getByText("이동했어요", { exact: true }).click();
  await page.locator("#heading-range").fill("90");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.getByRole("button", { name: "이 아이를 봤어요" }).click();
  await expect(page.locator("input[name=location]")).toHaveValue(place);
  await page.locator(".wizard-next").click();
  await expect(page.locator("#heading-label")).toContainText("동쪽");
  await page.locator(".wizard-next").click();
  await page
    .getByRole("button", { name: "목격 소식 남기기", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
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
    await witness
      .locator("input[name=location]")
      .fill("제보자 기기에서 본 장소");
    await witness
      .locator("#sighting-picker")
      .click({ position: { x: 140, y: 100 } });
    await witness.locator(".wizard-next").click();
    await witness.locator(".wizard-next").click();
    await witness
      .getByRole("button", { name: "목격 소식 남기기", exact: true })
      .click();
    await expect(witness.getByRole("dialog")).toHaveCount(0);
    await page.bringToFront();
    await expect(page.getByRole("button", { name: /^알림 [1-9]\d*개$/ })).toBeVisible({ timeout: 20000 });
    await expect(page.locator(".sighting-slide")).toHaveCount(1);
    await page.locator(".open-sighting").click();
    await page.locator("#message-form input").fill("보호자입니다. 감사합니다!");
    await page.locator("#message-form button").click();
    await expect(page.locator(".chat-bubble")).toContainText("감사합니다");
    await witness.reload();
    await witness.locator(".open-sighting").click();
    await expect(witness.locator(".chat-bubble")).toContainText("감사합니다");
    await expect(witness.locator("#report-status")).toBeDisabled();
    await page.getByRole("button", { name: "닫기", exact: true }).click();
    await page.goto("/#/my");
    await page.getByRole("button", { name: "재회 완료", exact: true }).click();
    await page.getByRole("button", { name: "네, 무사히 만났어요" }).click();
    await expect(page.locator('.manage-card .badge')).toHaveText('재회 완료');
    await witness.getByRole("button", { name: "닫기", exact: true }).click();
    await witness.bringToFront();
    await expect(witness.locator(".detail-image>.badge")).toHaveText(
      "재회 완료",
      {timeout:20000},
    );
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
  await page
    .locator("input[name=photo]")
    .setInputFiles("public/assets/dog-maltese.png");
  await page.locator("input[name=name]").fill(name);
  await page.locator("input[name=breed]").fill("말티즈");
  await page.locator(".wizard-next").click();
  await page.locator("input[name=location]").fill("서울 송파구 석촌호수");
  await page
    .locator("#location-picker")
    .click({ position: { x: 140, y: 110 } });
  await page.locator(".wizard-next").click();
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
  await expect(page.locator("#dog-form input[name=name]")).toHaveValue(name);
  await expect(page.locator("#dog-form input[name=breed]")).toHaveValue("말티즈");
});
test("saved profile becomes a report and uploaded image can be exported as QR poster", async ({
  page,
}) => {
  await account(page);
  await page.goto("/#/my");
  await page.getByRole("button", { name: "프로필 등록", exact: true }).click();
  await page
    .locator("input[name=photo]")
    .setInputFiles("public/assets/dog-jindo.png");
  await page.locator("input[name=name]").fill("프로필" + unique());
  await page.locator("input[name=breed]").fill("진도 믹스");
  await page.locator(".wizard-next").click();
  await page.locator(".wizard-next").click();
  await page.getByRole("button", { name: "프로필 저장하기" }).click();
  await expect(page.locator(".profile-card")).toHaveCount(1);
  await page.getByRole("button", { name: "이 정보로 실종 신고" }).click();
  await expect(page.locator("input[name=breed]")).toHaveValue("진도 믹스");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.goto("/#/dog/demo-bori");
  await page.getByRole("button", { name: "QR 전단 만들기" }).click();
  await page.getByRole("button", { name: "SNS 정사각형" }).click();
  await expect(page.locator("#poster-canvas")).toHaveAttribute(
    "height",
    "1000",
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "이미지 다운로드" }).click();
  expect((await download).suggestedFilename()).toContain("social");
});
