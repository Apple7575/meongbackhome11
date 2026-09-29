import { drawTimeline } from "./maps.js";
import {
  chronologicalSightings,
  escapeHTML as esc,
  headingLabel,
} from "./domain.js";
export function timelineExperience(map, reports, openReport) {
  const ordered = chronologicalSightings(reports),
    host = document.querySelector(".timeline-layout");
  if (!host) return () => {};
  let index = 0,
    playing = false,
    timer;
  const oldList = host.querySelector(".timeline-list");
  oldList?.remove();
  host.classList.add("interactive-timeline");
  const sheet = document.createElement("section");
  sheet.className = "timeline-sheet";
  sheet.setAttribute("aria-label", "목격 기록 탐색");
  sheet.innerHTML = `<button class="sheet-handle" aria-label="목격 목록 펼치기" aria-expanded="false"><span></span></button><div class="timeline-player"><div><span class="eyebrow">목격 기록을 시간순으로</span><strong><span id="timeline-index">${ordered.length ? 1 : 0}</span> / ${ordered.length} <small>개의 단서</small></strong></div><button class="play-button" ${ordered.length < 2 ? "disabled" : ""} aria-label="목격 기록 재생">▶ <span>시간순 재생</span></button></div><div class="timeline-track">${ordered.map((r, i) => `<button class="track-dot ${r.status === "관련 목격" ? "verified" : ""}" data-index="${i}" aria-label="${i + 1}번 목격 기록">${i + 1}</button>`).join("")}</div><div class="sighting-carousel" tabindex="0" aria-label="좌우로 넘겨 목격 기록 보기">${ordered.map((r, i) => `<article class="sighting-slide" data-index="${i}"><div class="slide-top"><span class="badge ${r.status === "관련 목격" ? "sage" : "unverified"}">${r.status === "관련 목격" ? "✓ 보호자 확인" : esc(r.status)}</span><time>${new Date(r.time).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time></div><h3>${esc(r.location)}</h3><div class="slide-content">${r.image ? `<img src="${esc(r.image)}" alt="목격 제보 사진"/>` : '<img src="/assets/mascot-search.webp" alt="" class="slide-mascot"/>'}<div><strong>${r.stationary ? "머물러 있었어요" : r.heading == null ? "방향 정보 없음" : `${headingLabel(r.heading)}으로 이동 ↗`}</strong><p>${esc(r.description || "사진과 위치를 확인해주세요.")}</p></div></div><button class="button white full small open-sighting" data-id="${r.id}">제보 자세히 보기 · 대화하기 →</button></article>`).join("") || '<div class="timeline-empty"><img src="/assets/mascot-search.webp" alt=""/><strong>아직 첫 번째 단서를 기다리고 있어요</strong><p>목격한 장소와 시간을 알려주세요.</p></div>'}</div><div class="carousel-nav"><button class="previous-sighting" aria-label="이전 목격">←</button><span>카드를 옆으로 넘겨보세요</span><button class="next-sighting" aria-label="다음 목격">→</button></div><p class="timeline-note">점선은 목격 순서예요. 실제 이동 경로를 뜻하지 않아요.</p>`;
  host.append(sheet);
  const carousel = sheet.querySelector(".sighting-carousel");
  let api;
  const select = (next, scroll = true) => {
    if (!ordered.length) return;
    index = Math.max(0, Math.min(ordered.length - 1, next));
    sheet.querySelector("#timeline-index").textContent = index + 1;
    sheet.querySelectorAll(".track-dot").forEach((b, i) => {
      b.classList.toggle("active", i === index);
      b.setAttribute("aria-pressed", i === index);
    });
    sheet.querySelector(".previous-sighting").disabled = index === 0;
    sheet.querySelector(".next-sighting").disabled =
      index === ordered.length - 1;
    api?.select(ordered[index].id);
    if (scroll)
      carousel.scrollTo({
        left: carousel.clientWidth * index,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
  };
  api = drawTimeline(map, reports, (id) =>
    select(ordered.findIndex((r) => r.id === id)),
  );
  const stop = () => {
    playing = false;
    clearInterval(timer);
    sheet.querySelector(".play-button").innerHTML =
      "▶ <span>시간순 재생</span>";
    sheet
      .querySelector(".play-button")
      .setAttribute("aria-label", "목격 기록 재생");
  };
  sheet.querySelector(".play-button").onclick = () => {
    if (playing) {
      stop();
      return;
    }
    playing = true;
    sheet.querySelector(".play-button").innerHTML = "Ⅱ <span>일시정지</span>";
    sheet
      .querySelector(".play-button")
      .setAttribute("aria-label", "목격 기록 일시정지");
    if (index === ordered.length - 1) select(0);
    timer = setInterval(() => {
      if (index >= ordered.length - 1) stop();
      else select(index + 1);
    }, 2600);
  };
  sheet.querySelectorAll(".track-dot").forEach(
    (b) =>
      (b.onclick = () => {
        stop();
        select(Number(b.dataset.index));
      }),
  );
  sheet.querySelector(".previous-sighting").onclick = () => {
    stop();
    select(index - 1);
  };
  sheet.querySelector(".next-sighting").onclick = () => {
    stop();
    select(index + 1);
  };
  sheet.querySelectorAll(".open-sighting").forEach(
    (b) =>
      (b.onclick = () => {
        stop();
        openReport(b.dataset.id);
      }),
  );
  let debounce,resizeTimer;
  carousel.addEventListener("scroll", () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      const next = Math.round(carousel.scrollLeft / carousel.clientWidth);
      if (next !== index) select(next, false);
    }, 120);
  });
  carousel.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      stop();
      select(index + (e.key === "ArrowRight" ? 1 : -1));
    }
  });
  const handle = sheet.querySelector(".sheet-handle");
  const expand = () => {
    const expanded = sheet.classList.toggle("expanded");
    handle.setAttribute("aria-expanded", expanded);
    clearTimeout(resizeTimer);
    resizeTimer=setTimeout(() => map.invalidateSize(), 250);
  };
  handle.onclick = expand;
  let startY;
  handle.addEventListener(
    "touchstart",
    (e) => (startY = e.touches[0].clientY),
    { passive: true },
  );
  handle.addEventListener("touchend", (e) => {
    const delta = e.changedTouches[0].clientY - startY;
    if (Math.abs(delta) > 20) {
      sheet.classList.toggle("expanded", delta < 0);
      handle.setAttribute("aria-expanded", delta < 0);
    }
  });
  select(0, false);
  return () => {
    clearInterval(timer);
    clearTimeout(debounce);
    clearTimeout(resizeTimer);
  };
}
