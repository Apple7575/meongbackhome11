import type { CapacitorConfig } from "@capacitor/cli";

// 1단계: 앱은 운영 사이트를 그대로 띄운다(로그인 쿠키·카카오 로그인·공유 링크가 웹과 똑같이 동작하고,
// main에 푸시하면 앱 화면도 바로 바뀐다). 오프라인이면 앱에 넣어 둔 dist/offline.html을 보여준다.
// appId는 스토어에 올리면 바꿀 수 없다.
const config: CapacitorConfig = {
  appId: "com.meongbackhome.app",
  appName: "멍백홈",
  webDir: "dist",
  // 웹 화면이 앱 안인지 알 수 있게 한다(예: '홈 화면에 추가' 안내 숨기기).
  appendUserAgent: "MeongbackApp",
  backgroundColor: "#ffffff",
  server: {
    url: "https://meongbackhome.com",
    errorPath: "offline.html",
    // 카카오 로그인 화면은 앱 밖(브라우저)으로 내보내지 않고 앱 안에서 연다(돌아오면 로그인 쿠키가 앱에 남도록).
    allowNavigation: ["meongbackhome.com", "*.kakao.com"],
  },
  android: {
    // 운영 사이트가 https라 섞인 콘텐츠는 막아 둔다.
    allowMixedContent: false,
  },
};

export default config;
