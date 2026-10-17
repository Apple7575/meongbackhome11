# 멍백홈 앱 (Android · iOS)

## 구조 (1단계)

Capacitor 앱이 운영 사이트 `https://meongbackhome.com`을 그대로 띄운다 (`capacitor.config.ts`의 `server.url`).

- 로그인 쿠키, 카카오 로그인, 공유 링크(`/d/:id`)가 웹과 똑같이 동작한다.
- `main`에 푸시하면 앱 화면도 바로 바뀐다. 네이티브 설정(권한, 아이콘, 플러그인)을 바꿀 때만 스토어에 다시 올린다.
- 인터넷이 안 되면 앱에 넣어 둔 `dist/offline.html`을 보여준다.
- 웹은 user agent의 `MeongbackApp`으로 앱 안인지 안다 (`src/app/install.ts`의 `isApp`).
- `appId`는 `com.meongbackhome.app`이다. 스토어에 올리면 바꿀 수 없다.

## 빌드

Android는 Windows에서 빌드할 수 있다 (JDK 21, Android SDK가 `%LOCALAPPDATA%\Android\Sdk`에 있어야 함).

```sh
npm run app:android   # → android/app/build/outputs/apk/debug/app-debug.apk
```

iOS는 Mac(Xcode)이 필요하다. Mac이 없으면 GitHub Actions의 macOS 러너나 Codemagic 같은 클라우드 빌드를 쓴다.

```sh
npm run app:sync      # Mac에서: npx cap open ios
```

아이콘과 스플래시는 `assets/`의 원본에서 만든다: `npx @capacitor/assets generate` (만든 뒤 `public/manifest.webmanifest`가 바뀌면 되돌린다).

## 권한

- Android `AndroidManifest.xml`: 위치(지도 핀·가까운 순), 카메라(사진 촬영)
- iOS `Info.plist`: 위치, 카메라, 사진 보관함, 동작(나침반 방향)

## 다음 단계 (아직 안 함)

1. **네이티브 푸시**: 앱 웹뷰에서는 Web Push가 동작하지 않는다. FCM/APNs(`@capacitor/push-notifications`)로 바꾸고, 서버 발송 큐에 기기 토큰 종류를 더한다. Firebase 프로젝트와 APNs 키가 필요하다.
2. **딥링크**: `/d/:id`와 메일 인증 링크가 앱으로 열리게 `assetlinks.json`(Android), `apple-app-site-association`(iOS)을 올린다. 서명 키 지문과 Apple Team ID가 필요하다.
3. **카카오 로그인**: 앱 안 웹뷰에서 카카오 계정 로그인 화면이 열린다. 카카오톡 앱으로 바로 로그인(intent/scheme 처리)은 실제 기기에서 확인이 필요하다.
4. **스토어 심사**: 애플 4.2(웹사이트를 감싼 앱) 거절을 피하려면 네이티브 푸시·공유 같은 기능을 먼저 붙인다. 사용자 차단 기능, 개인정보 라벨, 데이터 보안 양식, 심사용 계정도 준비한다.
5. **계정·비용**: Apple Developer(연 $99), Google Play(1회 $25), 서명 키 보관.
