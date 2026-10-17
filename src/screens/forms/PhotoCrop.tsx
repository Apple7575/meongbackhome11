import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, PointerEvent } from "react";
import BottomSheet from "../../ui/BottomSheet.tsx";
import { Button } from "../../ui/index.tsx";
import s from "./forms.module.css";
const OUT = 1000;
const MAX_ZOOM = 4;
interface View { x: number; y: number; zoom: number }
// 카카오 프로필 사진처럼 정사각형 틀 안에서 사진을 끌어 옮기고(한 손가락), 벌려 키운다(두 손가락·슬라이더).
// 적용하면 틀 안만 1000×1000 사진으로 잘라 돌려준다. 목록·공유·전단 모두 이 정사각형을 쓴다.
export default function PhotoCrop({ src, onApply, onClose }: { src: string; onApply: (image: string) => void; onClose: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [size, setSize] = useState(0);
  const [view, setView] = useState<View>({ x: 0, y: 0, zoom: 1 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  useEffect(() => {
    const image = new Image();
    image.onload = () => setImg(image);
    image.src = src;
  }, [src]);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => setSize(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // 틀을 꽉 채우는 배율(짧은 변 = 틀 한 변)에 zoom을 곱한다.
  const base = img && size ? size / Math.min(img.width, img.height) : 1;
  // 사진이 틀 밖으로 빠져 빈 곳이 생기지 않게 위치를 묶는다.
  const clamp = (v: View): View => {
    if (!img) return v;
    const k = base * v.zoom;
    return { zoom: v.zoom, x: Math.min(0, Math.max(size - img.width * k, v.x)), y: Math.min(0, Math.max(size - img.height * k, v.y)) };
  };
  // 처음에는 사진 가운데를 맞춘다.
  useEffect(() => {
    if (img && size) setView(clamp({ zoom: 1, x: (size - img.width * base) / 2, y: (size - img.height * base) / 2 }));
  }, [img, size]);
  // 틀 가운데를 기준으로 확대·축소한다.
  const zoomTo = (zoom: number, v = view) => {
    const z = Math.min(MAX_ZOOM, Math.max(1, zoom));
    const c = size / 2;
    const ratio = z / v.zoom;
    return clamp({ zoom: z, x: c - (c - v.x) * ratio, y: c - (c - v.y) * ratio });
  };
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
  // 키보드: 화살표로 옮기고 +/−로 확대·축소한다.
  const key = (e: KeyboardEvent) => {
    const step = 16;
    const moves: Record<string, [number, number]> = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
    if (moves[e.key]) {
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
  return (
    <BottomSheet open title="사진 위치와 크기 맞추기" onClose={onClose}>
      <div className={s.crop}>
        <div ref={box} className={s.cropBox} tabIndex={0} role="application" aria-label="사진 위치 조절. 끌어서 옮기고 두 손가락으로 키워요. 키보드는 화살표와 +, −"
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key}>
          {img && <img src={src} alt="" draggable={false}
            style={{ width: img.width * k, height: img.height * k, transform: `translate(${view.x}px, ${view.y}px)` }} />}
          <span className={s.cropGrid} aria-hidden="true" />
        </div>
        <label className={s.cropZoom}>
          <span>크기</span>
          <input type="range" name="photo-zoom" min={1} max={MAX_ZOOM} step={0.01} value={view.zoom}
            onChange={(e) => setView((v) => zoomTo(Number(e.target.value), v))} aria-label="사진 크기" />
        </label>
        <p className={s.hint}>강아지 얼굴과 몸이 틀 가운데에 크게 오게 맞춰주세요. 목록·공유·전단에 이 모습으로 보여요.</p>
        <div className={s.pairButtons}>
          <Button variant="weak" size="lg" full onClick={onClose}>취소</Button>
          <Button size="lg" full onClick={apply} disabled={!img}>이대로 쓰기</Button>
        </div>
      </div>
    </BottomSheet>
  );
}
