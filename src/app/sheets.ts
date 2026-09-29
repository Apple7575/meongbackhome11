// React 시트를 어디서든(옛 main.js 포함) 연다. App이 "open-sheet" 이벤트를 받아 그린다.
export type SheetName = "auth" | "notifications" | "areas" | "reunite" | "story";
export interface SheetRequest {
  name: SheetName;
  props: Record<string, unknown>;
}
export function openSheet(name: SheetName, props: Record<string, unknown> = {}) {
  window.dispatchEvent(new CustomEvent<SheetRequest>("open-sheet", { detail: { name, props } }));
}
