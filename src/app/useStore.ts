import { useSyncExternalStore } from "react";
import { read } from "../client-store.js";
import type { Store } from "../types.ts";
// client-store는 같은 객체를 제자리에서 바꾸므로, 이벤트마다 버전을 올려 다시 그린다.
let version = 0;
const listeners = new Set<() => void>();
for (const name of ["store-updated", "connection-change", "legacy-render"])
  addEventListener(name, () => {
    version++;
    listeners.forEach((l) => l());
  });
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};
export function useStore(): Store {
  useSyncExternalStore(subscribe, () => version);
  return read();
}
