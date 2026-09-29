import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  chronologicalSightings,
  arrowEnd,
  escapeHTML,
  headingLabel,
} from "./domain.js";
export function baseMap(element, center = [37.512, 127.107], zoom = 15) {
  const map = L.map(element, {
    zoomControl: false,
    scrollWheelZoom: false,
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
    icon: L.divIcon({
      className: "custom-map-icon",
      html: `<span class="map-pin ${className}"><b>${escapeHTML(label || "•")}</b></span>`,
      iconSize: [34, 42],
      iconAnchor: [17, 38],
    }),
  }).addTo(map);
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
export function directionPicker(element, coords, onChange) {
  const map = baseMap(element, coords, 16);
  const m = marker(map, coords, "");
  let arrow, tip;
  const set = (point, heading) => {
    coords = point;
    m.setLatLng(coords);
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
  map.on("click", (e) => onChange([e.latlng.lat, e.latlng.lng]));
  return { map, set };
}
