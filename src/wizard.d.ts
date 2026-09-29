// wizard.js(JavaScript)의 임시 저장 함수 모양.
export interface Draft<V = Record<string, string>, E = Record<string, unknown>> {
  values: V;
  image: string;
  extra: E;
  savedAt?: number;
}
export function loadDraft<V = Record<string, string>, E = Record<string, unknown>>(key: string): Draft<V, E> | null;
export function saveDraft(key: string, draft: { values: unknown; image?: string; extra?: unknown }): boolean;
export function clearDraft(key: string): void;
