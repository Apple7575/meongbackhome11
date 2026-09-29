import { useSyncExternalStore } from "react";
export const currentRoute = () => location.hash.slice(1) || "/";
const subscribe = (notify) => {
  addEventListener("hashchange", notify);
  return () => removeEventListener("hashchange", notify);
};
export function useRoute() {
  return useSyncExternalStore(subscribe, currentRoute);
}
