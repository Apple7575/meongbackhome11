# 3-1 옛 코드 완전 제거 — 기록

- 작성일: 2026-09-29 · 상태: 구현 완료

## 한 일

- 남은 옛 팝업 8종을 React 시트로 옮김: 공유(`ShareSheet`), QR 전단(`PosterSheet`), 수색 상황·문제 신고(`TextSheets`), 서비스·개인정보·보호소·설치 안내(`InfoSheet`), 기기 확인·계정 삭제·신고 완료 안내(`AccountSheets`).
- 전역 처리를 TypeScript 모듈로: 버튼 `data-action` 처리(`src/app/dispatch.ts`), 시작 처리(`boot.ts`: 데이터 불러오기·재연결 새로고침·서비스 워커·본문 바로가기), 설치 제안(`install.ts`), 알림 메시지(`toast.ts`), 임시 저장(`src/drafts.ts`), 연결 배너(`ConnectionBanner.tsx`).
- 삭제: `src/main.js`, `webapp.js`, `wizard.js`, `store.js`, `legacy.css`, `ui/legacy-sheet.css`, `index.html`의 `#modal-root`, 옛 팝업 테스트.
- `legacy.css`에서 아직 필요한 기본 규칙(초기화·포커스·지도 핀·본문 바로가기·알림 메시지·저장 중 표시)만 `src/ui/base.css`로 옮김.

## 남은 JavaScript

`client-store.js`(서버 동기화), `domain.js`, `maps.js`(Leaflet), `seed.js`, `examples.js` — 새 코드는 `.d.ts` 선언으로 사용.
