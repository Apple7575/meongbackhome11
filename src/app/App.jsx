import { useEffect, useState } from "react";
import "../main.js";
import ReportSheet from "../screens/ReportSheet.jsx";
import { useRoute } from "./router.js";
import { useStore } from "./useStore.js";
import TopBar from "./TopBar.jsx";
import BottomNav from "./BottomNav.jsx";
import Home from "../screens/Home.jsx";
import Explore from "../screens/Explore.jsx";
import Sightings from "../screens/Sightings.jsx";
import My from "../screens/My.jsx";
import Settings from "../screens/Settings.jsx";
import DogDetail from "../screens/DogDetail.jsx";
import Stories from "../screens/Stories.jsx";
import Admin from "../screens/Admin.jsx";
import ReportFlow from "../screens/forms/ReportFlow.jsx";
import SightingFlow from "../screens/forms/SightingFlow.jsx";
import AccountPage from "../screens/AccountPage.jsx";
import AuthSheet from "../screens/sheets/AuthSheet.jsx";
import NotificationsSheet from "../screens/sheets/NotificationsSheet.jsx";
import AreasSheet from "../screens/sheets/AreasSheet.jsx";
import ReuniteSheet from "../screens/sheets/ReuniteSheet.jsx";
import StorySheet from "../screens/sheets/StorySheet.jsx";
import { EmptyState, ButtonLink } from "../ui/index.jsx";
import s from "./Frame.module.css";
// openSheet(name, props)로 여는 시트들.
const SHEETS = { auth: AuthSheet, notifications: NotificationsSheet, areas: AreasSheet, reunite: ReuniteSheet, story: StorySheet };
export const SCREENS = {
  "/": Home, "/explore": Explore, "/sightings": Sightings, "/my": My, "/my/settings": Settings,
  "/stories": Stories, "/admin": Admin,
};
const PATTERNS = [
  [/^\/dog\/(?<id>[^/]+)$/, DogDetail],
  [/^\/report\/(?<mode>new)$/, ReportFlow],
  [/^\/report\/(?<mode>from|edit)\/(?<id>[^/]+)$/, ReportFlow],
  [/^\/(?<mode>profile)\/new$/, ReportFlow],
  [/^\/sighting\/new(?:\/(?<dogId>[^/]+))?$/, SightingFlow],
  [/^\/account\/(?<kind>[a-z]+)(?:\?(?<query>.*))?$/, AccountPage],
];
// 폼을 쓰는 동안에는 하단 메뉴를 숨기고 상단에 닫기만 둔다.
export const isFlow = (route) => /^\/(report|profile|sighting)\//.test(route);
function NotFound() {
  return <EmptyState title="페이지를 찾을 수 없어요" description="홈으로 돌아가 다시 시작해주세요." action={<ButtonLink href="#/" variant="weak">홈으로</ButtonLink>} />;
}
export function resolveScreen(route) {
  if (SCREENS[route]) return { Screen: SCREENS[route], params: {} };
  for (const [re, Screen] of PATTERNS) {
    const m = route.match(re);
    if (m) return { Screen, params: m.groups };
  }
  return { Screen: NotFound, params: {} };
}
export default function App() {
  const route = useRoute();
  const store = useStore();
  const { Screen, params } = resolveScreen(route);
  const [reportId, setReportId] = useState(null);
  const [sheet, setSheet] = useState(null);
  useEffect(() => {
    const openReport = (e) => setReportId(e.detail);
    const openNamed = (e) => setSheet(e.detail);
    addEventListener("open-report", openReport);
    addEventListener("open-sheet", openNamed);
    return () => {
      removeEventListener("open-report", openReport);
      removeEventListener("open-sheet", openNamed);
    };
  }, []);
  useEffect(() => {
    setReportId(null);
    setSheet(null);
    window.scrollTo({ top: 0 });
  }, [route]);
  const Sheet = sheet && SHEETS[sheet.name];
  return (
    <div className={s.app} data-shell="react">
      <TopBar route={route} store={store} />
      <div id="connection-banner" className={s.banner} hidden />
      <main id="main" className={s.main}>
        {/* 주소가 바뀌면(예: 인증 → 비밀번호 찾기, 다른 강아지) 화면 상태를 새로 시작한다. */}
        <Screen key={route.split("?")[0]} {...params} />
      </main>
      {!isFlow(route) && <BottomNav route={route} />}
      {reportId && <ReportSheet id={reportId} onClose={() => setReportId(null)} />}
      {Sheet && <Sheet {...sheet.props} onClose={() => setSheet(null)} />}
    </div>
  );
}
