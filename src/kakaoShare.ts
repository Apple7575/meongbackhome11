// 카카오톡 공유: 사진·이름·마지막 위치가 담긴 카드와 '보고 제보하기' 버튼을 보낸다.
// 카카오 JavaScript 키(지도와 같은 키)가 있고, 카카오 콘솔에 이 사이트 주소가 등록돼 있어야 동작한다.
import { providers } from "./app/providers.ts";
import { shareUrl, shareTitle } from "./share.ts";
import type { Dog } from "./types.ts";
// 카카오 개발자 문서의 최신판(2.8.3). 바꿀 때는 integrity도 함께 바꾼다.
const SDK = "https://t1.kakaocdn.net/kakao_js_sdk/2.8.3/kakao.min.js";
const SRI = "sha384-oroumrnFVE0xtgqyDZJARgERibXg2C28380uaUZz2kHDS5CR7tu20eGiOU6GkTpy";
interface KakaoSDK {
  init(key: string): void;
  isInitialized(): boolean;
  Share: { sendDefault(settings: Record<string, unknown>): void };
}
declare global {
  interface Window { Kakao?: KakaoSDK }
}
let ready: Promise<boolean> | null = null;
// 카카오톡 공유를 쓸 수 있으면 true. 키가 없거나 SDK를 못 불러오면 false(기존 공유를 쓴다).
export function kakaoShareReady(): Promise<boolean> {
  ready ??= providers().then(({ kakaoMapKey }) => {
    if (!kakaoMapKey) return false;
    return new Promise<boolean>((resolve) => {
      const done = () => {
        try {
          if (!window.Kakao) return resolve(false);
          if (!window.Kakao.isInitialized()) window.Kakao.init(kakaoMapKey);
          resolve(true);
        } catch { resolve(false); }
      };
      if (window.Kakao) return done();
      const script = document.createElement("script");
      script.src = SDK;
      script.integrity = SRI;
      script.crossOrigin = "anonymous";
      const timer = setTimeout(() => resolve(false), 8000);
      script.onload = () => { clearTimeout(timer); done(); };
      script.onerror = () => { clearTimeout(timer); resolve(false); };
      document.head.append(script);
    });
  });
  return ready;
}
// 카드 그림: 앱에 들어 있는 그림은 그대로, 올린 사진은 공유 미리보기용 1200×630 그림을 쓴다(/d/:id 미리보기와 같다).
function cardImage(dog: Dog) {
  if (/^\/assets\/[\w.-]+\.(png|webp|jpg)$/.test(dog.image || "")) return { imageUrl: `${location.origin}${dog.image}` };
  if (dog.image) return { imageUrl: `${location.origin}/api/og/dog/${encodeURIComponent(dog.id)}.jpg`, imageWidth: 1200, imageHeight: 630 };
  return { imageUrl: `${location.origin}/og-home.png`, imageWidth: 1200, imageHeight: 630 };
}
export async function shareToKakao(dog: Dog): Promise<boolean> {
  if (!(await kakaoShareReady()) || !window.Kakao) return false;
  const url = shareUrl(dog.id);
  const link = { mobileWebUrl: url, webUrl: url };
  try {
    window.Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: shareTitle(dog),
        description: [dog.breed, dog.location].filter(Boolean).join(" · "),
        ...cardImage(dog),
        link,
      },
      buttons: [{ title: dog.status === "reunited" ? "소식 보기" : "보고 제보하기", link }],
    });
    return true;
  } catch {
    return false;
  }
}
