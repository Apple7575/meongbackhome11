// 지도는 첫 화면에 필요 없으므로 지도를 그릴 때만 불러온다.
// 서버에 카카오 JavaScript 키(KAKAO_JS_KEY)가 있으면 카카오맵을, 없거나 SDK를 못 불러오면 OpenStreetMap(Leaflet)을 쓴다.
// 두 모듈은 공개 함수 모양이 같다.
// useEffect 안에서: useEffect(() => withMaps((maps) => { ...; return () => map.remove(); }), [deps])
import { providers } from "./providers.ts";
export type Maps = typeof import("../maps.js");
declare global {
  interface Window { kakao?: { maps?: { load(cb: () => void): void; services?: unknown } } }
}
let provider: Promise<Maps> | null = null;
// 카카오 SDK를 붙인다. 등록되지 않은 주소에서 열었거나 네트워크가 막히면 false.
function loadKakao(key: string): Promise<boolean> {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false&libraries=services`;
    const timer = setTimeout(() => resolve(false), 8000);
    script.onload = () => {
      if (!window.kakao?.maps) return resolve(false);
      window.kakao.maps.load(() => { clearTimeout(timer); resolve(true); });
    };
    script.onerror = () => { clearTimeout(timer); resolve(false); };
    document.head.append(script);
  });
}
export function mapProvider(): Promise<Maps> {
  provider ??= (async () => {
    const key = (await providers()).kakaoMapKey;
    if (key && (await loadKakao(key))) return (await import("../maps-kakao.js")) as Maps;
    return import("../maps.js");
  })();
  return provider;
}
export function withMaps(run: (maps: Maps) => (() => void) | void): () => void {
  let cancelled = false;
  let cleanup: (() => void) | void;
  mapProvider().then((maps) => {
    if (!cancelled) cleanup = run(maps);
  });
  return () => {
    cancelled = true;
    cleanup?.();
  };
}
