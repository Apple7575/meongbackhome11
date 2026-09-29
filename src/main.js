import {
  createIcons,
  ArrowRight,
  BellRing,
  Building2,
  Camera,
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
  LocateFixed,
  MapPin,
  MessagesSquare,
  Navigation,
  Plus,
  QrCode,
  Route,
  ScanEye,
  ScanSearch,
  Send,
  Share2,
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
import { formatTime, timeAgo } from "./format.js";
import { readPhoto } from "./photo.js";
import { baseMap, marker, drawTimeline, directionPicker } from "./maps.js";
import "./style.css";

let app = null;
export function mountLegacy(el) {
  app = el;
  if (app) render();
}
const modalRoot = document.querySelector("#modal-root");
let pendingRefresh = false;
let modalCleanup = async () => {},
  previousFocus = null;
const icon = (name, cls = "") =>
  `<i data-lucide="${name}" class="${cls}" aria-hidden="true"></i>`;
const refreshIcons = () =>
  createIcons({
    icons: {
      ArrowRight,
      BellRing,
      Building2,
      Camera,
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
      LocateFixed,
      MapPin,
      MessagesSquare,
      Navigation,
      Plus,
      QrCode,
      Route,
      ScanEye,
      ScanSearch,
      Send,
      Share2,
      X,
    },
    attrs: { "stroke-width": 1.7 },
  });
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
export function toast(message) {
  const el = document.querySelector("#toast");
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove("visible"), 3800);
}
function empty(title, body, button = "") {
  return `<div class="empty-state"><img src="/assets/mascot-reunion.webp" alt=""/><h3>${title}</h3><p>${body}</p>${button}</div>`;
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
  // React 화면에서는 그리지 않고, 옛 동작이 바꾼 데이터를 React가 다시 그리도록 알린다.
  if (!app) {
    window.dispatchEvent(new Event("legacy-render"));
    return;
  }
  const p = route();
  let body;
  if (p === "/stories") body = stories();
  else if (p === "/admin") body = admin();
  else
    body = empty(
      "페이지를 찾을 수 없어요",
      "홈으로 돌아가 다시 시작해주세요.",
      '<a class="button primary" href="#/">홈으로</a>',
    );
  app.innerHTML = body;
  refreshIcons();
  decorateSession();
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
  modalRoot.innerHTML = `<div class="modal-backdrop"><section class="modal ${wide ? "wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="modal-title"><div class="sheet-handle" aria-hidden="true"></div><div class="modal-header"><h2 id="modal-title">${title}</h2><button class="icon-button" data-action="close" aria-label="닫기">${icon("x")}</button></div><div class="modal-content">${body}</div></section></div>`;
  document.body.classList.add("modal-open");
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
  return readPhoto(file);
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
  // 로그인한 사람의 계정 메뉴는 설정 화면이 맡는다.
  if (a === "account") {
    if (read().user?.registered) location.hash = "/my/settings";
    else openSheet("auth");
  }
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
      toast("새 목격 소식 알림을 켰어요.");
    } catch (err) {
      toast(err.message);
    }
  } else if (a === "refresh") {
    await refresh();
    render();
  } else if (a === "close" || a === "close-link") closeModal();
  // 신고·제보는 React 전체 화면 흐름(src/screens/forms)으로 이동한다.
  else if (a === "report")
    location.hash = b.dataset.profile ? `/report/from/${b.dataset.profile}` : "/report/new";
  else if (a === "edit-dog") location.hash = `/report/edit/${did}`;
  else if (a === "profile") location.hash = "/profile/new";
  else if (a === "sighting") location.hash = did ? `/sighting/new/${did}` : "/sighting/new";
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
  } else if (a === "areas") openSheet("areas");
  else if (a === "notifications") openSheet("notifications");
  else if (a === "report-detail")
    window.dispatchEvent(new CustomEvent("open-report", { detail: did }));
  else if (a === "share") share(did);
  else if (a === "poster") poster(did);
  else if (a === "story") storyForm();
  else if (a === "update") updateForm(did);
  else if (a === "reunite") openSheet("reunite", { dogId: did });
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
document.querySelector(".skip-link").addEventListener("click", (e) => {
  e.preventDefault();
  const main = document.querySelector("#main");
  main.setAttribute("tabindex", "-1");
  main.focus();
  main.scrollIntoView();
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
  // React 화면에서는 render()가 그리지 않으므로 연결 배너는 여기서 따로 갱신한다.
  decorateSession();
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

function decorateSession() {
  const connection = document.querySelector("#connection-banner");
  if (!connection) return;
  const status = read().connection;
  connection.hidden = status === "online" || status === "loading";
  connection.innerHTML =
    status === 'unconfigured'
      ? `서비스 저장소 연결을 준비 중이에요. 지금은 예시만 볼 수 있고, 회원가입·신고·제보 저장은 아직 사용할 수 없어요. <button data-action="refresh">다시 확인</button>`
      : status === "offline"
      ? `서버에 연결하지 못했어요. 작성 중인 내용은 초안으로 보관해요. <button data-action="refresh">다시 연결</button>`
      : "연결을 다시 확인하고 있어요. 잠시만 기다려주세요.";
  document.querySelectorAll('[data-action="update"]').forEach((b) => {
    b.hidden = !read().dogs.find((d) => d.id === b.dataset.id)?.canManage;
  });
}

import "./quality.css";
import { openSheet } from './app/sheets.js';
// 신고 흐름이 쓰는 로그인 요청. React 로그인 시트를 연다.
export function accountForm(after) {
  openSheet("auth", { after });
}
import {setupWebApp} from './webapp.js';
setupWebApp({openModal,toast});

export function registeredNext(dogId) {
  const d = read().dogs.find((d) => d.id === dogId);
  if (!d) return;
  openModal(
    "이웃과 함께 찾을 준비가 됐어요",
    `<div class="success-next"><img src="/assets/mascot-alert.webp" alt=""/><h3>${esc(d.name)}의 소식을 알려주세요</h3><p>공유한 링크 하나가<br>소중한 목격 제보로 이어질 수 있어요.</p><button class="button primary full" data-action="share" data-id="${dogId}">신고 링크 공유하기 →</button><button class="button white full" data-action="poster" data-id="${dogId}">QR 전단 만들기</button><button class="button white full" data-action="push">새 목격 제보 알림 받기</button><p class="field-hint">${esc(d.name)} 목격 제보가 오면 바로 알려드려요. 나중에 설정에서 켜도 돼요.</p><button class="text-button" data-action="close">신고 내용 먼저 확인하기</button></div>`,
  );
}
