import { ListRow, Thumb, Badge, Button, EmptyState } from "../ui/index.tsx";
import BottomSheet from "../ui/BottomSheet.tsx";
import { REGIONS } from "../domain.js";
import Icon from "../ui/Icon.tsx";
import { DISTRICTS, splitRegion } from "../districts.js";
import { useState, useEffect } from "react";
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
  // true면 고른 뒤에도 닫지 않는다(다음 단계를 보여줄 때).
  stay?: boolean;
}
export function OptionSheet({ open, title, options, value, onSelect, onClose, stay = false }: OptionSheetProps) {
  return (
    <BottomSheet open={open} title={title} onClose={onClose}>
      <div className={s.optionGrid}>
        {options.map(([v, label]) => (
          <button key={v} type="button" className={s.option} aria-pressed={v === value} onClick={() => { onSelect(v); if (!stay) onClose(); }}>
            {label}
          </button>
        ))}
      </div>
    </BottomSheet>
  );
}
// districts: 시·도를 고르면 이어서 시·군·구를 고른다(값은 '서울 송파구'처럼).
export function RegionSheet({ districts = false, ...props }: Omit<OptionSheetProps, "title" | "options" | "stay"> & { districts?: boolean }) {
  const [province, setProvince] = useState<string | null>(null);
  useEffect(() => { if (!props.open) setProvince(null); }, [props.open]);
  if (districts && province)
    return (
      <OptionSheet
        {...props}
        title={`${province} 시·군·구`}
        options={[["", "← 뒤로"], [province, `${province} 전체`], ...DISTRICTS[province].map((d): [string, string] => [`${province} ${d}`, d])]}
        stay
        onSelect={(v) => { if (!v) return setProvince(null); props.onSelect(v); props.onClose(); }}
      />
    );
  return (
    <OptionSheet
      {...props}
      title="지역 선택"
      options={REGIONS.map((r) => [r, r])}
      value={splitRegion(props.value)[0]}
      stay={districts}
      onSelect={(v) => {
        if (districts && DISTRICTS[v]?.length) return setProvince(v);
        props.onSelect(v);
        if (districts) props.onClose();
      }}
    />
  );
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
// 지도 위 '내 위치로' 버튼(지도 앱처럼 확대 버튼 위에 둔다).
export function LocateButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className={s.locateBtn} onClick={onClick} aria-label="내 위치로">
      <Icon name="LocateFixed" size={20} />
    </button>
  );
}
// 위치 권한을 거절했을 때 화면 안에 남기는 안내. 다시 시도하거나 지역을 직접 고를 수 있다.
const IPHONE = typeof navigator !== "undefined" && /iPhone|iPad|iPod/.test(navigator.userAgent);
export function LocationDenied({ onRetry, onPick, onClose }: { onRetry: () => void; onPick: () => void; onClose: () => void }) {
  return (
    <div className={s.noticeCard} role="alert">
      <strong>위치 권한이 꺼져 있어요</strong>
      <p>
        {IPHONE
          ? "설정 앱 › 개인정보 보호 및 보안 › 위치 서비스 › Safari 웹 사이트에서 '앱을 사용하는 동안'으로 바꾼 뒤 다시 시도해주세요."
          : "주소창 왼쪽의 아이콘을 눌러 위치를 '허용'으로 바꾼 뒤 다시 시도해주세요."}
      </p>
      <div className={s.mapAreaActions}>
        <Button onClick={onRetry}>다시 시도</Button>
        <Button variant="weak" onClick={() => { onClose(); onPick(); }}>지역 고르기</Button>
      </div>
    </div>
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
