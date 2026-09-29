import { createRoot } from "react-dom/client";
import "../ui/base.css";
import App from "./App.tsx";
import "../ui/tokens.css";
createRoot(document.querySelector("#app") as HTMLElement).render(<App />);
