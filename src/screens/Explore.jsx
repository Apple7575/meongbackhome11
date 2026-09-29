import { useState, useCallback, useEffect, useRef } from "react";
import { useStore } from "../app/useStore.js";
import { Top, Chip, Button, EmptyState } from "../ui/index.jsx";
import Icon from "../ui/Icon.jsx";
import BottomSheet from "../ui/BottomSheet.jsx";
import { DogRow, OptionSheet, RegionSheet } from "./shared.jsx";
import { filterDogs, COORDS, escapeHTML } from "../domain.js";
import { baseMap, marker } from "../maps.js";
import s from "./screens.module.css";
const EMPTY = { query: "", region: "전국", status: "all", color: "", size: "", accessory: "" };
const STATUS = [["all", "전체"], ["missing", "찾고 있어요"], ["reunited", "집에 돌아왔어요"]];
const FILTERS = [
  ["color", "털 색", ["흰색", "갈색", "검정색", "회색", "혼합"]],
  ["size", "크기", ["소형", "중형", "대형"]],
  ["accessory", "착용물", ["없음", "목줄", "하네스", "옷"]],
];
function FilterSheet({ open, value, countFor, onApply, onClose }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { if (open) setDraft(value); }, [open, value]);
  const toggle = (key, v) => setDraft((d) => ({ ...d, [key]: d[key] === v ? "" : v }));
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
function ExploreMap({ dogs }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const ids = dogs.map((d) => d.id).join();
  useEffect(() => {
    const map = baseMap(ref.current, dogs[0]?.coords || COORDS.서울, dogs.length > 1 ? 7 : 12);
    dogs.forEach((d) =>
      marker(map, d.coords, "♥").bindPopup(`<a href="#/dog/${d.id}"><b>${escapeHTML(d.name)}</b> · ${escapeHTML(d.breed)}<br>${escapeHTML(d.location)}</a>`),
    );
    return () => map.remove();
  }, [ids]);
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
  const [sheet, setSheet] = useState(null);
  const [view, setView] = useState("list");
  const [limit, setLimit] = useState(20);
  const close = useCallback(() => setSheet(null), []);
  const set = (patch) => { setF((v) => ({ ...v, ...patch })); setLimit(20); };
  const dogs = filterDogs(db.dogs, f);
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
          <Chip onClick={() => setSheet("status")} expanded={sheet === "status"}>{STATUS.find(([v]) => v === f.status)[1]}</Chip>
          <Chip icon="SlidersHorizontal" onClick={() => setSheet("filters")} expanded={sheet === "filters"}>{filterCount ? `필터 ${filterCount}` : "필터"}</Chip>
          <button type="button" className={s.viewToggle} onClick={() => setView((v) => (v === "list" ? "map" : "list"))} aria-label={view === "list" ? "지도로 보기" : "목록으로 보기"}>
            <Icon name={view === "list" ? "Map" : "List"} />
          </button>
        </div>
      </div>
      {!dogs.length ? (
        <EmptyState title="조건에 맞는 강아지가 없어요" description="검색어나 필터를 바꿔보세요" action={<Button variant="weak" onClick={() => set(EMPTY)}>필터 초기화</Button>} />
      ) : view === "map" ? (
        <ExploreMap dogs={dogs} />
      ) : (
        <>
          {dogs.slice(0, limit).map((d) => <DogRow key={d.id} dog={d} size={72} />)}
          {dogs.length > limit && (
            <div className={s.more}><Button variant="weak" full onClick={() => setLimit((l) => l + 20)}>더 보기</Button></div>
          )}
        </>
      )}
      <RegionSheet open={sheet === "region"} value={f.region} onSelect={(region) => set({ region })} onClose={close} />
      <OptionSheet open={sheet === "status"} title="상태" options={STATUS} value={f.status} onSelect={(status) => set({ status })} onClose={close} />
      <FilterSheet open={sheet === "filters"} value={f} countFor={(d) => filterDogs(db.dogs, { ...f, ...d }).length} onApply={set} onClose={close} />
    </div>
  );
}
