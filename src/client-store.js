import { seed } from "./seed.js";
import {withExamples} from './examples.js';
let data = withExamples({ ...seed(), dogs: [], reports: [], user: null, connection: "loading" }),
  baseline = structuredClone(data),
  events,
  busy = false,
  epoch = 0;
let fallbackTimer, eventsHealthy=false;
document.addEventListener('visibilitychange',()=>{
  if(!document.hidden&&!eventsHealthy)window.dispatchEvent(new Event('remote-change'));
});
window.addEventListener('online',()=>window.dispatchEvent(new Event('remote-change')));
function pollWhenNeeded(){
  clearInterval(fallbackTimer);
  fallbackTimer=setInterval(()=>{
    if(!eventsHealthy&&!document.hidden&&data.connection!=='unconfigured')window.dispatchEvent(new Event('remote-change'));
  },15000);
}
export function read() {
  return data;
}
export function id(prefix) {
  return `${prefix}-${crypto.randomUUID()}`;
}
export function notify() {} // Server creates recipient-specific notifications.
export async function api(url, body) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      method: body ? "POST" : "GET",
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const value = await response.json();
    if (!response.ok)
      throw Object.assign(
        new Error(value.error || "요청을 처리하지 못했어요."),
        { status: response.status, code:value.code },
      );
    return value;
  } catch (e) {
    if (e.name === "AbortError")
      throw new Error(
        "연결 시간이 길어지고 있어요. 입력 내용은 그대로예요. 다시 시도해주세요.",
      );
    throw e;
  } finally {
    clearTimeout(timer);
  }
}
export async function refresh({force=false}={}) {
  if (busy) return;
  const requestEpoch=++epoch;
  try {
    const incoming = await api("/api/state");
    if(requestEpoch!==epoch||busy)return;

    data = withExamples(incoming);
    baseline = structuredClone(data);
    window.dispatchEvent(new Event("store-updated"));
    return true;
  } catch (error) {
    data.connection = error.code==='SERVICE_NOT_CONFIGURED'?'unconfigured':'offline';
    window.dispatchEvent(new Event("connection-change"));
    return false;
  }
}
export async function initialize() {
  events?.close();
  eventsHealthy=false;
  const connected=await refresh({force:true});
  pollWhenNeeded();
  if(!connected||data.realtimeMode==='poll')return;
  events = new EventSource("/api/events");
  events.addEventListener("change", () =>
    window.dispatchEvent(new Event("remote-change")),
  );
  events.onerror = () => {
    eventsHealthy=false;
    data.connection = "reconnecting";
    window.dispatchEvent(new Event("connection-change"));
  };
  events.addEventListener("connected", () => {
    eventsHealthy=true;
    data.connection = "online";
    window.dispatchEvent(new Event("connection-change"));
  });
}
export async function save() {
  if (busy)
    throw new Error("앞선 내용을 저장 중이에요. 잠시 후 다시 시도해주세요.");
  if (data.connection === "offline" || data.connection === 'unconfigured')
    throw new Error(
      "서버와 연결되지 않았어요. 연결 상태를 확인하고 다시 시도해주세요.",
    );
  epoch++;
  const operations = [];
  for (const collection of [
    "dogs",
    "reports",
    "profiles",
    "stories",
    "updates",
    "moderation",
  ])
    for (const entry of data[collection]) {
      if(entry.previewOnly)continue;
      const old = baseline[collection].find((v) => v.id === entry.id);
      if (JSON.stringify(entry) !== JSON.stringify(old)) {
        const value = old
          ? Object.fromEntries(
              Object.entries(entry).filter(
                ([k, v]) =>
                  k === "id" || JSON.stringify(v) !== JSON.stringify(old[k]),
              ),
            )
          : entry;
        operations.push({ collection, value, revision: old?.revision });
      }
    }
  const preferences = { saved: data.saved, areas: data.areas };
  const changedPrefs =
    JSON.stringify(preferences) !==
    JSON.stringify({ saved: baseline.saved, areas: baseline.areas });
  const readNotifications = data.notifications
    .filter(
      (n) => n.read && !baseline.notifications.find((b) => b.id === n.id)?.read,
    )
    .map((n) => n.id);
  busy = true;
  try {
    if(data.storageMode==='supabase')for(const operation of operations){
      if(operation.value.image?.startsWith('data:image/')){
        const uploaded=await api('/api/photos',{image:operation.value.image});
        operation.value.image=uploaded.image;
      }
    }
    data = await api("/api/changes", {
      operations,
      preferences: changedPrefs ? preferences : undefined,
      readNotifications,
    });
    data = withExamples(data);
    baseline = structuredClone(data);
    return true;
  } catch (e) {
    data = structuredClone(baseline);
    throw e;
  } finally {
    busy = false;
  }
}
export async function authenticate(mode, values) {
  const result=await api(`/api/auth/${mode}`, values || {});
  await initialize();
  return result;
}
export async function enablePush() {
  const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  if(ios&&!navigator.standalone&&!matchMedia('(display-mode: standalone)').matches) throw new Error('아이폰은 Safari 공유 메뉴에서 홈 화면에 추가한 뒤, 추가된 멍백홈을 열어 알림을 켜주세요.');
  if (
    !window.isSecureContext ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  )
    throw new Error(
      "이 브라우저에서는 백그라운드 알림을 지원하지 않아요. 서비스 알림함에서 소식을 확인할 수 있어요.",
    );
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    throw new Error("브라우저 알림 권한을 허용해주세요.");
  const config = await api("/api/push/key");
  if (!config.configured)
    throw new Error(
      "서버의 알림 발신 주소 설정이 필요해요. 실시간 알림함은 사용할 수 있어요.",
    );
  await navigator.serviceWorker.register("/sw.js");
  const registration = await navigator.serviceWorker.ready;
  const raw = atob(config.publicKey.replace(/-/g, "+").replace(/_/g, "/"));
  const key = Uint8Array.from(raw, (c) => c.charCodeAt(0));
  const subscription =
    (await registration.pushManager.getSubscription()) ||
    (await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: key,
    }));
  await api("/api/push/subscribe", subscription.toJSON());
  return true;
}
