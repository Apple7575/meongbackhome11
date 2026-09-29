# 2-2 강아지 상세 · 목격 기록 · 제보 상세/대화 — 설계와 계획

- 작성일: 2026-09-29 · 상태: 사용자가 "2단계 끝까지 이어서 개발" 요청 → 설계 결정은 1단계 원칙에 따라 구현자가 내림
- 상위: `2026-09-29-toss-redesign-phase1-design.md`, `2026-09-29-redesign-2-1-sheets-design.md`

## 화면 `#/dog/:id` (React `src/screens/DogDetail.jsx`)

위에서부터:
1. 상단 바: 뒤로(이전 기록이 있으면 `history.back()`, 없으면 `#/explore`) + 알림 종.
2. 사진(가로 100%, 4:3, 둥글기 없음), 사진 위 왼쪽 아래 `DogBadge`.
3. `Top`: 제목 이름, 설명 "견종 · 나이 · 성별".
4. 예시 신고면 회색 안내 한 줄 "체험용 예시 신고예요. 실제 실종 신고가 아니에요."
5. 보조 동작 줄(연한 버튼 4개, 한 줄 균등): 공유(`share`), 저장/저장됨(`save`, `aria-pressed`), QR 전단(`poster`), 문제 신고(`flag`). 보호자면 그 아래 연한 버튼 "수정"(`edit-dog`)·"찾았어요"(`reunite`, 찾는 중일 때).
6. 정보 목록 줄(비상호작용): 마지막으로 본 곳 / 실종 시간 / 특징(털 색·크기·착용물). 설명 문단.
7. 예시 프로필(`exampleProfile`)이 있으면 목록 제목 "알아보는 단서" + 줄 3개(구별되는 특징·평소 행동·확인 중인 구역). 옛 수치 카드(접수 수·거리 등)는 제거 — Minimum Features.
8. 목록 제목 "목격 기록 N" + 오른쪽 연한 작은 버튼 "순서대로 보기"(2개 이상일 때). 지도(높이 240px, `baseMap` + `drawTimeline`) + 안내 "점선은 목격 순서예요. 실제 이동 경로가 아니에요." + 시간순 목록 줄(왼쪽 번호 원, 제목 장소, 설명 "시각 · 이동", 오른쪽 상태 배지). 줄을 누르면 제보 시트. 재생 중이면 1.5초마다 다음 핀 강조, 강조된 줄은 `aria-current="true"`. 지도 핀을 누르면 해당 줄 강조.
   - 목격이 없으면 한 줄 "아직 목격 제보가 없어요. 첫 단서를 기다리고 있어요."
9. 목록 제목 "수색 상황" + 업데이트 줄들(없으면 "아직 공유된 수색 상황이 없어요"), 보호자면 연한 버튼 "수색 상황 남기기"(`update`).
10. 목록 제목 "함께 확인할 제보"(`matchCandidates` 상위 3) + 목록 줄 "보호소 공고도 확인해 보세요"(`public-data`).
11. `BottomCTA` "이 아이를 봤어요"(`sighting`, `data-id`) — 찾는 중일 때만. 집에 돌아왔으면 없음.
- 없는 id: `EmptyState` "신고를 찾을 수 없어요" + 연한 버튼 링크 "목록으로".

## 제보 시트 (React `src/screens/ReportSheet.jsx`, `BottomSheet` 사용)

- 여는 방법: 기존 `data-action="report-detail" data-id` 클릭 → `main.js`가 `window` 이벤트 `open-report`(detail=id)를 보냄 → `App`이 시트를 연다. 경로가 바뀌면 닫는다.
- 내용: 예시 안내 · 사진 · 종류 배지 · 제목 장소 · "시각 · 이동" · 설명.
- 보호자 확인(`canManage`만): 목록 제목 "보호자 확인" + 선택형 버튼 4개(`REPORT_STATUSES`, `aria-pressed`). 아니면 현재 상태 배지만.
- 연결: 강아지가 있으면 목록 줄 "{이름}의 신고 보기"(링크). 없고 내가 찾는 중인 신고가 있고 예시가 아니면 "내 신고에 연결" + 신고별 연한 버튼.
- 대화: `canChat`이면 말풍선(`data-chat-bubble`) + 입력 폼(`#message-form`, 입력 `name=message`, 보내기 버튼 aria-label "메시지 보내기"). 예시 대화면 안내 + 예시 말풍선. 아니면 "보호자와 이 제보를 작성한 이웃만 대화할 수 있어요."
- 저장: 값을 바꾼 뒤 `commit()`(아래) → 실패 시 알림 메시지.

## 공통 변경

- `src/app/actions.js`: `export async function commit()` = `save()` 후 `window` 이벤트 `store-updated`. 저장 중 `body.is-saving`.
- `src/main.js`: `render()`가 React 화면(`app` 없음)일 때도 `legacy-render` 이벤트를 보내 React가 갱신되게 함. `toast` export. `report-detail` 분기 → `open-report` 이벤트. `detail()`·타임라인 초기화 블록 삭제, `timeline.js`·`example-detail.js` 삭제.
- `src/app/App.jsx`: 경로 → 화면 해석을 `resolveScreen(route)`로(정확히 일치 + `/dog/:id`). `TopBar`: `/dog/*`에서 뒤로 버튼.

## 테스트

- 기존 "timeline swipes…" 테스트를 "detail lists sightings in time order and plays them on the map"으로 교체: `/dog/demo-bori`에서 `[data-sighting-step]` ≥ 3, `.direction-icon` ≥ 3, "순서대로 보기" 후 `.selected-pin b`가 "3"이 됨.
- 두 브라우저 테스트: `.sighting-slide`→`[data-sighting-step]`, `.open-sighting`→첫 `[data-sighting-step]`, `.chat-bubble`→`[data-chat-bubble]`, 목격자 `#report-status` 비활성 → 목격자 시트에 "관련 목격" 버튼 없음, `.detail-image>.badge` → 본문의 "집에 돌아왔어요".
- `design-rules.spec.js`: 감사 대상에 `/dog/demo-bori` 추가.
- 새 테스트: 저장 버튼을 누르면 `aria-pressed`가 바뀌고 마이홈 "저장한 소식"에 나타남(React 갱신 확인).

## 작업 순서

1. `actions.js`·`render()` 갱신 신호·`toast` export·`resolveScreen` → 기존 테스트 통과 → 커밋.
2. `ReportSheet` + `open-report` 연결 → 목격 소식 화면에서 시트 열림 테스트 → 커밋.
3. `DogDetail` + 테스트 교체 + 레거시 상세 삭제 → 전체 통과 → 캡처 → 커밋.
