import { useEffect, useRef, useState } from "react";
import BottomSheet from "../../ui/BottomSheet.tsx";
import { Button } from "../../ui/index.tsx";
import Icon from "../../ui/Icon.tsx";
import { useStore } from "../../app/useStore.ts";
import { toast } from "../../app/toast.ts";
import { formatTime } from "../../format.ts";
import type { Dog } from "../../types.ts";
import s from "./sheets.module.css";
type Format = "print" | "social";
// 인쇄용(1000×1400)·SNS용(1000×1000) 전단을 그린다. QR은 이 신고로 연결된다.
async function draw(canvas: HTMLCanvasElement, dog: Dog, format: Format) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  canvas.width = 1000;
  canvas.height = format === "print" ? 1400 : 1000;
  const h = canvas.height;
  ctx.fillStyle = "#fffaf3";
  ctx.fillRect(0, 0, 1000, h);
  ctx.fillStyle = "#e88161";
  ctx.fillRect(0, 0, 1000, 18);
  ctx.textAlign = "center";
  ctx.fillStyle = "#413a34";
  ctx.font = "bold 58px sans-serif";
  ctx.fillText(dog.status === "reunited" ? "집으로 돌아왔어요!" : "우리 아이를 찾고 있어요", 500, 110);
  ctx.fillStyle = "#917d6e";
  ctx.font = "24px sans-serif";
  ctx.fillText("멍백홈 · 작은 관심이 소중한 재회로", 500, 158);
  const img = new Image();
  img.src = dog.image || "/assets/mascot-home.webp";
  await img.decode();
  const photoH = format === "print" ? 630 : 400;
  const ratio = Math.max(820 / img.width, photoH / img.height);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(90, 200, 820, photoH, 24);
  ctx.clip();
  ctx.drawImage(img, 500 - (img.width * ratio) / 2, 200 + (photoH - img.height * ratio) / 2, img.width * ratio, img.height * ratio);
  ctx.restore();
  const y = 200 + photoH;
  ctx.font = "bold 48px sans-serif";
  ctx.fillStyle = "#413a34";
  ctx.fillText(dog.name, 500, y + 70, 820);
  ctx.font = "26px sans-serif";
  ctx.fillText(`${dog.breed} · ${dog.sex || "성별 모름"} · ${dog.age || "나이 모름"}`, 500, y + 114, 820);
  ctx.font = "24px sans-serif";
  ctx.fillText(dog.location, 500, y + 160, 820);
  ctx.font = "22px sans-serif";
  ctx.fillStyle = "#8a7c70";
  ctx.fillText(formatTime(dog.time), 500, y + 202);
  const qr = new Image();
  // QR 라이브러리는 전단을 만들 때만 불러온다.
  const { default: QRCode } = await import("qrcode");
  qr.src = await QRCode.toDataURL(`${location.origin}${location.pathname}#/dog/${dog.id}`, { width: 180, margin: 1 });
  await qr.decode();
  ctx.drawImage(qr, 760, h - 200, 150, 150);
  ctx.textAlign = "left";
  ctx.font = "bold 28px sans-serif";
  ctx.fillStyle = "#c76748";
  ctx.fillText("보셨다면, 소식을 남겨주세요.", 90, h - 139, 640);
  ctx.font = "20px sans-serif";
  ctx.fillStyle = "#83776b";
  ctx.fillText("QR을 스캔하면 신고 내용을 볼 수 있어요.", 90, h - 99, 640);
  ctx.font = "17px sans-serif";
  ctx.fillText("멍백홈 · 소중한 관심에 감사합니다.", 90, h - 50);
}
export default function PosterSheet({ dogId, onClose }: { dogId: string; onClose: () => void }) {
  const dog = useStore().dogs.find((d) => d.id === dogId);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [format, setFormat] = useState<Format>("print");
  useEffect(() => {
    if (!dog || !canvas.current) return;
    draw(canvas.current, dog, format).catch(() => toast("전단 이미지를 만들지 못했어요. 다시 시도해주세요."));
  }, [dog?.id, format]);
  if (!dog) return null;
  const download = () => {
    if (!canvas.current) return;
    const a = document.createElement("a");
    a.href = canvas.current.toDataURL("image/png");
    a.download = `멍백홈-${dog.name}-${format}.png`;
    a.click();
  };
  return (
    <BottomSheet open title="QR 전단 만들기" onClose={onClose}>
      <div className={s.body}>
        <div className={s.pair} role="group" aria-label="전단 모양">
          {([["print", "인쇄용 전단"], ["social", "SNS 정사각형"]] as const).map(([v, label]) => (
            <button key={v} type="button" className={s.option} aria-pressed={format === v} onClick={() => setFormat(v)}>{label}</button>
          ))}
        </div>
        <canvas id="poster-canvas" ref={canvas} className={s.poster} aria-label="실종 강아지 공유 전단" />
        <p className={s.intro}>QR은 이 신고의 최신 소식으로 연결돼요.</p>
        <Button size="lg" full onClick={download}><Icon name="Download" size={20} />이미지 다운로드</Button>
      </div>
    </BottomSheet>
  );
}
