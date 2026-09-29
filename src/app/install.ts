// 브라우저가 주는 "앱 설치" 제안을 잡아 두었다가 설정의 "홈 화면에 추가하기"에서 쓴다.
interface InstallPrompt extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<unknown>;
}
let installPrompt: InstallPrompt | null = null;
addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e as InstallPrompt;
});
export function takeInstallPrompt() {
  const p = installPrompt;
  installPrompt = null;
  return p;
}
export const isStandalone = () =>
  matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
