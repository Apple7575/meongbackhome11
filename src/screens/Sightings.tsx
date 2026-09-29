import { useState, useCallback } from "react";
import { useStore } from "../app/useStore.ts";
import { Top, ListHeader, ListRow, Chip, Badge, Button, BottomCTA, IconCircle, EmptyState, SkeletonRows } from "../ui/index.tsx";
import { RegionSheet } from "./shared.tsx";
import { headingLabel } from "../domain.js";
import { relativeTime, dayGroup } from "../format.ts";
import s from "./screens.module.css";
import type { Report } from "../types.ts";
import type { DayGroup } from "../format.ts";
import type { IconName } from "../ui/Icon.tsx";
const KIND_ICON: Record<string, IconName> = { 목격: "MapPin", "보호 중": "HouseHeart", "기관 인계": "Building2" };
const movement = (r: Report) => (r.stationary ? "머물러 있었어요" : r.heading == null ? "방향 정보 없음" : `${headingLabel(r.heading)}으로 이동`);
export default function Sightings() {
  const db = useStore();
  const [region, setRegion] = useState("전국");
  const [sheet, setSheet] = useState(false);
  const [limit, setLimit] = useState(20);
  const close = useCallback(() => setSheet(false), []);
  const regionOf = (r: Report) => r.region || db.dogs.find((d) => d.id === r.dogId)?.region;
  const reports = db.reports
    .filter((r) => region === "전국" || regionOf(r) === region)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  const groups: [DayGroup, Report[]][] = [];
  for (const r of reports.slice(0, limit)) {
    const label = dayGroup(r.time);
    if (groups.at(-1)?.[0] !== label) groups.push([label, []]);
    groups[groups.length - 1][1].push(r);
  }
  const dogName = (r: Report) => db.dogs.find((d) => d.id === r.dogId)?.name;
  return (
    <div className={`${s.screen} ${s.withCta}`}>
      <Top title="목격 소식" right={<Chip onClick={() => setSheet(true)} expanded={sheet}>{region}</Chip>} />
      {db.connection === "loading" ? (
        <SkeletonRows />
      ) : reports.length ? (
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
                description={`${relativeTime(r.time)} · ${movement(r)}`}
                right={dogName(r) ? <Badge>{dogName(r)}</Badge> : r.demo ? <Badge>예시</Badge> : undefined}
              />
            ))}
          </section>
        ))
      ) : (
        <EmptyState image="/assets/mascot-search.webp" title="아직 목격 소식이 없어요" description="주변에서 본 강아지를 알려주세요" />
      )}
      {reports.length > limit && (
        <div className={s.more}><Button variant="weak" full onClick={() => setLimit((l) => l + 20)}>더 보기</Button></div>
      )}
      <BottomCTA data-action="sighting">강아지를 봤어요</BottomCTA>
      <RegionSheet open={sheet} value={region} onSelect={setRegion} onClose={close} />
    </div>
  );
}
