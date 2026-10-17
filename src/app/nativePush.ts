// 앱(Android·iOS) 알림: 웹 푸시 대신 Firebase Cloud Messaging 기기 토큰을 서버에 등록한다.
// 앱 안에서만 불러온다(client-store.js·boot.ts의 동적 import). 웹 화면 묶음에는 들어가지 않는다.
import { Capacitor, registerPlugin } from "@capacitor/core";
import type { FirebaseMessagingPlugin } from "@capacitor-firebase/messaging";
import { api } from "../client-store.js";
import { toast } from "./toast.ts";
const Messaging = registerPlugin<FirebaseMessagingPlugin>("FirebaseMessaging");
const register = (token: string) => api("/api/push/native", { token, platform: Capacitor.getPlatform() });
export async function enableNativePush() {
  const { receive } = await Messaging.requestPermissions();
  if (receive !== "granted") throw new Error("휴대폰 설정에서 멍백홈 알림을 허용해주세요.");
  const { token } = await Messaging.getToken();
  await register(token);
  dispatchEvent(new Event("native-push-changed"));
  return true;
}
export const nativePushGranted = () => Messaging.checkPermissions().then(({ receive }) => receive === "granted").catch(() => false);
// 앱이 켜질 때 한 번: 알림을 눌러 들어오면 그 화면으로 가고, 토큰이 바뀌면 다시 등록하고,
// 앱을 보고 있을 때 온 알림은 화면 위에 짧게 보여준다(알림함은 서버 상태로 이미 갱신된다).
export function listenNativePush() {
  if (!Capacitor.isNativePlatform()) return;
  Messaging.addListener("notificationActionPerformed", ({ notification }) => {
    const url = (notification.data as { url?: string } | undefined)?.url;
    if (url?.startsWith("/#/")) location.hash = url.slice(2);
  });
  Messaging.addListener("tokenReceived", ({ token }) => {
    Messaging.checkPermissions().then(({ receive }) => receive === "granted" && register(token)).catch(() => {});
  });
  Messaging.addListener("notificationReceived", ({ notification }) => {
    if (notification.title) toast(notification.title);
  });
}
