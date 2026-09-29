# 2-4 계정 · 알림 · 관심 지역 · 재회 — 설계 기록

- 작성일: 2026-09-29 · 상태: 구현 완료

## React로 옮긴 것

| 기능 | 여는 방법 | 파일 |
|---|---|---|
| 로그인·회원가입 | `data-action="account"`(로그인 안 한 경우), 신고 등록 시 `accountForm(after)` | `src/screens/sheets/AuthSheet.jsx` |
| 알림함 | 상단 알림 종 `notifications` | `NotificationsSheet.jsx` (열면 모두 읽음) |
| 관심 지역 | `areas`, 알림함의 "관심 지역 고르기" | `AreasSheet.jsx` (여러 곳 선택) |
| 찾았어요 확인 | `reunite` | `ReuniteSheet.jsx` |
| 계정 페이지 | `#/account/verify?token=` · `reset?token=` · `forgot` | `src/screens/AccountPage.jsx` (토큰은 메모리에만, 주소에서 즉시 제거) |

- 공통 열기 장치: `src/app/sheets.js`의 `openSheet(name, props)` → `App`이 그린다. 주소가 바뀌면 닫힌다.
- 로그인한 사람의 `account` 동작은 설정 화면(`#/my/settings`)으로 이동한다. 옛 "내 계정" 팝업은 삭제(기능은 설정에 모두 있음).
- 화면 부품은 주소별로 새로 만든다(`key`), 인증 화면 상태가 비밀번호 찾기 화면에 남던 문제 방지.

## 옛 팝업 유지(2-1 시트 스타일 적용)

공유, QR 전단, 수색 상황 남기기, 문제 신고, 서비스·개인정보·보호소 안내, 기기 확인, 홈 화면 추가, 계정 삭제 — 사용 빈도가 낮아 Minimum Features 원칙으로 유지.

## 삭제

`accountForm`(옛 본문), `areaModal`, `notifications`, `reunite`, `notification-open` 동작, `src/account-ui.js`.
