import { useSyncExternalStore } from "react";
export const currentRoute = (): string => location.hash.slice(1) || "/";
const subscribe = (notify: () => void) => {
  addEventListener("hashchange", notify);
  return () => removeEventListener("hashchange", notify);
};
export function useRoute(): string {
  return useSyncExternalStore(subscribe, currentRoute);
}
