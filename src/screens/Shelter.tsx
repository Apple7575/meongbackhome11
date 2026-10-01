import { useEffect, useState, useCallback } from "react";
import { useStore } from "../app/useStore.ts";
import { Top, ListRow, Chip, Button, EmptyState, SkeletonRows, Thumb } from "../ui/index.tsx";
import { RegionSheet } from "./shared.tsx";
import { relativeTime } from "../format.ts";
import { openSheet } from "../app/sheets.ts";
import s from "./screens.module.css";
import type { PublicDog } from "../types.ts";
type Tab = "shelter" | "lost";
const TABS: [Tab, string][] = [["shelter", "보호소에 들어온 아이"], ["lost", "다른 곳의 분실 신고"]];
// 공공데이터 한 줄: 사진·견종·색·성별, 언제·어디서
export function PublicDogRow({ item }: { item: PublicDog }) {
  const shelter = item.source === "shelter";
  return (
    <ListRow as="button" data-public-row="" onClick={() => openSheet("publicDog", { item })}
      left={<Thumb src={item.photos[0] ? `${item.photos[0]}?w=192` : undefined} size={72} />}
      title={[item.breed, item.color, item.sex === "모름" ? "" : item.sex].filter(Boolean).join(" · ")}
      description={[item.happenedAt ? `${relativeTime(item.happenedAt)} ${shelter ? "구조" : "실종"}` : "", item.area, shelter ? item.care?.name : item.place].filter(Boolean).join(" · ")} />
  );
}
// 보호소에 들어온 아이·다른 곳에 낸 분실 신고(국가동물보호정보시스템, 매일 받아옴)
export default function Shelter({ region: initial }: { region?: string }) {
  const db = useStore();
  const [region, setRegion] = useState(decodeURIComponent(initial || "") || db.areas[0] || "서울");
  const [tab, setTab] = useState<Tab>("shelter");
  const [sheet, setSheet] = useState(false);
  const [items, setItems] = useState<PublicDog[] | null>(null);
  const [total, setTotal] = useState(0);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const close = useCallback(() => setSheet(false), []);
  const load = async (offset: number) => {
    const res = await fetch(`/api/public/${tab === "shelter" ? "shelter" : "lost"}?region=${encodeURIComponent(region)}&offset=${offset}&limit=20`);
    if (!res.ok) throw new Error(String(res.status));
    return (await res.json()) as { total: number; items: PublicDog[] };
  };
  useEffect(() => {
    let alive = true;
    setItems(null);
    setFailed(false);
    load(0).then((d) => { if (alive) { setItems(d.items); setTotal(d.total); } }).catch(() => alive && setFailed(true));
    return () => { alive = false; };
  }, [region, tab, attempt]);
  const more = () => load(items?.length || 0).then((d) => setItems((cur) => [...(cur || []), ...d.items])).catch(() => setFailed(true));
  return (
    <div className={s.screen}>
      <Top title="보호소·분실 신고" subtitle="국가동물보호정보시스템 공고를 매일 받아와요" />
      <div className={s.sticky}>
        <div className={s.chips}>
          <Chip onClick={() => setSheet(true)} expanded={sheet}>{region}</Chip>
          {TABS.map(([value, label]) => (
            <Chip key={value} pressed={tab === value} onClick={() => setTab(value)}>{label}</Chip>
          ))}
        </div>
      </div>
      {failed ? (
        <EmptyState title="공고를 불러오지 못했어요" description="잠시 후 다시 시도해주세요" action={<Button variant="weak" onClick={() => setAttempt((n) => n + 1)}>다시 시도</Button>} />
      ) : !items ? (
        <SkeletonRows />
      ) : items.length ? (
        <>
          {items.map((item) => <PublicDogRow key={item.id} item={item} />)}
          {items.length < total && <div className={s.more}><Button variant="weak" full onClick={more}>더 보기</Button></div>}
        </>
      ) : (
        <EmptyState image="/assets/mascot-search.webp" title={tab === "shelter" ? `${region} 보호소에 공고 중인 아이가 없어요` : `${region}에 최근 분실 신고가 없어요`} description="다른 지역도 살펴보세요" />
      )}
      <RegionSheet open={sheet} value={region} onSelect={setRegion} onClose={close} />
    </div>
  );
}
