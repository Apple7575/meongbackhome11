// React 시트를 어디서든(옛 main.js 포함) 연다. App이 "open-sheet" 이벤트를 받아 그린다.
export function openSheet(name, props = {}) {
  window.dispatchEvent(new CustomEvent("open-sheet", { detail: { name, props } }));
}
