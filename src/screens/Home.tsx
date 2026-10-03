import { useState, useCallback } from "react";
import { useStore } from "../app/useStore.ts";
import { ListHeader, ListRow, ButtonLink, Divider, Chip, IconCircle, EmptyState, Button, SkeletonRows, Thumb } from "../ui/index.tsx";
import { DogRow, RegionSheet } from "./shared.tsx";
import { filterDogs, chronologicalSightings } from "../domain.js";
import { relativeTime, objectParticle } from "../format.ts";
import s from "./screens.module.css";
import type { Dog, Store } from "../types.ts";
function OwnerCard({ dog, db }: { dog: Dog; db: Store }) {
  const reports = chronologicalSightings(db.reports.filter((r) => r.dogId === dog.id));
  const last = reports.at(-1);
  const unread = db.notifications.filter((n) => !n.read && n.dogId === dog.id).length;
  return (
    <section className={s.owner} aria-labelledby="owner-title">
      <Thumb src={dog.image} size={72} />
      <div className={s.ownerBody}>
        <h1 id="owner-title" className={s.ownerTitle}>{dog.name}{objectParticle(dog.name)} 찾고 있어요</h1>
        <p className={s.ownerDesc}>새 목격 제보 {unread}건 · {last ? `마지막 목격 ${relativeTime(last.time)}` : "아직 목격 제보가 없어요"}</p>
        <ButtonLink href={`#/dog/${dog.id}`} full>제보 확인하기</ButtonLink>
      </div>
    </section>
  );
}
export default function Home() {
  const db = useStore();
  const [picked, setPicked] = useState<string | null>(null);
  const [sheet, setSheet] = useState(false);
  const close = useCallback(() => setSheet(false), []);
  const region = picked ?? db.areas?.[0] ?? "전국";
  const mine = db.dogs.find((d) => d.canManage && d.status === "missing");
  const missing = filterDogs(db.dogs, { region, status: "missing" });
  const reunited = db.dogs.filter((d) => d.status === "reunited").length;
  return (
    <div className={s.screen}>
      {mine ? <OwnerCard dog={mine} db={db} /> : (
        <ListRow as="button" data-action="report" left={<IconCircle name="Search" tone="coral" />} title="강아지를 잃어버렸어요" description="사진과 장소만 있으면 돼요" />
      )}
      <ListRow as="button" data-action="sighting" left={<IconCircle name="MapPin" />} title="강아지를 봤어요" description="로그인 없이 알려줄 수 있어요" />
      <Divider />
      <ListHeader
        title={`${region}에서 찾고 있어요 ${missing.length}`}
        action={<Chip onClick={() => setSheet(true)} expanded={sheet}>{region}</Chip>}
      />
      {db.connection === "loading" ? (
        <SkeletonRows />
      ) : missing.length ? (
        missing.slice(0, 5).map((d) => <DogRow key={d.id} dog={d} />)
      ) : (
        <EmptyState title="지금 이 지역에서 찾고 있는 강아지가 없어요" description="다른 지역도 살펴볼 수 있어요" action={<Button variant="weak" onClick={() => setSheet(true)}>지역 바꾸기</Button>} />
      )}
      {missing.length > 5 && <ListRow href="#/explore" title="전체 보기" />}
      <Divider />
      <ListRow href="#/shelter" left={<IconCircle name="Building2" />} title="보호소에 들어온 아이" description="전국 보호소 공고와 다른 곳의 분실 신고를 매일 받아와요" />
      <ListRow href="#/stories" left={<IconCircle name="Heart" />} title={reunited ? `집에 돌아온 아이들 ${reunited}마리` : "집에 돌아온 아이들"} description="함께 찾아서 다시 만났어요" />
      <RegionSheet open={sheet} value={region} onSelect={setPicked} onClose={close} />
    </div>
  );
}
