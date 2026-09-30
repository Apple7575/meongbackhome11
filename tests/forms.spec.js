import { test, expect } from "@playwright/test";
import { fakeAddress, nextStep, registerByApi } from "./helpers.js";

test("report flow: next moves to the empty breed field, time wheels and pin address", async ({ page }) => {
  await fakeAddress(page);
  await page.goto("/#/report/new");
  await page.locator("input[name=photo]").setInputFiles("public/assets/dog-maltese.png");
  await expect(page.getByAltText("고른 사진")).toBeVisible();
  await nextStep(page);
  // 이름만 쓰고 키보드의 다음을 누르면 단계를 넘기지 않고 견종 칸으로 간다.
  await page.locator("input[name=name]").fill("보리");
  await page.locator("input[name=name]").press("Enter");
  await expect(page.locator("input[name=breed]")).toBeFocused();
  await expect(page.getByRole("heading", { name: "이름과 견종을 알려주세요" })).toBeVisible();
  await page.getByRole("button", { name: "푸들" }).click();
  await nextStep(page);
  await page.getByRole("group", { name: "털 색" }).getByRole("button", { name: "갈색" }).click();
  await nextStep(page);
  // 날짜·시간은 아래 시트에서 굴려 고른다.
  await page.getByRole("button", { name: /^날짜/ }).click();
  const dateSheet = page.getByRole("dialog", { name: "날짜를 골라주세요" });
  await dateSheet.getByRole("option", { name: /어제/ }).click();
  await dateSheet.getByRole("button", { name: "확인" }).click();
  await expect(page.getByRole("button", { name: /^날짜/ })).toContainText("어제");
  await page.getByRole("button", { name: /^시간/ }).click();
  const timeSheet = page.getByRole("dialog", { name: "시간을 골라주세요" });
  await timeSheet.getByRole("option", { name: "오전" }).click();
  await timeSheet.getByRole("option", { name: "9시" }).click();
  await timeSheet.getByRole("option", { name: "30분" }).click();
  await timeSheet.getByRole("button", { name: "확인" }).click();
  await expect(page.getByRole("button", { name: /^시간/ })).toContainText("오전 9:30");
  // ±버튼으로 조금씩 옮긴다.
  await page.getByRole("button", { name: "+1시간" }).click();
  await page.getByRole("button", { name: "−10분" }).click();
  await expect(page.getByRole("button", { name: /^시간/ })).toContainText("오전 10:20");
  await expect(page.getByRole("button", { name: /^날짜/ })).toContainText("어제");
  await nextStep(page);
  // 핀을 맞추면 주소가 보이고, 장소 칸을 비워도 그 주소로 넘어갈 수 있다.
  await expect(page.locator("#location-picker.leaflet-container")).toBeVisible();
  await page.locator("#location-picker").click({ position: { x: 150, y: 120 } });
  await expect(page.getByRole("status").filter({ hasText: "서울 송파구 잠실동" })).toBeVisible();
  await nextStep(page);
  await nextStep(page);
  await expect(page.getByText("서울 · 송파구 잠실동 석촌호수로")).toBeVisible();
});

test("a report can carry two extra photos and the detail page switches between them", async ({ page }) => {
  await fakeAddress(page);
  await page.goto("/");
  await registerByApi(page);
  await page.goto("/#/report/new");
  await page.locator("input[name=photo]").setInputFiles("public/assets/dog-maltese.png");
  await expect(page.getByAltText("고른 사진")).toBeVisible();
  // 대표 사진을 고르면 옆모습·무늬 사진을 더 올릴 수 있다.
  await page.locator("input[name=photo-extra]").setInputFiles("public/assets/dog-poodle.png");
  await expect(page.getByAltText("추가 사진 1")).toBeVisible();
  await page.locator("input[name=photo-extra]").setInputFiles("public/assets/dog-jindo.png");
  await expect(page.getByAltText("추가 사진 2")).toBeVisible();
  await expect(page.locator("input[name=photo-extra]")).toHaveCount(0);
  await nextStep(page);
  await page.locator("input[name=name]").fill("세장");
  await page.locator("input[name=breed]").fill("말티즈");
  await nextStep(page);
  await page.getByRole("group", { name: "털 색" }).getByRole("button", { name: "흰색" }).click();
  await nextStep(page);
  await nextStep(page);
  await expect(page.locator("#location-picker.leaflet-container")).toBeVisible();
  await page.locator("#location-picker").click({ position: { x: 150, y: 120 } });
  await nextStep(page);
  await nextStep(page);
  await page.getByRole("button", { name: "실종 신고 등록하기" }).click();
  // 등록 완료 시트가 뜬 뒤에 닫는다.
  await expect(page.getByRole("dialog", { name: "이웃과 함께 찾을 준비가 됐어요" })).toBeVisible();
  await page.keyboard.press("Escape");
  const gallery = page.getByRole("group", { name: "사진 고르기" });
  await expect(gallery.getByRole("button")).toHaveCount(3);
  await gallery.getByRole("button", { name: "사진 3 보기" }).click();
  await expect(page.getByAltText("세장 말티즈 사진 3/3")).toBeVisible();
});
