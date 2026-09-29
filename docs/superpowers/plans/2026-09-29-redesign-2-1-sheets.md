# 2-1 옛 팝업 아래 시트화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `openModal()`로 여는 옛 팝업을 폰에서는 아래 시트, 데스크톱에서는 가운데 480px 창으로 바꾸고 1단계 토큰을 입힌다.

**Architecture:** `src/ui/legacy-sheet.css`(모든 선택자 `#modal-root` 한정)를 `tokens.css` 뒤에 import해 옛 클래스 규칙을 id 우선순위로 덮어쓴다. `openModal()`에 손잡이와 끌어내려 닫기만 추가한다.

**Tech Stack:** CSS, 기존 `src/main.js`, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-29-redesign-2-1-sheets-design.md`

## Global Constraints

- 팝업의 구조·문구·버튼 개수·동작 변경 금지(손잡이 추가만 허용).
- 모든 새 선택자는 `#modal-root`로 시작.
- 폰 기준 `max-width: 600px`. 데스크톱 폭 480px, `.modal.wide` 640px.
- 입력 글자 16px(1rem) 이상, 버튼·입력 44px 이상.
- 각 Task 끝: `npm test`(27 pass), `npm run build`, `npm run test:browser` 전부 pass(skip 2) 후 커밋. 커밋 끝에 `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- 테스트가 다시 저장하는 `artifacts/account-phone.png`는 커밋 전 `git checkout --`로 되돌린다.

---

### Task 1: 시트 배치와 손잡이

**Files:**
- Create: `src/ui/legacy-sheet.css`, `tests/legacy-sheet.spec.js`
- Modify: `src/app/main.jsx`, `src/main.js` (`openModal`), `playwright.config.js`

**Interfaces:**
- Produces: `.sheet-handle` 요소(시트의 첫 자식, `aria-hidden="true"`), CSS 파일 `src/ui/legacy-sheet.css`(Task 2가 이어서 작성).

- [ ] **Step 1: Write the failing test** — `tests/legacy-sheet.spec.js`

```js
import { test, expect } from "@playwright/test";
import { ready, openLogin } from "./helpers.js";
test("legacy modal is a bottom sheet on phones and closes when dragged down", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "Phone layout");
  await ready(page);
  await openLogin(page);
  const sheet = page.getByRole("dialog");
  const box = await sheet.boundingBox();
  const vh = page.viewportSize().height;
  expect(Math.abs(box.y + box.height - vh)).toBeLessThanOrEqual(1);
  expect(Math.round(box.width)).toBe(page.viewportSize().width);
  const handle = page.locator("#modal-root .sheet-handle");
  await expect(handle).toBeVisible();
  const h = await handle.boundingBox();
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2 + 120, { steps: 5 });
  await page.mouse.up();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});
test("legacy modal is a centered 480px window on desktop", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Desktop layout");
  await ready(page);
  await openLogin(page);
  const box = await page.getByRole("dialog").boundingBox();
  expect(Math.round(box.width)).toBe(480);
  const vw = page.viewportSize().width;
  expect(Math.abs(box.x + box.width / 2 - vw / 2)).toBeLessThanOrEqual(1);
  await expect(page.locator("#modal-root .sheet-handle")).toBeHidden();
});
```

`playwright.config.js` testMatch에 `"legacy-sheet.spec.js"` 추가.

- [ ] **Step 2: Run to verify it fails**

Run: `npm run build && npm run test:browser -- tests/legacy-sheet.spec.js`
Expected: FAIL (모바일: 시트 아래 여백 ≠ 0 또는 `.sheet-handle` 없음, 데스크톱: 폭 510)

- [ ] **Step 3: Sheet layout CSS** — `src/ui/legacy-sheet.css`

```css
/* 2-1: 옛 openModal 팝업을 새 규칙으로 덮어쓴다. 2-5에서 옛 CSS와 함께 삭제. */
#modal-root .modal-backdrop {
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: none;
  padding: 24px;
  align-items: center;
}
#modal-root .modal {
  width: 100%;
  max-width: 480px;
  max-height: 85vh;
  background: #fff;
  border: 0;
  border-radius: var(--sheet-radius);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  font-family: inherit;
  color: var(--grey-900);
}
#modal-root .modal.wide { max-width: 640px; }
#modal-root .sheet-handle { display: none; }
@media (max-width: 600px) {
  #modal-root .modal-backdrop { padding: 0; align-items: flex-end; }
  #modal-root .modal,
  #modal-root .modal.wide {
    max-width: none;
    max-height: 90dvh;
    border-radius: var(--sheet-radius) var(--sheet-radius) 0 0;
    padding-bottom: env(safe-area-inset-bottom, 0px);
  }
  #modal-root .sheet-handle {
    display: flex; align-items: center; justify-content: center;
    height: 24px; touch-action: none; position: sticky; top: 0; z-index: 501; background: #fff;
    border-radius: var(--sheet-radius) var(--sheet-radius) 0 0;
  }
  #modal-root .sheet-handle::before {
    content: ""; width: 40px; height: 4px; border-radius: 2px; background: var(--grey-300);
  }
  #modal-root .modal-header { top: 24px; }
}
```

`src/app/main.jsx`:

```jsx
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "../ui/tokens.css";
import "../ui/legacy-sheet.css";
createRoot(document.querySelector("#app")).render(<App />);
```

- [ ] **Step 4: Handle and drag-to-close** — `src/main.js` `openModal()`

`modalRoot.innerHTML = ...` 템플릿의 `<section class="modal …" …>` 바로 뒤에 `<div class="sheet-handle" aria-hidden="true"></div>`를 넣고, `document.body.classList.add("modal-open");` 다음 줄에 추가:

```js
  const handle = modalRoot.querySelector(".sheet-handle");
  handle.addEventListener("pointerdown", (down) => {
    const startY = down.clientY;
    handle.setPointerCapture?.(down.pointerId);
    handle.addEventListener(
      "pointerup",
      (up) => {
        if (up.clientY - startY > 60) closeModal();
      },
      { once: true },
    );
  });
```

- [ ] **Step 5: Run tests**

Run: `npm test && npm run build && npm run test:browser`
Expected: 전부 pass(skip: 모바일 전용 2 on desktop, 데스크톱 전용 2 on mobile → 총 skip 4).

- [ ] **Step 6: Commit**

```bash
git add src/ui/legacy-sheet.css src/app/main.jsx src/main.js tests/legacy-sheet.spec.js playwright.config.js
git commit -m "feat(sheets): legacy modals open as bottom sheets on phones"
```

---

### Task 2: 팝업 안 토큰(버튼·입력·글자)

**Files:**
- Modify: `src/ui/legacy-sheet.css`, `tests/legacy-sheet.spec.js`

**Interfaces:**
- Consumes: Task 1의 `legacy-sheet.css`.

- [ ] **Step 1: Write the failing test** — append to `tests/legacy-sheet.spec.js`

```js
test("controls inside legacy sheets follow touch and type rules", async ({ page }, info) => {
  test.skip(info.project.name !== "mobile", "Phone layout");
  await ready(page);
  await openLogin(page);
  const r = await page.evaluate(() => {
    const root = document.querySelector("#modal-root");
    const vis = (el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0; };
    const small = [...root.querySelectorAll("button, a, input, select, textarea")].filter(vis)
      .filter((el) => { const b = el.getBoundingClientRect(); return b.height < 44 || b.width < 44; })
      .map((el) => (el.getAttribute("aria-label") || el.textContent || el.name).trim().slice(0, 20));
    const inputs = [...root.querySelectorAll("input, select, textarea")].filter(vis)
      .map((el) => parseFloat(getComputedStyle(el).fontSize));
    const primary = getComputedStyle(root.querySelector(".button.primary")).backgroundColor;
    return { small, minInput: Math.min(...inputs), primary };
  });
  expect(r.small).toEqual([]);
  expect(r.minInput).toBeGreaterThanOrEqual(16);
  expect(r.primary).toBe("rgb(232, 128, 95)");
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run build && npm run test:browser -- tests/legacy-sheet.spec.js`
Expected: FAIL (닫기 버튼 35px, primary 색 `#e87f5e` → `rgb(232, 127, 94)`)

- [ ] **Step 3: Inner rules** — append to `src/ui/legacy-sheet.css`

```css
#modal-root .modal-header {
  padding: 16px 12px 8px var(--gutter);
  background: #fff;
  backdrop-filter: none;
  border-bottom: 0;
}
#modal-root .modal-header h2 {
  font-size: var(--t4); line-height: var(--t4-lh); font-weight: 700;
  letter-spacing: -0.01em; color: var(--grey-900);
}
#modal-root .modal-header .icon-button {
  width: 44px; height: 44px; color: var(--grey-600); border-radius: var(--radius);
}
#modal-root .modal-content { padding: 8px var(--gutter) 24px; font-size: var(--t6); }
#modal-root .modal-intro,
#modal-root .field-hint,
#modal-root .local-notice { font-size: var(--t6); line-height: var(--t6-lh); color: var(--grey-600); }
#modal-root .field > span { font-size: var(--t6); font-weight: 600; color: var(--grey-800); }
#modal-root input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]),
#modal-root select,
#modal-root textarea {
  min-height: 48px; padding: 12px 14px; border: 0; border-radius: var(--radius);
  background: var(--grey-100); color: var(--grey-900); font-size: 1rem; font-family: inherit;
}
#modal-root input:focus-visible,
#modal-root select:focus-visible,
#modal-root textarea:focus-visible { outline: 2px solid var(--brand); outline-offset: 0; }
#modal-root .button {
  min-height: 48px; border-radius: var(--radius); font-size: var(--t5); font-weight: 600;
  box-shadow: none; border: 0;
}
#modal-root .button.primary { background: var(--brand); color: #fff; }
#modal-root .button.primary:hover,
#modal-root .button.primary:active { background: var(--brand-pressed); }
#modal-root .button.white { background: var(--grey-100); color: var(--grey-800); border: 0; }
#modal-root .button.full { min-height: 56px; }
#modal-root .text-button { min-height: 44px; min-width: 44px; font-size: var(--t6); color: var(--grey-700); }
#modal-root .form-error { color: #f04452; font-size: var(--t6); }
#modal-root .wizard-progress .current b { background: var(--brand); color: #fff; }
#modal-root .wizard-progress .done b { background: var(--grey-900); color: #fff; }
#modal-root .auth-tabs button { min-height: 48px; }
```

- [ ] **Step 4: Run tests**

Run: `npm test && npm run build && npm run test:browser`
Expected: 전부 pass. 새 테스트의 `small` 목록에 요소가 남으면 그 요소만 위 CSS에 `min-height/min-width: 44px`로 추가(규칙 완화 금지).

- [ ] **Step 5: Capture and commit**

Run: 모바일 390px에서 로그인 팝업과 "실종 신고" 폼을 캡처해 확인(`artifacts/redesign/sheet-login.png`, `sheet-report.png`).

```bash
git add src/ui/legacy-sheet.css tests/legacy-sheet.spec.js artifacts/redesign
git commit -m "feat(sheets): toss tokens for buttons, inputs and text inside legacy sheets"
```

---

### Task 3: 미리보기 배포

- [ ] **Step 1:** `npx vercel@latest deploy --yes`로 미리보기 배포, `vercel inspect`로 READY 확인.
- [ ] **Step 2:** 사용자에게 미리보기 주소 전달, 승인 후에만 `npx vercel@latest deploy --prod --yes`. GitHub `origin/main`에는 `git push origin redesign-2-1-sheets:main`(fast-forward만, 강제 푸시 금지).
