// 지도(Leaflet)는 첫 화면에 필요 없으므로 지도를 그릴 때만 불러온다.
// useEffect 안에서: useEffect(() => withMaps((maps) => { ...; return () => map.remove(); }), [deps])
export type Maps = typeof import("../maps.js");
export function withMaps(run: (maps: Maps) => (() => void) | void): () => void {
  let cancelled = false;
  let cleanup: (() => void) | void;
  import("../maps.js").then((maps) => {
    if (!cancelled) cleanup = run(maps);
  });
  return () => {
    cancelled = true;
    cleanup?.();
  };
}
