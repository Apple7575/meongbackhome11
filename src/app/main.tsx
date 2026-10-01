import { createRoot } from "react-dom/client";
import { applyTheme } from "./theme.ts";
import "../ui/base.css";
import App from "./App.tsx";
import "../ui/tokens.css";
// 저장된 화면 테마(라이트·다크)를 주소창 색까지 맞춘다.
applyTheme();
createRoot(document.querySelector("#app") as HTMLElement).render(<App />);
