// 핀 위치의 주소를 찾는다. 카카오맵을 쓰는 중이면 카카오 좌표→주소를, 아니면 OpenStreetMap(Nominatim)을 쓴다.
// Nominatim은 키가 필요 없고, 이용 규칙상 초당 1회 이하로만 부른다.
// 실패해도 신고는 이어서 할 수 있어야 하므로 오류 대신 null을 돌려준다.
import { regionFromAddress } from "./domain.js";
import type { Coords } from "./types.ts";
export interface Place {
  // 화면에 보여 줄 주소(예: '서울 노원구 하계1동')
  label: string;
  // 장소 칸을 비웠을 때 쓸 짧은 주소(예: '노원구 하계1동 공릉로')
  short: string;
  region: string;
}
interface NominatimAddress { [key: string]: string | undefined }
const cache = new Map<string, Place | null>();
let last = 0;
export async function reverseGeocode([lat, lng]: Coords): Promise<Place | null> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  if (window.kakao?.maps?.services) {
    const { kakaoAddress } = await import("./maps-kakao.js");
    const a = await kakaoAddress([lat, lng]);
    const place: Place | null = a?.address ? {
      label: [regionFromAddress(a.address.region_1depth_name), a.address.region_2depth_name, a.address.region_3depth_name].filter(Boolean).join(" "),
      short: [a.address.region_2depth_name, a.address.region_3depth_name, a.road_address?.road_name].filter(Boolean).join(" "),
      region: regionFromAddress(a.address.region_1depth_name),
    } : null;
    cache.set(key, place);
    return place;
  }
  const wait = last + 1100 - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  last = Date.now();
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&accept-language=ko&lat=${lat}&lon=${lng}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) throw new Error(String(res.status));
    const a: NominatimAddress = (await res.json()).address || {};
    const province = a.city && /(특별시|광역시|특별자치시)$/.test(a.city) ? a.city : a.province || a.state || a.city || "";
    const region = regionFromAddress(province);
    const district = [a.borough, a.county, a.city !== province ? a.city : "", a.city_district].filter(Boolean)[0] || "";
    const town = a.quarter || a.suburb || a.neighbourhood || a.village || a.town || "";
    const road = a.road || a.pedestrian || "";
    const place: Place | null = region || district || town ? {
      label: [region, district, town].filter(Boolean).join(" "),
      short: [district, town, road].filter(Boolean).join(" "),
      region,
    } : null;
    cache.set(key, place);
    return place;
  } catch {
    return null;
  }
}
