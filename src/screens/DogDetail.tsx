import { useEffect, useRef, useState } from "react";
import { useStore } from "../app/useStore.ts";
import { Top, ListHeader, ListRow, Button, ButtonLink, BottomCTA, Badge, EmptyState, IconCircle } from "../ui/index.tsx";
import Icon from "../ui/Icon.tsx";
import { DogBadge } from "./shared.tsx";
import { movement } from "./ReportSheet.tsx";
import { chronologicalSightings, matchCandidates } from "../domain.js";
import { formatTime, sexLabel, subjectParticle, placeText } from "../format.ts";
import { withMaps } from "../app/withMaps.ts";
import { openSheet } from "../app/sheets.ts";
import { thumbSrc } from "../thumb.ts";
import { PublicDogRow } from "./Shelter.tsx";
import type { PublicDog } from "../types.ts";
import s from "./detail.module.css";
import type { Dog, Report } from "../types.ts";
interface SightingMapProps {
  dog: Dog;
  reports: Report[];
  selected: string | null;
  onSelect: (id: string) => void;
}
function SightingMap({ dog, reports, selected, onSelect }: SightingMapProps) {
  const ref = useRef<HTMLDivElement>(null);
  const api = useRef<{ select(id: string): void } | null>(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const ids = reports.map((r) => r.id).join();
  useEffect(
    () =>
      withMaps(({ baseMap, drawTimeline, marker }) => {
        if (!ref.current) return;
        const map = baseMap(ref.current, dog.coords);
        api.current = drawTimeline(map, reports, onSelect);
        if (!reports.length) marker(map, dog.coords, "♥");
        // 지도가 늦게 준비되는 동안 고른 지점이 있으면 바로 강조한다.
        if (selectedRef.current) api.current.select(selectedRef.current);
        return () => map.remove();
      }),
    [dog.id, ids],
  );
  useEffect(() => {
    if (selected) api.current?.select(selected);
  }, [selected]);
  return <div ref={ref} className={s.map} aria-label="목격 순서와 이동 방향 지도" />;
}
export default function DogDetail({ id, report }: { id: string; report?: string }) {
  const db = useStore();
  const d = db.dogs.find((x) => x.id === id);
  const reports = d ? chronologicalSightings(db.reports.filter((r) => r.dogId === d.id)) : [];
  const [selected, setSelected] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [shown, setShown] = useState(0);
  // 찾고 있는 아이와 닮은, 보호소에 들어온 아이(공공데이터를 우리 서버가 매일 받아 둔다)
  const [similar, setSimilar] = useState<PublicDog[]>([]);
  const lookFor = db.dogs.find((x) => x.id === id && x.status !== "reunited" && !x.demo && !x.previewOnly);
  useEffect(() => {
    if (!lookFor) return;
    let alive = true;
    fetch(`/api/public/similar/${encodeURIComponent(id)}`).then((r) => (r.ok ? r.json() : { items: [] })).then((d) => alive && setSimilar(d.items || [])).catch(() => {});
    return () => { alive = false; };
  }, [id, !!lookFor]);
  // 알림에서 들어오면 그 목격 제보를 바로 열고, 주소의 ?report= 는 지운다(뒤로 가기 때 다시 열리지 않게).
  useEffect(() => {
    if (!report) return;
    history.replaceState(null, "", `#/dog/${id}`);
    window.dispatchEvent(new CustomEvent("open-report", { detail: report }));
  }, [id, report]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(() => {
      setSelected((cur) => {
        const i = reports.findIndex((r) => r.id === cur);
        if (i >= reports.length - 1) {
          setPlaying(false);
          return cur;
        }
        return reports[i + 1].id;
      });
    }, 1500);
    return () => clearInterval(timer);
  }, [playing, reports.length]);
  if (!d)
    return (
      <EmptyState
        title="신고를 찾을 수 없어요"
        description="링크가 맞는지 확인하거나 목록에서 다시 찾아주세요"
        action={<ButtonLink href="#/explore" variant="weak">목록으로</ButtonLink>}
      />
    );
  const saved = db.saved.includes(d.id);
  // 대표 사진 + 더 올린 사진(최대 2장)
  const photos = [d.image || "/assets/mascot-home.webp", ...(d.images || [])];
  const updates = db.updates.filter((u) => u.dogId === d.id);
  const candidates = matchCandidates(d, db.reports).slice(0, 3);
  const missing = d.status !== "reunited";
  const play = () => {
    setSelected(reports[0].id);
    setPlaying(true);
  };
  return (
    <div className={missing ? s.withCta : s.screen}>
      {/* 세로 사진도 잘리지 않게 전체를 보여주고, 남는 곳은 같은 사진을 흐리게 채운다. */}
      <div className={s.photo}>
        <img className={s.photoFill} src={photos[shown] ?? photos[0]} alt="" aria-hidden="true" />
        <img className={s.photoMain} src={photos[shown] ?? photos[0]} alt={`${d.name} ${d.breed} 사진${photos.length > 1 ? ` ${shown + 1}/${photos.length}` : ""}`} />
        <span className={s.photoBadge}><DogBadge dog={d} /></span>
      </div>
      {photos.length > 1 && (
        <div className={s.gallery} role="group" aria-label="사진 고르기">
          {photos.map((src, i) => (
            <button key={src + i} type="button" aria-pressed={i === shown} aria-label={`사진 ${i + 1} 보기`} onClick={() => setShown(i)}>
              <img src={thumbSrc(src)} alt="" />
            </button>
          ))}
        </div>
      )}
      <Top title={d.name} subtitle={[d.breed, d.age, sexLabel(d.sex) === "모름" ? "" : sexLabel(d.sex)].filter(Boolean).join(" · ")} />
      {d.previewOnly && <p className={s.notice}>체험용 예시 신고예요. 실제 실종 신고가 아니에요.</p>}
      <div className={s.actions}>
        <Button variant="weak" size="sm" data-action="share" data-id={d.id}><Icon name="Share2" size={18} />공유</Button>
        <Button variant="weak" size="sm" data-action="save" data-id={d.id} aria-pressed={saved}><Icon name="Heart" size={18} filled={saved} className={saved ? s.saved : undefined} />{saved ? "저장됨" : "저장"}</Button>
        <Button variant="weak" size="sm" data-action="poster" data-id={d.id}><Icon name="QrCode" size={18} />QR 전단</Button>
        <Button variant="weak" size="sm" data-action="flag" data-id={d.id}><Icon name="Flag" size={18} />문제 신고</Button>
      </div>
      {d.canManage && (
        <div className={s.actions}>
          <Button variant="weak" size="sm" data-action="edit-dog" data-id={d.id}><Icon name="Pencil" size={18} />신고 수정</Button>
          {missing && <Button variant="weak" size="sm" data-action="update" data-id={d.id}><Icon name="Clock3" size={18} />수색 상황 남기기</Button>}
          {!d.demo && !d.previewOnly && <Button variant="weak" size="sm" onClick={() => openSheet("deleteDoc", { collection: "dogs", id: d.id })}><Icon name="Trash2" size={18} />삭제</Button>}
        </div>
      )}
      {!missing && (
        <div className={s.home}>
          <strong>{d.name}{subjectParticle(d.name)} 집에 돌아왔어요</strong>
          <span>함께 찾아주신 이웃분들 고마워요.</span>
        </div>
      )}
      <ListHeader title="정보" />
      <dl className={s.facts}>
        {([
          ["마지막으로 본 곳", placeText(d.region, d.location)],
          ["잃어버린 때", formatTime(d.time)],
          ["털 색", d.color],
          ["크기", d.size],
          ["착용물", d.accessory],
          ["성별", sexLabel(d.sex) === "모름" ? "" : sexLabel(d.sex)],
          ["나이", d.age],
        ] as const).filter(([, v]) => v).map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
      {d.description && (
        <>
          <ListHeader title="특징" />
          <p className={s.desc}>{d.description}</p>
        </>
      )}
      {d.exampleProfile && (
        <>
          <ListHeader title="알아보는 단서" />
          <ListRow title={d.exampleProfile.feature} description="구별되는 특징" />
          <ListRow title={d.exampleProfile.habit} description="평소 행동" />
          <ListRow title={d.exampleProfile.focus} description="확인 중인 구역" />
        </>
      )}
      <ListHeader
        title={reports.length ? `목격 기록 ${reports.length}` : "목격 기록"}
        action={reports.length > 1 && (
          <Button variant="weak" size="sm" onClick={playing ? () => setPlaying(false) : play}>{playing ? "멈추기" : "순서대로 보기"}</Button>
        )}
      />
      <SightingMap dog={d} reports={reports} selected={selected} onSelect={(rid: string) => { setPlaying(false); setSelected(rid); }} />
      {reports.length > 1 && <p className={s.mapNote}>점선은 목격 순서예요. 실제 이동 경로가 아니에요.</p>}
      {reports.length ? (
        reports.map((r, i) => (
          <ListRow
            key={r.id}
            as="button"
            data-action="report-detail"
            data-id={r.id}
            data-sighting-step=""
            aria-current={selected === r.id ? "true" : undefined}
            left={<span className={selected === r.id ? s.stepOn : s.step}>{i + 1}</span>}
            title={r.location}
            description={`${formatTime(r.time)} · ${movement(r)}`}
            right={<Badge tone={r.status === "관련 목격" ? "green" : "grey"}>{r.status}</Badge>}
          />
        ))
      ) : (
        <p className={s.emptyLine}>아직 목격 제보가 없어요. 첫 단서를 기다리고 있어요.</p>
      )}
      {(missing || updates.length > 0) && <ListHeader title="수색 상황" action={d.canManage && <Button variant="weak" size="sm" data-action="update" data-id={d.id}>남기기</Button>} />}
      {updates.length ? (
        updates.map((u) => <ListRow key={u.id} title={u.text} description={formatTime(u.time)} />)
      ) : missing ? (
        <p className={s.emptyLine}>아직 공유된 수색 상황이 없어요.</p>
      ) : null}
      {missing && (
        <>
          {similar.length > 0 && (
            <>
              <ListHeader title={`보호소에 들어온 비슷한 아이 ${similar.length}`} />
              {similar.map((item) => <PublicDogRow key={item.id} item={item} />)}
            </>
          )}
          <ListHeader title="함께 확인할 제보" />
          {candidates.map((r) => (
            <ListRow key={r.id} as="button" data-action="report-detail" data-id={r.id} left={<IconCircle name="MapPin" />} title={r.location} description={`${r.distance.toFixed(1)}km · ${formatTime(r.time)}`} />
          ))}
          <ListRow href={`#/shelter?region=${encodeURIComponent(d.region)}`} left={<IconCircle name="Building2" />} title={`${d.region} 보호소 공고 모두 보기`} description="보호소에 들어온 아이일 수도 있어요" />
        </>
      )}
      {missing && (d.canManage
        ? <BottomCTA data-action="reunite" data-id={d.id}>찾았어요</BottomCTA>
        : <BottomCTA data-action="sighting" data-id={d.id}>이 아이를 봤어요</BottomCTA>)}
    </div>
  );
}
