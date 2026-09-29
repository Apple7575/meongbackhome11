# 2-6 TypeScript 전환 — 설계

- 작성일: 2026-09-29 · 상태: 사용자 요청("2-6 이어서 해")에 따라 진행

## 범위

- `.ts`/`.tsx`로 전환: `src/app/**`, `src/ui/**`, `src/screens/**`, `src/format`, `src/photo` (1·2단계에서 새로 만든 코드 전부).
- JavaScript 유지: `src/main.js`(옛 팝업), `client-store.js`, `domain.js`, `maps.js`, `wizard.js`, `webapp.js`, `seed.js`, `examples.js`, `store.js`, `server/**`, `tests/**`. `allowJs`로 함께 빌드하고 검사는 하지 않는다(`checkJs: false`).

## 설정

- `typescript`, `@types/react`, `@types/react-dom` 개발 의존성.
- `tsconfig.json`: `strict`, `noEmit`, `jsx: react-jsx`, `moduleResolution: bundler`, `allowImportingTsExtensions`, `allowJs`, `types: ["vite/client"]`(CSS Modules·자산 타입).
- import는 확장자를 명시(`./format.ts`). Node 24가 `.ts`를 바로 실행하므로 단위 테스트가 그대로 동작하고, Vite도 JS 파일에서의 `.ts` import를 처리한다.
- `npm run typecheck` = `tsc --noEmit`, `npm test`가 타입 검사 후 단위 테스트를 실행.

## 타입

- `src/types.ts`: `Dog`, `Report`, `Notice`, `Profile`, `Story`, `Update`, `Moderation`, `User`, `Store`(= `read()`가 돌려주는 모양), `Coords`.
- `useStore()`는 `Store`를 돌려준다. JS 모듈(`client-store.js` 등)은 `src/legacy.d.ts`에 필요한 함수 시그니처만 선언한다.
- 공통 부품은 props 인터페이스를 export한다.

## 완료 기준

`npm run typecheck` 오류 0, `npm test`·`npm run build`·`npm run test:browser` 전부 통과, 동작 변화 없음.
