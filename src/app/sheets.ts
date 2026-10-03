// React 시트를 어디서든(버튼의 data-action 처리 포함) 연다. App이 "open-sheet" 이벤트를 받아 그린다.
export type SheetName =
  | "auth" | "notifications" | "areas" | "reunite" | "story"
  | "share" | "poster" | "update" | "flag" | "info" | "device" | "deleteAccount" | "success" | "suggest" | "publicDog" | "logout" | "deleteDoc";
export interface SheetRequest {
  name: SheetName;
  props: Record<string, unknown>;
}
export function openSheet(name: SheetName, props: Record<string, unknown> = {}) {
  window.dispatchEvent(new CustomEvent<SheetRequest>("open-sheet", { detail: { name, props } }));
}
