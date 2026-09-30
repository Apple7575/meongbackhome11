// 화면에 쓰는 이미지를 원본 PNG에서 알맞은 크기의 WebP로 만든다. 원본을 바꾸면 다시 실행한다: node scripts/make-images.mjs
// - 마스코트: 안내 화면에 120~240px로 보이므로 480px(레티나 2배). 재회 마스코트는 이야기 카드 기본 사진이라 640px.
// - 예시 강아지 사진: 상세 화면용 800px, 목록 썸네일용 192px(-thumb).
import sharp from "sharp";
import fs from "node:fs";
const dir = "public/assets";
const jobs = [];
for (const name of ["mascot-home", "mascot-search", "mascot-alert", "mascot-reunion"])
  jobs.push([`${name}.png`, `${name}.webp`, name === "mascot-reunion" ? 640 : 480, 82]);
for (const name of ["dog-maltese", "dog-poodle", "dog-jindo", "dog-corgi"]) {
  jobs.push([`${name}.png`, `${name}.webp`, 800, 78]);
  jobs.push([`${name}.png`, `${name}-thumb.webp`, 192, 72]);
}
for (const [from, to, size, quality] of jobs) {
  const before = fs.existsSync(`${dir}/${to}`) ? fs.statSync(`${dir}/${to}`).size : 0;
  await sharp(`${dir}/${from}`).resize(size, size, { fit: "inside", withoutEnlargement: true }).webp({ quality }).toFile(`${dir}/${to}.tmp`);
  fs.renameSync(`${dir}/${to}.tmp`, `${dir}/${to}`);
  console.log(`${to.padEnd(26)} ${(before / 1024).toFixed(0).padStart(4)}KB → ${(fs.statSync(`${dir}/${to}`).size / 1024).toFixed(0)}KB`);
}
