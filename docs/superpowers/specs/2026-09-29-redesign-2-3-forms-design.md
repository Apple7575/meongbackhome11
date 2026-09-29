# 2-3 신고·목격 제보 폼 — 설계

- 작성일: 2026-09-29 · 상태: 사용자 "끝까지 이어서 개발" 요청에 따라 1단계 원칙으로 결정

## 흐름과 경로 (React 전체 화면, 하단 메뉴 숨김, 상단 바 왼쪽 닫기 X)

| 경로 | 용도 | 단계 |
|---|---|---|
| `#/report/new` | 새 실종 신고 | 사진 → 이름·견종 → 특징 → 언제 → 어디서 → 설명(선택) → 확인 |
| `#/report/from/:profileId` | 저장한 프로필로 신고 | 위와 같음(값 미리 채움) |
| `#/report/edit/:dogId` | 신고 수정 | 위와 같음(값 미리 채움, 제출 "수정 내용 저장") |
| `#/profile/new` | 우리 집 강아지 등록 | 사진 → 이름·견종 → 특징 → 설명(선택) → 확인 |
| `#/sighting/new`, `#/sighting/new/:dogId` | 목격 제보 | 어디서 → 언제·상황 → 방향 → 사진·특징(선택) → 확인 |

- 기존 `data-action`(`report`·`profile`·`edit-dog`·`sighting`)은 위 경로로 이동한다. 예시 신고 제한(`previewOnly`) 안내는 그대로.
- 단계 화면: 진행 막대(현재/전체) · 질문 제목(t2) · 한 줄 이유 설명 · 입력 · 하단 고정 두 버튼(이전=연한, 다음=코랄; 첫 단계는 다음만; 마지막은 제출).
- 닫기(X): 이전 화면으로(기록 없으면 홈). 작성 내용은 임시 저장에 남는다.

## 입력 방식 (Easy to Answer)

- 사진: 큰 올리기 영역(실제 `input[type=file][name=photo]`), 미리보기, 다시 고르기. 1000px JPEG로 줄임(`src/photo.js`로 분리해 옛 코드와 공유).
- 성별·털 색·크기·착용물·제보 종류·방향 모드: 선택 버튼(`aria-pressed`). 나이는 선택 입력.
- 시간: `input[type=datetime-local][name=time]` + 빠른 선택 "지금 / 1시간 전 / 3시간 전".
- 어디서: 지역 선택(`select[name=region]`) · 장소 입력(`name=location`) · 지도(`#location-picker` / `#sighting-picker`, 지점을 눌러 선택) · 현재 위치 버튼.
- 방향: "모르겠어요 / 이동했어요 / 머물러 있었어요". 이동했어요면 방향 슬라이더(`#heading-range`), 방향 글자(`#heading-label`), 휴대폰 나침반 버튼(기존 센서 로직).

## 검증

- 사진 필수(신고·프로필), 이름·견종 필수, 어디서 단계는 장소 글자와 지도 지점 필수, 시간은 미래 불가. 오류는 질문 아래 빨간 한 줄(`role=alert`).

## 저장

- 임시 저장: 기존 키·형식 유지(`meongback-draft-v2:` + `dog-new` / `dog-{id}` / `profile` / `sighting-{dogId|new}`), 값이 바뀔 때마다 저장, 다시 들어오면 복원, 제출 성공 시 삭제. `wizard.js`에 `saveDraft` 추가.
- 신고 제출: 로그인 안 했으면 기존 로그인 창(`accountForm`)을 열고 로그인 후 자동 재제출. 인증 필요 시 안내 오류. 성공 → 상세로 이동 + 기존 완료 안내 창(`registeredNext`).
- 프로필 제출 → 마이홈. 제보 제출 → 강아지 상세 또는 목격 소식.

## 테스트

- `tests/helpers.js`에 `fillReport(page, {name, breed, photo})`, `fillSighting(page, {place})` 추가, 기존 테스트가 이를 사용.
- 새 검사: 폼 흐름에서 하단 메뉴 숨김, 단계마다 코랄 버튼 1개, 모든 단계 44px·13px 규칙.
- 임시 저장 테스트: 장소·방향 입력 → 닫기 → 다시 열기 → 값 복원 → 제출 후 저장소 비움.

## 레거시 정리

`dogForm`, `sightingForm`, `locate`(React로 이동), `enhanceWizard` 삭제. 옛 폼 CSS는 2-5에서 삭제.
