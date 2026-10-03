import Icon from "../ui/Icon.tsx";
import type { IconName } from "../ui/Icon.tsx";
import s from "./Frame.module.css";
import { isSubPage } from "./TopBar.tsx";
const ITEMS: ([string, IconName, string] | null)[] = [
  ["/", "House", "홈"],
  ["/explore", "Search", "찾기"],
  null,
  ["/sightings", "MapPin", "목격 소식"],
  ["/my", "UserRound", "마이홈"],
];
// 보호소·재회 이야기는 홈에서 들어가는 화면이라 홈을 켜 둔다.
const isCurrent = (route: string, path: string) =>
  route === path || (path === "/my" && route.startsWith("/my/")) || (path === "/" && isSubPage(route));
export default function BottomNav({ route }: { route: string }) {
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
