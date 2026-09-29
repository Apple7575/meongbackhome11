import Icon from "../ui/Icon.jsx";
import s from "./Frame.module.css";
const ITEMS = [
  ["/", "House", "홈"],
  ["/explore", "Search", "찾기"],
  null,
  ["/sightings", "MapPin", "목격 소식"],
  ["/my", "UserRound", "마이홈"],
];
const isCurrent = (route, path) => route === path || (path === "/my" && route.startsWith("/my/"));
export default function BottomNav({ route }) {
  return (
    <nav className={s.nav} aria-label="하단 메뉴">
      {ITEMS.map((item) =>
        item ? (
          <a key={item[0]} className={s.navItem} href={`#${item[0]}`} aria-current={isCurrent(route, item[0]) ? "page" : undefined}>
            <Icon name={item[1]} />
            <span>{item[2]}</span>
          </a>
        ) : (
          <button key="report" type="button" className={s.navItem} data-action="report" aria-label="실종 신고">
            <span className={s.reportIcon}><Icon name="Plus" size={22} /></span>
            <span>신고</span>
          </button>
        ),
      )}
    </nav>
  );
}
