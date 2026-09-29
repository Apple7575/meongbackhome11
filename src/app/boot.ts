// 앱 시작 처리: 서버 데이터 불러오기, 실시간 변경·재연결 시 새로고침, 웹앱(서비스 워커) 준비.
import { initialize, refresh } from "../client-store.js";
import { toast } from "./toast.ts";
import { errorText } from "../errors.ts";
import { installActions } from "./dispatch.ts";
import "./install.ts";

if (isSecureContext && "serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

// 키보드가 올라온 뒤 보이는 높이(시트 최대 높이 계산에 쓴다).
const viewport = window.visualViewport;
const resize = () => document.documentElement.style.setProperty("--visible-height", `${viewport?.height || innerHeight}px`);
viewport?.addEventListener("resize", resize);
resize();

addEventListener("remote-change", () => void refresh());
addEventListener("online", () => void refresh());
addEventListener("unhandledrejection", (e) => {
  e.preventDefault();
  toast(e.reason ? errorText(e.reason) : "처리하지 못했어요. 다시 시도해주세요.");
});
document.querySelector(".skip-link")?.addEventListener("click", (e) => {
  e.preventDefault();
  const main = document.querySelector<HTMLElement>("#main");
  if (!main) return;
  main.setAttribute("tabindex", "-1");
  main.focus();
  main.scrollIntoView();
});

installActions();
void initialize();
