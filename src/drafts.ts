// 작성 중인 신고·제보를 이 기기에 7일 동안 보관한다. 키 형식은 옛 폼과 같다(계정 삭제 시 prefix로 지운다).
export const DRAFT_PREFIX = "meongback-draft-v2:";
const WEEK = 7 * 86400000;
export interface Draft<V, E> {
  values: V;
  image: string;
  extra: E;
  savedAt: number;
}
export function loadDraft<V, E>(key: string): Draft<V, E> | null {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_PREFIX + key) || "null") as Draft<V, E> | null;
    return d && Date.now() - d.savedAt < WEEK ? d : null;
  } catch {
    return null;
  }
}
export function saveDraft(key: string, { values, image = "", extra = {} }: { values: unknown; image?: string; extra?: unknown }) {
  try {
    localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify({ values, image, extra, savedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}
export function clearDraft(key: string) {
  localStorage.removeItem(DRAFT_PREFIX + key);
}
export function clearAllDrafts() {
  for (const key of Object.keys(localStorage)) if (key.startsWith(DRAFT_PREFIX)) localStorage.removeItem(key);
}
