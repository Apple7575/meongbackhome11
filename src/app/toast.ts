// 화면 아래에 잠깐 보이는 알림 메시지(#toast, 스크린리더에 읽힘).
let timer: ReturnType<typeof setTimeout> | undefined;
export function toast(message: string) {
  const el = document.querySelector<HTMLElement>("#toast");
  if (!el) return;
  el.textContent = message;
  el.classList.add("visible");
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove("visible"), 3800);
}
