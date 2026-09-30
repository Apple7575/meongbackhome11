type TimeInput = string | number | Date;
const ms = (t: TimeInput) => new Date(t).getTime();
// '9월 29일 오후 11:27'
export const formatTime = (t: TimeInput) => {
  const d = new Date(t);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" })}`;
};
// 예전 신고의 '여아·남아'를 새 표현으로 보여준다.
export const sexLabel = (sex?: string) => ({ 여아: "암컷", 남아: "수컷" } as Record<string, string>)[sex || ""] || sex || "";
// 350m · 1.2km · 12km
export const distanceText = (km: number) => (km < 1 ? `${Math.max(10, Math.round((km * 1000) / 10) * 10)}m` : km < 10 ? `${km.toFixed(1)}km` : `${Math.round(km)}km`);
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
// '서울' + '서울 송파구 …'처럼 장소에 지역이 이미 들어 있으면 한 번만 쓴다.
export const placeText = (region?: string, location?: string, sep = " · ") =>
  region && location?.startsWith(region) ? location : [region, location].filter(Boolean).join(sep);
