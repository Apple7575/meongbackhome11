# 마스코트 이미지 생성·투명도 검증

사용자가 제공한 흰 장모 치와와를 기준으로 홈, 탐색, 알림, 재회 4종을 제작했다. 큰 귀와 흰 털, 얼굴, 코랄색 발바닥 펜던트를 유지했다.

초기 생성본은 체크무늬가 RGB 픽셀로 그려져 있어 투명 이미지가 아니었다. 내장 imagegen 도구로 배경 제거를 다시 요청하고 실제 알파 채널을 가진 결과만 채택했다.

최종 배경 제거 프롬프트:

> Remove the background. Make a transparent background PNG cutout of only this puppy. Preserve the puppy exactly. Output must have actual transparency, like a sticker.

알림 포즈 프롬프트:

> Edit this transparent puppy sticker: raise its right front paw in a friendly little wave and perk up its ears. Keep its face, fluffy white fur and coral paw pendant unchanged. Keep the background transparent. Return a transparent PNG sticker.

알림 포즈 생성 후에도 위의 배경 제거 프롬프트를 추가 적용했다.

최종 파일: `public/assets/mascot-{home,search,alert,reunion}.png`. 웹용 파일은 같은 이름의 `.webp`이며 Sharp로 크기·용량만 최적화하고 알파를 보존한다. 실패본과 중간본은 `artifacts/image-drafts/`에 분리했다.

`tests/assets.test.js`에서 PNG·WebP 각각의 알파 채널, 투명한 네 모서리, 중앙 피사체, 투명 픽셀 비율을 검사한다. `node scripts/check-mascots.mjs`는 흰색·크림색·짙은 녹색 배경의 비교 화면을 `artifacts/mascot-alpha-check.png`에 저장한다.
