// 목록 썸네일(56~72px)에 원본 사진(수백 KB)을 내려받지 않도록 작은 사진 주소로 바꾼다.
// - 예시 사진: scripts/make-images.mjs 가 만든 -thumb.webp
// - 올린 사진: 서버가 ?w=192 로 줄여서 준다
// - 그 밖의 주소(작성 중 data URL 등)는 그대로 쓴다.
export function thumbSrc(src?: string): string {
  if (!src) return "/assets/mascot-home.webp";
  const asset = /^\/assets\/(dog-[\w-]+)\.webp$/.exec(src);
  if (asset && !asset[1].endsWith("-thumb")) return `/assets/${asset[1]}-thumb.webp`;
  if (/^\/api\/media\/[a-f0-9-]{36}$/.test(src)) return `${src}?w=192`;
  return src;
}
