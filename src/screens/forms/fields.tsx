import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, InputHTMLAttributes } from "react";
import { Button } from "../../ui/index.tsx";
import Icon from "../../ui/Icon.tsx";
import { readPhoto } from "../../photo.ts";
import { withMaps } from "../../app/withMaps.ts";
import type { Maps } from "../../app/withMaps.ts";
import { REGIONS, headingLabel, valuesOf, joinValues } from "../../domain.js";
import type { Coords } from "../../types.ts";
import { errorText } from "../../errors.ts";
import s from "./forms.module.css";
export const toLocalInput = (date: string | number | Date = new Date()) => {
  const d = new Date(date);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
type TextFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  hint?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "name">;
export function TextField({ label, name, value, onChange, multiline, hint, ...rest }: TextFieldProps) {
  const change = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value);
  return (
    <label className={s.field}>
      <span className={s.label}>{label}</span>
      {multiline ? (
        <textarea className={s.input} name={name} value={value ?? ""} onChange={change} maxLength={rest.maxLength} placeholder={rest.placeholder} />
      ) : (
        <input className={s.input} name={name} value={value ?? ""} onChange={change} enterKeyHint="next" {...rest} />
      )}
      {hint && <span className={s.hint}>{hint}</span>}
    </label>
  );
}
export function Options({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className={s.field}>
      <span className={s.label}>{label}</span>
      <div className={s.options} role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o} type="button" className={s.option} aria-pressed={value === o} onClick={() => onChange(o)}>{o}</button>
        ))}
      </div>
    </div>
  );
}
export type BigOption = [value: string, title: string, sub?: string];
export function BigOptions({ label, options, value, onChange }: { label: string; options: BigOption[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className={s.bigOptions} role="group" aria-label={label}>
      {options.map(([v, title, sub]) => (
        <button key={v} type="button" className={s.bigOption} aria-pressed={value === v} onClick={() => onChange(v)}>
          {title}{sub && <small>{sub}</small>}
        </button>
      ))}
    </div>
  );
}
// 입력칸 아래에서 자주 쓰는 값을 한 번에 고르는 칩.
export function QuickChips({ label, options, value, onPick }: { label: string; options: string[]; value: string; onPick: (v: string) => void }) {
  return (
    <div className={s.chips} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o} type="button" className={s.chip} aria-pressed={value === o} onClick={() => onPick(o)}>{o}</button>
      ))}
    </div>
  );
}
interface MultiOptionsProps {
  label: string;
  options: string[];
  value: string;
  onChange: (v: string) => void;
  // 고르면 다른 값을 모두 지우는 값(예: 착용물 '없음').
  exclusive?: string;
  otherPlaceholder: string;
}
// 여러 개 고르기 + 목록에 없는 값은 '기타'로 직접 적는다. 값은 쉼표로 이어 저장한다.
export function MultiOptions({ label, options, value, onChange, exclusive, otherPlaceholder }: MultiOptionsProps) {
  const all = valuesOf(value);
  const known = all.filter((x) => options.includes(x));
  const other = all.filter((x) => !options.includes(x)).join(", ");
  const [showOther, setShowOther] = useState(!!other);
  const [otherText, setOtherText] = useState(other);
  const emit = (picked: string[], text: string) => onChange(joinValues([...picked, ...valuesOf(text)]));
  const toggle = (o: string) => {
    if (o === exclusive) {
      setShowOther(false);
      setOtherText("");
      return onChange(known.includes(o) ? "" : o);
    }
    const rest = known.filter((x) => x !== exclusive);
    emit(rest.includes(o) ? rest.filter((x) => x !== o) : [...rest, o], otherText);
  };
  const toggleOther = () => {
    if (showOther) emit(known, "");
    setOtherText("");
    setShowOther(!showOther);
  };
  const typeOther = (text: string) => {
    setOtherText(text);
    emit(known.filter((x) => x !== exclusive), text);
  };
  return (
    <div className={s.field}>
      <span className={s.label}>{label} <small className={s.sub}>여러 개 골라도 돼요</small></span>
      <div className={s.options} role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o} type="button" className={s.option} aria-pressed={known.includes(o)} onClick={() => toggle(o)}>{o}</button>
        ))}
        <button type="button" className={s.option} aria-pressed={showOther} onClick={toggleOther}>기타</button>
      </div>
      {showOther && (
        <input className={s.input} aria-label={`${label} 직접 적기`} value={otherText} maxLength={40} autoFocus
          placeholder={otherPlaceholder} onChange={(e) => typeOther(e.target.value)} />
      )}
    </div>
  );
}
// 나이는 숫자를 올리고 내리거나 '1살 미만'·'모르겠어요'를 고른다. 빈 값은 모름.
export function AgeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const years = /^(\d+)살$/.exec(value)?.[1];
  const n = years ? Number(years) : null;
  const step = (d: number) => onChange(`${Math.min(25, Math.max(1, (n ?? (d > 0 ? 0 : 2)) + d))}살`);
  return (
    <div className={s.field}>
      <span className={s.label}>나이</span>
      <div className={s.stepper}>
        <button type="button" onClick={() => step(-1)} disabled={n !== null && n <= 1} aria-label="한 살 줄이기"><Icon name="Minus" size={20} /></button>
        <output aria-live="polite" className={n === null ? s.stepperEmpty : ""}>{n === null ? "몇 살인가요?" : `${n}살`}</output>
        <button type="button" onClick={() => step(1)} disabled={n !== null && n >= 25} aria-label="한 살 늘리기"><Icon name="Plus" size={20} /></button>
      </div>
      <div className={s.chips} role="group" aria-label="나이 빠른 선택">
        <button type="button" className={s.chip} aria-pressed={value === "1살 미만"} onClick={() => onChange("1살 미만")}>1살 미만</button>
        <button type="button" className={s.chip} aria-pressed={!value} onClick={() => onChange("")}>잘 모르겠어요</button>
      </div>
    </div>
  );
}
interface PhotoPickerProps {
  value: string;
  onChange: (dataUrl: string) => void;
  onError?: (message: string) => void;
  onBusy?: (busy: boolean) => void;
  label?: string;
}
export function PhotoPicker({ value, onChange, onError, onBusy, label = "사진 올리기" }: PhotoPickerProps) {
  const [busy, setBusy] = useState(false);
  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    onBusy?.(true);
    try {
      onChange(await readPhoto(file));
      onError?.("");
    } catch (err) {
      onError?.(errorText(err));
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  };
  return (
    <label className={`${s.photo} ${busy ? s.photoBusy : ""}`}>
      <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" onChange={pick} aria-label={label} />
      {value ? <img src={value} alt="고른 사진" /> : (<><Icon name="Camera" size={32} /><span>{label}</span></>)}
    </label>
  );
}
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const daysAgo = (value: string) => Math.round((startOfDay(new Date()) - startOfDay(new Date(value))) / 86400000);
const DAY_NAMES = ["오늘", "어제", "그저께"];
export function whenLabel(value: string) {
  if (!value) return "시간을 골라주세요";
  const d = new Date(value);
  const ago = daysAgo(value);
  const day = ago >= 0 && ago < 3 ? DAY_NAMES[ago] : `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return `${day} ${d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" })}`;
}
// 언제: 자주 쓰는 '몇 분 전'을 먼저 보여주고, 필요하면 날짜와 시각을 따로 고른다.
// 시각은 휴대폰 기본 시간 선택기(휠·시계)를 쓴다.
export function WhenField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const ago = (min: number) => onChange(toLocalInput(Date.now() - min * 60000));
  // 미래가 되면 지금으로 맞춘다.
  const setAt = (date: string, time: string) => {
    const next = `${date}T${time || "12:00"}`;
    onChange(new Date(next) > new Date() ? toLocalInput() : next);
  };
  const date = value.slice(0, 10);
  const time = value.slice(11, 16);
  const day = value ? daysAgo(value) : -1;
  const dayOf = (n: number) => toLocalInput(Date.now() - n * 86400000).slice(0, 10);
  const today = toLocalInput().slice(0, 10);
  return (
    <div className={s.field}>
      <span className={s.label}>{label}</span>
      <strong className={s.when} aria-live="polite">{whenLabel(value)}</strong>
      <div className={s.chips} role="group" aria-label="빠른 선택">
        {([[0, "방금"], [30, "30분 전"], [60, "1시간 전"], [180, "3시간 전"]] as const).map(([min, text]) => (
          <button key={min} type="button" className={s.chip} onClick={() => ago(min)}>{text}</button>
        ))}
      </div>
      <div className={s.whenGrid}>
        <span className={s.sublabel}>날짜</span>
        <div className={s.chips} role="group" aria-label="날짜">
          {DAY_NAMES.map((name, n) => (
            <button key={name} type="button" className={s.chip} aria-pressed={day === n} onClick={() => setAt(dayOf(n), time)}>{name}</button>
          ))}
          <label className={s.chip} data-on={day > 2}>
            {day > 2 ? `${new Date(value).getMonth() + 1}월 ${new Date(value).getDate()}일` : "다른 날"}
            <input type="date" className={s.overlay} max={today} value={date} aria-label="다른 날짜 고르기"
              onChange={(e) => e.target.value && setAt(e.target.value, time)} />
          </label>
        </div>
        <span className={s.sublabel}>시각</span>
        <input className={`${s.input} ${s.timeInput}`} type="time" name="time" value={time} aria-label="시각"
          onChange={(e) => e.target.value && setAt(date || today, e.target.value)} />
      </div>
    </div>
  );
}
interface WhereFieldProps {
  mapId: string;
  region: string;
  onRegion: (region: string) => void;
  location: string;
  onLocation: (location: string) => void;
  placeholder: string;
  coords: Coords;
  heading?: number | null;
  picked: boolean;
  onPick: (point: Coords) => void;
  onMessage: (message: string) => void;
}
// 어디서: 지도가 먼저. 가운데 핀에 맞춰 지도를 움직이면 지점과 지역이 정해진다.
// 지도는 이 단계가 보이는 동안만 만든다.
export function WhereField({ mapId, region, onRegion, location, onLocation, placeholder, coords, heading = null, picked, onPick, onMessage }: WhereFieldProps) {
  const ref = useRef<HTMLDivElement>(null);
  const picker = useRef<ReturnType<Maps["directionPicker"]> | null>(null);
  const latest = useRef({ coords, heading });
  latest.current = { coords, heading };
  const pickRef = useRef(onPick);
  pickRef.current = onPick;
  useEffect(
    () =>
      withMaps(({ directionPicker }) => {
        if (!ref.current) return;
        const { coords: c, heading: h } = latest.current;
        const p = directionPicker(ref.current, c, (point) => pickRef.current(point));
        p.set(c, h);
        picker.current = p;
        return () => {
          picker.current = null;
          p.map.remove();
        };
      }),
    [],
  );
  useEffect(() => {
    picker.current?.set(coords, heading);
  }, [coords, heading]);
  const here = () => {
    if (!navigator.geolocation) return onMessage("이 브라우저에서는 위치를 가져올 수 없어요. 지도를 움직여 골라주세요.");
    onMessage("현재 위치를 확인하고 있어요.");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        onPick([p.coords.latitude, p.coords.longitude]);
        onMessage("내 위치로 옮겼어요. 강아지를 본 곳으로 핀을 맞춰주세요.");
      },
      () => onMessage("위치 권한을 확인하거나 지도를 움직여 골라주세요."),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };
  return (
    <>
      <div className={s.field}>
        <div className={s.mapWrap}>
          <div id={mapId} ref={ref} className={s.map} aria-label="지점 고르기 지도. 지도를 움직이거나 눌러서 핀을 맞춰주세요" />
          <span className={s.centerPin} aria-hidden="true"><Icon name="MapPin" size={40} /></span>
          <button type="button" className={s.locate} onClick={here}><Icon name="LocateFixed" size={18} />내 위치</button>
        </div>
        <p className={s.hint} role="status">
          {picked ? "핀 위치로 정했어요. 더 정확하게 맞춰도 돼요." : "지도를 움직여 핀을 강아지를 본 곳에 맞춰주세요."}
        </p>
      </div>
      <TextField label="어디쯤인가요?" name="location" value={location} onChange={onLocation} maxLength={150} placeholder={placeholder}
        hint="가게·건물·공원 입구처럼 이웃이 알아볼 수 있는 이름을 적어주세요." />
      <label className={s.field}>
        <span className={s.label}>지역 <small className={s.sub}>핀 위치로 자동으로 골라요</small></span>
        <select className={s.input} name="region" value={region} onChange={(e) => onRegion(e.target.value)}>
          {REGIONS.slice(1).map((r) => <option key={r}>{r}</option>)}
        </select>
      </label>
    </>
  );
}
// iOS Safari는 방향 센서 권한을 따로 요청해야 한다.
type OrientationEventWithPermission = typeof DeviceOrientationEvent & { requestPermission?: () => Promise<"granted" | "denied"> };
type CompassEvent = DeviceOrientationEvent & { webkitCompassHeading?: number };
export type DirectionMode = "unknown" | "moving" | "still";
interface DirectionFieldProps {
  mode: DirectionMode;
  heading: number;
  onMode: (mode: DirectionMode) => void;
  onHeading: (heading: number) => void;
}
export function DirectionField({ mode, heading, onMode, onHeading }: DirectionFieldProps) {
  const [status, setStatus] = useState("");
  const listener = useRef<((e: Event) => void) | null>(null);
  const stop = () => {
    if (!listener.current) return;
    removeEventListener("deviceorientationabsolute", listener.current);
    removeEventListener("deviceorientation", listener.current);
    listener.current = null;
  };
  useEffect(() => stop, []);
  const sensor = async () => {
    try {
      if (!window.isSecureContext) throw new Error("방향 센서는 HTTPS에서만 쓸 수 있어요. 슬라이더로 정해주세요.");
      const Orientation = window.DeviceOrientationEvent as OrientationEventWithPermission | undefined;
      if (!Orientation) throw new Error("방향 센서를 지원하지 않아요. 슬라이더로 정해주세요.");
      if (typeof Orientation.requestPermission === "function" && (await Orientation.requestPermission()) !== "granted")
        throw new Error("센서 권한이 없어요. 슬라이더로 정해주세요.");
      stop();
      setStatus("휴대폰을 수평으로 잡고 위쪽을 강아지가 간 쪽으로 향해주세요.");
      let got = false;
      listener.current = (event: Event) => {
        const e = event as CompassEvent;
        let v: number;
        if (typeof e.webkitCompassHeading === "number") v = e.webkitCompassHeading;
        else if (e.absolute && e.alpha != null) v = (360 - e.alpha) % 360;
        else return;
        got = true;
        onHeading(Math.round(v));
      };
      addEventListener("deviceorientationabsolute", listener.current);
      addEventListener("deviceorientation", listener.current);
      setTimeout(() => {
        if (!got) {
          stop();
          setStatus("나침반 정보를 받지 못했어요. 슬라이더로 정해주세요.");
        }
      }, 6000);
    } catch (e) {
      setStatus(errorText(e));
    }
  };
  return (
    <>
      <BigOptions
        label="이동 방향"
        value={mode}
        onChange={(m) => { stop(); onMode(m as DirectionMode); }}
        options={[["unknown", "모르겠어요"], ["moving", "이동했어요", "간 방향을 알려주세요"], ["still", "머물러 있었어요"]]}
      />
      {mode === "moving" && (
        <div className={s.field}>
          <div className={s.compass}>
            <div className={s.needle}><span style={{ transform: `rotate(${heading}deg)` }}>↑</span></div>
            <div>
              <strong id="heading-label" className={s.heading}>{headingLabel(heading)} · {Math.round(heading)}°</strong>
              <p className={s.hint}>슬라이더를 움직이거나 휴대폰으로 가리켜주세요.</p>
            </div>
          </div>
          <input id="heading-range" className={s.range} type="range" min="0" max="359" value={heading} aria-label="이동 방향 각도"
            onChange={(e) => { stop(); onHeading(Number(e.target.value)); }} />
          <Button variant="weak" size="sm" onClick={sensor}>휴대폰으로 가리키기</Button>
          {status && <p className={s.hint} role="status">{status}</p>}
        </div>
      )}
    </>
  );
}
