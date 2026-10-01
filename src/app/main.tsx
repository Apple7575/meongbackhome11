import { createRoot } from "react-dom/client";
import { toast } from "./toast.ts";
import { applyTheme } from "./theme.ts";
import "../ui/base.css";
import App from "./App.tsx";
import "../ui/tokens.css";
// 카카오 로그인에서 돌아왔으면 결과를 알리고 주소의 login= 은 지운다.
const login = /[?&]login=(kakao|cancelled|failed)/.exec(location.hash)?.[1];
if (login) {
  history.replaceState(null, "", location.hash.replace(/[?&]login=\w+/, "") || "#/my");
  const message = { kakao: "카카오로 로그인했어요.", cancelled: "카카오 로그인을 취소했어요.", failed: "카카오 로그인에 실패했어요. 다시 시도해주세요." }[login];
  setTimeout(() => toast(message ?? ""), 400);
}
// 저장된 화면 테마(라이트·다크)를 주소창 색까지 맞춘다.
applyTheme();
createRoot(document.querySelector("#app") as HTMLElement).render(<App />);
