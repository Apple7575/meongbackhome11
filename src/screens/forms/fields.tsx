import { useEffect, useRef, useState } from "react";
import type { ChangeEvent, InputHTMLAttributes } from "react";
import { Button } from "../../ui/index.tsx";
import Icon from "../../ui/Icon.tsx";
import { readPhoto } from "../../photo.ts";
import { withMaps } from "../../app/withMaps.ts";
import type { Maps } from "../../app/withMaps.ts";
import { REGIONS, COORDS, headingLabel } from "../../domain.js";
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
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "name">;
export function TextField({ label, name, value, onChange, multiline, ...rest }: TextFieldProps) {
  const change = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value);
  return (
    <label className={s.field}>
      <span className={s.label}>{label}</span>
      {multiline ? (
        <textarea className={s.input} name={name} value={value ?? ""} onChange={change} maxLength={rest.maxLength} placeholder={rest.placeholder} />
      ) : (
        <input className={s.input} name={name} value={value ?? ""} onChange={change} {...rest} />
      )}
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
export function WhenField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const ago = (h: number) => onChange(toLocalInput(Date.now() - h * 3600000));
  return (
    <div className={s.field}>
      <div className={s.quick} role="group" aria-label="빠른 선택">
        <Button variant="weak" size="sm" onClick={() => ago(0)}>지금</Button>
        <Button variant="weak" size="sm" onClick={() => ago(1)}>1시간 전</Button>
        <Button variant="weak" size="sm" onClick={() => ago(3)}>3시간 전</Button>
      </div>
      <TextField label={label} name="time" type="datetime-local" value={value} onChange={onChange} max={toLocalInput()} />
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
// 지역·장소·지도 지점. 지도는 이 단계가 보이는 동안만 만든다.
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
  const changeRegion = (r: string) => {
    onRegion(r);
    picker.current?.map.setView(COORDS[r], 13);
  };
  const here = () => {
    if (!navigator.geolocation) return onMessage("이 브라우저에서는 위치를 가져올 수 없어요. 지도에서 골라주세요.");
    onMessage("현재 위치를 확인하고 있어요.");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const point: Coords = [p.coords.latitude, p.coords.longitude];
        picker.current?.map.setView(point, 16);
        onPick(point);
        onMessage("현재 위치예요. 강아지를 본 지점으로 조정해주세요.");
      },
      () => onMessage("위치 권한을 확인하거나 지도에서 직접 골라주세요."),
      { enableHighAccuracy: true, timeout: 12000 },
    );
  };
  return (
    <>
      <label className={s.field}>
        <span className={s.label}>지역</span>
        <select className={s.input} name="region" value={region} onChange={(e) => changeRegion(e.target.value)}>
          {REGIONS.slice(1).map((r) => <option key={r}>{r}</option>)}
        </select>
      </label>
      <TextField label="장소" name="location" value={location} onChange={onLocation} maxLength={150} placeholder={placeholder} />
      <div className={s.field}>
        <div className={s.mapHead}>
          <span className={s.label}>지도에서 본 지점을 눌러주세요</span>
          <Button variant="weak" size="sm" onClick={here}>현재 위치</Button>
        </div>
        <div id={mapId} ref={ref} className={s.map} aria-label="지점 고르기 지도" />
        <p className={s.hint}>{picked ? "지점을 골랐어요." : "내 위치가 아니라 강아지를 본 곳을 눌러주세요."}</p>
      </div>
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
