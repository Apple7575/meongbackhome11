# 2-1 옛 팝업을 아래 시트로 — 설계

- 작성일: 2026-09-29 · 상태: 사용자 승인(대화)
- 상위: `2026-09-29-toss-redesign-phase1-design.md`의 2단계를 5개 묶음으로 나눈 첫 번째(2-1 시트 → 2-2 상세·타임라인·대화 → 2-3 폼 → 2-4 계정·알림 → 2-5 재회·운영·옛 CSS 삭제)

## 목표

`openModal()`(`src/main.js`)로 여는 옛 팝업 21개를 폰에서는 아래에서 올라오는 시트로, 데스크톱에서는 가운데 창으로 바꾸고, 팝업 안에 1단계 토큰(색·글자·크기)을 적용한다. 팝업의 구조·문구·동작은 바꾸지 않는다(구조는 2-2~2-4에서 React로 재설계).

## 방식

- 새 파일 `src/ui/legacy-sheet.css`: 모든 선택자를 `#modal-root` 아래로 한정. `src/app/main.jsx`에서 `tokens.css` 다음에 import.
- `openModal()`: 시트 맨 위에 손잡이(`.sheet-handle`, `aria-hidden`) 추가, 손잡이를 60px 이상 끌어내리면 `closeModal()`.
- 2-5에서 옛 CSS와 함께 이 파일을 삭제.

## 모양

| 항목 | 폰(≤600px) | 데스크톱(>600px) |
|---|---|---|
| 위치 | 화면 아래에 붙음, 폭 100% | 화면 가운데, 폭 480px(넓은 창 `.modal.wide` 640px) |
| 모서리 | 위 20px | 전체 20px |
| 높이 | 최대 90dvh, 내용만 스크롤 | 최대 85vh |
| 손잡이 | 보임(40×4px 회색 300, 영역 높이 24px) | 숨김 |
| 아래 여백 | `env(safe-area-inset-bottom)` 포함 | — |

- 닫기: 배경 누르기·Esc·닫기(X) 버튼(기존) + 손잡이 끌어내리기(폰).
- 배경: 검정 40%.

## 팝업 안 규칙

- 제목(`.modal-header h2`) t4(20px) 700, 회색 900. 헤더 구분선 없음.
- 본문 글자 Pretendard, 기본 t6(15px), 안내(`.modal-intro`, `.field-hint`, `.local-notice`) t7~t6 회색 600.
- 버튼: `.button` 높이 48px·둥글기 12px·t5 600, `.button.primary` 코랄 채움, `.button.white` 회색 100 바탕·회색 800 글자·테두리 없음, `.button.full` 높이 56px, `.text-button` 최소 높이 44px.
- 입력: `input, select, textarea` 회색 100 바탕, 테두리 없음, 둥글기 12px, 최소 높이 48px, 글자 16px(1rem). 포커스 시 코랄 2px 테두리.
- 필드 라벨(`.field > span`) t6 600 회색 800.
- 단계형 폼: 진행 표시 현재 단계 코랄, 완료 단계 회색 900. `.wizard-next`는 primary 규칙.
- 오류(`.form-error`) 빨강 `#F04452` t6.
- 팝업 안 버튼 개수·배치는 변경하지 않음.

## 테스트

- 기존 브라우저 테스트 전부 통과.
- `tests/legacy-sheet.spec.js`
  - 모바일: 로그인 팝업이 화면 아래에 붙음(시트 bottom == viewport 높이, 오차 1px), 손잡이 60px 이상 끌어내리면 닫힘.
  - 모바일: 팝업 안 보이는 버튼·입력 44px 이상, 입력 글자 16px 이상.
  - 데스크톱: 로그인 팝업 폭 480px, 가로 가운데.

## 배포

미리보기 배포 → 사용자 확인 → 승인 후 `vercel --prod`.
