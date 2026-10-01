import { lazy, Suspense, useEffect, useState } from "react";
import type { ComponentType, LazyExoticComponent } from "react";
import type { SheetName, SheetRequest } from "./sheets.ts";
import "./boot.ts";
import ConnectionBanner from "./ConnectionBanner.tsx";
import ReportSheet from "../screens/ReportSheet.tsx";
import { useRoute } from "./router.ts";
import { useStore } from "./useStore.ts";
import TopBar from "./TopBar.tsx";
import BottomNav from "./BottomNav.tsx";
import Home from "../screens/Home.tsx";
import Explore from "../screens/Explore.tsx";
import Sightings from "../screens/Sightings.tsx";
import My from "../screens/My.tsx";
import Settings from "../screens/Settings.tsx";
import DogDetail from "../screens/DogDetail.tsx";
// 자주 쓰지 않는 화면은 들어갈 때 불러온다(첫 화면을 가볍게).
const Stories = lazy(() => import("../screens/Stories.tsx"));
const Admin = lazy(() => import("../screens/Admin.tsx"));
const ReportFlow = lazy(() => import("../screens/forms/ReportFlow.tsx"));
const SightingFlow = lazy(() => import("../screens/forms/SightingFlow.tsx"));
const AccountPage = lazy(() => import("../screens/AccountPage.tsx"));
import AuthSheet from "../screens/sheets/AuthSheet.tsx";
import NotificationsSheet from "../screens/sheets/NotificationsSheet.tsx";
import AreasSheet from "../screens/sheets/AreasSheet.tsx";
import ReuniteSheet from "../screens/sheets/ReuniteSheet.tsx";
import StorySheet from "../screens/sheets/StorySheet.tsx";
import ShareSheet from "../screens/sheets/ShareSheet.tsx";
import PosterSheet from "../screens/sheets/PosterSheet.tsx";
import InfoSheet from "../screens/sheets/InfoSheet.tsx";
import { UpdateSheet, FlagSheet } from "../screens/sheets/TextSheets.tsx";
import { DeviceSheet, DeleteAccountSheet, SuccessSheet } from "../screens/sheets/AccountSheets.tsx";
import SuggestSheet from "../screens/sheets/SuggestSheet.tsx";
import { EmptyState, ButtonLink, SkeletonRows } from "../ui/index.tsx";
import s from "./Frame.module.css";
// openSheet(name, props)로 여는 시트들. 화면·시트마다 props가 달라 표는 느슨한 타입으로 둔다.
type AnyComponent = ComponentType<any> | LazyExoticComponent<ComponentType<any>>;
const SHEETS: Record<SheetName, AnyComponent> = {
  auth: AuthSheet, notifications: NotificationsSheet, areas: AreasSheet, reunite: ReuniteSheet, story: StorySheet,
  share: ShareSheet, poster: PosterSheet, update: UpdateSheet, flag: FlagSheet, info: InfoSheet,
  device: DeviceSheet, deleteAccount: DeleteAccountSheet, success: SuccessSheet, suggest: SuggestSheet,
};
export const SCREENS: Record<string, AnyComponent> = {
  "/": Home, "/explore": Explore, "/sightings": Sightings, "/my": My, "/my/settings": Settings,
  "/stories": Stories, "/admin": Admin,
};
const PATTERNS: [RegExp, AnyComponent][] = [
  // ?report=ID 가 붙으면 그 목격 제보를 바로 연다(알림에서 들어올 때).
  [/^\/dog\/(?<id>[^/?]+)(?:\?report=(?<report>[\w-]+))?$/, DogDetail],
  [/^\/report\/(?<mode>new)$/, ReportFlow],
  [/^\/report\/(?<mode>from|edit)\/(?<id>[^/]+)$/, ReportFlow],
  [/^\/(?<mode>profile)\/new$/, ReportFlow],
  [/^\/sighting\/new(?:\/(?<dogId>[^/]+))?$/, SightingFlow],
  [/^\/account\/(?<kind>[a-z]+)(?:\?(?<query>.*))?$/, AccountPage],
];
// 폼을 쓰는 동안에는 하단 메뉴를 숨기고 상단에 닫기만 둔다.
export const isFlow = (route: string) => /^\/(report|profile|sighting)\//.test(route);
// 상세 화면은 뒤로 가기가 있는 한 단계 깊은 화면이라 하단 메뉴를 숨긴다.
export const isDetail = (route: string) => route.startsWith("/dog/");
function NotFound() {
  return <EmptyState title="페이지를 찾을 수 없어요" description="홈으로 돌아가 다시 시작해주세요." action={<ButtonLink href="#/" variant="weak">홈으로</ButtonLink>} />;
}
export function resolveScreen(route: string): { Screen: AnyComponent; params: Record<string, string> } {
  if (SCREENS[route]) return { Screen: SCREENS[route], params: {} };
  for (const [re, Screen] of PATTERNS) {
    const m = route.match(re);
    if (m) return { Screen, params: m.groups ?? {} };
  }
  return { Screen: NotFound, params: {} };
}
export default function App() {
  const route = useRoute();
  const store = useStore();
  const { Screen, params } = resolveScreen(route);
  const [reportId, setReportId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetRequest | null>(null);
  useEffect(() => {
    const openReport = (e: Event) => setReportId((e as CustomEvent<string>).detail);
    const openNamed = (e: Event) => setSheet((e as CustomEvent<SheetRequest>).detail);
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
    <div className={s.app} data-shell="react" data-nav={isFlow(route) || isDetail(route) ? "off" : undefined}>
      <TopBar route={route} store={store} />
      <ConnectionBanner connection={store.connection} />
      <main id="main" className={s.main}>
        {/* 주소가 바뀌면(예: 인증 → 비밀번호 찾기, 다른 강아지) 화면 상태를 새로 시작한다. */}
        <Suspense fallback={<SkeletonRows />}>
          <Screen key={route.split("?")[0]} {...params} />
        </Suspense>
      </main>
      {!isFlow(route) && !isDetail(route) && <BottomNav route={route} />}
      {reportId && <ReportSheet id={reportId} onClose={() => setReportId(null)} />}
      {sheet && Sheet && <Sheet {...sheet.props} onClose={() => setSheet(null)} />}
    </div>
  );
}
