import { useState, useCallback, useEffect, useRef } from "react";
import { useStore } from "../app/useStore.ts";
import { Top, ListHeader, ListRow, Chip, Badge, Button, BottomCTA, IconCircle, EmptyState, SkeletonRows } from "../ui/index.tsx";
import { RegionSheet, MapAreaPrompt } from "./shared.tsx";
import { headingLabel, haversine, COORDS } from "../domain.js";
import { withMaps } from "../app/withMaps.ts";
import { toast } from "../app/toast.ts";
import Icon from "../ui/Icon.tsx";
import { relativeTime, dayGroup, distanceText } from "../format.ts";
import s from "./screens.module.css";
import type { Report, Coords } from "../types.ts";
import type { DayGroup } from "../format.ts";
import type { IconName } from "../ui/Icon.tsx";
const KIND_ICON: Record<string, IconName> = { 목격: "MapPin", "보호 중": "HouseHeart", "기관 인계": "Building2" };
const movement = (r: Report) => (r.stationary ? "머물러 있었어요" : r.heading == null ? "방향 정보 없음" : `${headingLabel(r.heading)}으로 이동`);
// 내 근처로 볼 때의 반경(km)
const NEAR_KM = 5;
const VIEW_KEY = "meongback-sightings-view";
// 목격 소식 지도: 핀을 누르면 그 제보를 연다. 내 근처로 볼 때는 내 위치를, 지역으로 볼 때는 그 지역을 가운데에 둔다.
function SightingsMap({ reports, here, center }: { reports: Report[]; here: Coords | null; center: Coords }) {
  const ref = useRef<HTMLDivElement>(null);
  const ids = reports.map((r) => r.id).join();
  useEffect(
    () =>
      withMaps(({ baseMap, marker }) => {
        if (!ref.current) return;
        const map = baseMap(ref.current, here || reports[0]?.coords || center, here || reports.length === 1 ? 14 : 11);
        reports.forEach((r) => marker(map, r.coords, "").on("click", () => window.dispatchEvent(new CustomEvent("open-report", { detail: r.id }))));
        if (here) marker(map, here, "", "here-pin");
        else if (reports.length > 1) map.fitBounds(reports.map((r) => r.coords), { paddingTopLeft: [40, 40], paddingBottomRight: [40, 100], maxZoom: 14 });
        return () => map.remove();
      }),
    [ids, here?.join()],
  );
  return (
    <div className={s.map}>
      <div ref={ref} aria-label="목격 소식 지도. 핀을 누르면 제보를 볼 수 있어요" />
    </div>
  );
}
export default function Sightings() {
  const db = useStore();
  // 처음엔 홈과 같이 저장한 관심 지역으로 연다.
  const [picked, setRegion] = useState<string | null>(null);
  const region = picked ?? db.areas?.[0] ?? "전국";
  const [sheet, setSheet] = useState(false);
  const [limit, setLimit] = useState(20);
  // 목록·지도 중 마지막에 본 방식을 이 휴대폰에 기억한다(처음엔 읽기 쉬운 목록).
  const [view, setViewState] = useState<"list" | "map">(() => {
    try { return localStorage.getItem(VIEW_KEY) === "map" ? "map" : "list"; } catch { return "list"; }
  });
  const setView = (next: (v: "list" | "map") => "list" | "map") =>
    setViewState((v) => { const n = next(v); try { localStorage.setItem(VIEW_KEY, n); } catch { /* 저장이 막혀도 화면은 바뀐다 */ } return n; });
  // 내 근처: 이 기기의 현재 위치는 거르기에만 쓰고 저장하지 않는다.
  const [here, setHere] = useState<Coords | null>(null);
  const close = useCallback(() => setSheet(false), []);
  const near = () => {
    if (here) return setHere(null);
    if (!navigator.geolocation) return toast("이 브라우저에서는 위치를 가져올 수 없어요.");
    toast("현재 위치를 확인하고 있어요.");
    navigator.geolocation.getCurrentPosition(
      (p) => { setHere([p.coords.latitude, p.coords.longitude]); setLimit(20); },
      () => toast("위치 권한을 허용하면 내 근처 목격 소식을 볼 수 있어요."),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  };
  const regionOf = (r: Report) => r.region || db.dogs.find((d) => d.id === r.dogId)?.region;
  const km = (r: Report) => (here ? haversine(here, r.coords) : 0);
  const reports = db.reports
    .filter((r) => (here ? Array.isArray(r.coords) && km(r) <= NEAR_KM : region === "전국" || regionOf(r) === region))
    .sort((a, b) => (here ? km(a) - km(b) : new Date(b.time).getTime() - new Date(a.time).getTime()));
  const groups: [DayGroup, Report[]][] = [];
  for (const r of reports.slice(0, limit)) {
    const label = here ? (`내 근처 ${NEAR_KM}km` as DayGroup) : dayGroup(r.time);
    if (groups.at(-1)?.[0] !== label) groups.push([label, []]);
    groups[groups.length - 1][1].push(r);
  }
  const dogName = (r: Report) => db.dogs.find((d) => d.id === r.dogId)?.name;
  return (
    <div className={`${s.screen} ${s.withCta}`}>
      <Top title="목격 소식" />
      <div className={s.sticky}>
        <div className={s.chips}>
          {!here && <Chip onClick={() => setSheet(true)} expanded={sheet}>{region}</Chip>}
          <Chip icon="LocateFixed" onClick={near} pressed={!!here}>{here ? `내 근처 ${NEAR_KM}km` : "내 근처"}</Chip>
          <button type="button" className={s.viewToggle} onClick={() => setView((v) => (v === "list" ? "map" : "list"))} aria-label={view === "list" ? "지도로 보기" : "목록으로 보기"}>
            <Icon name={view === "list" ? "Map" : "List"} />
          </button>
        </div>
      </div>
      {db.connection === "loading" ? (
        <SkeletonRows />
      ) : !reports.length ? (
        here ? (
          <EmptyState image="/assets/mascot-search.webp" title={`내 근처 ${NEAR_KM}km 안에는 아직 목격 소식이 없어요`} description="다른 지역도 살펴보거나, 본 강아지가 있다면 알려주세요" />
        ) : (
          <EmptyState image="/assets/mascot-search.webp" title="아직 목격 소식이 없어요" description="주변에서 본 강아지를 알려주세요" />
        )
      ) : view === "map" && !here && region === "전국" ? (
        <MapAreaPrompt onNear={near} onPick={() => setSheet(true)} />
      ) : view === "map" ? (
        <SightingsMap reports={reports} here={here} center={COORDS[region] || COORDS.서울} />
      ) : (
        groups.map(([label, items]) => (
          <section key={label}>
            <ListHeader title={label} />
            {items.map((r) => (
              <ListRow
                key={r.id}
                as="button"
                data-action="report-detail"
                data-id={r.id}
                data-sighting-row=""
                left={<IconCircle name={KIND_ICON[r.kind] || "MapPin"} />}
                title={r.location}
                description={[here ? distanceText(km(r)) : "", relativeTime(r.time), movement(r)].filter(Boolean).join(" · ")}
                right={dogName(r) ? <Badge>{dogName(r)}</Badge> : r.demo ? <Badge>예시</Badge> : undefined}
              />
            ))}
          </section>
        ))
      )}
      {view === "list" && reports.length > limit && (
        <div className={s.more}><Button variant="weak" full onClick={() => setLimit((l) => l + 20)}>더 보기</Button></div>
      )}
      <BottomCTA data-action="sighting">강아지를 봤어요</BottomCTA>
      <RegionSheet open={sheet} value={region} onSelect={setRegion} onClose={close} />
    </div>
  );
}
