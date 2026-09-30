import { useEffect, useRef, useState } from "react";
import BottomSheet from "../../ui/BottomSheet.tsx";
import { Button } from "../../ui/index.tsx";
import Icon from "../../ui/Icon.tsx";
import { useStore } from "../../app/useStore.ts";
import { toast } from "../../app/toast.ts";
import { formatTime, sexLabel, placeText } from "../../format.ts";
import { shareUrl } from "../../share.ts";
import type { Dog } from "../../types.ts";
import s from "./sheets.module.css";
type Format = "print" | "social";
const FONT = `"Pretendard", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
const C = { title: "#191f28", body: "#4e5968", muted: "#8b95a1", line: "#e5e8eb", box: "#f2f4f6", brand: "#a94c2f" };
// 인쇄용(1000×1400)·SNS용(1000×1000) 전단. 앱과 같은 규칙: 흰 바탕 · 굵은 제목 하나 · 코랄은 강조에만.
async function draw(canvas: HTMLCanvasElement, dog: Dog, format: Format) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const print = format === "print";
  canvas.width = 1000;
  canvas.height = print ? 1400 : 1000;
  const h = canvas.height;
  await document.fonts?.load(`700 40px Pretendard`).catch(() => undefined);
  const font = (size: number, weight = 400) => (ctx.font = `${weight} ${size}px ${FONT}`);
  const home = dog.status === "reunited";
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, 1000, h);
  // 상태 표시와 제목
  font(28, 700);
  const tag = home ? "재회" : "실종";
  const tagW = ctx.measureText(tag).width + 40;
  ctx.fillStyle = home ? "#e8f6ee" : "#fdeee8";
  ctx.beginPath();
  ctx.roundRect(80, 64, tagW, 52, 26);
  ctx.fill();
  ctx.fillStyle = home ? "#16793f" : C.brand;
  ctx.textBaseline = "middle";
  ctx.fillText(tag, 100, 91);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = C.title;
  font(print ? 68 : 60, 800);
  ctx.fillText(home ? "집으로 돌아왔어요" : "강아지를 찾고 있어요", 80, print ? 200 : 186, 840);
  // 사진: 잘라내면 강아지가 빠질 수 있어 사진 전체를 가운데에 두고, 남는 곳은 같은 사진을 흐리게 채운다.
  const img = new Image();
  img.src = dog.image || "/assets/mascot-home.webp";
  await img.decode();
  const top = print ? 244 : 222;
  const photoH = print ? 520 : 340;
  const cover = Math.max(840 / img.width, photoH / img.height);
  const fit = Math.min(840 / img.width, photoH / img.height);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(80, top, 840, photoH, 32);
  ctx.clip();
  ctx.fillStyle = C.box;
  ctx.fillRect(80, top, 840, photoH);
  ctx.filter = "blur(24px) brightness(0.9)";
  ctx.drawImage(img, 500 - (img.width * cover) / 2, top + photoH / 2 - (img.height * cover) / 2, img.width * cover, img.height * cover);
  ctx.filter = "none";
  ctx.drawImage(img, 500 - (img.width * fit) / 2, top + photoH / 2 - (img.height * fit) / 2, img.width * fit, img.height * fit);
  ctx.restore();
  // 이름과 특징
  let y = top + photoH + (print ? 96 : 84);
  ctx.fillStyle = C.title;
  font(print ? 64 : 56, 800);
  ctx.fillText(dog.name, 80, y, 840);
  y += print ? 52 : 46;
  font(30);
  ctx.fillStyle = C.body;
  ctx.fillText([dog.breed, sexLabel(dog.sex) === "모름" ? "" : sexLabel(dog.sex), dog.age, dog.color].filter(Boolean).join(" · "), 80, y, 840);
  const rows: [string, string][] = [["마지막으로 본 곳", placeText(dog.region, dog.location, " ")]];
  if (print) rows.push([home ? "잃어버렸던 때" : "잃어버린 때", formatTime(dog.time)]);
  y += print ? 30 : 22;
  for (const [k, v] of rows) {
    ctx.fillStyle = C.line;
    ctx.fillRect(80, y, 840, 2);
    y += print ? 58 : 50;
    font(28);
    ctx.fillStyle = C.muted;
    ctx.textAlign = "left";
    ctx.fillText(k, 80, y);
    font(30, 700);
    ctx.fillStyle = C.title;
    ctx.textAlign = "right";
    ctx.fillText(v, 920, y, 560);
    ctx.textAlign = "left";
    y += print ? 30 : 24;
  }
  // QR 안내
  const boxH = print ? 210 : 170;
  const boxY = h - boxH - (print ? 48 : 36);
  ctx.fillStyle = C.box;
  ctx.beginPath();
  ctx.roundRect(80, boxY, 840, boxH, 28);
  ctx.fill();
  const qrSize = boxH - 50;
  const qr = new Image();
  // QR 라이브러리는 전단을 만들 때만 불러온다.
  const { default: QRCode } = await import("qrcode");
  qr.src = await QRCode.toDataURL(shareUrl(dog.id), { width: 240, margin: 1 });
  await qr.decode();
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(104, boxY + 18, qrSize + 14, qrSize + 14, 16);
  ctx.fill();
  ctx.drawImage(qr, 111, boxY + 25, qrSize, qrSize);
  const tx = 111 + qrSize + 44;
  ctx.fillStyle = C.title;
  font(print ? 34 : 30, 700);
  ctx.fillText(home ? "QR로 재회 소식을 볼 수 있어요" : "보셨다면 QR로 알려주세요", tx, boxY + boxH / 2 - 22, 920 - tx - 24);
  font(print ? 26 : 24);
  ctx.fillStyle = C.body;
  ctx.fillText(home ? "함께 찾아주셔서 고마워요" : "사진 한 장, 위치 한 번이면 충분해요", tx, boxY + boxH / 2 + 22, 920 - tx - 24);
  font(print ? 24 : 22, 700);
  ctx.fillStyle = C.brand;
  ctx.fillText("멍백홈 meongbackhome.com", tx, boxY + boxH / 2 + 62, 920 - tx - 24);
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
        <p className={s.intro}>QR을 찍으면 이 신고의 최신 소식으로 연결돼요. 인쇄용은 A4에 맞춰져 있어요.</p>
        <Button size="lg" full onClick={download}><Icon name="Download" size={20} />이미지 다운로드</Button>
      </div>
    </BottomSheet>
  );
}
