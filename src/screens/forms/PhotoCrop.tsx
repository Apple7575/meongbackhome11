import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "../../ui/index.tsx";
import Icon from "../../ui/Icon.tsx";
import s from "./forms.module.css";
const OUT = 1000;
const MAX_ZOOM = 4;
interface View { x: number; y: number; zoom: number }
// 인스타그램·카카오톡 프로필처럼 사진을 고르면 바로 뜨는 전체 화면 편집기.
// 가운데 정사각형 틀 밖도 어둡게 보여 무엇이 잘리는지 알 수 있고, 끌어서 옮기고 두 손가락(컴퓨터는 휠)으로 키운다.
// 완료하면 틀 안만 1000×1000 사진으로 잘라 돌려준다. 닫으면 고른 사진을 그대로 쓴다.
export default function PhotoCrop({ src, onApply, onClose }: { src: string; onApply: (image: string) => void; onClose: () => void }) {
  const stage = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  // 틀 한 변(px): 화면 가로·세로 중 짧은 쪽에 맞춘다.
  const [size, setSize] = useState(0);
  const [view, setView] = useState<View>({ x: 0, y: 0, zoom: 1 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const image = new Image();
    image.onload = () => setImg(image);
    image.src = src;
  }, [src]);
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = () => setSize(Math.max(0, Math.min(el.clientWidth, el.clientHeight) - 32));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    // 편집하는 동안 뒤 화면이 스크롤되지 않게 하고, 끝나면 원래 자리로 초점을 돌려준다.
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    el.focus();
    return () => {
      ro.disconnect();
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);
  // 틀을 꽉 채우는 배율(짧은 변 = 틀 한 변)에 zoom을 곱한다.
  const base = img && size ? size / Math.min(img.width, img.height) : 1;
  // 사진이 틀 밖으로 빠져 틀 안에 빈 곳이 생기지 않게 위치를 묶는다.
  const clamp = (v: View): View => {
    if (!img) return v;
    const k = base * v.zoom;
    return { zoom: v.zoom, x: Math.min(0, Math.max(size - img.width * k, v.x)), y: Math.min(0, Math.max(size - img.height * k, v.y)) };
  };
  // 처음에는 사진 가운데를 맞춘다(화면 크기가 바뀌어도 다시 가운데로).
  useEffect(() => {
    if (img && size) setView(clamp({ zoom: 1, x: (size - img.width * base) / 2, y: (size - img.height * base) / 2 }));
  }, [img, size]);
  // 틀 가운데를 기준으로 키우고 줄인다.
  const zoomTo = (zoom: number, v: View) => {
    const z = Math.min(MAX_ZOOM, Math.max(1, zoom));
    const c = size / 2;
    const ratio = z / v.zoom;
    return clamp({ zoom: z, x: c - (c - v.x) * ratio, y: c - (c - v.y) * ratio });
  };
  const zoomRef = useRef(zoomTo);
  zoomRef.current = zoomTo;
  // 컴퓨터: 마우스 휠·트랙패드 핀치(ctrl+휠). 페이지가 스크롤되지 않게 직접 등록한다.
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      setView((v) => zoomRef.current(v.zoom * Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.002)), v));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, []);
  const down = (e: PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: view.zoom };
    }
  };
  const move = (e: PointerEvent) => {
    const last = pointers.current.get(e.pointerId);
    if (!last) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const p = pinch.current;
      setView((v) => zoomTo((p.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / p.dist, v));
    } else if (pointers.current.size === 1) {
      setView((v) => clamp({ ...v, x: v.x + e.clientX - last.x, y: v.y + e.clientY - last.y }));
    }
  };
  const up = (e: PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };
  // 키보드: 화살표로 옮기고 +/−로 키우고 줄이며, Esc로 닫는다.
  const key = (e: KeyboardEvent) => {
    const step = 16;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (e.key === "Escape") closeRef.current();
    else if (moves[e.key]) {
      e.preventDefault();
      const [dx, dy] = moves[e.key];
      setView((v) => clamp({ ...v, x: v.x + dx, y: v.y + dy }));
    } else if (e.key === "+" || e.key === "=") setView((v) => zoomTo(v.zoom + 0.2, v));
    else if (e.key === "-") setView((v) => zoomTo(v.zoom - 0.2, v));
  };
  const apply = () => {
    if (!img || !size) return;
    const k = base * view.zoom;
    const side = size / k;
    const out = Math.min(OUT, Math.round(side));
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = out;
    canvas.getContext("2d")?.drawImage(img, -view.x / k, -view.y / k, side, side, 0, 0, out, out);
    onApply(canvas.toDataURL("image/jpeg", 0.85));
    onClose();
  };
  const k = base * view.zoom;
  return createPortal(
    <div className={s.cropScreen} role="dialog" aria-modal="true" aria-labelledby={titleId} onKeyDown={key}>
      <header className={s.cropTop}>
        <button type="button" className={s.cropClose} onClick={onClose} aria-label="닫고 원래 사진 쓰기"><Icon name="X" size={24} /></button>
        <h2 id={titleId}>사진 맞추기</h2>
      </header>
      <div ref={stage} className={s.cropStage} tabIndex={0} role="application"
        aria-label="사진 위치 조절. 끌어서 옮기고 두 손가락이나 휠로 키워요. 키보드는 화살표와 +, −"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
        <div className={s.cropFrame} style={{ width: size, height: size }}>
          {img && <img src={src} alt="" draggable={false}
            style={{ width: img.width * k, height: img.height * k, transform: `translate(${view.x}px, ${view.y}px)` }} />}
          <span className={s.cropGrid} aria-hidden="true" />
        </div>
      </div>
      <footer className={s.cropBottom}>
        <p>두 손가락으로 키우고, 끌어서 옮겨요</p>
        <Button size="lg" full onClick={apply} disabled={!img}>완료</Button>
      </footer>
    </div>,
    document.body,
  );
}
