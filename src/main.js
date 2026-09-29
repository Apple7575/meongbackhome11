import {exampleDetail} from './example-detail.js';
import {
  createIcons,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BellRing,
  Building2,
  Camera,
  ChevronDown,
  ChevronRight,
  Clock3,
  Compass,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Flag,
  Heart,
  House,
  House as HouseHeart,
  LayoutGrid,
  LocateFixed,
  Map,
  MapPin,
  MapPinned,
  MessagesSquare,
  Navigation,
  PawPrint,
  Plus,
  QrCode,
  Route,
  ScanEye,
  ScanSearch,
  Search,
  Send,
  Share2,
  SlidersHorizontal,
  Sprout,
  UserRound,
  X,
} from "lucide";
import QRCode from "qrcode";
import {
  REGIONS,
  COORDS,
  REPORT_STATUSES,
  escapeHTML as esc,
  filterDogs,
  chronologicalSightings,
  headingLabel,
  matchCandidates,
} from "./domain.js";
import {
  read,
  save,
  id,
  notify,
  initialize,
  refresh,
  authenticate,
  enablePush,
  api,
} from "./client-store.js";
import { enhanceWizard, loadDraft, clearDraft } from "./wizard.js";
import { timelineExperience } from "./timeline.js";
import { baseMap, marker, drawTimeline, directionPicker } from "./maps.js";
import "./style.css";

let app = null;
export function mountLegacy(el) {
  app = el;
  if (app) render();
}
const modalRoot = document.querySelector("#modal-root");
const state = {
  region: "전국",
  query: "",
  color: "",
  size: "",
  accessory: "",
  status: "all",
  view: "list",
  showFilters: false,
  tab: "missing",
};
let timelineCleanup = () => {},
  pendingRefresh = false;
let maps = [],
  modalCleanup = async () => {},
  previousFocus = null;
const icon = (name, cls = "") =>
  `<i data-lucide="${name}" class="${cls}" aria-hidden="true"></i>`;
const refreshIcons = () =>
  createIcons({
    icons: {
      ArrowRight,
      ArrowUpRight,
      Bell,
      BellRing,
      Building2,
      Camera,
      ChevronDown,
      ChevronRight,
      Clock3,
      Compass,
      Copy,
      Download,
      ExternalLink,
      Eye,
      Flag,
      Heart,
      House,
      HouseHeart,
      LayoutGrid,
      LocateFixed,
      Map,
      MapPin,
      MapPinned,
      MessagesSquare,
      Navigation,
      PawPrint,
      Plus,
      QrCode,
      Route,
      ScanEye,
      ScanSearch,
      Search,
      Send,
      Share2,
      SlidersHorizontal,
      Sprout,
      UserRound,
      X,
    },
    attrs: { "stroke-width": 1.7 },
  });
const formatTime = (t) =>
  new Date(t).toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const timeAgo = (t) => {
  const h = Math.max(0, Math.floor((Date.now() - new Date(t)) / 3600000));
  return h < 1
    ? "방금 전"
    : h < 24
      ? `${h}시간 전`
      : `${Math.floor(h / 24)}일 전`;
};
const localDate = () => {
  const d = new Date();
  return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const options = (arr, selected) =>
  arr
    .map(
      (x) => `<option ${x === selected ? "selected" : ""}>${esc(x)}</option>`,
    )
    .join("");
const route = () => location.hash.slice(1) || "/";
const persist = async () => {
  document.body.classList.add("is-saving");
  try {
    await save();
  } finally {
    document.body.classList.remove("is-saving");
  }
};
const badge = (d) =>
  `<span class="badge ${d.status === "reunited" ? "sage" : ""}">${d.status === "reunited" ? "재회 완료" : "가족을 찾고 있어요"}</span>`;
function toast(message) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("visible"), 3800);
}
function header() {
  const current = route();
  const count = read().notifications.filter((n) => !n.read).length;
  return `<header class="site-header"><div class="header-inner"><a class="brand" href="#/" aria-label="멍백홈 홈"><img src="/favicon.svg" alt=""/><span>멍백홈<span class="brand-dot">.</span></span></a><nav class="desktop-nav" aria-label="메인 메뉴"><a href="#/" class="${current === "/" ? "active" : ""}">홈</a><a href="#/explore" class="${current === "/explore" ? "active" : ""}">강아지 찾기</a><a href="#/sightings" class="${current === "/sightings" ? "active" : ""}">목격 소식</a><a href="#/stories" class="${current === "/stories" ? "active" : ""}">따뜻한 재회</a></nav><div class="header-actions"><button class="icon-button notification-button" data-action="notifications" aria-label="알림 ${count}개">${icon("bell")}${count ? '<span class="notification-dot"></span>' : ""}</button><a class="my-link" href="#/my">${icon("user-round")}<span>마이홈</span></a><button class="button primary small header-report" data-action="report">${icon("plus")}실종 신고</button></div></div></header>`;
}
function footer() {
  return `<footer class="site-footer"><div><a class="brand" href="#/"><img src="/favicon.svg" alt=""/><span>멍백홈<span class="brand-dot">.</span></span></a><p>모든 강아지가 다시, 따뜻한 집으로.</p></div><div class="footer-right"><button class="text-button" data-action="about">서비스 안내</button><button class="text-button" data-action="privacy">개인정보 안내</button><a href="#/admin">운영 화면</a><span>© ${new Date().getFullYear()} MEONGBACK HOME</span></div></footer><div class="demo-strip">${icon("sprout")} 작은 관심이 소중한 재회로 · 예시 표시가 있는 신고는 실제 실종 신고가 아니에요.</div><nav class="mobile-nav" aria-label="모바일 메뉴">${[
    ["/", "house", "홈"],
    ["/explore", "search", "찾기"],
    ["/sightings", "map-pin", "목격 소식"],
    ["/my", "user-round", "마이홈"],
  ]
    .map(
      ([p, i, t]) =>
        `<a href="#${p}" class="${route() === p ? "active" : ""}">${icon(i)}<span>${t}</span></a>`,
    )
    .map((html, n) =>
      n === 2
        ? `<button class="mobile-report" data-action="report" aria-label="실종 신고"><span class="mobile-report-icon">${icon("plus")}</span><span>신고</span></button>${html}`
        : html,
    )
    .join("")}</nav>`;
}
function hero() {
  return `<section class="hero"><div class="hero-copy"><span class="eyebrow"><span></span> 잃어버린 강아지를 함께 찾는 곳</span><h1>우리 강아지 찾기,<br>여기서 시작하세요<span class="coral">.</span></h1><p>잃어버렸다면 사진과 장소를 등록하세요.<br>발견했다면 어디서 봤는지 알려주세요.</p><div class="hero-buttons"><button class="button primary" data-action="report">${icon("search")}강아지를 잃어버렸어요</button><button class="button white" data-action="sighting">${icon("map-pin")}강아지를 발견했어요</button></div><div class="hero-note"><span class="tiny-paw">${icon("paw-print")}</span> 강아지 둘러보기와 발견 제보는 로그인 없이 가능해요.</div></div><div class="hero-art"><div class="hero-orbit"></div><span class="art-spark spark-one">✦</span><span class="art-spark spark-two">✧</span><img class="hero-dogs" src="/assets/mascot-home.webp" alt="코랄색 인식표를 한 멍백홈의 하얀 강아지" fetchpriority="high"/><div class="hero-sticker">${icon("heart")} 함께라서, 찾을 수 있어요</div></div></section>`;
}
function actionCards() {
  return `<section class="quick-actions" aria-label="함께 찾는 방법"><button class="quick-card peach" data-action="report"><span class="quick-icon">${icon("scan-search")}</span><span><span class="mini-label">혼자 걱정하지 마세요</span><strong>우리 아이를 찾고 있어요</strong><span class="quick-desc">사진과 마지막으로 본 장소를 알려주세요.</span></span><span class="quick-arrow">${icon("arrow-up-right")}</span></button><button class="quick-card mint" data-action="sighting"><span class="quick-icon">${icon("map-pinned")}</span><span><span class="mini-label">잠깐의 관심이 큰 도움이 돼요</span><strong>이 강아지를 보셨나요?</strong><span class="quick-desc">목격한 장소와 이동 방향을 남겨주세요.</span></span><span class="quick-arrow">${icon("arrow-up-right")}</span></button></section>`;
}
function dogCard(d) {
  const saved = read().saved.includes(d.id);
  return `<article class="dog-card"><a class="dog-photo" href="#/dog/${d.id}"><img src="${esc(d.image || "/assets/mascot-home.webp")}" alt="${esc(d.name)} ${esc(d.breed)} 사진" loading="lazy"/>${badge(d)}${d.demo ? '<span class="sample-label">예시</span>' : ""}</a><button class="save-button ${saved ? "saved" : ""}" data-action="save" data-id="${d.id}" aria-label="${esc(d.name)} ${saved ? "저장 취소" : "저장"}" aria-pressed="${saved}">${icon("heart")}</button><a class="dog-info" href="#/dog/${d.id}"><div class="dog-title"><h3>${esc(d.name)}</h3><span>${esc(d.breed)} · ${esc(d.sex)}</span></div><p>${icon("map-pin")}${esc(d.location)}</p><div class="dog-meta"><span>${icon("clock-3")}${timeAgo(d.time)}</span><span>${esc(d.age)}<span class="dot-separator">·</span>${esc(d.size)}</span></div></a></article>`;
}
function empty(title, body, button = "") {
  return `<div class="empty-state"><img src="/assets/mascot-reunion.webp" alt=""/><h3>${title}</h3><p>${body}</p>${button}</div>`;
}
function filterBar() {
  return `<div class="filter-bar"><div class="search-input">${icon("search")}<input id="dog-search" type="search" value="${esc(state.query)}" placeholder="지역, 견종, 이름으로 찾아보세요" aria-label="강아지 검색"/></div><button class="filter-button" data-action="region">${icon("map-pin")}<span>${state.region === "전국" ? "전국 모든 지역" : state.region}</span>${icon("chevron-down")}</button><button class="filter-button ${state.showFilters ? "selected" : ""}" data-action="filters" aria-expanded="${state.showFilters}">${icon("sliders-horizontal")}<span>상세 필터</span>${state.color || state.size || state.accessory ? '<b class="filter-dot"></b>' : ""}</button><div class="view-toggle"><button data-action="view" data-view="list" class="${state.view === "list" ? "active" : ""}" aria-label="목록 보기" aria-pressed="${state.view === "list"}">${icon("layout-grid")}</button><button data-action="view" data-view="map" class="${state.view === "map" ? "active" : ""}" aria-label="지도 보기" aria-pressed="${state.view === "map"}">${icon("map")}</button></div></div>${state.showFilters ? `<div class="advanced-filters"><label>털 색<select data-filter="color"><option value="">모든 색</option>${options(["흰색", "갈색", "검정색", "회색", "혼합"], state.color)}</select></label><label>크기<select data-filter="size"><option value="">모든 크기</option>${options(["소형", "중형", "대형"], state.size)}</select></label><label>착용물<select data-filter="accessory"><option value="">모든 착용물</option>${options(["없음", "목줄", "하네스", "옷"], state.accessory)}</select></label><button class="text-button" data-action="clear-filters">초기화</button></div>` : ""}`;
}
function explorer(home = false) {
  return `<section class="explore-section" id="explore"><div class="section-heading"><div><span class="eyebrow section-eyebrow">함께 찾아주세요</span><h2>찾고 있는 강아지<span class="coral">.</span></h2><p>사진을 누르면 특징과 목격 장소를 볼 수 있어요.</p></div><button class="text-button area-alert" data-action="areas">${icon("bell-ring")}우리 동네 알림 받기${icon("chevron-right")}</button></div><div class="list-tabs"><button class="${state.status === "all" ? "active" : ""}" data-action="status" data-status="all">전체 소식</button><button class="${state.status === "missing" ? "active" : ""}" data-action="status" data-status="missing">찾고 있어요<span>${read().dogs.filter((d) => d.status === "missing").length}</span></button><button class="${state.status === "reunited" ? "active" : ""}" data-action="status" data-status="reunited">집에 돌아왔어요</button><span class="example-note">예시 데이터 포함</span></div>${filterBar()}<div id="dog-results">${resultsHTML(home)}</div></section>`;
}
function resultsHTML(home = false) {
  const dogs = filterDogs(read().dogs, state);
  if (!dogs.length)
    return empty(
      "아직 등록된 소식이 없어요",
      "다른 지역이나 검색 조건으로 찾아보세요.",
      `<button class="button white" data-action="clear-filters">검색 조건 초기화</button>`,
    );
  return state.view === "map"
    ? '<div id="explore-map" class="explore-map" aria-label="실종 강아지 지도"></div>'
    : `<div class="dog-grid">${dogs
        .slice(0, home ? 4 : 100)
        .map(dogCard)
        .join(
          "",
        )}</div>${home ? '<a class="all-link" href="#/explore">더 많은 아이들 만나보기 ' + icon("arrow-right") + "</a>" : ""}`;
}
function renderResults() {
  const el = document.querySelector("#dog-results");
  if (!el) return;
  maps.forEach((m) => m.remove());
  maps = [];
  el.innerHTML = resultsHTML(route() === "/");
  refreshIcons();
  initExploreMap();
}
function initExploreMap() {
  const el = document.querySelector("#explore-map");
  if (!el) return;
  const dogs = filterDogs(read().dogs, state);
  const m = baseMap(
    el,
    dogs[0]?.coords || COORDS.서울,
    state.region === "전국" ? 7 : 12,
  );
  maps.push(m);
  dogs.forEach((d) => {
    const mk = marker(m, d.coords, "♥");
    mk.bindPopup(
      `<a href="#/dog/${d.id}"><b>${esc(d.name)}</b> · ${esc(d.breed)}<br>${esc(d.location)}<br>상세 보기 →</a>`,
    );
  });
}
function communityBanner() {
  return `<section class="community-banner"><div class="community-art"><img src="/assets/mascot-reunion.webp" alt="다시 만나 기쁘게 집으로 달려오는 멍백홈 강아지" loading="lazy"/></div><div><span class="eyebrow">우리가 함께 만드는 해피엔딩</span><h2>“다시 만나서, 정말 다행이야.”</h2><p>작은 제보로 시작된, 따뜻한 재회의 이야기를 만나보세요.</p></div><a class="button white" href="#/stories">재회 이야기 읽기${icon("arrow-up-right")}</a></section><section class="how-it-works"><div><span class="eyebrow">작은 행동, 커다란 변화</span><h2>함께라면 더 빨리 만날 수 있어요</h2></div><div class="how-steps"><div><span>01</span><strong>주변을 살펴봐 주세요</strong><p>우리 동네 실종 소식에 관심을 가져주세요.</p></div><div><span>02</span><strong>기억을 나눠주세요</strong><p>목격한 장소와 시간이 큰 단서가 돼요.</p></div><div><span>03</span><strong>소식을 퍼뜨려 주세요</strong><p>공유한 링크 하나가 재회로 이어져요.</p></div></div></section>`;
}
function detail(d) {
  if (!d)
    return empty(
      "신고를 찾을 수 없어요",
      "링크가 올바른지 확인하거나 목록에서 다시 찾아주세요.",
      '<a class="button primary" href="#/explore">목록으로</a>',
    );
  const reports = chronologicalSightings(
    read().reports.filter((r) => r.dogId === d.id),
  );
  return `<div class="page-breadcrumb"><a href="#/explore">강아지 찾기</a>${icon("chevron-right")}<span>${esc(d.name)}의 소식</span>${d.demo ? '<span class="subtle-tag">체험용 예시 신고</span>' : ""}</div><section class="detail-top"><div class="detail-image"><img src="${esc(d.image || "/assets/mascot-home.webp")}" alt="${esc(d.name)} 사진"/>${badge(d)}</div><div class="detail-copy"><span class="eyebrow">${d.status === "reunited" ? "가족의 품으로 돌아왔어요" : "소중한 가족을 찾고 있어요"}</span><h1>${esc(d.name)}<span>${esc(d.breed)} · ${esc(d.age)} · ${esc(d.sex)}</span></h1><dl><div><dt>${icon("map-pin")}마지막 목격 장소</dt><dd>${esc(d.location)}</dd></div><div><dt>${icon("clock-3")}실종 시간</dt><dd>${formatTime(d.time)}</dd></div><div><dt>${icon("scan-eye")}구별되는 특징</dt><dd>${esc(d.color)} · ${esc(d.size)} · ${esc(d.accessory)}</dd></div></dl><p class="dog-description">${esc(d.description)}</p><div class="detail-actions">${d.status !== "reunited" ? `<button class="button primary" data-action="sighting" data-id="${d.id}">${icon("map-pin")}이 아이를 봤어요</button>` : '<span class="reunited-message">♥ 소중한 관심에 감사해요</span>'}<button class="button white" data-action="share" data-id="${d.id}">${icon("share-2")}공유하기</button><button class="icon-button outlined ${read().saved.includes(d.id) ? "saved" : ""}" data-action="save" data-id="${d.id}" aria-label="신고 저장">${icon("heart")}</button></div><div class="detail-tools"><button class="text-button" data-action="poster" data-id="${d.id}">${icon("qr-code")}QR 전단 만들기</button><button class="text-button" data-action="flag" data-id="${d.id}">${icon("flag")}신고하기</button></div></div></section>${exampleDetail(d,read())}<section class="timeline-section"><div class="section-heading"><div><span class="eyebrow section-eyebrow">작은 단서를 하나씩 모아요</span><h2>목격 타임라인 <span class="count-chip">${reports.length}</span></h2></div><span class="subtle-tag">${icon("clock-3")}목격 시간순</span></div><div class="timeline-layout"><div><div id="timeline-map" class="timeline-map" aria-label="목격 시간순 연결선과 이동 방향 지도"></div><div class="map-legend"><span><i class="legend-line"></i>목격 시간순 연결</span><span><i class="legend-arrow">↗</i>제보된 이동 방향</span></div><p class="map-disclaimer">점선은 목격 지점을 시간순으로 연결한 선이며, 실제 이동 경로가 아니에요. 다른 강아지로 확인된 제보는 제외돼요.</p></div><div class="timeline-list">${reports.length ? reports.map((s, i) => `<button class="timeline-item" data-action="report-detail" data-id="${s.id}" id="timeline-${s.id}"><span class="timeline-number ${s.status === "관련 목격" ? "confirmed" : ""}">${i + 1}</span><span class="timeline-body"><span class="timeline-time">${formatTime(s.time)}<span class="report-status">${esc(s.status)}</span></span><strong>${esc(s.location)}</strong><span>${s.stationary ? "머물러 있었어요" : s.heading == null ? "방향 정보 없음" : `${headingLabel(s.heading)}으로 이동 ↗`}</span><small>${esc(s.description)}</small></span>${icon("chevron-right")}</button>`).join("") : empty("아직 목격 제보가 없어요", "첫 번째 단서를 기다리고 있어요.")}</div></div></section><div class="detail-bottom"><section class="panel"><h3>${icon("route")}수색 상황</h3>${
    read()
      .updates.filter((u) => u.dogId === d.id)
      .map(
        (u) =>
          `<p class="update-item"><small>${formatTime(u.time)}</small>${esc(u.text)}</p>`,
      )
      .join("") || '<p class="muted">아직 공유된 수색 상황이 없어요.</p>'
  }<button class="button white small" data-action="update" data-id="${d.id}">수색 상황 남기기</button></section><section class="panel"><h3>${icon("scan-search")}함께 확인할 발견 제보</h3>${
    matchCandidates(d, read().reports)
      .slice(0, 3)
      .map(
        (r) =>
          `<button class="candidate" data-action="report-detail" data-id="${r.id}">${icon("map-pin")}<span>${esc(r.location)}<small>${r.distance.toFixed(1)}km · ${formatTime(r.time)}</small></span>${icon("chevron-right")}</button>`,
      )
      .join("") ||
    '<p class="muted">주변 발견 제보가 등록되면 위치·시간·특징으로 후보를 보여드려요.</p>'
  }<button class="text-button" data-action="public-data">공공 보호 정보 연계 안내${icon("external-link")}</button></section></div>`;
}
function sightings() {
  const reports = [...read().reports]
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .filter(
      (r) =>
        state.region === "전국" ||
        r.region === state.region ||
        read().dogs.find((d) => d.id === r.dogId)?.region === state.region,
    );
  return `<section class="page-heading"><span class="eyebrow">당신이 본 그 아이, 누군가는 찾고 있어요</span><h1>우리 주변의 목격 소식<span class="coral">.</span></h1><p>목격한 시간과 장소, 작은 기억 하나도 소중한 단서가 돼요.</p><button class="button primary" data-action="sighting">${icon("plus")}발견 제보 남기기</button></section><div class="section-heading"><h2>최근 발견 제보 <span class="count-chip">${reports.length}</span></h2><button class="filter-button" data-action="region">${icon("map-pin")}${state.region}${icon("chevron-down")}</button></div><div class="sighting-grid">${reports.map((r) => `<button class="sighting-card" data-action="report-detail" data-id="${r.id}"><span class="sighting-symbol">${icon(r.kind === "목격" ? "map-pin" : r.kind === "보호 중" ? "house-heart" : "building-2")}</span><span><span class="badge sage">${esc(r.kind)}</span>${r.demo ? '<span class="subtle-tag">예시</span>' : ""}<h3>${esc(r.location)}</h3><p>${esc(r.description)}</p><small>${formatTime(r.time)} · ${headingLabel(r.heading)}</small></span>${icon("chevron-right")}</button>`).join("") || empty("아직 목격 소식이 없어요", "주변에서 발견한 강아지의 소식을 남겨주세요.")}</div>`;
}
function stories() {
  return `<section class="stories-hero"><img src="/assets/mascot-reunion.webp" alt="서로 기대고 있는 강아지들"/><div><span class="eyebrow">함께 만들어낸 해피엔딩</span><h1>다시 만나서,<br>정말 다행이야<span class="coral">.</span></h1><p>평범했던 일상이 다시 돌아온 순간.<br>소중한 재회의 이야기를 나눠주세요.</p><button class="button primary" data-action="story">${icon("heart")}우리의 재회 이야기 쓰기</button></div></section><section class="story-list">${
    read().stories.length
      ? read()
          .stories.map(
            (s) =>
              `<article class="story-card"><img src="${esc(s.image || "/assets/mascot-reunion.webp")}" alt="재회 이야기 사진"/><div><span class="badge sage">재회 이야기</span><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p><small>${formatTime(s.time)}</small></div></article>`,
          )
          .join("")
      : empty(
          "첫 번째 따뜻한 이야기를 기다려요",
          "다시 만난 순간과 도움이 되었던 경험을 나눠주세요.",
        )
  }</section>`;
}
function myHome() {
  const db = read();
  return `<section class="page-heading"><span class="eyebrow">우리 아이와 함께하는 공간</span><h1>나의 멍백홈<span class="coral">.</span></h1><p>신고와 반려견 정보를 한곳에서 관리하고, 새 목격 소식을 확인하세요.</p></section><div class="my-sections"><section><div class="section-heading"><h2>우리 집 강아지</h2><button class="button white small" data-action="profile">${icon("plus")}프로필 등록</button></div><div class="profile-grid">${db.profiles.length ? db.profiles.map((p) => `<article class="profile-card"><img src="${esc(p.image || "/assets/mascot-home.webp")}" alt="${esc(p.name)}"/><div><h3>${esc(p.name)}</h3><p>${esc(p.breed)} · ${esc(p.age)}</p><button class="text-button" data-action="report" data-profile="${p.id}">이 정보로 실종 신고${icon("arrow-right")}</button></div></article>`).join("") : `<button class="profile-add" data-action="profile">${icon("paw-print")}<strong>우리 아이를 미리 등록해두세요</strong><span>사진과 특징을 저장하면, 필요할 때 빠르게 신고할 수 있어요.</span>${icon("plus")}</button>`}</div></section><section><div class="section-heading"><h2>내 신고 관리</h2><button class="button primary small" data-action="report">신고 등록</button></div><div class="manage-list">${
    db.dogs
      .filter((d) => d.canManage)
      .map(
        (d) =>
          `<article class="manage-card"><a href="#/dog/${d.id}"><img src="${esc(d.image || "/assets/mascot-home.webp")}" alt=""/><span><strong>${esc(d.name)}</strong><small>${esc(d.location)}</small>${badge(d)}</span></a><div><button class="button white small" data-action="edit-dog" data-id="${d.id}">수정</button>${d.status !== "reunited" ? `<button class="button primary small" data-action="reunite" data-id="${d.id}">재회 완료</button>` : ""}</div></article>`,
      )
      .join("") ||
    '<p class="muted panel">직접 등록한 실종 신고가 여기에 표시돼요.</p>'
  }</div></section><section><div class="section-heading"><h2>저장한 소식</h2><button class="text-button" data-action="areas">${icon("bell")}관심 지역 설정</button></div><div class="dog-grid">${
    db.dogs
      .filter((d) => db.saved.includes(d.id))
      .map(dogCard)
      .join("") ||
    '<p class="muted">마음이 쓰이는 아이의 하트를 눌러 소식을 저장해보세요.</p>'
  }</div></section><section><div class="section-heading"><h2>들어온 제보</h2></div>${
    db.reports
      .filter((r) => db.dogs.some((d) => d.canManage && d.id === r.dogId))
      .map(
        (r) =>
          `<button class="candidate panel" data-action="report-detail" data-id="${r.id}"><span><strong>${esc(r.location)}</strong><small>${formatTime(r.time)} · ${esc(r.status)}</small></span>${icon("chevron-right")}</button>`,
      )
      .join("") ||
    '<p class="muted">내 신고에 연결된 제보를 여기에서 확인할 수 있어요.</p>'
  }</section></div>`;
}
function admin() {
  if (read().user?.role !== "admin")
    return empty(
      "운영자 전용 공간이에요",
      "운영 계정으로 로그인하면 접수된 신고를 관리할 수 있어요.",
      '<button class="button primary" data-action="account">로그인 / 회원가입</button>',
    );
  return `<section class="page-heading"><span class="eyebrow">운영 관리</span><h1>접수된 신고 관리</h1><p>접수 내용을 확인하고 처리 상태를 기록해주세요. 모든 관리 요청은 서버에서 권한을 확인해요.</p></section><section class="panel"><h2>접수된 악용 신고</h2>${
    read()
      .moderation.map(
        (m) =>
          `<div class="moderation-item"><p>${esc(m.reason)}<small>${formatTime(m.time)} · ${esc(m.target)}</small></p><span class="badge ${m.resolved ? "sage" : ""}">${m.resolved ? "처리 완료" : "접수"}</span>${!m.resolved ? `<button class="button white small" data-action="resolve" data-id="${m.id}">처리 완료</button>` : ""}</div>`,
      )
      .join("") || '<p class="muted">접수된 신고가 없어요.</p>'
  }</section>`;
}
function render() {
  if (!app) return;
  timelineCleanup();
  maps.forEach((m) => m.remove());
  maps = [];
  const p = route();
  let body;
  if (p === "/")
    body =
      dashboard() + hero() + explorer(true) + communityBanner();
  else if (p === "/explore") body = explorer();
  else if (p.startsWith("/dog/"))
    body = detail(read().dogs.find((d) => d.id === p.split("/")[2]));
  else if (p === "/sightings") body = sightings();
  else if (p === "/stories") body = stories();
  else if (p === "/my") body = myHome();
  else if (p === "/admin") body = admin();
  else if (p.startsWith('/account/')) body=accountPage(p);
  else
    body = empty(
      "페이지를 찾을 수 없어요",
      "홈으로 돌아가 다시 시작해주세요.",
      '<a class="button primary" href="#/">홈으로</a>',
    );
  app.innerHTML =
    header() + `<main id="main" class="container">${body}</main>` + footer();
  refreshIcons();
  decorateSession();
  bindAccountPage();
  initExploreMap();
  const el = document.querySelector("#timeline-map");
  if (el) {
    const d = read().dogs.find((d) => d.id === p.split("/")[2]);
    const m = baseMap(el, d.coords);
    maps.push(m);
    const reports = read().reports.filter((r) => r.dogId === d.id);
    timelineCleanup = timelineExperience(m, reports, reportDetail);
    if (!reports.length) marker(m, d.coords, "♥");
  }
  window.dispatchEvent(new Event("legacy-render"));
}
function closeModal() {
  modalCleanup();
  modalCleanup = async () => {};
  modalRoot.innerHTML = "";
  document.body.classList.remove("modal-open");
  previousFocus?.focus?.();
  if (pendingRefresh) {
    pendingRefresh = false;
    refresh();
  }
}
function openModal(title, body, wide = false) {
  const focus = document.activeElement;
  closeModal();
  previousFocus = focus;
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="modal-header"><h2 id="modal-title">${title}</h2><button class="icon-button" data-action="close" aria-label="닫기">${icon("x")}</button></div><div class="modal-content">${body}</div></section></div>`;
  document.body.classList.add("modal-open");
  refreshIcons();
  setTimeout(
    () => modalRoot.querySelector("input,select,textarea,button")?.focus(),
    50,
  );
}
function field(label, name, type = "text", value = "", extra = "") {
  return `<label class="field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}" ${extra}/></label>`;
}
function selectField(label, name, values, value = "") {
  return `<label class="field"><span>${label}</span><select name="${name}">${options(values, value)}</select></label>`;
}
function photoField(image = "") {
  return `<label class="photo-upload"><input name="photo" type="file" accept="image/jpeg,image/png,image/webp"/><span class="photo-preview">${image ? `<img src="${esc(image)}" alt="선택된 사진"/>` : icon("camera")}</span><span><strong>강아지 사진 올리기</strong><small>얼굴과 특징이 잘 보이는 사진 · JPG, PNG, WebP</small></span>${icon("plus")}</label>`;
}
async function photoValue(form, fallback = "") {
  const file = form.elements.photo?.files[0];
  if (!file) return form._photo || fallback;
  if (file.size > 15 * 1024 * 1024)
    throw new Error("사진은 15MB 이하로 선택해주세요.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("JPG, PNG, WebP 사진을 선택해주세요.");
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 1000 / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = async () => {
      URL.revokeObjectURL(url);
      reject(new Error("사진을 읽을 수 없어요. 다른 사진을 선택해주세요."));
    };
    img.src = url;
  });
}
function formError(form, message) {
  let el = form.querySelector(".form-error");
  if (!el) {
    el = document.createElement("p");
    el.className = "form-error";
    el.setAttribute("role", "alert");
    form.prepend(el);
  }
  el.textContent = message;
  el.scrollIntoView({ block: "nearest" });
}
function initPhotoPreview(form) {
  form.elements.photo?.addEventListener("change", async () => {
    form.dispatchEvent(new Event("photo-processing"));
    form.querySelector(".photo-upload").classList.add("uploading");
    try {
      const url = await photoValue(form);
      form._photo = url;
      form.querySelector(".photo-preview").innerHTML =
        `<img src="${url}" alt="선택된 사진"/>`;
    } catch (e) {
      formError(form, e.message);
    } finally {
      form.querySelector(".photo-upload").classList.remove("uploading");
      form.dispatchEvent(new Event("photo-ready"));
    }
  });
}

function dogForm({ profile, edit, profileOnly = false } = {}) {
  const d = edit || profile || {};
  openModal(
    profileOnly
      ? "우리 아이 프로필 등록"
      : edit
        ? "실종 신고 수정"
        : "우리 아이를 함께 찾아요",
    `<p class="modal-intro">${profileOnly ? "소중한 우리 아이의 사진과 특징을 미리 저장해두세요." : "사진과 마지막으로 본 장소부터 알려주세요. 작은 특징도 도움이 돼요."}</p><form id="dog-form">${photoField(d.image)}<div class="form-grid">${field("강아지 이름 *", "name", "text", d.name, 'required maxlength="30" placeholder="예: 보리"')}${field("견종 *", "breed", "text", d.breed, 'required maxlength="40" placeholder="예: 말티즈, 믹스"')}${field("나이", "age", "text", d.age, 'maxlength="20" placeholder="예: 3살, 모름"')}${selectField("성별", "sex", ["모름", "여아", "남아"], d.sex)}${selectField("털 색", "color", ["흰색", "갈색", "검정색", "회색", "혼합"], d.color)}${selectField("크기", "size", ["소형", "중형", "대형"], d.size)}</div>${!profileOnly ? `<div class="form-grid">${selectField("실종 지역", "region", REGIONS.slice(1), d.region || "서울")}${field("실종 시간 *", "time", "datetime-local", d.time ? new Date(new Date(d.time) - new Date(d.time).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : localDate(), "required")}${selectField("착용물", "accessory", ["없음", "목줄", "하네스", "옷"], d.accessory)}</div>${field("마지막으로 본 장소 *", "location", "text", d.location, 'required maxlength="150" placeholder="예: 서울 송파구 석촌호수 동호 입구"')}<div class="picker-heading"><span>지도에서 실제 목격 지점을 눌러주세요 *</span><button class="text-button" type="button" id="locate">${icon("locate-fixed")}현재 위치</button></div><div id="location-picker" class="location-picker"></div><p class="field-hint" id="location-help">${edit ? "저장된 위치를 불러왔어요." : "지역 중심이 표시돼요. 정확한 지점을 선택해주세요."}</p>` : ""}<label class="field"><span>구별되는 특징</span><textarea name="description" rows="3" maxlength="1000" placeholder="털 무늬, 성격, 이름에 대한 반응 등을 적어주세요">${esc(d.description || "")}</textarea></label><p class="local-notice">신고 사진과 목격 장소는 함께 찾는 이웃에게 공개돼요. 연락처는 게시글에 적지 말아주세요.</p><button class="button primary full" type="submit">${profileOnly ? "프로필 저장하기" : edit ? "수정 내용 저장" : "실종 신고 등록하기"}${icon("arrow-right")}</button></form>`,
    true,
  );
  const form = document.querySelector("#dog-form");
  initPhotoPreview(form);
  const draftKey = profileOnly
    ? "profile"
    : `dog-${edit?.id || profile?.id || "new"}`;
  const draft = loadDraft(draftKey);
  let coords = draft?.extra?.coords || d.coords || COORDS[d.region || "서울"];
  let picked = draft?.extra?.picked || !!edit;
  if (!profileOnly) {
    const picker = directionPicker(
      document.querySelector("#location-picker"),
      coords,
      (p) => {
        coords = p;
        picked = true;
        picker.set(coords, null);
        document.querySelector("#location-help").textContent =
          "목격 위치가 선택됐어요.";
      },
    );
    modalCleanup = () => picker.map.remove();
    form.elements.region.addEventListener("change", (e) => {
      coords = COORDS[e.target.value];
      picked = false;
      picker.map.setView(coords, 13);
      picker.set(coords, null);
      document.querySelector("#location-help").textContent =
        "정확한 지점을 지도에서 선택해주세요.";
    });
    document.querySelector("#locate").onclick = () =>
      locate((p) => {
        coords = p;
        picked = true;
        picker.map.setView(coords, 16);
        picker.set(coords, null);
        document.querySelector("#location-help").textContent =
          "현재 위치를 불러왔어요. 실제 목격 지점인지 확인해주세요.";
      });
  }
  const wizard = enhanceWizard(form, {
    key: draftKey,
    kind: profileOnly ? "profile" : "dog",
    extra: () => ({ coords, picked }),
    validate: (step) => {
      if (!profileOnly && step === 1 && !picked)
        throw new Error("지도에서 목격 위치를 선택해주세요.");
    },
    onStep: () => window.dispatchEvent(new Event("resize")),
  });
  const cleanup = modalCleanup;
  modalCleanup = () => {
    wizard.dispose();
    cleanup();
  };
  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      if (!profileOnly && !picked)
        throw new Error("지도에서 마지막으로 본 지점을 선택해주세요.");
      const values = Object.fromEntries(new FormData(form));
      delete values.photo;
      values.name = values.name.trim();
      values.breed = values.breed.trim();
      if (!values.name || !values.breed)
        throw new Error("이름과 견종을 입력해주세요.");
      const image = await photoValue(form, d.image);
      if (!image) throw new Error("강아지 사진을 한 장 올려주세요.");
      // 작성은 로그인 없이 시작하고, 등록 직전에만 계정을 확인한다. 초안은 closeModal에서 저장된다.
      if (!profileOnly && !read().user?.registered) {
        closeModal();
        accountForm(() => dogForm({ profile, edit, profileOnly }));
        return;
      }
      if (!profileOnly && read().user?.verificationRequired && !read().user?.verified)
        throw new Error("받은 메일에서 이메일 인증을 마치면 바로 등록할 수 있어요. 작성한 내용은 이 기기에 7일 동안 보관돼요.");
      if (profileOnly) {
        read().profiles.push({ ...values, image, id: id("profile") });
      } else {
        if (new Date(values.time) > new Date())
          throw new Error("실종 시간은 현재보다 미래일 수 없어요.");
        const entry = {
          ...values,
          id: edit?.id || id("dog"),
          coords,
          image,
          time: new Date(values.time).toISOString(),
          status: edit?.status || "missing",
          demo: false,
        };
        if (edit) Object.assign(edit, entry);
        else {
          read().dogs.unshift(entry);
          if (read().areas.includes(entry.region))
            notify(
              "관심 지역에 새 실종 소식이 있어요",
              `${entry.region} · ${entry.name}의 가족을 찾고 있어요.`,
              entry.id,
            );
        }
        await persist();
        wizard.complete();
        closeModal();
        location.hash = `/dog/${entry.id}`;
        render();
        if (!edit) setTimeout(() => registeredNext(entry.id), 80);
        toast(
          edit
            ? "신고를 수정했어요."
            : "신고가 등록됐어요. 이제 이웃에게 알려주세요.",
        );
        return;
      }
      await persist();
      wizard.complete();
      closeModal();
      location.hash = "/my";
      render();
      toast("우리 아이 프로필을 저장했어요.");
    } catch (err) {
      formError(form, err.message);
    }
  };
}
function locate(success) {
  const owner = modalRoot.firstElementChild;
  if (!navigator.geolocation) {
    toast("이 브라우저에서는 위치를 가져올 수 없어요. 지도에서 선택해주세요.");
    return;
  }
  toast("현재 위치를 확인하고 있어요.");
  navigator.geolocation.getCurrentPosition(
    (p) => {
      if (modalRoot.firstElementChild !== owner) return;
      success([p.coords.latitude, p.coords.longitude]);
    },
    () => toast("위치 권한을 확인하거나 지도에서 직접 선택해주세요."),
    { enableHighAccuracy: true, timeout: 12000 },
  );
}
function sightingForm(dogId) {
  const draftKey = `sighting-${dogId || "new"}`,
    draft = loadDraft(draftKey);
  const dog = read().dogs.find((d) => d.id === dogId);
  let coords = draft?.extra?.coords || dog?.coords || COORDS.서울,
    heading = draft?.extra?.heading ?? null,
    picked = draft?.extra?.picked || false,
    sensorHeading = null,
    orientationListener = null;
  openModal(
    dog ? `${esc(dog.name)}의 목격 소식 남기기` : "발견한 강아지의 소식 남기기",
    `<p class="modal-intro">${dog ? "어디에서, 어느 쪽으로 갔나요? 기억나는 만큼 알려주세요." : "어떤 아이인지 몰라도 괜찮아요. 발견한 장소와 특징을 남겨주세요."}</p><form id="sighting-form"><div class="segmented-options">${["목격", "보호 중", "기관 인계"].map((v, i) => `<label><input type="radio" name="kind" value="${v}" ${i === 0 ? "checked" : ""}/><span>${icon(i === 0 ? "eye" : i === 1 ? "house-heart" : "building-2")}${v}</span></label>`).join("")}</div>${photoField()}<div class="form-grid">${selectField("발견 지역", "region", REGIONS.slice(1), dog?.region || "서울")}${field("목격 시간 *", "time", "datetime-local", localDate(), "required")}</div>${field("목격 장소 *", "location", "text", "", 'required maxlength="150" placeholder="예: 석촌호수 동호 북쪽 산책로"')}<div class="picker-heading"><span>강아지를 본 지점을 눌러주세요 *</span><button class="text-button" type="button" id="locate">${icon("locate-fixed")}현재 위치</button></div><div id="sighting-picker" class="location-picker"></div><p class="field-hint" id="location-help">내 위치가 아닌, 강아지를 실제로 본 지점을 선택해주세요.</p><section class="direction-section"><div class="picker-heading"><strong>${icon("navigation")}어느 쪽으로 이동했나요?</strong><span class="muted">선택</span></div><div class="direction-modes"><label><input type="radio" name="directionMode" value="unknown" checked/>모르겠어요</label><label><input type="radio" name="directionMode" value="moving"/>이동했어요</label><label><input type="radio" name="directionMode" value="still"/>머물러 있었어요</label></div><div id="direction-controls" hidden><div class="compass-row"><div class="compass"><span class="north">N</span><span class="east">E</span><span class="south">S</span><span class="west">W</span><div class="compass-needle" id="compass-needle">↑</div></div><div class="compass-help"><strong id="heading-label">북쪽 · 0°</strong><p>슬라이더로 화살표를 돌리거나,<br>휴대폰 위쪽으로 방향을 가리켜주세요.</p><button class="button white small" id="sensor" type="button">${icon("compass")}휴대폰으로 가리키기</button></div></div><label class="field direction-range"><span>이동 방향 조절</span><input type="range" id="heading-range" min="0" max="359" value="0" aria-label="이동 방향 각도"/></label><p id="sensor-status" class="field-hint">지도 화살표를 확인하고 저장해주세요.</p><button class="button white small" type="button" id="capture-heading" hidden>이 방향으로 갔어요</button></div></section>${!dog ? `<div class="form-grid">${selectField("털 색", "color", ["모름", "흰색", "갈색", "검정색", "회색", "혼합"])}${selectField("크기", "size", ["모름", "소형", "중형", "대형"])}</div>` : ""}<label class="field"><span>추가로 알려주실 내용</span><textarea name="description" rows="3" maxlength="1000" placeholder="강아지의 모습, 이동 상황, 인계한 기관 등을 적어주세요"></textarea></label><p class="local-notice">제보가 등록되면 보호자에게 알림이 전달돼요. 보호 중인 정확한 위치와 대화는 당사자만 볼 수 있어요.</p><button class="button primary full" type="submit">목격 소식 남기기${icon("arrow-right")}</button></form>`,
    true,
  );
  const form = document.querySelector("#sighting-form");
  initPhotoPreview(form);
  const picker = directionPicker(
    document.querySelector("#sighting-picker"),
    coords,
    (p) => {
      coords = p;
      picked = true;
      picker.set(coords, heading);
      document.querySelector("#location-help").textContent =
        "목격 위치가 선택됐어요.";
    },
  );
  const setHeading = (value) => {
    heading = Number(value);
    document.querySelector("#heading-range").value = heading;
    document.querySelector("#heading-label").textContent =
      `${headingLabel(heading)} · ${Math.round(heading)}°`;
    document.querySelector("#compass-needle").style.transform =
      `rotate(${heading}deg)`;
    picker.set(coords, heading);
  };
  let sensorTimer;
  const stopSensor = async () => {
    clearTimeout(sensorTimer);
    if (orientationListener) {
      window.removeEventListener(
        "deviceorientationabsolute",
        orientationListener,
      );
      window.removeEventListener("deviceorientation", orientationListener);
      orientationListener = null;
    }
  };
  modalCleanup = async () => {
    stopSensor();
    picker.map.remove();
  };
  form.elements.region.addEventListener("change", (e) => {
    coords = COORDS[e.target.value];
    picked = false;
    picker.map.setView(coords, 13);
    picker.set(coords, heading);
    document.querySelector("#location-help").textContent =
      "정확한 목격 지점을 다시 선택해주세요.";
  });
  document.querySelector("#locate").onclick = () =>
    locate((p) => {
      coords = p;
      picked = true;
      picker.map.setView(coords, 16);
      picker.set(coords, heading);
      document.querySelector("#location-help").textContent =
        "현재 위치예요. 강아지를 본 지점으로 조정해주세요.";
    });
  form.querySelectorAll("[name=directionMode]").forEach(
    (el) =>
      (el.onchange = async () => {
        const moving = form.elements.directionMode.value === "moving";
        document.querySelector("#direction-controls").hidden = !moving;
        stopSensor();
        if (moving) setHeading(document.querySelector("#heading-range").value);
        else {
          heading = null;
          picker.set(coords, null);
        }
      }),
  );
  document.querySelector("#heading-range").oninput = async (e) => {
    stopSensor();
    setHeading(e.target.value);
  };
  document.querySelector("#sensor").onclick = async () => {
    const status = document.querySelector("#sensor-status");
    try {
      if (!window.isSecureContext)
        throw new Error(
          "방향 센서는 HTTPS 연결에서 사용할 수 있어요. 슬라이더로 지정해주세요.",
        );
      if (!window.DeviceOrientationEvent)
        throw new Error(
          "방향 센서를 지원하지 않아요. 슬라이더로 지정해주세요.",
        );
      if (typeof DeviceOrientationEvent.requestPermission === "function") {
        const permission = await DeviceOrientationEvent.requestPermission();
        if (permission !== "granted")
          throw new Error("센서 권한이 없어 수동 방향 선택을 사용해주세요.");
      }
      if (!document.contains(status)) return;
      stopSensor();
      sensorHeading = null;
      status.textContent =
        "휴대폰을 수평으로 잡고 위쪽을 이동 방향으로 향해주세요.";
      orientationListener = async (e) => {
        let value;
        if (
          typeof e.webkitCompassHeading === "number" &&
          (e.webkitCompassAccuracy == null || e.webkitCompassAccuracy >= 0)
        )
          value = e.webkitCompassHeading;
        else if (e.absolute && e.alpha != null) value = (360 - e.alpha) % 360;
        else return;
        sensorHeading = value;
        setHeading(value);
        document.querySelector("#capture-heading").hidden = false;
        status.textContent =
          "가리키는 방향을 확인하고 아래 버튼을 눌러 고정해주세요.";
      };
      window.addEventListener("deviceorientationabsolute", orientationListener);
      window.addEventListener("deviceorientation", orientationListener);
      sensorTimer = setTimeout(() => {
        if (sensorHeading === null) {
          stopSensor();
          status.textContent =
            "나침반 데이터를 받지 못했어요. 슬라이더로 방향을 지정해주세요.";
        }
      }, 6000);
    } catch (e) {
      status.textContent = e.message;
    }
  };
  document.querySelector("#capture-heading").onclick = async () => {
    stopSensor();
    document.querySelector("#sensor-status").textContent =
      `${headingLabel(heading)} 방향으로 고정했어요. 지도에서 확인해주세요.`;
    document.querySelector("#capture-heading").hidden = true;
  };
  const wizard = enhanceWizard(form, {
    key: draftKey,
    kind: "sighting",
    extra: () => ({ coords, picked, heading }),
    validate: (step) => {
      if (step === 0 && !picked)
        throw new Error("지도에서 목격 위치를 선택해주세요.");
    },
    onStep: () => window.dispatchEvent(new Event("resize")),
  });
  if (heading !== null) {
    document.querySelector("#direction-controls").hidden = false;
    setHeading(heading);
  }
  picker.set(coords, heading);
  const cleanup = modalCleanup;
  modalCleanup = () => {
    wizard.dispose();
    cleanup();
  };
  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      if (!picked) throw new Error("지도에서 강아지를 본 지점을 선택해주세요.");
      const v = Object.fromEntries(new FormData(form));
      if (new Date(v.time) > new Date())
        throw new Error("목격 시간은 현재보다 미래일 수 없어요.");
      const image = await photoValue(form);
      const report = {
        id: id("sighting"),
        dogId: dog?.id || null,
        kind: v.kind,
        region: v.region,
        coords,
        heading,
        stationary: v.directionMode === "still",
        location: v.location.trim(),
        time: new Date(v.time).toISOString(),
        description: v.description.trim(),
        image,
        color: v.color || dog?.color,
        size: v.size || dog?.size,
        status: "확인 전",
        messages: [],
        demo: false,
      };
      if (!report.location) throw new Error("목격 장소를 입력해주세요.");
      read().reports.unshift(report);
      notify(
        "새로운 목격 소식이 도착했어요",
        `${report.location} · ${dog?.name || "발견 제보"}`,
        dog?.id,
      );
      await persist();
      wizard.complete();
      closeModal();
      if (dog) location.hash = `/dog/${dog.id}`;
      else location.hash = "/sightings";
      render();
      toast("소중한 제보가 전달됐어요. 감사합니다.");
    } catch (err) {
      formError(form, err.message);
    }
  };
}
function reportDetail(reportId) {
  const r = read().reports.find((r) => r.id === reportId);
  if (!r) return;
  const dog = read().dogs.find((d) => d.id === r.dogId);
  openModal(
    "목격 제보 확인",
    `${r.demo ? '<p class="local-notice">예시 제보예요. 실제 제보의 상태 변경은 해당 보호자만 할 수 있어요.</p>' : ""}${r.image ? `<img class="report-image" src="${esc(r.image)}" alt="제보 사진"/>` : ""}<span class="badge sage">${esc(r.kind)}</span><h3>${esc(r.location)}</h3><p class="muted">${formatTime(r.time)} · ${r.stationary ? "머물러 있었어요" : headingLabel(r.heading)}</p><p class="report-description">${esc(r.description || "추가 설명이 없어요.")}</p><label class="field"><span>제보 확인 상태 <small>보호자 확인</small></span><select id="report-status">${options(REPORT_STATUSES, r.status)}</select></label>${
      !dog
        ? `<label class="field"><span>실종 신고에 연결하기</span><select id="link-report"><option value="">신고를 선택해주세요</option>${read()
            .dogs.filter((d) => d.status === "missing")
            .map(
              (d) =>
                `<option value="${d.id}">${esc(d.name)} · ${esc(d.location)}</option>`,
            )
            .join("")}</select></label>`
        : `<a class="text-button" href="#/dog/${dog.id}" data-action="close-link">${esc(dog.name)}의 신고 보기${icon("arrow-right")}</a>`
    }<section class="chat-section"><h3>${icon("messages-square")}추가 대화</h3><p class="field-hint">이 대화는 보호자와 제보자만 볼 수 있어요.</p><div class="chat-messages">${(r.messages || []).map((m) => `<div class="chat-bubble">${esc(m.text)}<small>${formatTime(m.time)}</small></div>`).join("") || '<p class="muted">확인하고 싶은 내용을 남겨보세요.</p>'}</div><form id="message-form" class="chat-input"><input name="message" aria-label="추가 메시지" placeholder="추가로 궁금한 내용을 입력하세요" required maxlength="1000"/><button class="icon-button" type="submit" aria-label="메시지 저장">${icon("send")}</button></form></section>`,
  );
  document.querySelector("#report-status").onchange = async (e) => {
    r.status = e.target.value;
    await persist();
    render();
    reportDetail(r.id);
    toast("제보 상태를 변경했어요.");
  };
  const link = document.querySelector("#link-report");
  if (link)
    link.onchange = async (e) => {
      if (!e.target.value) return;
      r.dogId = e.target.value;
      await persist();
      render();
      reportDetail(r.id);
      toast("실종 신고에 제보를 연결했어요.");
    };
  document.querySelector("#message-form").onsubmit = async (e) => {
    e.preventDefault();
    const input = e.target.elements.message;
    if (!input.value.trim()) return;
    (r.messages ||= []).push({
      text: input.value.trim(),
      time: new Date().toISOString(),
    });
    await persist();
    reportDetail(r.id);
  };
  document.querySelector("#report-status").disabled = !r.canManage;
  if (!r.canChat) {
    const chat = document.querySelector(".chat-section");
    chat.innerHTML =
      r.previewOnly&&r.exampleConversation?.length
      ? '<h3>추가 확인 대화 · 가상 예시</h3><p class="field-hint">아래 대화는 기능 설명용 예시이며 실제 사용자 대화가 아니에요.</p><div class="chat-messages">'+r.exampleConversation.map(m=>'<div class="chat-bubble"><small>'+esc(m.who)+'</small>'+esc(m.text)+'</div>').join('')+'</div>'
      : '<p class="message-restricted">보호자와 이 제보를 작성한 이웃만 대화할 수 있어요.</p>';
  }
  if (link && r.previewOnly)link.disabled=true;
  if (link && !read().dogs.some((d) => d.canManage && d.status === "missing"))
    link.closest("label").hidden = true;
}
function regionModal() {
  openModal(
    "어느 지역을 살펴볼까요?",
    `<p class="modal-intro">전국 어디서든 소식을 나눌 수 있어요.</p><div class="region-grid">${REGIONS.map((r) => `<button class="region-chip ${r === state.region ? "active" : ""}" data-action="select-region" data-region="${r}">${r}</button>`).join("")}</div>`,
  );
}
function areaModal() {
  openModal(
    "우리 동네 소식 받아보기",
    `<p class="modal-intro">관심 있는 지역을 선택해주세요. 여러 곳을 저장할 수 있어요.</p><form id="areas-form"><div class="region-grid">${REGIONS.slice(
      1,
    )
      .map(
        (r) =>
          `<label class="area-check"><input type="checkbox" name="area" value="${r}" ${read().areas.includes(r) ? "checked" : ""}/><span>${r}</span></label>`,
      )
      .join(
        "",
      )}</div><p class="local-notice">새 실종 신고가 올라오면 알림함에서 바로 확인할 수 있어요. 브라우저 알림을 켜면 지원되는 기기에서 백그라운드 알림도 받을 수 있어요.</p><button class="button primary full" type="submit">관심 지역 저장하기</button></form>`,
  );
  document.querySelector("#areas-form").onsubmit = async (e) => {
    e.preventDefault();
    read().areas = new FormData(e.target).getAll("area");
    await persist();
    closeModal();
    toast("관심 지역을 저장했어요.");
  };
}
async function notifications() {
  const ns = read().notifications;
  openModal(
    "도착한 소식",
    `${ns.length ? `<div class="notifications-list">${ns.map((n) => `<button class="notification-item" data-action="notification-open" data-id="${n.id}">${icon("bell-ring")}<span><strong>${esc(n.title)}</strong><p>${esc(n.body)}</p><small>${timeAgo(n.time)}</small></span>${!n.read ? '<b class="unread-dot"></b>' : ""}</button>`).join("")}</div>` : empty("아직 도착한 소식이 없어요", "관심 지역을 등록하거나, 아이의 소식을 저장해보세요.")}<button class="button white full" data-action="areas">${icon("map-pin")}관심 지역 설정</button>`,
  );
  ns.forEach((n) => (n.read = true));
  await persist();
  render();
}
async function share(dogId) {
  const d = read().dogs.find((d) => d.id === dogId);
  const url = `${location.origin}${location.pathname}#/dog/${dogId}`;
  openModal(
    "소식을 함께 나눠주세요",
    `<p class="modal-intro">${esc(d.name)}의 소식이 더 많은 이웃에게 닿을 수 있도록.</p><label class="field"><span>신고 링크</span><input id="share-url" readonly value="${esc(url)}"/></label><div class="form-grid"><button class="button primary" id="copy-link">${icon("copy")}링크 복사</button><button class="button white" id="native-share">${icon("share-2")}공유 메뉴 열기</button></div><button class="button white full spaced" data-action="poster" data-id="${dogId}">${icon("qr-code")}공유 이미지 / QR 전단 만들기</button><p class="local-notice">공유받은 사람은 가입 없이 신고를 확인하고 제보할 수 있어요. 재회하면 이 링크에도 완료 상태가 표시돼요.</p>`,
  );
  document.querySelector("#copy-link").onclick = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast("링크를 복사했어요.");
    } catch {
      document.querySelector("#share-url").select();
      toast("링크를 선택했어요. 직접 복사해주세요.");
    }
  };
  document.querySelector("#native-share").onclick = async () => {
    try {
      if (!navigator.share) {
        toast("이 브라우저에서는 링크 복사를 이용해주세요.");
        return;
      }
      await navigator.share({
        title: `${d.name}의 가족을 찾아주세요 · 멍백홈`,
        text: d.location,
        url,
      });
    } catch (e) {
      if (e.name !== "AbortError")
        toast("공유 메뉴를 열지 못했어요. 링크를 복사해주세요.");
    }
  };
}
async function poster(dogId) {
  const d = read().dogs.find((d) => d.id === dogId);
  openModal(
    "작은 전단 하나가, 재회의 시작",
    `<p class="modal-intro">QR로 연결되는 전단과 SNS 이미지를 만들어요.</p><div class="poster-formats"><button class="button white small selected" data-format="print">인쇄용 전단</button><button class="button white small" data-format="social">SNS 정사각형</button></div><canvas id="poster-canvas" class="poster-canvas" aria-label="실종 강아지 공유 전단"></canvas><button class="button primary full" id="download-poster">${icon("download")}이미지 다운로드</button><p class="local-notice">QR은 이 신고의 최신 소식으로 연결돼요. 휴대폰으로 QR을 스캔해 확인할 수 있어요.</p>`,
    true,
  );
  const canvas = document.querySelector("#poster-canvas");
  let format = "print";
  const draw = async () => {
    const ctx = canvas.getContext("2d");
    canvas.width = 1000;
    canvas.height = format === "print" ? 1400 : 1000;
    const h = canvas.height;
    ctx.fillStyle = "#fffaf3";
    ctx.fillRect(0, 0, 1000, h);
    ctx.fillStyle = "#e88161";
    ctx.fillRect(0, 0, 1000, 18);
    ctx.textAlign = "center";
    ctx.fillStyle = "#413a34";
    ctx.font = "bold 58px sans-serif";
    ctx.fillText(
      d.status === "reunited"
        ? "집으로 돌아왔어요!"
        : "우리 아이를 찾고 있어요",
      500,
      110,
    );
    ctx.fillStyle = "#917d6e";
    ctx.font = "24px sans-serif";
    ctx.fillText("멍백홈 · 작은 관심이 소중한 재회로", 500, 158);
    const img = new Image();
    img.src = d.image || "/assets/mascot-home.webp";
    await img.decode();
    if (!document.contains(canvas)) return;
    const photoH = format === "print" ? 630 : 400;
    const ratio = Math.max(820 / img.width, photoH / img.height);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(90, 200, 820, photoH, 24);
    ctx.clip();
    ctx.drawImage(
      img,
      500 - (img.width * ratio) / 2,
      200 + (photoH - img.height * ratio) / 2,
      img.width * ratio,
      img.height * ratio,
    );
    ctx.restore();
    const y = 200 + photoH;
    ctx.font = "bold 48px sans-serif";
    ctx.fillStyle = "#413a34";
    ctx.fillText(d.name, 500, y + 70, 820);
    ctx.font = "26px sans-serif";
    ctx.fillText(
      `${d.breed} · ${d.sex} · ${d.age || "나이 모름"}`,
      500,
      y + 114,
      820,
    );
    ctx.font = "24px sans-serif";
    ctx.fillText(d.location, 500, y + 160, 820);
    ctx.font = "22px sans-serif";
    ctx.fillStyle = "#8a7c70";
    ctx.fillText(formatTime(d.time), 500, y + 202);
    const qr = await QRCode.toDataURL(
      `${location.origin}${location.pathname}#/dog/${dogId}`,
      { width: 180, margin: 1 },
    );
    const qi = new Image();
    qi.src = qr;
    await qi.decode();
    ctx.drawImage(qi, 760, h - 200, 150, 150);
    ctx.textAlign = "left";
    ctx.font = "bold 28px sans-serif";
    ctx.fillStyle = "#c76748";
    ctx.fillText("보셨다면, 소식을 남겨주세요.", 90, h - 139, 640);
    ctx.font = "20px sans-serif";
    ctx.fillStyle = "#83776b";
    ctx.fillText("QR을 스캔하면 신고 내용을 볼 수 있어요.", 90, h - 99, 640);
    ctx.font = "17px sans-serif";
    ctx.fillText("멍백홈 · 소중한 관심에 감사합니다.", 90, h - 50);
  };
  document.querySelectorAll("[data-format]").forEach(
    (b) =>
      (b.onclick = async () => {
        format = b.dataset.format;
        document
          .querySelectorAll("[data-format]")
          .forEach((x) => x.classList.toggle("selected", x === b));
        try {
          await draw();
        } catch {
          toast("전단 이미지를 만들지 못했어요.");
        }
      }),
  );
  document.querySelector("#download-poster").onclick = async () => {
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `멍백홈-${d.name}-${format}.png`;
    a.click();
  };
  try {
    await draw();
  } catch {
    toast("사진을 불러오지 못했어요. 다시 시도해주세요.");
  }
}
function storyForm() {
  openModal(
    "다시 만난 이야기를 들려주세요",
    `<form id="story-form">${photoField()}${field("이야기 제목 *", "title", "text", "", 'required maxlength="100" placeholder="예: 이웃의 제보로 보리를 찾았어요"')}<label class="field"><span>재회 이야기 *</span><textarea name="text" rows="6" required maxlength="3000" placeholder="어떻게 다시 만났나요? 도움이 된 행동과 감사한 마음을 나눠주세요."></textarea></label><p class="local-notice">재회의 경험이 다른 보호자에게 큰 도움이 돼요.</p><button class="button primary full" type="submit">따뜻한 이야기 남기기${icon("heart")}</button></form>`,
  );
  const f = document.querySelector("#story-form");
  initPhotoPreview(f);
  f.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const v = Object.fromEntries(new FormData(f));
      if (!v.title.trim() || !v.text.trim())
        throw new Error("제목과 이야기를 입력해주세요.");
      read().stories.unshift({
        id: id("story"),
        title: v.title.trim(),
        text: v.text.trim(),
        image: await photoValue(f),
        time: new Date().toISOString(),
      });
      await persist();
      closeModal();
      location.hash = "/stories";
      render();
      toast("따뜻한 이야기를 저장했어요.");
    } catch (err) {
      formError(f, err.message);
    }
  };
}
function updateForm(dogId) {
  openModal(
    "수색 상황 공유",
    `<form id="update-form"><label class="field"><span>지금까지 확인한 내용을 알려주세요</span><textarea name="text" required maxlength="1000" rows="4" placeholder="예: 오후 4시에 공원 동쪽 산책로를 확인했어요."></textarea></label><button class="button primary full" type="submit">수색 상황 저장</button></form>`,
  );
  document.querySelector("#update-form").onsubmit = async (e) => {
    e.preventDefault();
    const text = e.target.elements.text.value.trim();
    if (!text) return;
    read().updates.unshift({
      id: id("update"),
      dogId,
      text,
      time: new Date().toISOString(),
    });
    await persist();
    closeModal();
    render();
    toast("수색 상황을 저장했어요.");
  };
}
function reunite(dogId) {
  const d = read().dogs.find((d) => d.id === dogId);
  openModal(
    "다시 만나서 정말 다행이에요",
    `<div class="reunion-confirm"><img src="/assets/mascot-reunion.webp" alt="서로 기대는 두 강아지"/><h3>${esc(d.name)}가 집으로 돌아왔나요?</h3><p>신고가 재회 완료로 바뀌고, 제보한 이웃과<br>소식을 저장한 분들에게 재회 알림이 전달돼요.</p><button class="button primary full" id="confirm-reunion">네, 무사히 만났어요${icon("heart")}</button></div>`,
  );
  document.querySelector("#confirm-reunion").onclick = async () => {
    d.status = "reunited";
    d.reunitedAt = new Date().toISOString();
    notify(
      `${d.name}가 가족의 품으로 돌아왔어요`,
      "함께 마음 써주셔서 감사해요. 수색이 종료되었어요.",
      d.id,
    );
    await persist();
    closeModal();
    render();
    toast("재회 완료로 바꿨어요. 소중한 순간을 후기로 남겨주세요.");
  };
}
function flag(target) {
  openModal(
    "내용 신고하기",
    `<form id="flag-form">${selectField("신고 이유", "reason", ["허위·잘못된 정보", "중복 신고", "부적절한 사진·내용", "금전 요구·사기 의심", "기타"])}<label class="field"><span>추가 설명</span><textarea name="detail" rows="3" maxlength="1000"></textarea></label><p class="local-notice">접수된 내용은 운영자에게 전달돼요. 확인할 수 있는 내용을 구체적으로 적어주세요.</p><button class="button primary full" type="submit">신고 접수</button></form>`,
  );
  document.querySelector("#flag-form").onsubmit = async (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target));
    read().moderation.push({
      id: id("flag"),
      target,
      reason: `${v.reason}${v.detail ? " · " + v.detail : ""}`,
      time: new Date().toISOString(),
      resolved: false,
    });
    await persist();
    closeModal();
    toast("신고 내역을 저장했어요.");
  };
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-action]");
  if (!b) {
    if (e.target.classList.contains("modal-backdrop")) closeModal();
    return;
  }
  const a = b.dataset.action,
    did = b.dataset.id;
  if(read().dogs.find(d=>d.id===did)?.previewOnly&&['sighting','save','share','poster','flag','update','reunite'].includes(a)){
    toast('화면 안내용 예시예요. 실제 제보나 공유 대상이 아니에요.');
    return;
  }
  if (a === "account") accountForm();
  else if(a==='verify-resend') {
    b.disabled=true;
    try {await api('/api/auth/resend',{});toast('인증 메일을 보냈어요. 스팸함도 확인해주세요.');}
    catch(error){toast(error.message);}finally{b.disabled=false;}
  }
  else if(a==='push-test') {
    try{await api('/api/push/test',{});toast('테스트 알림을 요청했어요. 잠시 뒤 도착하는지 확인해주세요.');}catch(error){toast(error.message);}
  }
  else if(a==='delete-account') {
    openModal('계정 삭제','<p>계정과 직접 등록한 신고·사진·제보·후기가 삭제돼요. 이 작업은 되돌릴 수 없어요.</p><form id="delete-account-form"><label class="field">현재 비밀번호<input type="password" name="password" required autocomplete="current-password"/></label><button class="button primary full" type="submit">계정과 내 기록 삭제하기</button><p role="status"></p></form>');
    const form=document.querySelector('#delete-account-form');
    form.onsubmit=async event=>{
      event.preventDefault();const button=form.querySelector('button');button.disabled=true;
      try{await api('/api/auth/delete',Object.fromEntries(new FormData(form)));for(const key of Object.keys(localStorage))if(key.startsWith('meongback-draft-'))localStorage.removeItem(key);closeModal();location.hash='/';await initialize();render();toast('계정과 등록한 기록을 삭제했어요.');}
      catch(error){form.querySelector('[role=status]').textContent=error.message;button.disabled=false;}
    };
  }
  else if (a === "logout") {
    await authenticate("logout");
    render();
    toast("로그아웃했어요.");
  } else if (a === "push") {
    try {
      await enablePush();
      toast("브라우저 알림을 켰어요.");
    } catch (err) {
      toast(err.message);
    }
  } else if (a === "refresh") {
    await refresh();
    render();
  } else if (a === "close" || a === "close-link") closeModal();
  else if (a === "report")
    dogForm({
      profile: read().profiles.find((p) => p.id === b.dataset.profile),
    });
  else if (a === "edit-dog")
    dogForm({ edit: read().dogs.find((d) => d.id === did) });
  else if (a === "profile") dogForm({ profileOnly: true });
  else if (a === "sighting") sightingForm(did);
  else if (a === "save") {
    const i = read().saved.indexOf(did);
    if (i >= 0) read().saved.splice(i, 1);
    else read().saved.push(did);
    await persist();
    render();
    toast(
      i >= 0
        ? "저장을 취소했어요."
        : "소식을 저장했어요. 마이홈에서 다시 볼 수 있어요.",
    );
  } else if (a === "region") regionModal();
  else if (a === "select-region") {
    state.region = b.dataset.region;
    closeModal();
    render();
  } else if (a === "filters") {
    state.showFilters = !state.showFilters;
    render();
  } else if (a === "clear-filters") {
    Object.assign(state, {
      region: "전국",
      query: "",
      color: "",
      size: "",
      accessory: "",
      status: "all",
    });
    render();
  } else if (a === "view") {
    state.view = b.dataset.view;
    render();
  } else if (a === "status") {
    state.status = b.dataset.status;
    render();
  } else if (a === "areas") areaModal();
  else if (a === "notifications") notifications();
  else if (a === "notification-open") {
    const n = read().notifications.find((n) => n.id === did);
    closeModal();
    location.hash = n.dogId ? `/dog/${n.dogId}` : "/sightings";
  } else if (a === "report-detail") reportDetail(did);
  else if (a === "share") share(did);
  else if (a === "poster") poster(did);
  else if (a === "story") storyForm();
  else if (a === "update") updateForm(did);
  else if (a === "reunite") reunite(did);
  else if (a === "flag") flag(did);
  else if (a === "resolve") {
    read().moderation.find((m) => m.id === did).resolved = true;
    await persist();
    render();
    toast("처리 완료로 변경했어요.");
  } else if (a === "public-data")
    openModal(
      "공공 보호 정보 연계",
      `<div class="info-content">${icon("building-2")}<h3>보호소 접수 정보도 함께 확인할 수 있도록</h3><p>국가동물보호정보시스템의 공공 데이터 연계를 위한 영역이에요. 현재 API가 연결되어 있지 않아 보호소 정보를 표시하지 않아요.</p><p>운영 버전에서는 서버에서 데이터를 가져와 발견 장소·접수일·특징으로 비교할 예정이에요.</p></div>`,
    );
  else if (a === "about")
    openModal(
      "모든 강아지가, 다시 집으로",
      `<div class="info-content"><img src="/assets/mascot-reunion.webp" alt=""/><p>멍백홈은 실종 강아지의 보호자와 주변에서 강아지를 발견한 사람을 연결하는 서비스예요.</p><p>예시 표시가 있는 신고의 사진은 AI로 생성되었고, 실제 실종 신고가 아니에요. 직접 등록한 신고와 제보는 서버에 저장되어 다른 기기에서도 확인할 수 있어요.</p><p>계정, 신고, 당사자 대화와 실시간 알림함을 사용할 수 있어요. 브라우저 푸시는 HTTPS와 발신 설정이 필요하며, 공공 보호 정보는 아직 연동 전이에요.</p></div>`,
    );
  else if (a === "privacy")
    openModal(
      "개인정보와 위치 안내",
      `<div class="info-content"><p>등록한 신고·제보는 서버에 저장돼요. 작성 중인 초안은 이 기기에 7일 동안 보관되며 등록을 완료하면 지워져요. 대화와 보호 중인 정확한 위치는 당사자만 볼 수 있어요.</p><p>지도를 열면 OpenStreetMap 서버에서 지도 이미지를 불러와요. 현재 위치와 나침반은 사용자가 해당 버튼을 누르고 권한을 허용할 때 사용해요.</p><p>공용 기기에서는 이용 후 로그아웃해주세요. 신고 설명이나 공개 사진에는 전화번호와 집 주소가 드러나지 않도록 확인해주세요.</p></div>`,
    );
});
document.addEventListener("input", (e) => {
  if (e.target.id === "dog-search") {
    state.query = e.target.value;
    renderResults();
  }
});
document.querySelector(".skip-link").addEventListener("click", (e) => {
  e.preventDefault();
  const main = document.querySelector("#main");
  main.setAttribute("tabindex", "-1");
  main.focus();
  main.scrollIntoView();
});
document.addEventListener("change", (e) => {
  if (e.target.dataset.filter) {
    state[e.target.dataset.filter] = e.target.value;
    renderResults();
  }
});
document.addEventListener("keydown", (e) => {
  if (!modalRoot.children.length) return;
  if (e.key === "Escape") closeModal();
  if (e.key === "Tab") {
    const f = [
      ...modalRoot.querySelectorAll(
        'button,a,input,select,textarea,[tabindex="0"]',
      ),
    ].filter((el) => !el.disabled && el.getClientRects().length);
    const first = f[0],
      last = f.at(-1);
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last?.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first?.focus();
    }
  }
});
window.addEventListener("hashchange", () => {
  closeModal();
  render();
  window.scrollTo({ top: 0 });
});

window.addEventListener("store-updated", () => {
  if (!modalRoot.children.length && !route().startsWith('/account/')) render();
});
window.addEventListener("remote-change", () => {
  if (modalRoot.children.length) pendingRefresh = true;
  else refresh();
});
window.addEventListener("connection-change", () => decorateSession());
window.addEventListener("unhandledrejection", (e) => {
  e.preventDefault();
  toast(e.reason?.message || "처리하지 못했어요. 다시 시도해주세요.");
});
window.addEventListener("online", () => refresh());
initialize();

function dashboard() {
  const mine = read().dogs.filter((d) => d.canManage && d.status === "missing");
  if (!mine.length) return "";
  const d = mine[0],
    reports = chronologicalSightings(
      read().reports.filter((r) => r.dogId === d.id),
    ),
    last = reports.at(-1),
    unread = read().notifications.filter(
      (n) => !n.read && n.dogId === d.id,
    ).length;
  return `<section class="owner-dashboard"><div class="dashboard-intro"><span class="eyebrow"><span class="live-dot"></span>함께 찾고 있어요</span><h1>${esc(d.name)}의 새로운 단서부터<br>확인해보세요<span class="coral">.</span></h1><p>${last ? `최근 목격 · ${esc(last.location)}` : "주변 이웃의 소중한 제보를 기다리고 있어요."}</p><div class="dashboard-actions"><a class="button primary" href="#/dog/${d.id}">목격 지도 확인 ${icon("arrow-right")}</a><button class="button white" data-action="share" data-id="${d.id}">${icon("share-2")}소식 공유</button></div></div><div class="dashboard-companion"><img src="/assets/mascot-search.webp" alt="함께 찾고 있는 멍백홈 강아지"/><div class="dashboard-count"><b>${reports.length}</b>개의 목격 단서 <span>${unread ? "새 알림 " + unread + "개" : "함께 찾는 마음을 모아요"}</span></div></div><div class="dashboard-last"><span>${icon("map-pin")}${last ? esc(last.location) : esc(d.location)}</span><span>${last ? formatTime(last.time) : "마지막으로 본 장소"}</span></div></section>`;
}
function decorateSession() {
  const user = read().user;
  const header = document.querySelector(".header-actions");
  const accountLabel = !user?.registered
    ? "로그인"
    : user.verified
      ? `${esc(user.name)} 님`
      : `인증 전 · ${esc(user.name)}`;
  if (header && !header.querySelector(".account-button"))
    header.insertAdjacentHTML("afterbegin", `<button class="account-button text-button" data-action="account">${accountLabel}</button>`);
  else if (header?.querySelector(".account-button"))
    header.querySelector(".account-button").innerHTML = accountLabel;
  let connection = document.querySelector("#connection-banner");
  if (!connection) {
    connection = document.createElement("div");
    connection.id = "connection-banner";
    document.querySelector(".site-header")?.after(connection);
  }
  const status = read().connection;
  connection.hidden = status === "online" || status === "loading";
  connection.innerHTML =
    status === 'unconfigured'
      ? `서비스 저장소 연결을 준비 중이에요. 지금은 예시만 볼 수 있고, 회원가입·신고·제보 저장은 아직 사용할 수 없어요. <button data-action="refresh">다시 확인</button>`
      : status === "offline"
      ? `서버에 연결하지 못했어요. 작성 중인 내용은 초안으로 보관해요. <button data-action="refresh">다시 연결</button>`
      : "연결을 다시 확인하고 있어요. 잠시만 기다려주세요.";
  if (route() === "/my" && !document.querySelector(".account-panel"))
    document
      .querySelector(".my-sections")
      ?.insertAdjacentHTML(
        "afterbegin",
        `<section class="account-panel ${user?.registered && !user.verified ? "account-panel-unverified" : ""}"><img src="/assets/mascot-alert.webp" alt=""/><div><strong>${user?.registered ? (user.verified ? esc(user.name) + " 님, 소식을 놓치지 마세요" : esc(user.name) + " 님, 이메일 인증이 필요해요") : "다른 기기에서도 이어서 관리하세요"}</strong><p>${user?.registered ? (user.verified ? "목격 제보와 재회 소식을 알림으로 받아보세요." : "인증 전에는 실종 신고와 제보 저장을 사용할 수 없어요.") : "계정을 연결하면 신고와 대화를 안전하게 이어갈 수 있어요."}</p><button class="button primary small" data-action="${user?.registered ? "account" : "account"}">${user?.registered ? (user.verified ? "브라우저 알림 켜기" : "이메일 인증하기") : "로그인 / 회원가입"}</button>${user?.registered ? '<button class="text-button logout-button" data-action="logout">로그아웃</button>' : ""}</div></section>`,
      );
  document.querySelectorAll('[data-action="update"]').forEach((b) => {
    b.hidden = !read().dogs.find((d) => d.id === b.dataset.id)?.canManage;
  });
  if (read().dogs.some((d) => d.canManage && d.status === "missing"))
    document.querySelector(".hero")?.classList.add("returning-hero");
}
function accountForm(after) {
  const user = read().user;
  if (user?.registered && !after) {
    openModal(
      "내 계정",
      `<div class="account-intro"><img src="/assets/mascot-alert.webp" alt=""/><h3>${esc(user.name)} 님과 함께 찾고 있어요</h3>${verificationPanel()}<button class="button primary full" data-action="push">브라우저 알림 켜기</button><button class="button white full" data-action="install-app">홈 화면에 추가하기</button><button class="text-button" data-action="device-check">이 휴대폰에서 기능 확인</button><button class="text-button" data-action="logout">로그아웃</button></div>`,
    );
    return;
  }
  let mode = 'login';
  const values={};
  const show = () => {
    openModal(
      mode === 'register' ? '회원가입' : '로그인',
      `<div class="auth-intro"><p>${after?'작성한 신고는 이 기기에 저장돼 있어요. 로그인하면 이어서 등록할 수 있어요.':'로그인하면 내 신고와 제보를 확인할 수 있어요.'}</p>${after?'<div class="auth-next-step">처음 가입한 경우, 이메일 인증 후 신고할 수 있어요.</div>':''}</div><div class="auth-tabs" aria-label="로그인 또는 회원가입"><button type="button" data-auth-mode="login" class="${mode==='login'?'active':''}" aria-pressed="${mode==='login'}">로그인</button><button type="button" data-auth-mode="register" class="${mode==='register'?'active':''}" aria-pressed="${mode==='register'}">회원가입</button></div><form id="account-form">${mode==='register'?field('닉네임','name','text',values.name||'','required maxlength="30" autocomplete="nickname" placeholder="예: 보리 보호자"'):''}${field('이메일','email','email',values.email||'','required autocomplete="email" placeholder="이메일 주소 입력"')}${field(mode==='register'?'비밀번호 (10자 이상)':'비밀번호','password','password','','required minlength="10" maxlength="200" autocomplete="'+(mode==='register'?'new-password':'current-password')+'" placeholder="비밀번호 입력"')}${mode==='register'?field('비밀번호 확인','passwordConfirm','password','','required minlength="10" maxlength="200" autocomplete="new-password" placeholder="비밀번호 다시 입력"'):''}<button class="button primary full" type="submit">${mode==='register'?'회원가입':'로그인'}</button></form>`,

    );
    document.querySelectorAll("[data-auth-mode]").forEach(
      (b) =>
        (b.onclick = () => {
          const current=document.querySelector('#account-form');
          if(current)Object.assign(values,{email:current.elements.email.value,name:current.elements.name?.value||values.name});
          mode = b.dataset.authMode;
          show();
        }),
    );
    const form = document.querySelector("#account-form");
    if(mode==='login')form.insertAdjacentHTML('afterend','<a class="text-button recovery-link" href="#/account/forgot">비밀번호를 잊으셨나요?</a>');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const b = form.querySelector("[type=submit]");
      b.disabled = true;
      if(mode==='register'&&form.elements.password.value!==form.elements.passwordConfirm.value){formError(form,'비밀번호가 일치하지 않아요. 다시 확인해주세요.');b.disabled=false;return;}
      b.textContent = mode==='register'?'가입 중…':'로그인 중…';
      try {
        const result=await authenticate(mode, Object.fromEntries(new FormData(form)));
        closeModal();
        render();
        if (after) {
          after();
          if (result.emailDelivery === 'sent') toast('받은 메일에서 이메일을 인증하면 작성한 신고를 바로 등록할 수 있어요.');
        } else toast(result.emailDelivery==='sent'?'회원가입이 완료됐어요. 받은 메일에서 이메일을 인증해주세요.':mode==='register'?'회원가입이 완료됐어요.':'로그인했어요.');
      } catch (err) {
        formError(form, err.message);
        b.disabled = false;
        b.textContent = "다시 시도하기";
      }
    };
  };
  show();
}

import "./quality.css";
import {accountPage,bindAccountPage,verificationPanel} from './account-ui.js';
import {setupWebApp} from './webapp.js';
setupWebApp({openModal,toast});

function registeredNext(dogId) {
  const d = read().dogs.find((d) => d.id === dogId);
  if (!d) return;
  openModal(
    "이웃과 함께 찾을 준비가 됐어요",
    `<div class="success-next"><img src="/assets/mascot-alert.webp" alt=""/><h3>${esc(d.name)}의 소식을 알려주세요</h3><p>공유한 링크 하나가<br>소중한 목격 제보로 이어질 수 있어요.</p><button class="button primary full" data-action="share" data-id="${dogId}">신고 링크 공유하기 →</button><button class="button white full" data-action="poster" data-id="${dogId}">QR 전단 만들기</button><button class="text-button" data-action="close">신고 내용 먼저 확인하기</button></div>`,
  );
}
