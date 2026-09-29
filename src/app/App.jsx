import { useEffect, useRef } from "react";
import { mountLegacy } from "../main.js";
export default function App() {
  const legacyRef = useRef(null);
  useEffect(() => {
    mountLegacy(legacyRef.current);
    return () => mountLegacy(null);
  }, []);
  return <div ref={legacyRef} id="legacy-root" data-shell="react" />;
}
