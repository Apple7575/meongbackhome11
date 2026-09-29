export const formatTime = (t) =>
  new Date(t).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
export const timeAgo = (t) => {
  const h = Math.max(0, Math.floor((Date.now() - new Date(t)) / 3600000));
  return h < 1 ? "방금 전" : h < 24 ? `${h}시간 전` : `${Math.floor(h / 24)}일 전`;
};
export function relativeTime(t, now = Date.now()) {
  const m = Math.max(0, Math.floor((now - new Date(t)) / 60000));
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  if (m < 1440) return `${Math.floor(m / 60)}시간 전`;
  return `${Math.floor(m / 1440)}일 전`;
}
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
export function dayGroup(t, now = Date.now()) {
  const days = Math.round((startOfDay(new Date(now)) - startOfDay(new Date(t))) / 86400000);
  return days <= 0 ? "오늘" : days === 1 ? "어제" : days < 7 ? "이번 주" : "이전";
}
const hasBatchim = (name) => {
  const code = String(name).trim().slice(-1).charCodeAt(0) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
};
export const subjectParticle = (name) => (hasBatchim(name) ? "이" : "가");
export function objectParticle(name) {
  const code = String(name).trim().slice(-1).charCodeAt(0) - 0xac00;
  if (code < 0 || code > 11171) return "를";
  return code % 28 ? "을" : "를";
}
