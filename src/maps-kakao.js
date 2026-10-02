// 카카오맵(JavaScript SDK)으로 그리는 지도. maps.js(Leaflet)와 공개 함수 모양이 같아서 화면 코드는 어느 쪽인지 모른다.
// SDK는 app/withMaps.ts가 불러온 뒤에만 이 파일을 쓴다(window.kakao.maps가 준비된 상태).
import { chronologicalSightings, arrowEnd, escapeHTML, headingLabel } from "./domain.js";
import { groupByPixel, centerOf, samePlace } from "./cluster.js";

const k = () => window.kakao.maps;
const ll = ([lat, lng]) => new (k().LatLng)(lat, lng);
const pt = (latLng) => [latLng.getLat(), latLng.getLng()];
// Leaflet 확대 단계(클수록 가까이) ↔ 카카오 지도 레벨(작을수록 가까이)
const level = (zoom) => Math.min(14, Math.max(1, 20 - zoom));
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// 화면 코드가 쓰는 지도 손잡이: remove, setView, fitBounds, 그리고 이 파일 안에서만 쓰는 kmap
function handle(kmap, element) {
  const h = {
    kmap,
    remove() {
      element.replaceChildren();
    },
    setView(center, zoom) {
      kmap.setLevel(level(zoom));
      kmap.setCenter(ll(center));
    },
    // points: 좌표 목록. maxZoom보다 가까이 들어가지 않는다.
    fitBounds(points, { paddingTopLeft = [40, 40], paddingBottomRight = [40, 40], maxZoom = 16 } = {}) {
      if (!points.length) return;
      const b = new (k().LatLngBounds)();
      points.forEach((p) => b.extend(ll(p)));
      const [left, top] = paddingTopLeft;
      const [right, bottom] = paddingBottomRight;
      kmap.setBounds(b, top, right, bottom, left);
      if (kmap.getLevel() < level(maxZoom)) kmap.setLevel(level(maxZoom));
    },
  };
  return h;
}

export function baseMap(element, center = [37.512, 127.107], zoom = 15) {
  element.classList.add("kakao-map");
  const kmap = new (k().Map)(element, { center: ll(center), level: level(zoom) });
  kmap.addControl(new (k().ZoomControl)(), k().ControlPosition.RIGHT);
  // 화면이 막 그려진 직후에는 크기가 0일 수 있어 한 번 다시 잰다.
  setTimeout(() => kmap.relayout(), 100);
  return handle(kmap, element);
}

// 핀: Leaflet 쪽과 같은 모양(.custom-map-icon > .map-pin)을 HTML로 올린다.
export function marker(map, coords, label = "•", className = "") {
  const el = document.createElement("div");
  el.className = "custom-map-icon";
  el.innerHTML = `<span class="map-pin ${className}"><b>${escapeHTML(String(label || "•"))}</b></span>`;
  const overlay = new (k().CustomOverlay)({ position: ll(coords), content: el, xAnchor: 0.5, yAnchor: 0.9, clickable: true });
  overlay.setMap(map.kmap);
  let popup = null;
  const m = {
    remove: () => { overlay.setMap(null); popup?.setMap(null); },
    overlay,
    getElement: () => el,
    getLatLng: () => overlay.getPosition(),
    on(event, fn) {
      if (event === "click") el.addEventListener("click", (e) => { e.stopPropagation(); fn(); });
      return m;
    },
    // 누르면 핀 위에 작은 설명을 띄우고, 지도 빈 곳을 누르면 닫는다.
    bindPopup(html) {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!popup) {
          const box = document.createElement("div");
          box.className = "kakao-popup";
          box.innerHTML = html;
          box.addEventListener("click", (ev) => ev.stopPropagation());
          popup = new (k().CustomOverlay)({ position: overlay.getPosition(), content: box, xAnchor: 0.5, yAnchor: 1.45, zIndex: 5, clickable: true });
          k().event.addListener(map.kmap, "click", () => popup.setMap(null));
        }
        popup.setMap(popup.getMap() ? null : map.kmap);
      });
      return m;
    },
  };
  return m;
}

// 여러 핀을 겹치지 않게 그린다(maps.js의 pins와 같은 동작).
export function pins(map, items) {
  const kmap = map.kmap;
  let drawn = [];
  const draw = () => {
    drawn.forEach((m) => m.remove());
    drawn = [];
    const proj = kmap.getProjection();
    for (const g of groupByPixel(items, (c) => proj.containerPointFromCoords(ll(c)))) {
      if (g.length === 1) {
        const it = g[0];
        const m = marker(map, it.coords, "", it.className || "");
        if (it.popup) m.bindPopup(it.popup);
        if (it.onClick) m.on("click", it.onClick);
        drawn.push(m);
        continue;
      }
      drawn.push(marker(map, centerOf(g), String(g.length), "cluster-pin").on("click", () => {
        if (samePlace(g) || kmap.getLevel() <= 1) return g[0].onClick?.();
        map.fitBounds(g.map((i) => i.coords), { paddingTopLeft: [60, 60], paddingBottomRight: [60, 60], maxZoom: 19 });
      }));
    }
  };
  draw();
  k().event.addListener(kmap, "zoom_changed", draw);
  return () => { k().event.removeListener(kmap, "zoom_changed", draw); drawn.forEach((m) => m.remove()); };
}
// 내 근처 반경을 원으로 그리고, 원 전체가 화면에 들어오게 맞춘다.
export function rangeCircle(map, center, km, { paddingTopLeft = [16, 16], paddingBottomRight = [16, 16] } = {}) {
  const circle = new (k().Circle)({
    center: ll(center), radius: km * 1000,
    strokeWeight: 1.5, strokeColor: "#3182f6", strokeOpacity: 0.6, fillColor: "#3182f6", fillOpacity: 0.06,
  });
  circle.setMap(map.kmap);
  const b = circle.getBounds();
  map.kmap.setBounds(b, paddingTopLeft[1], paddingBottomRight[0], paddingBottomRight[1], paddingTopLeft[0]);
  return circle;
}

function arrow(map, from, heading, meters, weight) {
  const end = arrowEnd(from, heading, meters);
  const line = new (k().Polyline)({ path: [ll(from), ll(end)], strokeWeight: weight, strokeColor: "#e77f5d", strokeOpacity: 1 });
  line.setMap(map.kmap);
  const tip = document.createElement("div");
  tip.className = "direction-icon";
  tip.innerHTML = `<span style="transform:rotate(${Number(heading)}deg)">▲</span>`;
  const o = new (k().CustomOverlay)({ position: ll(end), content: tip, xAnchor: 0.5, yAnchor: 0.5 });
  o.setMap(map.kmap);
  return () => { line.setMap(null); o.setMap(null); };
}

export function drawTimeline(map, reports, onSelect) {
  const ordered = chronologicalSightings(reports);
  const pins = new Map();
  if (ordered.length > 1)
    new (k().Polyline)({ path: ordered.map((s) => ll(s.coords)), strokeWeight: 3, strokeColor: "#738a79", strokeOpacity: 0.8, strokeStyle: "dash" }).setMap(map.kmap);
  ordered.forEach((s, i) => {
    const m = marker(map, s.coords, i + 1, s.status === "관련 목격" ? "confirmed" : "unconfirmed");
    pins.set(s.id, m);
    m.bindPopup(
      `<strong>${escapeHTML(s.location)}</strong><br>${escapeHTML(new Date(s.time).toLocaleString("ko-KR"))}<br>${escapeHTML(s.status)} · ${s.stationary ? "머물러 있었어요" : headingLabel(s.heading)}`,
    );
    if (onSelect) m.on("click", () => onSelect(s.id));
    if (s.heading !== null && s.heading !== undefined && !s.stationary) arrow(map, s.coords, s.heading, undefined, 3);
  });
  if (ordered.length) map.fitBounds(ordered.map((s) => s.coords), { paddingTopLeft: [65, 65], paddingBottomRight: [65, 65], maxZoom: 16 });
  return {
    select(id) {
      const target = pins.get(id);
      if (!target) return;
      for (const [key, pin] of pins) pin.getElement().classList.toggle("selected-pin", key === id);
      if (reduced()) map.kmap.setCenter(target.getLatLng());
      else map.kmap.panTo(target.getLatLng());
    },
  };
}

// 가운데 고정 핀 방식: 지도를 끌면 가운데가 고른 지점이 되고, 누르면 그 지점으로 옮긴다.
// 핀은 화면(CSS)이 지도 가운데에 그린다.
export function directionPicker(element, coords, onChange) {
  const map = baseMap(element, coords, 16);
  const kmap = map.kmap;
  let clearArrow = null, silent = false;
  const same = (a, b) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
  k().event.addListener(kmap, "idle", () => {
    const c = pt(kmap.getCenter());
    // 확대 버튼처럼 가운데가 그대로인 이동은 고른 것으로 치지 않는다.
    if (silent || same(c, coords)) return;
    coords = c;
    onChange(coords);
  });
  k().event.addListener(kmap, "click", (e) => {
    coords = pt(e.latLng);
    onChange(coords);
    kmap.panTo(e.latLng);
  });
  const set = (point, heading) => {
    if (!same(point, coords)) {
      coords = point;
      // 코드로 옮길 때는 고른 것으로 치지 않는다(idle은 나중에 오므로 그때까지 막는다).
      silent = true;
      kmap.setCenter(ll(coords));
      setTimeout(() => { silent = false; }, 300);
    }
    clearArrow?.();
    clearArrow = null;
    if (heading !== null) clearArrow = arrow(map, coords, heading, 90, 4);
  };
  return { map, set };
}

// 핀 위치의 주소(카카오 좌표→주소). services 라이브러리가 없으면 null.
export function kakaoAddress([lat, lng]) {
  const services = k().services;
  if (!services) return Promise.resolve(null);
  return new Promise((resolve) => {
    new services.Geocoder().coord2Address(lng, lat, (result, status) => {
      resolve(status === services.Status.OK ? result[0] : null);
    });
  });
}
