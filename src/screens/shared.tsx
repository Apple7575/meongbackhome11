import { ListRow, Thumb, Badge } from "../ui/index.tsx";
import BottomSheet from "../ui/BottomSheet.tsx";
import { REGIONS } from "../domain.js";
import { relativeTime } from "../format.ts";
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
export function DogBadge({ dog }: { dog: Dog }) {
  if (dog.demo) return <Badge>예시</Badge>;
  return dog.status === "reunited" ? <Badge tone="green">집에 돌아왔어요</Badge> : <Badge tone="coral">찾고 있어요</Badge>;
}
export function DogRow({ dog, size = 56 }: { dog: Dog; size?: 56 | 72 }) {
  return (
    <ListRow
      href={`#/dog/${dog.id}`}
      data-dog-row=""
      left={<Thumb src={dog.image} size={size} />}
      title={<><span className={s.name}>{dog.name}</span><span className={s.breed}> · {dog.breed}</span></>}
      description={`${relativeTime(dog.time)} · ${dog.location}`}
      right={<DogBadge dog={dog} />}
    />
  );
}
