import Icon from "../ui/Icon.tsx";
import s from "./Frame.module.css";
import type { Store } from "../types.ts";
const BACK: Record<string, string> = { "/my/settings": "/my" };
// 홈에서 들어가는 한 단계 깊은 화면: 뒤로 가기를 두고, 주소로 바로 들어왔다면 홈으로 보낸다.
export const isSubPage = (route: string) => route === "/stories" || /^\/shelter(\?|$)/.test(route);
export default function TopBar({ route, store }: { route: string; store: Store }) {
  const unread = store.notifications.filter((n) => !n.read).length;
  const back = BACK[route];
  const flow = /^\/(report|profile|sighting)\//.test(route);
  const goBack = (fallback: string) => (history.length > 1 ? history.back() : (location.hash = fallback));
  return (
    <header className={s.top}>
      {flow ? (
        <button type="button" className={`${s.iconButton} ${s.back}`} onClick={() => goBack("/")} aria-label="닫기">
          <Icon name="X" />
        </button>
      ) : route.startsWith("/dog/") || isSubPage(route) ? (
        <button type="button" className={`${s.iconButton} ${s.back}`} onClick={() => goBack(isSubPage(route) ? "/" : "/explore")} aria-label="뒤로">
          <Icon name="ChevronLeft" />
        </button>
      ) : back ? (
        <a className={`${s.iconButton} ${s.back}`} href={`#${back}`} aria-label="뒤로">
          <Icon name="ChevronLeft" />
        </a>
      ) : (
        <a className={s.brand} href="#/" aria-label="멍백홈 홈">
          <img src="/favicon.svg" alt="" />
          멍백홈
        </a>
      )}
      <div className={s.actions}>
        {/* 작성하는 동안에는 알림으로 빠져나가지 않도록 종을 숨긴다. */}
        {!flow && (
          <button type="button" className={s.iconButton} data-action="notifications" aria-label={`알림 ${unread}개`}>
            <Icon name="Bell" />
            {unread > 0 && <span className={s.dot} />}
          </button>
        )}
        {route === "/my" && (
          <a className={s.iconButton} href="#/my/settings" aria-label="설정">
            <Icon name="Settings" />
          </a>
        )}
      </div>
    </header>
  );
}
