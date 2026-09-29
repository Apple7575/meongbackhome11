import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "../ui/tokens.css";
import "../ui/legacy-sheet.css";
createRoot(document.querySelector("#app") as HTMLElement).render(<App />);
