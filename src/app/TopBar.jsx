import Icon from "../ui/Icon.jsx";
import s from "./Frame.module.css";
const BACK = { "/my/settings": "/my" };
const PLAIN = new Set(["/explore", "/sightings", "/my"]);
export default function TopBar({ route, store }) {
  const unread = store.notifications.filter((n) => !n.read).length;
  const back = BACK[route];
  return (
    <header className={s.top}>
      {back ? (
        <a className={`${s.iconButton} ${s.back}`} href={`#${back}`} aria-label="뒤로">
          <Icon name="ChevronLeft" />
        </a>
      ) : PLAIN.has(route) ? (
        <span />
      ) : (
        <a className={s.brand} href="#/" aria-label="멍백홈 홈">
          <img src="/favicon.svg" alt="" />
          멍백홈
        </a>
      )}
      <div className={s.actions}>
        <button type="button" className={s.iconButton} data-action="notifications" aria-label={`알림 ${unread}개`}>
          <Icon name="Bell" />
          {unread > 0 && <span className={s.dot} />}
        </button>
        {route === "/my" && (
          <a className={s.iconButton} href="#/my/settings" aria-label="설정">
            <Icon name="Settings" />
          </a>
        )}
      </div>
    </header>
  );
}
