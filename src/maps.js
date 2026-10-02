import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  chronologicalSightings,
  arrowEnd,
  escapeHTML,
  headingLabel,
} from "./domain.js";
import { groupByPixel, centerOf, samePlace } from "./cluster.js";
export function baseMap(element, center = [37.512, 127.107], zoom = 15) {
  const map = L.map(element, {
    zoomControl: false,
    // 마우스 휠로 확대·축소(지도 앱과 같은 동작). 한 칸에 너무 많이 바뀌지 않게 조금 느리게.
    scrollWheelZoom: true,
    wheelPxPerZoomLevel: 90,
  }).setView(center, zoom);
  L.control.zoom({ position: "bottomright" }).addTo(map);
  const tiles = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  ).addTo(map);
  const notice = L.control({ position: "topright" });
  const noticeEl = L.DomUtil.create("div", "map-load-notice");
  noticeEl.textContent = "지도를 불러오고 있어요…";
  notice.onAdd = () => noticeEl;
  notice.addTo(map);
  let loaded = false;
  tiles.on("tileload", () => {
    loaded = true;
    notice.remove();
  });
  tiles.on("tileerror", () => {
    if (!loaded)
      noticeEl.textContent =
        "배경 지도를 불러오지 못했어요. 네트워크 연결을 확인해주세요.";
  });
  const timer = setTimeout(() => {
    if (!loaded)
      noticeEl.textContent =
        "지도 연결이 지연되고 있어요. 네트워크 연결을 확인해주세요.";
  }, 8000);
  const resizeTimer=setTimeout(() => map.invalidateSize(), 100);
  map.on("unload", () => {clearTimeout(timer);clearTimeout(resizeTimer);});
  return map;
}
export function marker(map, coords, label = "•", className = "") {
  return L.marker(coords, {
    // 내 위치 점은 다른 핀·묶음에 가리지 않게 늘 위에 둔다.
    zIndexOffset: className.includes("here-pin") ? 1000 : 0,
    icon: L.divIcon({
      className: "custom-map-icon",
      html: `<span class="map-pin ${className}"><b>${escapeHTML(label || "•")}</b></span>`,
      iconSize: [34, 42],
      iconAnchor: [17, 38],
    }),
  }).addTo(map);
}
// 여러 핀을 겹치지 않게 그린다: 가까이 모인 핀은 숫자 묶음으로 보여주고, 누르면 그 묶음이 보이게 확대한다.
// items: { coords, onClick?, popup?, className? }. 확대·축소할 때마다 다시 묶는다.
export function pins(map, items) {
  const layer = L.layerGroup().addTo(map);
  const draw = () => {
    layer.clearLayers();
    for (const g of groupByPixel(items, (c) => map.latLngToContainerPoint(c))) {
      if (g.length === 1) {
        const it = g[0];
        const m = marker(layer, it.coords, "", it.className || "");
        if (it.popup) m.bindPopup(it.popup);
        if (it.onClick) m.on("click", it.onClick);
        continue;
      }
      marker(layer, centerOf(g), String(g.length), "cluster-pin").on("click", () => {
        if (samePlace(g) || map.getZoom() >= 18) return g[0].onClick?.();
        map.fitBounds(L.latLngBounds(g.map((i) => i.coords)), { padding: [60, 60], maxZoom: 18 });
      });
    }
  };
  draw();
  map.on("zoomend", draw);
  return () => { map.off("zoomend", draw); layer.remove(); };
}
// 내 근처 반경을 원으로 그리고, 원 전체가 화면에 들어오게 맞춘다.
export function rangeCircle(map, center, km, padding = {}) {
  const circle = L.circle(center, { radius: km * 1000, className: "range-circle", interactive: false }).addTo(map);
  map.fitBounds(circle.getBounds(), padding);
  return circle;
}
export function drawTimeline(map, reports, onSelect) {
  const ordered = chronologicalSightings(reports);
  const pins = new Map();
  if (ordered.length > 1)
    L.polyline(
      ordered.map((s) => s.coords),
      { color: "#738a79", weight: 3, dashArray: "6 8", opacity: 0.8 },
    ).addTo(map);
  ordered.forEach((s, i) => {
    const m = marker(
      map,
      s.coords,
      i + 1,
      s.status === "관련 목격" ? "confirmed" : "unconfirmed",
    );
    pins.set(s.id, m);
    m.bindPopup(
      `<strong>${escapeHTML(s.location)}</strong><br>${escapeHTML(new Date(s.time).toLocaleString("ko-KR"))}<br>${escapeHTML(s.status)} · ${s.stationary ? "머물러 있었어요" : headingLabel(s.heading)}`,
    );
    if (onSelect) m.on("click", () => onSelect(s.id));
    if (s.heading !== null && s.heading !== undefined && !s.stationary) {
      const end = arrowEnd(s.coords, s.heading);
      L.polyline([s.coords, end], { color: "#e77f5d", weight: 3 }).addTo(map);
      L.marker(end, {
        interactive: false,
        icon: L.divIcon({
          className: "direction-icon",
          html: `<span style="transform:rotate(${Number(s.heading)}deg)">▲</span>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        }),
      }).addTo(map);
    }
  });
  if (ordered.length)
    map.fitBounds(L.latLngBounds(ordered.map((s) => s.coords)), {
      animate: false,
      padding: [65, 65],
      maxZoom: 16,
    });
  return {
    select(id) {
      const target = pins.get(id);
      if (!target) return;
      for (const [key, pin] of pins)
        pin.getElement()?.classList.toggle("selected-pin", key === id);
      map.panTo(target.getLatLng(), {
        animate: !matchMedia("(prefers-reduced-motion: reduce)").matches,
        duration: 0.4,
      });
    },
  };
}
// 가운데 고정 핀 방식: 지도를 끌면 가운데가 고른 지점이 되고, 누르면 그 지점으로 옮긴다.
// 핀은 화면(CSS)이 지도 가운데에 그린다.
export function directionPicker(element, coords, onChange) {
  const map = baseMap(element, coords, 16);
  let arrow, tip, silent = false;
  const same = (a, b) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;
  map.on("moveend", () => {
    const c = map.getCenter();
    // 크기 맞춤·확대 버튼처럼 가운데가 그대로인 이동은 고른 것으로 치지 않는다.
    if (silent || same([c.lat, c.lng], coords)) return;
    coords = [c.lat, c.lng];
    onChange(coords);
  });
  map.on("click", (e) => {
    coords = [e.latlng.lat, e.latlng.lng];
    onChange(coords);
    map.panTo(e.latlng);
  });
  const set = (point, heading) => {
    if (!same(point, coords)) {
      coords = point;
      // 코드로 옮길 때는 고른 것으로 치지 않는다.
      silent = true;
      map.setView(coords, map.getZoom(), { animate: false });
      silent = false;
    }
    if (arrow) map.removeLayer(arrow);
    if (tip) map.removeLayer(tip);
    if (heading !== null) {
      const end = arrowEnd(coords, heading, 90);
      arrow = L.polyline([coords, end], { color: "#e77f5d", weight: 4 }).addTo(
        map,
      );
      tip = L.marker(end, {
        interactive: false,
        icon: L.divIcon({
          className: "direction-icon",
          html: `<span style="transform:rotate(${heading}deg)">▲</span>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        }),
      }).addTo(map);
    }
  };
  return { map, set };
}
