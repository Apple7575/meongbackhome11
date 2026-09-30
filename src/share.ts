import type { Dog } from "./types.ts";
import { objectParticle } from "./format.ts";
// 공유용 주소. /d/:id 는 서버가 사진·이름이 담긴 미리보기 카드를 보여주고 상세 화면으로 옮겨 준다.
export const shareUrl = (dogId: string) => `${location.origin}/d/${encodeURIComponent(dogId)}`;
export const shareTitle = (dog: Pick<Dog, "name" | "status">) =>
  dog.status === "reunited" ? `${dog.name}, 집에 돌아왔어요` : `${dog.name}${objectParticle(dog.name)} 찾고 있어요`;
// 휴대폰에서는 카카오톡·문자가 바로 보이는 기본 공유창을 먼저 연다.
// 공유창을 열었으면(보냈거나 닫았으면) true, 쓸 수 없거나 실패하면 false를 돌려 앱의 공유 시트로 넘긴다.
export async function nativeShare(dog: Dog): Promise<boolean> {
  if (typeof navigator.share !== "function" || !matchMedia("(pointer: coarse)").matches) return false;
  try {
    await navigator.share({ title: `${shareTitle(dog)} · 멍백홈`, text: dog.location, url: shareUrl(dog.id) });
    return true;
  } catch (e) {
    return e instanceof DOMException && e.name === "AbortError";
  }
}
