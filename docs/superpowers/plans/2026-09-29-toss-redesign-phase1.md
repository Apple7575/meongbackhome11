# 멍백홈 토스 원칙 재설계 1단계 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** React 틀을 도입하고 홈·찾기·목격 소식·마이홈·설정을 토스 원칙 기반 새 디자인으로 바꾼다. 나머지 화면과 팝업은 기존 코드를 그대로 재사용한다.

**Architecture:** `#app`을 React가 소유하고, 옮기지 않은 경로(`/dog/*`, `/stories`, `/admin`, `/account/*`)는 React 안의 `#legacy-root`에 기존 `main.js`가 그린다. 데이터는 기존 `client-store.js`를 `useSyncExternalStore`로 구독하고, 버튼 동작은 기존 `data-action` 문서 클릭 처리기를 그대로 쓴다.

**Tech Stack:** React 19.x, react-dom 19.x, @vitejs/plugin-react 5.2.x (Vite 7 호환), Vite 7, Pretendard 1.3.9, lucide(기존), Leaflet(기존), Playwright(기존), node:test(기존).

**Spec:** `docs/superpowers/specs/2026-09-29-toss-redesign-phase1-design.md`

## Global Constraints

- TDS UI 키트·`@toss/tds-mobile`·Toss Product Sans 사용 금지. 추가 의존성은 `react`, `react-dom`, `@vitejs/plugin-react@^5.2.0`, `pretendard` 네 개뿐.
- 서버·API·DB·배포 설정·`public/sw.js`·`manifest.webmanifest` 변경 금지. (예외 없음)
- 모든 문구 해요체, 기술 용어 금지("브라우저 알림" → "새 목격 소식 알림").
- 색: 회색 50 `#F9FAFB` 100 `#F2F4F6` 200 `#E5E8EB` 300 `#D1D6DB` 400 `#B0B8C1` 500 `#8B95A1` 600 `#6B7684` 700 `#4E5968` 800 `#333D4B` 900 `#191F28`, 코랄 `#E8805F`, 연한 코랄 `#FDF0EB`, 초록 `#1E8E4E`, 연한 초록 `#E8F7EE`.
- 글자 t1 30/40 · t2 26/35 · t3 22/31 · t4 20/29 · t5 17/25.5 · t6 15/22.5 · t7 13/19.5 (px, rem으로 작성). 13px 미만 금지.
- 좌우 여백 20px, 버튼·입력·썸네일 둥글기 12px, 시트 윗모서리 20px, 터치 영역 44×44px 이상.
- `main` 안 코랄 fill 버튼(`[data-variant="fill"]`) 화면당 1개 이하. 하단 메뉴 "+ 신고"는 제외.
- 데스크톱: React 화면은 가운데 480px 기둥. **레거시 경로는 2단계 전까지 기존 전체 폭 유지**(좁은 기둥에 넣으면 기존 데스크톱 레이아웃이 깨짐 — 스펙 보완 사항).
- 각 Task 끝: `npm test`(26 pass), `npm run build`, `npm run test:browser`(skip 1개 외 전부 pass) 후 커밋. 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- 테스트 서버 포트 5174, 브라우저 테스트 실행은 `npm run test:browser -- <파일>`로 파일 지정 가능.

## File Structure

| 파일 | 책임 |
|---|---|
| `src/app/main.jsx` | React 시작점 |
| `src/app/App.jsx` | 틀: 상단 바, 연결 배너 자리, `main`, 하단 메뉴, 화면/레거시 전환 |
| `src/app/Frame.module.css` | 틀 스타일 |
| `src/app/TopBar.jsx` · `BottomNav.jsx` | 상단 바 · 하단 메뉴 |
| `src/app/router.js` | `useRoute()`, `currentRoute()` |
| `src/app/useStore.js` | `useStore()` |
| `src/format.js` | `timeAgo`, `formatTime`, `relativeTime`, `dayGroup`, `objectParticle` (main.js와 공유) |
| `src/ui/tokens.css` | 색·글자·여백 토큰, Pretendard, 데스크톱 기둥 |
| `src/ui/ui.module.css` | 공통 부품 스타일 |
| `src/ui/Icon.jsx` | lucide 아이콘 → SVG |
| `src/ui/index.jsx` | `Top`, `ListHeader`, `ListRow`, `Button`, `ButtonLink`, `BottomCTA`, `Badge`, `Chip`, `Divider`, `Thumb`, `IconCircle`, `EmptyState`, `SkeletonRows` |
| `src/ui/BottomSheet.jsx` | 아래 시트 |
| `src/screens/screens.module.css` | 화면 공통 스타일 |
| `src/screens/shared.jsx` | `DogRow`, `DogBadge`, `OptionSheet`, `RegionSheet` |
| `src/screens/My.jsx` · `Settings.jsx` · `Home.jsx` · `Explore.jsx` · `Sightings.jsx` | 화면 |
| `src/main.js` | (수정) 마운트 대상 교체, 헤더·푸터 제거, 옮긴 화면 함수 삭제 |
| `tests/helpers.js` | 브라우저 테스트 공통 도우미 |
| `tests/shell.spec.js` · `tests/design-rules.spec.js` | 새 브라우저 테스트 |

---

### Task 1: React 틀 도입 (겉모습 변화 없음)

**Files:**
- Modify: `package.json`, `vite.config.js`, `index.html:20`, `src/main.js:70,364-402,1341`, `playwright.config.js:4`
- Create: `src/app/main.jsx`, `src/app/App.jsx`, `src/app/router.js`, `src/app/useStore.js`
- Test: `tests/shell.spec.js`

**Interfaces:**
- Produces: `mountLegacy(el: HTMLElement | null): void` (from `src/main.js`), `useRoute(): string`, `currentRoute(): string` (from `src/app/router.js`), `useStore(): Store` (from `src/app/useStore.js`, returns `read()` of client-store), window event `"legacy-render"` fired after every legacy render.

- [ ] **Step 1: Write the failing test** — `tests/shell.spec.js`

```js
import { test, expect } from "@playwright/test";
test("React shell hosts the legacy app", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#app [data-shell=react]")).toHaveCount(1);
  await expect(page.locator("#legacy-root main#main")).toHaveCount(1);
});
```

`playwright.config.js` testMatch에 `"shell.spec.js"` 추가:

```js
  testMatch: ["v2-browser.spec.js","account-browser.spec.js","mobile-browser.spec.js","shell.spec.js"],
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run build && npm run test:browser -- tests/shell.spec.js`
Expected: FAIL (`[data-shell=react]` count 0)

- [ ] **Step 3: Install dependencies**

Run: `npm install react@^19.2.0 react-dom@^19.2.0 && npm install -D @vitejs/plugin-react@^5.2.0`
(Worktree의 `node_modules`는 원본 체크아웃에 연결된 junction이다. 설치는 원본 `node_modules`에도 반영되므로, 설치 전에 사용자에게 알린다.)

- [ ] **Step 4: Configure Vite and entry**

`vite.config.js`:

```js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: { "/api": { target: "http://127.0.0.1:3001", changeOrigin: false } },
  },
  preview: {
    host: "0.0.0.0",
    proxy: { "/api": { target: "http://127.0.0.1:3001", changeOrigin: false } },
  },
});
```

`index.html` 20행: `<script type="module" src="/src/app/main.jsx"></script>`

`src/app/router.js`:

```js
import { useSyncExternalStore } from "react";
export const currentRoute = () => location.hash.slice(1) || "/";
const subscribe = (notify) => {
  addEventListener("hashchange", notify);
  return () => removeEventListener("hashchange", notify);
};
export function useRoute() {
  return useSyncExternalStore(subscribe, currentRoute);
}
```

`src/app/useStore.js`:

```js
import { useSyncExternalStore } from "react";
import { read } from "../client-store.js";
// client-store는 같은 객체를 제자리에서 바꾸므로, 이벤트마다 버전을 올려 다시 그린다.
let version = 0;
const listeners = new Set();
for (const name of ["store-updated", "connection-change", "legacy-render"])
  addEventListener(name, () => {
    version++;
    listeners.forEach((l) => l());
  });
const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
export function useStore() {
  useSyncExternalStore(subscribe, () => version);
  return read();
}
```

`src/app/App.jsx` (Task 1 버전):

```jsx
import { useEffect, useRef } from "react";
import { mountLegacy } from "../main.js";
export default function App() {
  const legacyRef = useRef(null);
  useEffect(() => {
    mountLegacy(legacyRef.current);
    return () => mountLegacy(null);
  }, []);
  return <div ref={legacyRef} id="legacy-root" data-shell="react" />;
}
```

`src/app/main.jsx`:

```jsx
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
createRoot(document.querySelector("#app")).render(<App />);
```

- [ ] **Step 5: Let main.js render into a given element**

`src/main.js` 70행 `const app = document.querySelector("#app");` →

```js
let app = null;
export function mountLegacy(el) {
  app = el;
  if (app) render();
}
```

`render()` 첫 줄에 `if (!app) return;` 추가, 마지막(`timelineExperience` 블록 뒤)에 `window.dispatchEvent(new Event("legacy-render"));` 추가.
1341행의 최상위 `render();` 호출 삭제(첫 렌더는 `mountLegacy`가 한다).

- [ ] **Step 6: Run tests**

Run: `npm test && npm run build && npm run test:browser`
Expected: 26 pass / build OK / 브라우저 전부 pass(모바일 전용 1 skip). 겉모습 변화 없음.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.js index.html playwright.config.js src/app src/main.js tests/shell.spec.js
git commit -m "feat(app): mount legacy UI inside a React shell"
```

---

### Task 2: 토큰·글꼴·새 틀(상단 바, 하단 메뉴, 데스크톱 기둥)

**Files:**
- Create: `src/ui/tokens.css`, `src/ui/Icon.jsx`, `src/app/Frame.module.css`, `src/app/TopBar.jsx`, `src/app/BottomNav.jsx`, `tests/helpers.js`
- Modify: `src/app/App.jsx`, `src/app/main.jsx`, `src/main.js` (render 본문만 그리기, `decorateSession` 헤더 부분 제거), `tests/v2-browser.spec.js`, `tests/mobile-browser.spec.js`, `tests/shell.spec.js`, `package.json`
- Test: `tests/shell.spec.js`

**Interfaces:**
- Consumes: `mountLegacy`, `useRoute`, `useStore`.
- Produces: `Icon({ name: IconName, size?: number, className?: string })` where `IconName` ∈ keys of `ICONS` below; `App` exports default; `SCREENS` object in `App.jsx` (`{ [route: string]: React.ComponentType }`, empty in this task, later tasks add entries); test helpers `ready(page)`, `registerByApi(page) → {email,password,name}`, `openLogin(page)`, `trigger(page, action)`.

- [ ] **Step 1: Write the failing test** — replace `tests/shell.spec.js`

```js
import { test, expect } from "@playwright/test";
import { ready } from "./helpers.js";
test("React shell draws top bar and bottom navigation around legacy pages", async ({ page }) => {
  await ready(page);
  await expect(page.locator("#app [data-shell=react]")).toHaveCount(1);
  const nav = page.getByRole("navigation", { name: "하단 메뉴" });
  await expect(nav.getByRole("link")).toHaveCount(4);
  await expect(nav.getByRole("button", { name: "실종 신고", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /^알림 \d+개$/ })).toBeVisible();
  await expect(page.locator(".site-header, .site-footer, .mobile-nav")).toHaveCount(0);
  await expect(page.locator("#legacy-root")).toBeVisible();
});
```

`tests/helpers.js`:

```js
import { expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
export const unique = () => randomUUID().slice(0, 8);
export const credentials = () => ({
  email: `${unique()}@example.com`,
  password: "browser-test-password",
  name: "테스트 보호자",
});
export async function ready(page, path = "/") {
  await page.goto(path);
  await expect(page.getByRole("navigation", { name: "하단 메뉴" })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => document.querySelector("#connection-banner")?.hidden))
    .toBe(true);
}
export async function currentUserName(page) {
  return page.evaluate(async () => (await (await fetch("/api/state")).json()).user?.name ?? null);
}
export async function registerByApi(page, c = credentials()) {
  await page.request.post("/api/auth/register", { data: c });
  await page.reload();
  await expect.poll(() => currentUserName(page)).toBe(c.name);
  return c;
}
export async function openLogin(page) {
  await page.goto("/#/my");
  await page.getByRole("main").getByRole("button", { name: /^로그인/ }).first().click();
  await expect(page.locator("#account-form")).toBeVisible();
}
// 기존 data-action 처리기를 화면 위치와 무관하게 호출한다(설정 화면이 생기기 전 임시).
export async function trigger(page, action) {
  await page.evaluate((a) => {
    const b = document.createElement("button");
    b.dataset.action = a;
    document.body.append(b);
    b.click();
    b.remove();
  }, action);
}
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run build && npm run test:browser -- tests/shell.spec.js`
Expected: FAIL (navigation "하단 메뉴" not found)

- [ ] **Step 3: Install Pretendard and write tokens**

Run: `npm install pretendard@^1.3.9` 후 `ls node_modules/pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css`로 경로 확인.

`src/ui/tokens.css`:

```css
@import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
:root {
  --grey-50: #f9fafb; --grey-100: #f2f4f6; --grey-200: #e5e8eb; --grey-300: #d1d6db;
  --grey-400: #b0b8c1; --grey-500: #8b95a1; --grey-600: #6b7684; --grey-700: #4e5968;
  --grey-800: #333d4b; --grey-900: #191f28;
  --brand: #e8805f; --brand-pressed: #d96f4e; --brand-weak: #fdf0eb; --brand-text: #c65f3f;
  --green: #1e8e4e; --green-weak: #e8f7ee;
  --t1: 1.875rem; --t1-lh: 2.5rem; --t2: 1.625rem; --t2-lh: 2.1875rem;
  --t3: 1.375rem; --t3-lh: 1.9375rem; --t4: 1.25rem; --t4-lh: 1.8125rem;
  --t5: 1.0625rem; --t5-lh: 1.59375rem; --t6: 0.9375rem; --t6-lh: 1.40625rem;
  --t7: 0.8125rem; --t7-lh: 1.21875rem;
  --gutter: 20px; --radius: 12px; --sheet-radius: 20px;
  --column: 480px; --top-h: 56px; --nav-h: 64px;
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  font-family: "Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  color: var(--grey-900);
}
body { padding-bottom: 0 !important; }
body[data-shell="column"] { background: var(--grey-50); }
body[data-shell="column"] #app {
  max-width: var(--column);
  margin: 0 auto;
  min-height: 100dvh;
  background: #fff;
}
#toast {
  background: var(--grey-800);
  color: #fff;
  border-radius: var(--radius);
  font-size: var(--t6);
  bottom: calc(var(--nav-h) + var(--safe-bottom) + 16px);
}
```

(`body padding-bottom !important`는 `quality.css`의 모바일 `body{padding-bottom:calc(76px+…)}`를 무력화한다. 여백은 틀이 준다. 2단계에서 옛 CSS를 지우면 `!important`도 삭제.)

- [ ] **Step 4: Icon component**

`src/ui/Icon.jsx`:

```jsx
import { createElement } from "react";
import {
  Bell, ChevronDown, ChevronLeft, ChevronRight, Heart, House, List, Map, MapPin,
  Plus, Search, Settings, SlidersHorizontal, UserRound, Building2, HouseHeart,
  Smartphone, Info, ShieldCheck, LogOut, Download,
} from "lucide";
const ICONS = {
  Bell, ChevronDown, ChevronLeft, ChevronRight, Heart, House, List, Map, MapPin,
  Plus, Search, Settings, SlidersHorizontal, UserRound, Building2, HouseHeart,
  Smartphone, Info, ShieldCheck, LogOut, Download,
};
const camel = (attrs) =>
  Object.fromEntries(
    Object.entries(attrs).map(([k, v]) => [k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()), v]),
  );
export default function Icon({ name, size = 24, className }) {
  const [, attrs, children] = ICONS[name];
  return (
    <svg {...camel(attrs)} width={size} height={size} strokeWidth={1.8} className={className} aria-hidden="true" focusable="false">
      {children.map(([tag, a], i) => createElement(tag, { ...camel(a), key: i }))}
    </svg>
  );
}
```

- [ ] **Step 5: Frame components**

`src/app/Frame.module.css`:

```css
.app { min-height: 100dvh; padding-bottom: calc(var(--nav-h) + var(--safe-bottom) + 24px); }
.top {
  position: sticky; top: 0; z-index: 500; height: var(--top-h);
  padding: env(safe-area-inset-top, 0px) 8px 0 var(--gutter);
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(255, 255, 255, 0.96); backdrop-filter: blur(12px);
}
.brand { display: inline-flex; align-items: center; gap: 8px; min-height: 44px;
  font-size: var(--t4); font-weight: 700; color: var(--grey-900); letter-spacing: -0.02em; }
.brand img { width: 28px; height: 28px; }
.back { margin-left: -12px; }
.actions { display: flex; align-items: center; }
.iconButton { position: relative; width: 44px; height: 44px; display: inline-flex;
  align-items: center; justify-content: center; color: var(--grey-800); border-radius: var(--radius); }
.iconButton:active { background: var(--grey-100); }
.dot { position: absolute; top: 10px; right: 10px; width: 8px; height: 8px;
  border-radius: 50%; background: var(--brand); border: 2px solid #fff; }
.nav {
  position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); z-index: 600;
  width: min(100%, var(--column));
  display: grid; grid-template-columns: repeat(5, 1fr); align-items: end;
  padding: 6px 4px calc(6px + var(--safe-bottom));
  background: rgba(255, 255, 255, 0.97); border-top: 1px solid var(--grey-200);
  backdrop-filter: blur(12px);
}
.navItem { min-height: 52px; display: flex; flex-direction: column; align-items: center;
  justify-content: flex-end; gap: 4px; font-size: var(--t7); line-height: 1; color: var(--grey-500);
  background: none; border: 0; }
.navItem[aria-current="page"] { color: var(--grey-900); font-weight: 600; }
.reportIcon { width: 44px; height: 44px; margin-top: -18px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--brand); color: #fff; box-shadow: 0 4px 12px rgba(232, 128, 95, 0.35);
  border: 3px solid #fff; }
.main { padding: 0; }
.banner { margin: 0 var(--gutter) 8px; padding: 12px 16px; border-radius: var(--radius);
  background: var(--grey-100); color: var(--grey-800); font-size: var(--t6); line-height: var(--t6-lh); }
```

`src/app/TopBar.jsx`:

```jsx
import Icon from "../ui/Icon.jsx";
import s from "./Frame.module.css";
const BACK = { "/my/settings": "/my" };
const PLAIN = new Set(["/explore", "/sightings", "/my"]);
export default function TopBar({ route, store }) {
  const unread = store.notifications.filter((n) => !n.read).length;
  const back = BACK[route];
  return (
    <header className={s.top}>
      {back ? (
        <a className={`${s.iconButton} ${s.back}`} href={`#${back}`} aria-label="뒤로">
          <Icon name="ChevronLeft" />
        </a>
      ) : PLAIN.has(route) ? (
        <span />
      ) : (
        <a className={s.brand} href="#/" aria-label="멍백홈 홈">
          <img src="/favicon.svg" alt="" />
          멍백홈
        </a>
      )}
      <div className={s.actions}>
        <button type="button" className={s.iconButton} data-action="notifications" aria-label={`알림 ${unread}개`}>
          <Icon name="Bell" />
          {unread > 0 && <span className={s.dot} />}
        </button>
        {route === "/my" && (
          <a className={s.iconButton} href="#/my/settings" aria-label="설정">
            <Icon name="Settings" />
          </a>
        )}
      </div>
    </header>
  );
}
```

`src/app/BottomNav.jsx`:

```jsx
import Icon from "../ui/Icon.jsx";
import s from "./Frame.module.css";
const ITEMS = [
  ["/", "House", "홈"],
  ["/explore", "Search", "찾기"],
  null,
  ["/sightings", "MapPin", "목격 소식"],
  ["/my", "UserRound", "마이홈"],
];
const isCurrent = (route, path) => route === path || (path === "/my" && route.startsWith("/my/"));
export default function BottomNav({ route }) {
  return (
    <nav className={s.nav} aria-label="하단 메뉴">
      {ITEMS.map((item) =>
        item ? (
          <a key={item[0]} className={s.navItem} href={`#${item[0]}`} aria-current={isCurrent(route, item[0]) ? "page" : undefined}>
            <Icon name={item[1]} />
            <span>{item[2]}</span>
          </a>
        ) : (
          <button key="report" type="button" className={s.navItem} data-action="report" aria-label="실종 신고">
            <span className={s.reportIcon}><Icon name="Plus" size={22} /></span>
            <span>신고</span>
          </button>
        ),
      )}
    </nav>
  );
}
```

`src/app/App.jsx`:

```jsx
import { useEffect, useRef } from "react";
import { mountLegacy } from "../main.js";
import { useRoute } from "./router.js";
import { useStore } from "./useStore.js";
import TopBar from "./TopBar.jsx";
import BottomNav from "./BottomNav.jsx";
import s from "./Frame.module.css";
// 새 디자인으로 옮긴 화면. 여기에 없는 경로는 기존 main.js가 #legacy-root에 그린다.
export const SCREENS = {};
export default function App() {
  const route = useRoute();
  const store = useStore();
  const Screen = SCREENS[route];
  const legacyRef = useRef(null);
  useEffect(() => {
    document.body.dataset.shell = Screen ? "column" : "legacy";
    if (Screen) return;
    mountLegacy(legacyRef.current);
    return () => mountLegacy(null);
  }, [Screen]);
  useEffect(() => { window.scrollTo({ top: 0 }); }, [route]);
  return (
    <div className={s.app} data-shell="react">
      <TopBar route={route} store={store} />
      <div id="connection-banner" className={s.banner} hidden />
      <main id="main" className={Screen ? s.main : "container"}>
        {Screen ? <Screen /> : <div ref={legacyRef} id="legacy-root" />}
      </main>
      <BottomNav route={route} />
    </div>
  );
}
```

`src/app/main.jsx`에 토큰 import 추가(레거시 CSS 뒤에 오도록 App import 다음):

```jsx
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "../ui/tokens.css";
createRoot(document.querySelector("#app")).render(<App />);
```

- [ ] **Step 6: Legacy renders only the page body**

`src/main.js` `render()`의

```js
  app.innerHTML =
    header() + `<main id="main" class="container">${body}</main>` + footer();
```

를 `app.innerHTML = body;`로 바꾼다. `decorateSession()`에서 `.header-actions`/`.account-button` 처리 블록(현재 1373~1382행)과 `connection` 생성 블록의 `if (!connection) {…}`를 삭제하고, 배너는 `const connection = document.querySelector("#connection-banner"); if (!connection) return;` 로 찾기만 한다. `header()`·`footer()` 함수는 Task 7에서 삭제(지금은 호출만 사라짐).

- [ ] **Step 7: Update existing browser tests to the new frame**

`tests/v2-browser.spec.js`: 파일 상단의 `unique`, `credentials`, `ready`, `account` 정의를 삭제하고

```js
import { unique, credentials, ready, registerByApi as account, openLogin } from "./helpers.js";
```

로 바꾼다. `test.beforeEach(async ({ page }) => ready(page));`는 그대로. 교체 목록:
- `await page.locator(".account-button").click();` → `await openLogin(page);`
- `await expect(page.locator(".notification-dot")).toBeVisible({timeout:20000});` → `await expect(page.getByRole("button", { name: /^알림 [1-9]\d*개$/ })).toBeVisible({ timeout: 20000 });`
- 두 브라우저 테스트의 `const other = await browser.newContext(...)` 다음 `await ready(witness);`는 helpers의 `ready` 사용(변경 없음).

`tests/mobile-browser.spec.js` 전체:

```js
import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { ready, currentUserName, trigger } from "./helpers.js";
test("small phone layouts, keyboard inputs, and location permission feedback", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Phone-only coverage");
  await ready(page);
  for (const width of [320, 360, 430]) {
    await page.setViewportSize({ width, height: 740 });
    for (const route of ["/#/", "/#/explore", "/#/sightings", "/#/my"]) {
      await page.goto(route);
      const nav = page.getByRole("navigation", { name: "하단 메뉴" });
      await expect(nav).toBeVisible();
      await expect(nav.getByRole("button", { name: "실종 신고", exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${width} ${route}`).toBe(true);
    }
  }
  await page.request.post("/api/auth/register", { data: { name: "기기확인", email: `${randomUUID()}@example.com`, password: "test-phone-password" } });
  await page.reload();
  await expect.poll(() => currentUserName(page)).toBe("기기확인");
  await trigger(page, "device-check");
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({ latitude: 37.51, longitude: 127.1, accuracy: 20 });
  await page.getByRole("button", { name: "현재 위치 확인", exact: true }).click();
  await expect(page.locator("#gps-status")).toContainText("약 20m");
  await context.clearPermissions();
  await page.evaluate(() => Object.defineProperty(navigator, "geolocation", { configurable: true, value: { getCurrentPosition: (_ok, error) => error({ code: 1 }) } }));
  await page.getByRole("button", { name: "현재 위치 확인", exact: true }).click();
  await expect(page.locator("#gps-status")).toContainText("위치 권한이 꺼져");
  await page.getByRole("button", { name: "닫기", exact: true }).click();
  await page.goto("/#/account/forgot");
  expect(await page.locator("#main input").first().evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  await page.screenshot({ path: "artifacts/account-phone.png", fullPage: true });
});
```

`tests/account-browser.spec.js`: `page.locator('#connection-banner')` 선택자는 그대로 동작(React가 같은 id를 렌더). 변경 없음. 실행 후 실패하면 `.account-button` 참조만 `openLogin`으로 교체.

- [ ] **Step 8: Run tests**

Run: `npm test && npm run build && npm run test:browser`
Expected: 모두 pass(1 skip). 실패 시 레거시 CSS가 기대하는 `.container` 여백·z-index를 확인하고 `Frame.module.css`만 조정.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json src tests
git commit -m "feat(app): React top bar, bottom navigation and design tokens"
```

---

### Task 3: 공통 부품 + 마이홈 + 설정

**Files:**
- Create: `src/format.js`, `src/ui/index.jsx`, `src/ui/ui.module.css`, `src/screens/screens.module.css`, `src/screens/shared.jsx`, `src/screens/My.jsx`, `src/screens/Settings.jsx`
- Modify: `src/main.js` (시간 함수 import로 교체), `src/app/App.jsx` (SCREENS), `tests/v2-browser.spec.js`, `tests/shell.spec.js`, `tests/mobile-browser.spec.js`
- Test: `tests/shell.spec.js` (마이홈·설정 케이스 추가)

**Interfaces:**
- Consumes: `Icon`, `useStore`, `SCREENS`.
- Produces (from `src/format.js`): `timeAgo(t)`, `formatTime(t)`, `relativeTime(t, now = Date.now()) → "방금 전"|"n분 전"|"n시간 전"|"n일 전"`, `dayGroup(t, now = Date.now()) → "오늘"|"어제"|"이번 주"|"이전"`, `objectParticle(name) → "을"|"를"`.
- Produces (from `src/ui/index.jsx`): `Top({title, subtitle?, right?})`, `ListHeader({title, action?})`, `ListRow({as?: "a"|"button"|"div", href?, left?, title, description?, right?, tone?: "muted", ...rest})`, `Button({variant?: "fill"|"weak", size?: "sm"|"md"|"lg", full?, ...rest})`, `ButtonLink({href, variant?, size?, full?, children})`, `BottomCTA(props)` (props → Button), `Badge({tone?: "grey"|"coral"|"green", children})`, `Chip({onClick, icon?, children, expanded?})`, `Divider()`, `Thumb({src, size?: 56|72})`, `IconCircle({name, tone?: "grey"|"coral"})`, `EmptyState({image?, title, description?, action?})`, `SkeletonRows({count?})`.
- Produces (from `src/screens/shared.jsx`): `DogBadge({dog})`, `DogRow({dog, size?})` (renders `data-dog-row`).
- 스펙 2장의 `Tabs` 부품은 1단계 화면 어디에서도 쓰지 않아(상태 전환은 시트로 대체) 만들지 않는다 — YAGNI. 2단계에서 필요할 때 추가.

- [ ] **Step 1: Write the failing tests** — append to `tests/shell.spec.js`

```js
import { registerByApi } from "./helpers.js";
test("my home puts reports first and keeps logout in settings", async ({ page }) => {
  await ready(page, "/#/my");
  await expect(page.getByRole("heading", { name: "마이홈" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("button", { name: "로그인", exact: true })).toBeVisible();
  const c = await registerByApi(page);
  await page.goto("/#/my");
  await expect(page.getByRole("heading", { name: `${c.name} 님` })).toBeVisible();
  const headers = await page.getByRole("main").getByRole("heading", { level: 2 }).allInnerTexts();
  expect(headers.slice(0, 2)).toEqual(["내 신고", "우리 집 강아지"]);
  await expect(page.getByRole("main").getByRole("button", { name: "로그아웃" })).toHaveCount(0);
  await page.getByRole("link", { name: "설정" }).click();
  await expect(page).toHaveURL(/#\/my\/settings$/);
  await expect(page.getByRole("button", { name: "새 목격 소식 알림 받기" })).toBeVisible();
  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect.poll(() => page.evaluate(async () => (await (await fetch("/api/state")).json()).user?.registered)).toBeFalsy();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run build && npm run test:browser -- tests/shell.spec.js`
Expected: FAIL (heading "마이홈" not found)

- [ ] **Step 3: Shared formatting module**

`src/format.js`:

```js
export const formatTime = (t) =>
  new Date(t).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
export const timeAgo = (t) => {
  const h = Math.max(0, Math.floor((Date.now() - new Date(t)) / 3600000));
  return h < 1 ? "방금 전" : h < 24 ? `${h}시간 전` : `${Math.floor(h / 24)}일 전`;
};
export function relativeTime(t, now = Date.now()) {
  const m = Math.max(0, Math.floor((now - new Date(t)) / 60000));
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  if (m < 1440) return `${Math.floor(m / 60)}시간 전`;
  return `${Math.floor(m / 1440)}일 전`;
}
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
export function dayGroup(t, now = Date.now()) {
  const days = Math.round((startOfDay(new Date(now)) - startOfDay(new Date(t))) / 86400000);
  return days <= 0 ? "오늘" : days === 1 ? "어제" : days < 7 ? "이번 주" : "이전";
}
export function objectParticle(name) {
  const code = String(name).trim().slice(-1).charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return "를";
  return code % 28 ? "을" : "를";
}
```

`src/main.js`: 134~148행의 `formatTime`, `timeAgo` 정의를 삭제하고 import 목록에 `import { formatTime, timeAgo } from "./format.js";` 추가.

`tests/domain.test.js` 끝에 추가:

```js
import { relativeTime, dayGroup, objectParticle } from "../src/format.js";
test("relative time, day groups and Korean object particle", () => {
  const now = new Date(2026, 8, 29, 16, 0).getTime();
  assert.equal(relativeTime(now - 30_000, now), "방금 전");
  assert.equal(relativeTime(now - 8 * 60_000, now), "8분 전");
  assert.equal(relativeTime(now - 3 * 3600_000, now), "3시간 전");
  assert.equal(dayGroup(new Date(2026, 8, 29, 1).getTime(), now), "오늘");
  assert.equal(dayGroup(new Date(2026, 8, 28, 23).getTime(), now), "어제");
  assert.equal(dayGroup(new Date(2026, 8, 25).getTime(), now), "이번 주");
  assert.equal(dayGroup(new Date(2026, 8, 1).getTime(), now), "이전");
  assert.equal(objectParticle("보리"), "를");
  assert.equal(objectParticle("초콩"), "을");
});
```

(`tests/domain.test.js` 상단에 이미 `import test from "node:test"`와 `import assert from "node:assert/strict"`가 있는지 확인하고 없으면 같은 형식으로 추가. 이로써 `npm test`는 27개가 된다.)

- [ ] **Step 4: UI primitives**

`src/ui/ui.module.css`:

```css
.top { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px;
  padding: 8px var(--gutter) 20px; }
.topTitle { margin: 0; font-size: var(--t2); line-height: var(--t2-lh); font-weight: 700;
  letter-spacing: -0.02em; color: var(--grey-900); }
.topSub { margin: 4px 0 0; font-size: var(--t6); line-height: var(--t6-lh); color: var(--grey-600);
  display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.listHeader { display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 20px var(--gutter) 8px; min-height: 44px; }
.listHeader h2 { margin: 0; font-size: var(--t6); line-height: var(--t6-lh); font-weight: 700;
  color: var(--grey-800); letter-spacing: 0; }
.row { display: flex; align-items: center; gap: 14px; width: 100%; min-height: 64px;
  padding: 12px var(--gutter); text-align: left; background: none; border: 0; color: inherit; }
.rowInteractive { cursor: pointer; }
.rowInteractive:active { background: var(--grey-50); }
.rowLeft { flex-shrink: 0; display: flex; }
.rowBody { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.rowTitle { font-size: var(--t5); line-height: var(--t5-lh); font-weight: 600; color: var(--grey-900);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rowDesc { font-size: var(--t6); line-height: var(--t6-lh); color: var(--grey-600);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rowRight { flex-shrink: 0; display: flex; align-items: center; gap: 8px; color: var(--grey-600);
  font-size: var(--t6); }
.chevron { color: var(--grey-400); flex-shrink: 0; }
.muted .rowTitle { color: var(--grey-600); font-weight: 500; }
.button { display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  border: 0; border-radius: var(--radius); font-weight: 600; white-space: nowrap; }
.button:active { transform: scale(0.98); }
.fill { background: var(--brand); color: #fff; }
.fill:active { background: var(--brand-pressed); }
.weak { background: var(--grey-100); color: var(--grey-800); }
.sm { min-height: 44px; padding: 0 14px; font-size: var(--t6); }
.md { min-height: 48px; padding: 0 18px; font-size: var(--t5); }
.lg { min-height: 56px; padding: 0 20px; font-size: var(--t5); }
.full { width: 100%; }
.bottomCta { position: fixed; left: 50%; transform: translateX(-50%); z-index: 550;
  bottom: calc(var(--nav-h) + var(--safe-bottom)); width: min(100%, var(--column));
  padding: 12px var(--gutter); background: linear-gradient(rgba(255,255,255,0), #fff 30%); }
.badge { display: inline-flex; align-items: center; height: 24px; padding: 0 8px; border-radius: 6px;
  font-size: var(--t7); line-height: 1; font-weight: 600; white-space: nowrap; }
.grey { background: var(--grey-100); color: var(--grey-600); }
.coral { background: var(--brand-weak); color: var(--brand-text); }
.green { background: var(--green-weak); color: var(--green); }
.chip { display: inline-flex; align-items: center; gap: 4px; min-height: 44px; padding: 0 12px;
  border-radius: 999px; border: 1px solid var(--grey-200); background: #fff; color: var(--grey-800);
  font-size: var(--t6); font-weight: 500; white-space: nowrap; }
.band { height: 12px; background: var(--grey-50); margin: 12px 0; }
.thumb { border-radius: var(--radius); object-fit: cover; background: var(--grey-100); }
.iconCircle { width: 40px; height: 40px; border-radius: 50%; display: inline-flex;
  align-items: center; justify-content: center; background: var(--grey-100); color: var(--grey-700); }
.iconCoral { background: var(--brand-weak); color: var(--brand-text); }
.empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px;
  padding: 40px var(--gutter); }
.empty img { width: 120px; height: 120px; object-fit: contain; }
.empty h2 { margin: 8px 0 0; font-size: var(--t4); line-height: var(--t4-lh); font-weight: 700;
  color: var(--grey-900); letter-spacing: -0.01em; }
.empty p { margin: 0; font-size: var(--t6); line-height: var(--t6-lh); color: var(--grey-600); }
.empty > :last-child:not(p):not(h2):not(img) { margin-top: 12px; }
.skeleton { display: flex; align-items: center; gap: 14px; padding: 12px var(--gutter); }
.skeleton span:first-child { width: 56px; height: 56px; border-radius: var(--radius); background: var(--grey-100); }
.skeleton span:last-child { flex: 1; height: 40px; border-radius: 8px; background: var(--grey-100); }
@media (prefers-reduced-motion: no-preference) {
  .skeleton span { animation: pulse 1.2s ease-in-out infinite; }
  @keyframes pulse { 50% { opacity: 0.5; } }
}
```

`src/ui/index.jsx`:

```jsx
import Icon from "./Icon.jsx";
import s from "./ui.module.css";
const cx = (...c) => c.filter(Boolean).join(" ");
export function Top({ title, subtitle, right }) {
  return (
    <div className={s.top}>
      <div>
        <h1 className={s.topTitle}>{title}</h1>
        {subtitle && <p className={s.topSub}>{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
export function ListHeader({ title, action }) {
  return (
    <div className={s.listHeader}>
      <h2>{title}</h2>
      {action}
    </div>
  );
}
export function ListRow({ as, href, left, title, description, right, tone, ...rest }) {
  const Tag = href ? "a" : as || "div";
  const interactive = Tag !== "div";
  return (
    <Tag
      className={cx(s.row, interactive && s.rowInteractive, tone === "muted" && s.muted)}
      href={href}
      type={Tag === "button" ? "button" : undefined}
      {...rest}
    >
      {left && <span className={s.rowLeft}>{left}</span>}
      <span className={s.rowBody}>
        <span className={s.rowTitle}>{title}</span>
        {description && <span className={s.rowDesc}>{description}</span>}
      </span>
      {right !== undefined ? (
        <span className={s.rowRight}>{right}</span>
      ) : (
        interactive && <Icon name="ChevronRight" size={20} className={s.chevron} />
      )}
    </Tag>
  );
}
export const buttonClass = ({ variant = "fill", size = "md", full }) =>
  cx(s.button, s[variant], s[size], full && s.full);
export function Button({ variant = "fill", size = "md", full, className, ...rest }) {
  return <button type="button" data-variant={variant} className={cx(buttonClass({ variant, size, full }), className)} {...rest} />;
}
export function ButtonLink({ href, variant = "fill", size = "md", full, children }) {
  return <a href={href} data-variant={variant} className={buttonClass({ variant, size, full })}>{children}</a>;
}
export function BottomCTA(props) {
  return (
    <div className={s.bottomCta}>
      <Button size="lg" full {...props} />
    </div>
  );
}
export function Badge({ tone = "grey", children }) {
  return <span className={cx(s.badge, s[tone])}>{children}</span>;
}
export function Chip({ onClick, icon = "ChevronDown", expanded, children }) {
  return (
    <button type="button" className={s.chip} onClick={onClick} aria-haspopup="dialog" aria-expanded={expanded}>
      {icon === "SlidersHorizontal" && <Icon name={icon} size={16} />}
      {children}
      {icon === "ChevronDown" && <Icon name={icon} size={16} />}
    </button>
  );
}
export function Divider() {
  return <div className={s.band} role="presentation" />;
}
export function Thumb({ src, size = 56 }) {
  return <img className={s.thumb} src={src || "/assets/mascot-home.webp"} alt="" width={size} height={size} loading="lazy" />;
}
export function IconCircle({ name, tone = "grey" }) {
  return (
    <span className={cx(s.iconCircle, tone === "coral" && s.iconCoral)}>
      <Icon name={name} size={20} />
    </span>
  );
}
export function EmptyState({ image, title, description, action }) {
  return (
    <div className={s.empty}>
      {image && <img src={image} alt="" />}
      <h2>{title}</h2>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}
export function SkeletonRows({ count = 5 }) {
  return (
    <div role="status" aria-label="불러오는 중">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={s.skeleton} aria-hidden="true">
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Shared screen pieces**

`src/screens/screens.module.css`:

```css
.screen { padding-bottom: 8px; }
.withCta { padding-bottom: 96px; }
.name { font-weight: 600; }
.breed { font-weight: 400; color: var(--grey-600); }
.emptyLine { margin: 0; padding: 12px var(--gutter) 16px; font-size: var(--t6); color: var(--grey-500); }
.notice { display: flex; align-items: center; justify-content: space-between; gap: 12px;
  margin: 0 var(--gutter) 8px; padding: 12px 16px; border-radius: var(--radius); background: var(--brand-weak); }
.notice p { margin: 0; font-size: var(--t6); line-height: var(--t6-lh); color: var(--grey-800); }
.rowActions { display: flex; gap: 8px; padding: 0 var(--gutter) 12px calc(var(--gutter) + 70px); }
.count { font-size: var(--t7); font-weight: 600; color: var(--brand-text); }
.more { padding: 8px var(--gutter) 16px; }
.optionGrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 8px var(--gutter) 16px; }
.option { min-height: 48px; border-radius: var(--radius); border: 1px solid var(--grey-200); background: #fff;
  font-size: var(--t6); color: var(--grey-800); }
.option[aria-pressed="true"] { border-color: var(--grey-900); font-weight: 700; color: var(--grey-900); }
.optionLabel { margin: 16px var(--gutter) 0; font-size: var(--t6); font-weight: 700; color: var(--grey-800); }
.sheetActions { display: grid; grid-template-columns: 1fr 2fr; gap: 8px; padding: 8px var(--gutter) 0; }
```

`src/screens/shared.jsx`:

```jsx
import { ListRow, Thumb, Badge } from "../ui/index.jsx";
import { relativeTime } from "../format.js";
import s from "./screens.module.css";
export function DogBadge({ dog }) {
  if (dog.demo) return <Badge>예시</Badge>;
  return dog.status === "reunited" ? <Badge tone="green">집에 돌아왔어요</Badge> : <Badge tone="coral">찾고 있어요</Badge>;
}
export function DogRow({ dog, size = 56 }) {
  return (
    <ListRow
      href={`#/dog/${dog.id}`}
      data-dog-row=""
      left={<Thumb src={dog.image} size={size} />}
      title={<><span className={s.name}>{dog.name}</span><span className={s.breed}> · {dog.breed}</span></>}
      description={`${dog.location} · ${relativeTime(dog.time)}`}
      right={<DogBadge dog={dog} />}
    />
  );
}
```

(`OptionSheet`, `RegionSheet`는 Task 4에서 추가)

- [ ] **Step 6: My screen**

`src/screens/My.jsx`:

```jsx
import { Fragment } from "react";
import { useStore } from "../app/useStore.js";
import { Top, ListHeader, ListRow, Button, Badge, Divider, Thumb, IconCircle, EmptyState } from "../ui/index.jsx";
import { DogBadge, DogRow } from "./shared.jsx";
import s from "./screens.module.css";
export default function My() {
  const db = useStore();
  const user = db.user;
  if (!user?.registered)
    return (
      <div className={s.screen}>
        <Top title="마이홈" />
        <EmptyState
          image="/assets/mascot-home.webp"
          title="로그인하면 내 신고와 제보를 한곳에서 볼 수 있어요"
          description="둘러보기와 목격 제보는 로그인 없이 할 수 있어요"
          action={<Button data-action="account">로그인</Button>}
        />
      </div>
    );
  const mine = db.dogs.filter((d) => d.canManage);
  const saved = db.dogs.filter((d) => db.saved.includes(d.id));
  const unreadFor = (id) => db.notifications.filter((n) => !n.read && n.dogId === id).length;
  return (
    <div className={s.screen}>
      <Top
        title={`${user.name} 님`}
        subtitle={<>{user.email}<Badge tone={user.verified ? "green" : "grey"}>{user.verified ? "인증 완료" : "인증 전"}</Badge></>}
      />
      {user.verificationRequired && !user.verified && (
        <div className={s.notice}>
          <p>이메일 인증을 마쳐야 신고를 등록할 수 있어요</p>
          <Button variant="weak" size="sm" data-action="verify-resend">메일 다시 받기</Button>
        </div>
      )}
      <ListHeader title="내 신고" />
      {mine.length ? (
        mine.map((d) => (
          <Fragment key={d.id}>
            <ListRow
              href={`#/dog/${d.id}`}
              left={<Thumb src={d.image} />}
              title={d.name}
              description={d.location}
              right={<>{unreadFor(d.id) > 0 && <span className={s.count}>새 제보 {unreadFor(d.id)}</span>}<DogBadge dog={d} /></>}
            />
            <div className={s.rowActions}>
              <Button variant="weak" size="sm" data-action="edit-dog" data-id={d.id}>수정</Button>
              {d.status !== "reunited" && <Button variant="weak" size="sm" data-action="reunite" data-id={d.id}>찾았어요</Button>}
            </div>
          </Fragment>
        ))
      ) : (
        <p className={s.emptyLine}>등록한 신고가 없어요</p>
      )}
      <Divider />
      <ListHeader title="우리 집 강아지" />
      {db.profiles.map((p) => (
        <ListRow
          key={p.id}
          left={<Thumb src={p.image} />}
          title={p.name}
          description={[p.breed, p.age].filter(Boolean).join(" · ")}
          right={<Button variant="weak" size="sm" data-action="report" data-profile={p.id}>이 정보로 신고</Button>}
        />
      ))}
      <ListRow as="button" data-action="profile" left={<IconCircle name="Plus" />} title="강아지 등록하기" description="미리 저장해두면 빠르게 신고할 수 있어요" />
      <Divider />
      <ListHeader title={`저장한 소식 ${saved.length}`} />
      {saved.length ? saved.map((d) => <DogRow key={d.id} dog={d} />) : <p className={s.emptyLine}>하트를 누른 강아지가 여기에 모여요</p>}
    </div>
  );
}
```

(스펙 3장 "저장한 소식 → 같은 화면 안 펼침"은 목록을 바로 보여주는 것으로 단순화 — Minimum Features.)

- [ ] **Step 7: Settings screen**

`src/screens/Settings.jsx`:

```jsx
import { useStore } from "../app/useStore.js";
import { Top, ListHeader, ListRow, Divider, IconCircle } from "../ui/index.jsx";
import s from "./screens.module.css";
export default function Settings() {
  const db = useStore();
  const user = db.user;
  return (
    <div className={s.screen}>
      <Top title="설정" />
      <ListHeader title="알림" />
      <ListRow as="button" data-action="push" left={<IconCircle name="Bell" />} title="새 목격 소식 알림 받기" description="내 신고에 제보가 오면 바로 알려드려요" />
      <ListRow as="button" data-action="areas" left={<IconCircle name="MapPin" />} title="관심 지역" description={db.areas.length ? db.areas.join(", ") : "새 실종 소식을 받을 동네를 골라요"} />
      <Divider />
      <ListHeader title="이 휴대폰" />
      <ListRow as="button" data-action="device-check" left={<IconCircle name="Smartphone" />} title="이 휴대폰에서 기능 확인" description="위치와 알림이 잘 되는지 확인해요" />
      <ListRow as="button" data-action="install-app" left={<IconCircle name="Download" />} title="홈 화면에 추가하기" description="앱처럼 바로 열 수 있어요" />
      <Divider />
      <ListHeader title="안내" />
      <ListRow as="button" data-action="about" left={<IconCircle name="Info" />} title="서비스 안내" />
      <ListRow as="button" data-action="privacy" left={<IconCircle name="ShieldCheck" />} title="개인정보 안내" />
      {user?.role === "admin" && <ListRow href="#/admin" left={<IconCircle name="Building2" />} title="운영 화면" />}
      {user?.registered && (
        <>
          <Divider />
          <ListRow as="button" data-action="logout" title="로그아웃" />
          <ListRow as="button" data-action="delete-account" title="계정 삭제" tone="muted" />
        </>
      )}
    </div>
  );
}
```

(스펙의 "운영 화면"은 관리자에게만 노출하도록 좁힘 — 일반 사용자에게 의미 없는 메뉴 제거.)

`src/app/App.jsx`:

```jsx
import My from "../screens/My.jsx";
import Settings from "../screens/Settings.jsx";
export const SCREENS = { "/my": My, "/my/settings": Settings };
```

- [ ] **Step 8: Update tests that used the old my page**

`tests/v2-browser.spec.js` 두 브라우저 테스트:

```js
    await page.goto("/#/my");
    await page.getByRole("button", { name: "찾았어요", exact: true }).click();
    await page.getByRole("button", { name: "네, 무사히 만났어요" }).click();
    await expect(page.getByRole("main").getByText("집에 돌아왔어요")).toBeVisible();
```

`saved profile …` 테스트의 `await expect(page.locator(".profile-card")).toHaveCount(1);` → `await expect(page.getByRole("button", { name: "이 정보로 신고" })).toHaveCount(1);` 그리고 `getByRole("button", { name: "이 정보로 실종 신고" })` → `getByRole("button", { name: "이 정보로 신고" })`. `getByRole("button", { name: "프로필 등록", exact: true })` → `getByRole("button", { name: /강아지 등록하기/ })`.

`tests/mobile-browser.spec.js`의 `await trigger(page, "device-check");` → `await page.goto("/#/my/settings"); await page.getByRole("button", { name: /이 휴대폰에서 기능 확인/ }).click();` 그리고 import에서 `trigger` 삭제.

- [ ] **Step 9: Suggest alerts right after a report (Value first) and fix alert wording**

`src/main.js` `registeredNext()`의 모달 본문에서 `QR 전단 만들기` 버튼 다음에 추가:

```js
<button class="button white full" data-action="push">새 목격 제보 알림 받기</button><p class="field-hint">${esc(d.name)} 목격 제보가 오면 바로 알려드려요. 나중에 설정에서 켜도 돼요.</p>
```

클릭 처리기 `a === "push"`의 성공 문구 `"브라우저 알림을 켰어요."` → `"새 목격 소식 알림을 켰어요."`. `accountForm()`의 `브라우저 알림 켜기` 버튼 문구 → `새 목격 소식 알림 받기`.

`tests/v2-browser.spec.js`의 `submitDog` 안 `await expect(page.locator(".success-next")).toBeVisible();` 다음 줄에 추가:

```js
  await expect(page.getByRole("button", { name: "새 목격 제보 알림 받기" })).toBeVisible();
```

- [ ] **Step 10: Run tests**

Run: `npm test && npm run build && npm run test:browser`
Expected: node 27 pass, 브라우저 전부 pass(1 skip).

- [ ] **Step 11: Capture and show**

Run: 아래 스크립트를 `scripts/capture-redesign.mjs`로 만들고 `node scripts/capture-redesign.mjs`

```js
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { startTestServer } from "./e2e-server.mjs";
const routes = process.argv.slice(2).length ? process.argv.slice(2) : ["/", "/explore", "/sightings", "/my", "/my/settings"];
mkdirSync("artifacts/redesign", { recursive: true });
const fx = await startTestServer();
await new Promise((r) => fx.server.once("listening", r));
const browser = await chromium.launch({ channel: "msedge" });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
await page.goto("http://127.0.0.1:5174/");
await page.request.post("http://127.0.0.1:5174/api/auth/register", { data: { name: "토토로", email: `capture-${Date.now()}@example.com`, password: "capture-password-1" } });
for (const route of routes) {
  await page.goto(`http://127.0.0.1:5174/#${route}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(500);
  const name = route === "/" ? "home" : route.slice(1).replaceAll("/", "-");
  await page.screenshot({ path: `artifacts/redesign/${name}.png`, fullPage: true });
}
await browser.close();
await fx.close();
```

`artifacts/redesign/my.png`, `my-settings.png`를 사용자에게 보여주고 **방향 확인을 받은 뒤 Task 4 진행**(스펙 7장 3단계 체크포인트).

- [ ] **Step 12: Commit**

```bash
git add src tests scripts/capture-redesign.mjs artifacts/redesign
git commit -m "feat(my): toss-style my home and settings with shared list components"
```

---

### Task 4: 아래 시트 + 홈

**Files:**
- Create: `src/ui/BottomSheet.jsx`, `src/screens/Home.jsx`
- Modify: `src/ui/ui.module.css` (시트 스타일 추가), `src/screens/shared.jsx` (`OptionSheet`, `RegionSheet`), `src/app/App.jsx`, `tests/v2-browser.spec.js`, `tests/shell.spec.js`
- Test: `tests/shell.spec.js`

**Interfaces:**
- Consumes: 부품 전부, `filterDogs`, `chronologicalSightings`, `REGIONS` (from `src/domain.js`), `relativeTime`, `objectParticle`.
- Produces: `BottomSheet({open, title, onClose, children})`, `OptionSheet({open, title, options: [value, label][], value, onSelect(value), onClose})`, `RegionSheet({open, value, onSelect, onClose})`.

- [ ] **Step 1: Write the failing test** — append to `tests/shell.spec.js`

```js
test("home shows missing dogs first and lets people change the region in a bottom sheet", async ({ page }) => {
  await ready(page);
  await expect(page.getByRole("button", { name: /강아지를 잃어버렸어요/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /강아지를 발견했어요/ })).toBeVisible();
  const first = page.locator("[data-dog-row]").first();
  await expect(first).toBeVisible();
  expect((await first.boundingBox()).y).toBeLessThan(600);
  expect(await page.locator("[data-dog-row]").count()).toBeLessThanOrEqual(5);
  await page.getByRole("button", { name: "전국" }).click();
  const sheet = page.getByRole("dialog", { name: "지역 선택" });
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "부산" }).click();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByRole("heading", { name: /^부산에서 찾고 있어요/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /집에 돌아온 아이들/ })).toBeVisible();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run build && npm run test:browser -- tests/shell.spec.js`
Expected: FAIL (`[data-dog-row]` not found)

- [ ] **Step 3: BottomSheet**

`src/ui/ui.module.css` 끝에 추가:

```css
.sheetBackdrop { position: fixed; inset: 0; z-index: 900; background: rgba(0, 0, 0, 0.4);
  display: flex; align-items: flex-end; justify-content: center; }
.sheet { width: min(100%, var(--column)); max-height: 85dvh; overflow: auto; background: #fff;
  border-radius: var(--sheet-radius) var(--sheet-radius) 0 0;
  padding-bottom: calc(16px + var(--safe-bottom)); }
.handle { height: 28px; display: flex; align-items: center; justify-content: center; touch-action: none; }
.handle::before { content: ""; width: 40px; height: 4px; border-radius: 2px; background: var(--grey-300); }
.sheetTitle { margin: 0; padding: 4px var(--gutter) 8px; font-size: var(--t4); line-height: var(--t4-lh);
  font-weight: 700; color: var(--grey-900); outline: none; letter-spacing: -0.01em; }
@media (prefers-reduced-motion: no-preference) {
  .sheet { animation: rise 0.22s ease-out; }
  @keyframes rise { from { transform: translateY(24px); opacity: 0.6; } }
}
```

`src/ui/BottomSheet.jsx`:

```jsx
import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import s from "./ui.module.css";
const FOCUSABLE = 'button,a[href],input,select,textarea,[tabindex="0"]';
export default function BottomSheet({ open, title, onClose, children }) {
  const ref = useRef(null);
  const dragFrom = useRef(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    ref.current?.querySelector("h2")?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab") return;
      const items = [...ref.current.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled);
      if (!items.length) return;
      const first = items[0], last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className={s.sheetBackdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <section ref={ref} className={s.sheet} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div
          className={s.handle}
          aria-hidden="true"
          onPointerDown={(e) => (dragFrom.current = e.clientY)}
          onPointerUp={(e) => {
            if (dragFrom.current != null && e.clientY - dragFrom.current > 60) onClose();
            dragFrom.current = null;
          }}
        />
        <h2 id={titleId} tabIndex={-1} className={s.sheetTitle}>{title}</h2>
        {children}
      </section>
    </div>,
    document.body,
  );
}
```

- [ ] **Step 4: Option and region sheets** — append to `src/screens/shared.jsx`

```jsx
import BottomSheet from "../ui/BottomSheet.jsx";
import { REGIONS } from "../domain.js";
export function OptionSheet({ open, title, options, value, onSelect, onClose }) {
  return (
    <BottomSheet open={open} title={title} onClose={onClose}>
      <div className={s.optionGrid}>
        {options.map(([v, label]) => (
          <button key={v} type="button" className={s.option} aria-pressed={v === value} onClick={() => { onSelect(v); onClose(); }}>
            {label}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
export function RegionSheet(props) {
  return <OptionSheet {...props} title="지역 선택" options={REGIONS.map((r) => [r, r])} />;
}
```

- [ ] **Step 5: Home screen**

`src/screens/Home.jsx`:

```jsx
import { useState, useCallback } from "react";
import { useStore } from "../app/useStore.js";
import { ListHeader, ListRow, ButtonLink, Divider, Chip, IconCircle, EmptyState, Button, SkeletonRows, Thumb } from "../ui/index.jsx";
import { DogRow, RegionSheet } from "./shared.jsx";
import { filterDogs, chronologicalSightings } from "../domain.js";
import { relativeTime, objectParticle } from "../format.js";
import s from "./screens.module.css";
function OwnerCard({ dog, db }) {
  const reports = chronologicalSightings(db.reports.filter((r) => r.dogId === dog.id));
  const last = reports.at(-1);
  const unread = db.notifications.filter((n) => !n.read && n.dogId === dog.id).length;
  return (
    <section className={s.owner} aria-labelledby="owner-title">
      <Thumb src={dog.image} size={72} />
      <div className={s.ownerBody}>
        <h1 id="owner-title" className={s.ownerTitle}>{dog.name}{objectParticle(dog.name)} 찾고 있어요</h1>
        <p className={s.ownerDesc}>새 목격 제보 {unread}건 · {last ? `마지막 목격 ${relativeTime(last.time)}` : "아직 목격 제보가 없어요"}</p>
        <ButtonLink href={`#/dog/${dog.id}`} full>제보 확인하기</ButtonLink>
      </div>
    </section>
  );
}
export default function Home() {
  const db = useStore();
  const [picked, setPicked] = useState(null);
  const [sheet, setSheet] = useState(false);
  const close = useCallback(() => setSheet(false), []);
  const region = picked ?? db.areas?.[0] ?? "전국";
  const mine = db.dogs.find((d) => d.canManage && d.status === "missing");
  const missing = filterDogs(db.dogs, { region, status: "missing" });
  const reunited = db.dogs.filter((d) => d.status === "reunited").length;
  return (
    <div className={s.screen}>
      {mine ? <OwnerCard dog={mine} db={db} /> : (
        <ListRow as="button" data-action="report" left={<IconCircle name="Search" tone="coral" />} title="강아지를 잃어버렸어요" description="사진과 장소만 있으면 돼요" />
      )}
      <ListRow as="button" data-action="sighting" left={<IconCircle name="MapPin" />} title="강아지를 발견했어요" description="로그인 없이 알려줄 수 있어요" />
      <Divider />
      <ListHeader
        title={`${region}에서 찾고 있어요 ${missing.length}`}
        action={<Chip onClick={() => setSheet(true)} expanded={sheet}>{region}</Chip>}
      />
      {db.connection === "loading" ? (
        <SkeletonRows />
      ) : missing.length ? (
        missing.slice(0, 5).map((d) => <DogRow key={d.id} dog={d} />)
      ) : (
        <EmptyState title="지금 이 지역에서 찾고 있는 강아지가 없어요" description="다른 지역도 살펴볼 수 있어요" action={<Button variant="weak" onClick={() => setSheet(true)}>지역 바꾸기</Button>} />
      )}
      {missing.length > 5 && <ListRow href="#/explore" title="전체 보기" />}
      <Divider />
      <ListRow href="#/stories" left={<IconCircle name="Heart" />} title={`집에 돌아온 아이들 ${reunited}마리`} description="함께 찾아서 다시 만났어요" />
      <RegionSheet open={sheet} value={region} onSelect={setPicked} onClose={close} />
    </div>
  );
}
```

`src/screens/screens.module.css` 끝에 추가:

```css
.owner { display: flex; gap: 16px; margin: 8px var(--gutter) 12px; padding: 20px; border-radius: 16px; background: var(--grey-50); }
.ownerBody { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.ownerTitle { margin: 0; font-size: var(--t4); line-height: var(--t4-lh); font-weight: 700; color: var(--grey-900); letter-spacing: -0.01em; }
.ownerDesc { margin: 0 0 12px; font-size: var(--t6); line-height: var(--t6-lh); color: var(--grey-600); }
```

`src/app/App.jsx`: `import Home from "../screens/Home.jsx";` 후 `SCREENS`에 `"/": Home` 추가.

- [ ] **Step 6: Update tests that used the old home**

`tests/v2-browser.spec.js` "mascot, readable responsive home…" 테스트 본문을 교체(이름은 `"home list, explore search and no horizontal overflow"`로 변경):

```js
  await expect(page.locator("[data-dog-row]").first()).toBeVisible();
  await page.goto("/#/explore");
  await page.locator("#dog-search").fill("초코");
  await expect(page.locator("[data-dog-row]")).toHaveCount(1);
  await page.locator("#dog-search").fill("없는강아지XYZ");
  await expect(page.getByText("조건에 맞는 강아지가 없어요")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
```

(`/explore`는 Task 5 전까지 레거시라 `[data-dog-row]`·새 빈 상태 문구가 없어 이 테스트는 **Task 5에서 통과**한다. Task 4에서는 `test.fixme`로 표시하고 Task 5 Step 6에서 해제.)

"account registration, three-step report and personalized owner home" 테스트 끝:

```js
  await page.goto("/#/");
  await expect(page.getByRole("heading", { name: new RegExp(`^${name}`) })).toBeVisible();
  await expect(page.getByRole("button", { name: /강아지를 잃어버렸어요/ })).toHaveCount(0);
```

- [ ] **Step 7: Run tests**

Run: `npm test && npm run build && npm run test:browser`
Expected: 전부 pass(1 skip, 1 fixme).

- [ ] **Step 8: Commit**

```bash
git add src tests
git commit -m "feat(home): list-first home with owner card and region bottom sheet"
```

---

### Task 5: 찾기 (필터 시트, 지도 보기)

**Files:**
- Create: `src/screens/Explore.jsx`
- Modify: `src/screens/screens.module.css`, `src/app/App.jsx`, `tests/v2-browser.spec.js`, `tests/shell.spec.js`
- Test: `tests/shell.spec.js`

**Interfaces:**
- Consumes: `filterDogs`, `COORDS`, `escapeHTML` (from `src/domain.js`), `baseMap(el, center, zoom)`, `marker(map, coords, label)` (from `src/maps.js`), `OptionSheet`, `RegionSheet`, `BottomSheet`, 부품.
- Produces: 없음(화면).

- [ ] **Step 1: Write the failing test** — append to `tests/shell.spec.js`

```js
test("explore filters with easy-to-answer sheets and pages 20 at a time", async ({ page }) => {
  await ready(page, "/#/explore");
  await expect(page.getByRole("heading", { name: "찾기" })).toBeVisible();
  const total = await page.locator("[data-dog-row]").count();
  expect(total).toBeGreaterThan(0);
  expect(total).toBeLessThanOrEqual(20);
  await page.getByRole("button", { name: "필터" }).click();
  const sheet = page.getByRole("dialog", { name: "필터" });
  await sheet.getByRole("button", { name: "소형" }).click();
  await sheet.getByRole("button", { name: /마리 보기$/ }).click();
  await expect(page.getByRole("button", { name: "필터 1" })).toBeVisible();
  for (const row of await page.locator("[data-dog-row]").all()) await expect(row).toBeVisible();
  await page.getByRole("button", { name: "지도로 보기" }).click();
  await expect(page.locator(".leaflet-container")).toBeVisible();
  await page.getByRole("button", { name: "목록으로 보기" }).click();
  await expect(page.locator(".leaflet-container")).toHaveCount(0);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run build && npm run test:browser -- tests/shell.spec.js`
Expected: FAIL (heading "찾기" not found)

- [ ] **Step 3: Explore screen**

`src/screens/screens.module.css` 끝에 추가:

```css
.sticky { position: sticky; top: var(--top-h); z-index: 400; background: #fff; padding: 0 var(--gutter) 8px; }
.search { display: flex; align-items: center; gap: 8px; min-height: 48px; padding: 0 14px;
  border-radius: var(--radius); background: var(--grey-100); color: var(--grey-500); }
.search input { flex: 1; min-width: 0; align-self: stretch; min-height: 48px; border: 0; background: none;
  outline: none; font-size: 1rem; color: var(--grey-900); }
.chips { display: flex; align-items: center; gap: 8px; margin-top: 8px; overflow-x: auto; }
.viewToggle { margin-left: auto; width: 44px; height: 44px; flex-shrink: 0; display: inline-flex;
  align-items: center; justify-content: center; border-radius: var(--radius); color: var(--grey-800); }
.map { position: relative; height: calc(100dvh - var(--top-h) - var(--nav-h) - 180px); min-height: 320px; }
.map > div:first-child { position: absolute; inset: 0; }
.mapPanel { position: absolute; left: 0; right: 0; bottom: 0; z-index: 450; background: #fff;
  border-radius: var(--sheet-radius) var(--sheet-radius) 0 0; box-shadow: 0 -4px 16px rgba(0,0,0,0.08);
  max-height: 60%; overflow: auto; }
.mapPanelToggle { width: 100%; min-height: 48px; font-size: var(--t6); font-weight: 600; color: var(--grey-800); }
```

`src/screens/Explore.jsx`:

```jsx
import { useState, useCallback, useEffect, useRef } from "react";
import { useStore } from "../app/useStore.js";
import { Top, Chip, Button, EmptyState } from "../ui/index.jsx";
import Icon from "../ui/Icon.jsx";
import BottomSheet from "../ui/BottomSheet.jsx";
import { DogRow, OptionSheet, RegionSheet } from "./shared.jsx";
import { filterDogs, COORDS, escapeHTML } from "../domain.js";
import { baseMap, marker } from "../maps.js";
import s from "./screens.module.css";
const EMPTY = { query: "", region: "전국", status: "all", color: "", size: "", accessory: "" };
const STATUS = [["all", "전체"], ["missing", "찾고 있어요"], ["reunited", "집에 돌아왔어요"]];
const FILTERS = [
  ["color", "털 색", ["흰색", "갈색", "검정색", "회색", "혼합"]],
  ["size", "크기", ["소형", "중형", "대형"]],
  ["accessory", "착용물", ["없음", "목줄", "하네스", "옷"]],
];
function FilterSheet({ open, value, countFor, onApply, onClose }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (open) setDraft(value); }, [open, value]);
  const toggle = (key, v) => setDraft((d) => ({ ...d, [key]: d[key] === v ? "" : v }));
  return (
    <BottomSheet open={open} title="필터" onClose={onClose}>
      {FILTERS.map(([key, label, values]) => (
        <div key={key}>
          <p className={s.optionLabel}>{label}</p>
          <div className={s.optionGrid}>
            {values.map((v) => (
              <button key={v} type="button" className={s.option} aria-pressed={draft[key] === v} onClick={() => toggle(key, v)}>{v}</button>
            ))}
          </div>
        </div>
      ))}
      <div className={s.sheetActions}>
        <Button variant="weak" onClick={() => setDraft((d) => ({ ...d, color: "", size: "", accessory: "" }))}>초기화</Button>
        <Button onClick={() => { onApply(draft); onClose(); }}>{countFor(draft)}마리 보기</Button>
      </div>
    </BottomSheet>
  );
}
function ExploreMap({ dogs }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const ids = dogs.map((d) => d.id).join();
  useEffect(() => {
    const map = baseMap(ref.current, dogs[0]?.coords || COORDS.서울, dogs.length > 1 ? 7 : 12);
    dogs.forEach((d) =>
      marker(map, d.coords, "♥").bindPopup(`<a href="#/dog/${d.id}"><b>${escapeHTML(d.name)}</b> · ${escapeHTML(d.breed)}<br>${escapeHTML(d.location)}</a>`),
    );
    return () => map.remove();
  }, [ids]);
  return (
    <div className={s.map}>
      <div ref={ref} aria-label="실종 강아지 지도" />
      <div className={s.mapPanel}>
        <button type="button" className={s.mapPanelToggle} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {dogs.length}마리 · {open ? "목록 접기" : "목록 펼치기"}
        </button>
        {open && dogs.map((d) => <DogRow key={d.id} dog={d} />)}
      </div>
    </div>
  );
}
export default function Explore() {
  const db = useStore();
  const [f, setF] = useState(EMPTY);
  const [sheet, setSheet] = useState(null);
  const [view, setView] = useState("list");
  const [limit, setLimit] = useState(20);
  const close = useCallback(() => setSheet(null), []);
  const set = (patch) => { setF((v) => ({ ...v, ...patch })); setLimit(20); };
  const dogs = filterDogs(db.dogs, f);
  const filterCount = [f.color, f.size, f.accessory].filter(Boolean).length;
  return (
    <div className={s.screen}>
      <Top title="찾기" />
      <div className={s.sticky}>
        <label className={s.search}>
          <Icon name="Search" size={20} />
          <input id="dog-search" type="search" value={f.query} onChange={(e) => set({ query: e.target.value })} placeholder="이름, 견종, 동네로 찾기" aria-label="강아지 검색" />
        </label>
        <div className={s.chips}>
          <Chip onClick={() => setSheet("region")} expanded={sheet === "region"}>{f.region}</Chip>
          <Chip onClick={() => setSheet("status")} expanded={sheet === "status"}>{STATUS.find(([v]) => v === f.status)[1]}</Chip>
          <Chip icon="SlidersHorizontal" onClick={() => setSheet("filters")} expanded={sheet === "filters"}>{filterCount ? `필터 ${filterCount}` : "필터"}</Chip>
          <button type="button" className={s.viewToggle} onClick={() => setView((v) => (v === "list" ? "map" : "list"))} aria-label={view === "list" ? "지도로 보기" : "목록으로 보기"}>
            <Icon name={view === "list" ? "Map" : "List"} />
          </button>
        </div>
      </div>
      {!dogs.length ? (
        <EmptyState title="조건에 맞는 강아지가 없어요" description="검색어나 필터를 바꿔보세요" action={<Button variant="weak" onClick={() => set(EMPTY)}>필터 초기화</Button>} />
      ) : view === "map" ? (
        <ExploreMap dogs={dogs} />
      ) : (
        <>
          {dogs.slice(0, limit).map((d) => <DogRow key={d.id} dog={d} size={72} />)}
          {dogs.length > limit && (
            <div className={s.more}><Button variant="weak" full onClick={() => setLimit((l) => l + 20)}>더 보기</Button></div>
          )}
        </>
      )}
      <RegionSheet open={sheet === "region"} value={f.region} onSelect={(region) => set({ region })} onClose={close} />
      <OptionSheet open={sheet === "status"} title="상태" options={STATUS} value={f.status} onSelect={(status) => set({ status })} onClose={close} />
      <FilterSheet open={sheet === "filters"} value={f} countFor={(d) => filterDogs(db.dogs, { ...f, ...d }).length} onApply={set} onClose={close} />
    </div>
  );
}
```

`src/app/App.jsx`: `import Explore from "../screens/Explore.jsx";`, `SCREENS`에 `"/explore": Explore` 추가.

- [ ] **Step 4: Run the new test**

Run: `npm run build && npm run test:browser -- tests/shell.spec.js`
Expected: PASS

- [ ] **Step 5: Un-fixme the home/explore test**

Task 4 Step 6에서 `test.fixme`로 둔 `"home list, explore search and no horizontal overflow"`를 `test`로 되돌린다.

- [ ] **Step 6: Run all tests**

Run: `npm test && npm run build && npm run test:browser`
Expected: 전부 pass(1 skip).

- [ ] **Step 7: Commit**

```bash
git add src tests
git commit -m "feat(explore): search with filter sheets, paging and map panel"
```

---

### Task 6: 목격 소식

**Files:**
- Create: `src/screens/Sightings.jsx`
- Modify: `src/app/App.jsx`, `tests/shell.spec.js`
- Test: `tests/shell.spec.js`

**Interfaces:**
- Consumes: `relativeTime`, `dayGroup`, `headingLabel`, `BottomCTA`, `RegionSheet`, 부품.

- [ ] **Step 1: Write the failing test** — append to `tests/shell.spec.js`

```js
test("sightings are grouped by day, paged, and have one thumb-reach action", async ({ page }) => {
  await ready(page, "/#/sightings");
  await expect(page.getByRole("heading", { name: "목격 소식" })).toBeVisible();
  const rows = page.locator("[data-sighting-row]");
  expect(await rows.count()).toBeGreaterThan(0);
  expect(await rows.count()).toBeLessThanOrEqual(20);
  const groups = await page.getByRole("main").getByRole("heading", { level: 2 }).allInnerTexts();
  for (const g of groups) expect(["오늘", "어제", "이번 주", "이전"]).toContain(g);
  await expect(page.getByRole("button", { name: "강아지를 봤어요" })).toBeVisible();
  await rows.first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run build && npm run test:browser -- tests/shell.spec.js`
Expected: FAIL

- [ ] **Step 3: Sightings screen**

`src/screens/Sightings.jsx`:

```jsx
import { useState, useCallback } from "react";
import { useStore } from "../app/useStore.js";
import { Top, ListHeader, ListRow, Chip, Badge, Button, BottomCTA, IconCircle, EmptyState, SkeletonRows } from "../ui/index.jsx";
import { RegionSheet } from "./shared.jsx";
import { headingLabel } from "../domain.js";
import { relativeTime, dayGroup } from "../format.js";
import s from "./screens.module.css";
const KIND_ICON = { 목격: "MapPin", "보호 중": "HouseHeart", "기관 인계": "Building2" };
const movement = (r) => (r.stationary ? "머물러 있었어요" : r.heading == null ? "방향 정보 없음" : `${headingLabel(r.heading)}으로 이동`);
export default function Sightings() {
  const db = useStore();
  const [region, setRegion] = useState("전국");
  const [sheet, setSheet] = useState(false);
  const [limit, setLimit] = useState(20);
  const close = useCallback(() => setSheet(false), []);
  const regionOf = (r) => r.region || db.dogs.find((d) => d.id === r.dogId)?.region;
  const reports = db.reports
    .filter((r) => region === "전국" || regionOf(r) === region)
    .sort((a, b) => new Date(b.time) - new Date(a.time));
  const groups = [];
  for (const r of reports.slice(0, limit)) {
    const label = dayGroup(r.time);
    if (groups.at(-1)?.[0] !== label) groups.push([label, []]);
    groups.at(-1)[1].push(r);
  }
  const dogName = (r) => db.dogs.find((d) => d.id === r.dogId)?.name;
  return (
    <div className={`${s.screen} ${s.withCta}`}>
      <Top title="목격 소식" right={<Chip onClick={() => setSheet(true)} expanded={sheet}>{region}</Chip>} />
      {db.connection === "loading" ? (
        <SkeletonRows />
      ) : reports.length ? (
        groups.map(([label, items]) => (
          <section key={label}>
            <ListHeader title={label} />
            {items.map((r) => (
              <ListRow
                key={r.id}
                as="button"
                data-action="report-detail"
                data-id={r.id}
                data-sighting-row=""
                left={<IconCircle name={KIND_ICON[r.kind] || "MapPin"} />}
                title={r.location}
                description={`${relativeTime(r.time)} · ${movement(r)}`}
                right={dogName(r) ? <Badge>{dogName(r)}</Badge> : r.demo ? <Badge>예시</Badge> : undefined}
              />
            ))}
          </section>
        ))
      ) : (
        <EmptyState image="/assets/mascot-search.webp" title="아직 목격 소식이 없어요" description="주변에서 본 강아지를 알려주세요" />
      )}
      {reports.length > limit && (
        <div className={s.more}><Button variant="weak" full onClick={() => setLimit((l) => l + 20)}>더 보기</Button></div>
      )}
      <BottomCTA data-action="sighting">강아지를 봤어요</BottomCTA>
      <RegionSheet open={sheet} value={region} onSelect={setRegion} onClose={close} />
    </div>
  );
}
```

(`BottomCTA`는 `main` 안에 있는 유일한 fill 버튼이다. 목록 줄이 `button`이고 오른쪽 배지는 `span`이라 버튼 안 버튼이 생기지 않는다.)

`src/app/App.jsx`: `import Sightings from "../screens/Sightings.jsx";`, `SCREENS`에 `"/sightings": Sightings` 추가.

- [ ] **Step 4: Run all tests**

Run: `npm test && npm run build && npm run test:browser`
Expected: 전부 pass(1 skip).

- [ ] **Step 5: Commit**

```bash
git add src tests
git commit -m "feat(sightings): day-grouped sightings with fixed report action"
```

---

### Task 7: 원칙 자동 검사 + 레거시 정리 + 최종 캡처

**Files:**
- Create: `tests/design-rules.spec.js`, `docs/REDESIGN-PHONE-CHECK.md`
- Modify: `playwright.config.js`, `src/main.js`, `docs/superpowers/specs/2026-09-29-toss-redesign-phase1-design.md` (CSS 삭제 시점 명시)

**Interfaces:**
- Consumes: 모든 화면, `tests/helpers.js`.

- [ ] **Step 1: Write the design-rule tests** — `tests/design-rules.spec.js`

```js
import { test, expect } from "@playwright/test";
import { ready, registerByApi } from "./helpers.js";
const SCREENS = ["/", "/explore", "/sightings", "/my", "/my/settings"];
async function audit(page) {
  return page.evaluate(() => {
    const visible = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden"; };
    const small = [...document.querySelectorAll("#app a, #app button, #app input, #app select")]
      .filter((el) => visible(el) && !el.closest(".leaflet-container"))
      .filter((el) => { const r = el.getBoundingClientRect(); return r.width < 44 || r.height < 44; })
      .map((el) => `${el.tagName} ${(el.getAttribute("aria-label") || el.textContent).trim().slice(0, 20)}`);
    const tiny = [...document.querySelectorAll("#app *")]
      .filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && visible(el) && !el.closest(".leaflet-container"))
      .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 13)
      .map((el) => el.textContent.trim().slice(0, 20));
    const fills = [...document.querySelectorAll('main [data-variant="fill"]')].filter(visible).length;
    return { small, tiny, fills, overflow: document.documentElement.scrollWidth > innerWidth };
  });
}
test("toss rules hold on every redesigned screen (guest and member)", async ({ page }) => {
  await ready(page);
  for (const pass of ["guest", "member"]) {
    if (pass === "member") await registerByApi(page);
    for (const route of SCREENS) {
      await page.goto(`/#${route}`);
      await expect(page.getByRole("main")).toBeVisible();
      const r = await audit(page);
      expect(r.fills, `${pass} ${route} coral buttons`).toBeLessThanOrEqual(1);
      expect(r.small, `${pass} ${route} small targets`).toEqual([]);
      expect(r.tiny, `${pass} ${route} tiny text`).toEqual([]);
      expect(r.overflow, `${pass} ${route} overflow`).toBe(false);
    }
  }
});
test("logout lives in settings, not on my home", async ({ page }) => {
  await ready(page);
  await registerByApi(page);
  await page.goto("/#/my");
  await expect(page.getByRole("button", { name: "로그아웃" })).toHaveCount(0);
  await page.goto("/#/my/settings");
  await expect(page.getByRole("button", { name: "로그아웃" })).toBeVisible();
});
test("legacy pages still render inside the React frame", async ({ page }) => {
  for (const [path, check] of [
    ["/#/dog/demo-bori", () => page.getByRole("heading", { name: /보리/ }).first()],
    ["/#/stories", () => page.getByRole("button", { name: "우리의 재회 이야기 쓰기" })],
    ["/#/account/forgot", () => page.locator("#legacy-root input").first()],
  ]) {
    await ready(page, path);
    await expect(check()).toBeVisible();
    await expect(page.getByRole("navigation", { name: "하단 메뉴" })).toBeVisible();
  }
});
test("desktop shows redesigned screens in a centered 480px column", async ({ page }, info) => {
  test.skip(info.project.name !== "desktop", "Desktop-only layout");
  await ready(page, "/#/my");
  expect(Math.round((await page.locator("#app").boundingBox()).width)).toBe(480);
});
```

`playwright.config.js` testMatch에 `"design-rules.spec.js"` 추가.

- [ ] **Step 2: Run and fix violations**

Run: `npm run build && npm run test:browser -- tests/design-rules.spec.js`
Expected: PASS. 실패 시 메시지(`small targets`, `tiny text` 목록)에 나온 요소의 스타일만 `ui.module.css`/`screens.module.css`/`Frame.module.css`에서 고친다(예: 크기 44px, 글자 `var(--t7)` 이상). 규칙을 완화하지 않는다.

- [ ] **Step 3: Delete migrated legacy functions**

`src/main.js`에서 삭제: `header`, `footer`, `hero`, `actionCards`, `dogCard`, `filterBar`, `explorer`, `resultsHTML`, `renderResults`, `initExploreMap`, `communityBanner`, `sightings`, `myHome`, `dashboard`, `regionModal`. 
`render()`의 경로 분기를 다음으로 교체:

```js
  if (p.startsWith("/dog/"))
    body = detail(read().dogs.find((d) => d.id === p.split("/")[2]));
  else if (p === "/stories") body = stories();
  else if (p === "/admin") body = admin();
  else if (p.startsWith("/account/")) body = accountPage(p);
  else
    body = empty(
      "페이지를 찾을 수 없어요",
      "홈으로 돌아가 다시 시작해주세요.",
      '<a class="button primary" href="#/">홈으로</a>',
    );
```

`render()`의 `initExploreMap();` 호출 삭제. 클릭 처리기에서 `region`, `select-region`, `filters`, `clear-filters`, `view`, `status` 분기 삭제. `document.addEventListener("input", …)`의 `dog-search` 처리와 `document.addEventListener("change", …)`의 `data-filter` 처리 삭제. `decorateSession()`에서 `/my` account-panel 삽입 블록과 `returning-hero` 처리 삭제. `state` 객체에서 쓰이지 않는 필드(`query`, `color`, `size`, `accessory`, `status`, `view`, `showFilters`, `tab`) 삭제 — 삭제 후 `grep -n "state\." src/main.js`로 남은 사용처가 `state.region`뿐인지 확인하고, 없으면 `state` 자체를 삭제. 사용하지 않게 된 lucide import(`LayoutGrid`, `SlidersHorizontal` 등)는 `refreshIcons`에서 남은 `icon("…")` 호출을 grep해 정리.

- [ ] **Step 4: Clarify spec on CSS removal**

스펙 7장 7번 "옮긴 화면의 레거시 함수·CSS 제거"를 "옮긴 화면의 레거시 함수 제거 (옛 CSS 파일 삭제는 2단계 끝에 일괄)"로 수정 — 0장 2단계 범위와 일치시킴.

- [ ] **Step 5: Run everything**

Run: `npm test && npm run build && npm run test:browser`
Expected: node 27 pass, 브라우저 전부 pass(skip: 모바일 전용 1 + 데스크톱 전용 1).

- [ ] **Step 6: Final capture and phone checklist**

Run: `node scripts/capture-redesign.mjs`
`docs/REDESIGN-PHONE-CHECK.md`:

```markdown
# 1단계 재설계 폰 확인

미리보기 배포 주소를 폰(Chrome·Safari)에서 열고 확인한다. 기종·OS와 실패 재현 순서만 기록한다.

| 항목 | 확인 방법 | 결과 |
|---|---|---|
| 홈 | 첫 화면에 실종견 목록이 보이는지, 지역 바꾸기 시트가 아래에서 올라오고 끌어내려 닫히는지 | |
| 신고 | 하단 "+ 신고" → 로그인 없이 작성 → 등록 시 로그인 요청 → 작성 내용 유지 | |
| 찾기 | 검색 입력 시 키보드가 목록을 가리지 않는지, 필터 시트, 지도 보기 전환 | |
| 목격 소식 | 날짜 묶음, 하단 "강아지를 봤어요" 버튼이 하단 메뉴와 겹치지 않는지 | |
| 마이홈 | 내 신고가 맨 위, ⚙ → 설정 → 로그아웃 | |
| 글자 크게 | 폰 설정에서 글자 크기를 키웠을 때 잘림·겹침이 없는지 | |
| 레거시 화면 | 강아지 상세·재회 이야기·비밀번호 찾기가 새 상단 바·하단 메뉴 안에서 열리는지 | |
```

- [ ] **Step 7: Commit**

```bash
git add src tests playwright.config.js docs artifacts/redesign
git commit -m "test(design): enforce toss rules; remove migrated legacy screens"
```
