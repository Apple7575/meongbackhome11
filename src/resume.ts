// 작성한 신고를 등록하려다 카카오 로그인으로 페이지를 떠날 때, 돌아오면 이어서 등록하도록 표시해 둔다.
// 이 탭에서만, 10분 안에 같은 화면으로 돌아온 경우에만 한 번 이어 간다.
const KEY = "meongback-resume-submit";
const LIMIT = 10 * 60000;
export function markResume(route: string) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ route, at: Date.now() }));
  } catch {
    // 저장소를 못 쓰면 돌아와서 확인 단계부터 다시 누르면 된다.
  }
}
// 화면이 그려지다 멈췄다 다시 그려질 수 있으므로(Suspense) 읽기만 하고, 실제로 이어 갈 때 clearResume으로 지운다.
export function hasResume(route: string) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) || "null") as { route?: string; at?: number } | null;
    return !!saved && saved.route === route && Date.now() - (saved.at || 0) < LIMIT;
  } catch {
    return false;
  }
}
export function clearResume() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // 지우지 못해도 10분이 지나면 쓰지 않는다.
  }
}
