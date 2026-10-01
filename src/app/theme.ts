// 화면 테마: 시스템 설정 따르기(기본) · 라이트 · 다크. 이 휴대폰에만 저장한다.
// 첫 화면 깜빡임을 막으려고 index.html의 짧은 스크립트가 같은 키로 먼저 적용한다.
export type Theme = "system" | "light" | "dark";
export const THEME_KEY = "meongback-theme";
export const THEMES: [Theme, string][] = [["system", "시스템 설정 따르기"], ["light", "라이트"], ["dark", "다크"]];
export function getTheme(): Theme {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}
export function applyTheme(theme: Theme = getTheme()) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
  // 주소창 색: 직접 고르면 그 색으로, 시스템 설정이면 모드별 기본값으로
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  metas.forEach((m) => {
    const dark = m.media.includes("dark");
    m.content = theme === "system" ? (dark ? "#17171c" : "#ffffff") : theme === "dark" ? "#17171c" : "#ffffff";
  });
}
export function setTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {
    // 저장이 막힌 브라우저에서도 지금 화면에는 적용한다.
  }
  applyTheme(theme);
}
