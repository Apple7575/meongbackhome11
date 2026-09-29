import { useEffect, useRef } from "react";
import { mountLegacy } from "../main.js";
import { useRoute } from "./router.js";
import { useStore } from "./useStore.js";
import TopBar from "./TopBar.jsx";
import BottomNav from "./BottomNav.jsx";
import s from "./Frame.module.css";
// 새 디자인으로 옮긴 화면. 여기에 없는 경로는 기존 main.js가 #legacy-root에 그린다.
export const SCREENS = {};
export default function App() {
  const route = useRoute();
  const store = useStore();
  const Screen = SCREENS[route];
  const legacyRef = useRef(null);
  useEffect(() => {
    document.body.dataset.shell = Screen ? "column" : "legacy";
    if (Screen) return;
    mountLegacy(legacyRef.current);
    return () => mountLegacy(null);
  }, [Screen]);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route]);
  return (
    <div className={s.app} data-shell="react">
      <TopBar route={route} store={store} />
      <div id="connection-banner" className={s.banner} hidden />
      <main id="main" className={Screen ? s.main : "container"}>
        {Screen ? <Screen /> : <div ref={legacyRef} id="legacy-root" />}
      </main>
      <BottomNav route={route} />
    </div>
  );
}
