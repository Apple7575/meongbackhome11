import { useState, useCallback, useEffect, useRef } from "react";
import { useStore } from "../app/useStore.ts";
import { Top, Chip, Button, EmptyState } from "../ui/index.tsx";
import Icon from "../ui/Icon.tsx";
import BottomSheet from "../ui/BottomSheet.tsx";
import { DogRow, OptionSheet, RegionSheet, MapAreaPrompt } from "./shared.tsx";
import { filterDogs, COORDS, escapeHTML, haversine } from "../domain.js";
import { toast } from "../app/toast.ts";
import type { Coords } from "../types.ts";
import { withMaps } from "../app/withMaps.ts";
import s from "./screens.module.css";
import type { Dog } from "../types.ts";
import type { DogFilter } from "../domain.js";
type Filters = Required<DogFilter>;
type FilterKey = "color" | "size" | "accessory";
type SheetKind = "region" | "status" | "filters" | "sort" | null;
const SORTS: [string, string][] = [["recent", "최신순"], ["near", "가까운 순"]];
const EMPTY: Filters = { query: "", region: "전국", status: "all", color: "", size: "", accessory: "" };
const STATUS: [string, string][] = [["all", "전체"], ["missing", "찾고 있어요"], ["reunited", "집에 돌아왔어요"]];
const FILTERS: [FilterKey, string, string[]][] = [
  ["color", "털 색", ["흰색", "크림", "갈색", "검정색", "회색", "황색", "얼룩"]],
  ["size", "크기", ["소형", "중형", "대형"]],
  ["accessory", "착용물", ["없음", "목줄", "하네스", "옷", "인식표"]],
];
interface FilterSheetProps {
  open: boolean;
  value: Filters;
  countFor: (draft: Filters) => number;
  onApply: (draft: Filters) => void;
  onClose: () => void;
}
function FilterSheet({ open, value, countFor, onApply, onClose }: FilterSheetProps) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (open) setDraft(value); }, [open, value]);
  const toggle = (key: FilterKey, v: string) => setDraft((d) => ({ ...d, [key]: d[key] === v ? "" : v }));
  return (
    <BottomSheet open={open} title="필터" onClose={onClose}>
      {FILTERS.map(([key, label, values]) => (
        <div key={key}>
          <p className={s.optionLabel}>{label}</p>
          <div className={s.optionGrid}>
            {values.map((v) => (
              <button key={v} type="button" className={s.option} aria-pressed={draft[key] === v} onClick={() => toggle(key, v)}>{v}</button>
            ))}
          </div>
        </div>
      ))}
      <div className={s.sheetActions}>
        <Button variant="weak" onClick={() => setDraft((d) => ({ ...d, color: "", size: "", accessory: "" }))}>초기화</Button>
        <Button onClick={() => { onApply(draft); onClose(); }}>{countFor(draft)}마리 보기</Button>
      </div>
    </BottomSheet>
  );
}
// 내 위치가 있으면 그 근처를, 아니면 고른 지역의 강아지들이 다 보이게 연다(전국 지도는 열지 않는다).
function ExploreMap({ dogs, here, center }: { dogs: Dog[]; here: Coords | null; center: Coords }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const ids = dogs.map((d) => d.id).join();
  useEffect(
    () =>
      withMaps(({ baseMap, marker }) => {
        if (!ref.current) return;
        const map = baseMap(ref.current, here || dogs[0]?.coords || center, here ? 13 : 12);
        dogs.forEach((d) =>
          marker(map, d.coords, "♥").bindPopup(`<a href="#/dog/${d.id}"><b>${escapeHTML(d.name)}</b> · ${escapeHTML(d.breed)}<br>${escapeHTML(d.location)}</a>`),
        );
        if (here) marker(map, here, "", "here-pin");
        // 여러 마리면 모든 핀이 보이게 맞춘다(아래 목록 손잡이만큼 아래쪽 여백을 더 둔다).
        else if (dogs.length > 1) map.fitBounds(dogs.map((d) => d.coords), { paddingTopLeft: [40, 40], paddingBottomRight: [40, 100], maxZoom: 13 });
        return () => map.remove();
      }),
    [ids, here?.join()],
  );
  return (
    <div className={s.map}>
      <div ref={ref} aria-label="실종 강아지 지도" />
      <div className={s.mapPanel}>
        <button type="button" className={s.mapPanelToggle} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
          {dogs.length}마리 · {open ? "목록 접기" : "목록 펼치기"}
        </button>
        {open && dogs.map((d) => <DogRow key={d.id} dog={d} />)}
      </div>
    </div>
  );
}
export default function Explore() {
  const db = useStore();
  const [f, setF] = useState(EMPTY);
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [view, setView] = useState("list");
  const [limit, setLimit] = useState(20);
  const close = useCallback(() => setSheet(null), []);
  const set = (patch: Partial<Filters>) => { setF((v) => ({ ...v, ...patch })); setLimit(20); };
  // 가까운 순: 이 기기의 현재 위치는 정렬에만 쓰고 저장하지 않는다.
  const [here, setHere] = useState<Coords | null>(null);
  const near = (value: string) => {
    if (value !== "near") return setHere(null);
    if (!navigator.geolocation) return toast("이 브라우저에서는 위치를 가져올 수 없어요.");
    toast("현재 위치를 확인하고 있어요.");
    navigator.geolocation.getCurrentPosition(
      (p) => { setHere([p.coords.latitude, p.coords.longitude]); setLimit(20); toast("가까운 순으로 보여드려요."); },
      () => toast("위치 권한을 허용하면 가까운 순으로 볼 수 있어요."),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 },
    );
  };
  const filtered = filterDogs(db.dogs, f);
  const dogs = here ? [...filtered].sort((a, b) => haversine(here, a.coords) - haversine(here, b.coords)) : filtered;
  const filterCount = [f.color, f.size, f.accessory].filter(Boolean).length;
  return (
    <div className={s.screen}>
      <Top title="찾기" />
      <div className={s.sticky}>
        <label className={s.search}>
          <Icon name="Search" size={20} />
          <input id="dog-search" type="search" value={f.query} onChange={(e) => set({ query: e.target.value })} placeholder="이름, 견종, 동네로 찾기" aria-label="강아지 검색" />
        </label>
        <div className={s.chips}>
          <Chip onClick={() => setSheet("region")} expanded={sheet === "region"}>{f.region}</Chip>
          <Chip onClick={() => setSheet("status")} expanded={sheet === "status"}>{STATUS.find(([v]) => v === f.status)?.[1] ?? "전체"}</Chip>
          <Chip icon="SlidersHorizontal" onClick={() => setSheet("filters")} expanded={sheet === "filters"}>{filterCount ? `필터 ${filterCount}` : "필터"}</Chip>
          <Chip onClick={() => setSheet("sort")} expanded={sheet === "sort"}>{here ? "가까운 순" : "최신순"}</Chip>
          <button type="button" className={s.viewToggle} onClick={() => setView((v) => (v === "list" ? "map" : "list"))} aria-label={view === "list" ? "지도로 보기" : "목록으로 보기"}>
            <Icon name={view === "list" ? "Map" : "List"} />
          </button>
        </div>
      </div>
      {!dogs.length ? (
        <EmptyState title="조건에 맞는 강아지가 없어요" description="검색어나 필터를 바꿔보세요" action={<Button variant="weak" onClick={() => set(EMPTY)}>필터 초기화</Button>} />
      ) : view === "map" && !here && f.region === "전국" ? (
        <MapAreaPrompt onNear={() => near("near")} onPick={() => setSheet("region")} />
      ) : view === "map" ? (
        <ExploreMap dogs={dogs} here={here} center={COORDS[f.region] || COORDS.서울} />
      ) : (
        <>
          {dogs.slice(0, limit).map((d) => <DogRow key={d.id} dog={d} size={72} distance={here ? haversine(here, d.coords) : undefined} />)}
          {dogs.length > limit && (
            <div className={s.more}><Button variant="weak" full onClick={() => setLimit((l) => l + 20)}>더 보기</Button></div>
          )}
        </>
      )}
      <RegionSheet open={sheet === "region"} value={f.region} onSelect={(region: string) => set({ region })} onClose={close} />
      <OptionSheet open={sheet === "status"} title="상태" options={STATUS} value={f.status} onSelect={(status: string) => set({ status })} onClose={close} />
      <OptionSheet open={sheet === "sort"} title="정렬" options={SORTS} value={here ? "near" : "recent"} onSelect={near} onClose={close} />
      <FilterSheet open={sheet === "filters"} value={f} countFor={(d) => filterDogs(db.dogs, { ...f, ...d }).length} onApply={set} onClose={close} />
    </div>
  );
}
