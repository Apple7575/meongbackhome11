type TimeInput = string | number | Date;
const ms = (t: TimeInput) => new Date(t).getTime();
export const formatTime = (t: TimeInput) =>
  new Date(t).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
export const timeAgo = (t: TimeInput) => {
  const h = Math.max(0, Math.floor((Date.now() - ms(t)) / 3600000));
  return h < 1 ? "방금 전" : h < 24 ? `${h}시간 전` : `${Math.floor(h / 24)}일 전`;
};
export function relativeTime(t: TimeInput, now: number = Date.now()): string {
  const m = Math.max(0, Math.floor((now - ms(t)) / 60000));
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  if (m < 1440) return `${Math.floor(m / 60)}시간 전`;
  return `${Math.floor(m / 1440)}일 전`;
}
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
export type DayGroup = "오늘" | "어제" | "이번 주" | "이전";
export function dayGroup(t: TimeInput, now: number = Date.now()): DayGroup {
  const days = Math.round((startOfDay(new Date(now)) - startOfDay(new Date(t))) / 86400000);
  return days <= 0 ? "오늘" : days === 1 ? "어제" : days < 7 ? "이번 주" : "이전";
}
// 마지막 글자가 한글 음절이고 받침이 있는지
const hasBatchim = (name: string) => {
  const code = String(name).trim().slice(-1).charCodeAt(0) - 0xac00;
  return code >= 0 && code <= 11171 && code % 28 !== 0;
};
export const subjectParticle = (name: string) => (hasBatchim(name) ? "이" : "가");
export const objectParticle = (name: string) => (hasBatchim(name) ? "을" : "를");
