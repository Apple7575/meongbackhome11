import { ListRow, Thumb, Badge, Button, EmptyState } from "../ui/index.tsx";
import BottomSheet from "../ui/BottomSheet.tsx";
import { REGIONS } from "../domain.js";
import { relativeTime, distanceText } from "../format.ts";
import s from "./screens.module.css";
import type { Dog } from "../types.ts";
interface OptionSheetProps {
  open: boolean;
  title: string;
  options: [string, string][];
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}
export function OptionSheet({ open, title, options, value, onSelect, onClose }: OptionSheetProps) {
  return (
    <BottomSheet open={open} title={title} onClose={onClose}>
      <div className={s.optionGrid}>
        {options.map(([v, label]) => (
          <button key={v} type="button" className={s.option} aria-pressed={v === value} onClick={() => { onSelect(v); onClose(); }}>
            {label}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
export function RegionSheet(props: Omit<OptionSheetProps, "title" | "options">) {
  return <OptionSheet {...props} title="지역 선택" options={REGIONS.map((r) => [r, r])} />;
}
// 전국을 한 장의 지도로 보여주지 않는다(당근·토스처럼 기준 동네가 있어야 지도를 연다).
// 내 위치나 지역을 고르면 그 근처만 지도로 보여준다.
export function MapAreaPrompt({ onNear, onPick }: { onNear: () => void; onPick: () => void }) {
  return (
    <EmptyState
      image="/assets/mascot-search.webp"
      title="어느 동네를 지도로 볼까요?"
      description="내 위치나 지역을 고르면 그 근처만 보여드려요"
      action={
        <div className={s.mapAreaActions}>
          <Button onClick={onNear}>내 위치로 보기</Button>
          <Button variant="weak" onClick={onPick}>지역 고르기</Button>
        </div>
      }
    />
  );
}
export function DogBadge({ dog }: { dog: Dog }) {
  if (dog.demo) return <Badge>예시</Badge>;
  return dog.status === "reunited" ? <Badge tone="green">집에 돌아왔어요</Badge> : <Badge tone="coral">찾고 있어요</Badge>;
}
// distance(km)가 있으면 "1.2km · 3시간 전 · 장소"처럼 거리를 앞에 보여준다.
export function DogRow({ dog, size = 56, distance }: { dog: Dog; size?: 56 | 72; distance?: number }) {
  return (
    <ListRow
      href={`#/dog/${dog.id}`}
      data-dog-row=""
      left={<Thumb src={dog.image} size={size} />}
      title={<><span className={s.name}>{dog.name}</span><span className={s.breed}> · {dog.breed}</span></>}
      description={[distance === undefined ? "" : distanceText(distance), relativeTime(dog.time), dog.location].filter(Boolean).join(" · ")}
      right={<DogBadge dog={dog} />}
    />
  );
}
