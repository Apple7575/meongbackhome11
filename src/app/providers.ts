// 서버가 켜 둔 외부 기능(카카오 로그인, 카카오 JavaScript 키). 한 번만 묻고 기억한다.
export interface Providers { kakao?: boolean; kakaoMapKey?: string | null }
let cached: Promise<Providers> | null = null;
export function providers(): Promise<Providers> {
  cached ??= fetch("/api/auth/providers")
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));
  return cached;
}
