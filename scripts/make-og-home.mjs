// 홈 주소를 공유할 때 보이는 미리보기 그림(1200×630)을 만든다. 문구를 바꾸면 다시 실행한다: node scripts/make-og-home.mjs
import sharp from "sharp";
const W = 1200, H = 630;
const text = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <style>text{font-family:'Pretendard','Malgun Gothic','Apple SD Gothic Neo',sans-serif}</style>
  <rect width="100%" height="100%" fill="#ffffff"/>
  <rect x="80" y="96" width="112" height="48" rx="24" fill="#fdeee8"/>
  <text x="136" y="129" text-anchor="middle" font-size="26" font-weight="700" fill="#e8805f">멍백홈</text>
  <text x="80" y="236" font-size="64" font-weight="800" fill="#191f28">잃어버린 강아지,</text>
  <text x="80" y="316" font-size="64" font-weight="800" fill="#191f28">이웃과 함께 찾아요</text>
  <text x="80" y="392" font-size="30" fill="#4e5968">사진과 장소만 있으면 바로 신고할 수 있어요.</text>
  <text x="80" y="438" font-size="30" fill="#4e5968">본 강아지는 로그인 없이 알려줄 수 있어요.</text>
  <text x="80" y="540" font-size="28" font-weight="700" fill="#e8805f">meongbackhome.com</text>
</svg>`;
const mascot = await sharp("public/assets/mascot-home.png").resize({ height: 440, fit: "inside" }).toBuffer();
await sharp(Buffer.from(text))
  .composite([{ input: mascot, left: 800, top: 120 }])
  .png({ compressionLevel: 9 })
  .toFile("public/og-home.png");
console.log("public/og-home.png");
