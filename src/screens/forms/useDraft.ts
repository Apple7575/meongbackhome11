import { useEffect, useRef, useState } from "react";
import { loadDraft, saveDraft, clearDraft } from "../../drafts.ts";
export interface DraftState<V, E> {
  values: V;
  image: string;
  extra: E;
}
export interface DraftPatch<V, E> {
  values?: Partial<V>;
  extra?: Partial<E>;
  image?: string;
}
// 사용자가 무언가 바꾼 뒤부터 이 기기에 7일 동안 보관한다(옛 폼과 같은 키·형식).
export function useDraft<V extends object, E extends object>(key: string, initial: DraftState<V, E>) {
  const [state, setState] = useState<DraftState<V, E> & { restored: boolean }>(() => {
    const d = loadDraft<Partial<V>, Partial<E>>(key);
    if (!d) return { ...initial, restored: false };
    return {
      values: { ...initial.values, ...d.values },
      image: d.image || initial.image,
      extra: { ...initial.extra, ...d.extra },
      restored: true,
    };
  });
  const dirty = useRef(false);
  const done = useRef(false);
  useEffect(() => {
    if (dirty.current && !done.current) saveDraft(key, state);
  }, [state]);
  const update = (patch: DraftPatch<V, E>) => {
    dirty.current = true;
    setState((s) => ({
      ...s,
      values: { ...s.values, ...(patch.values || {}) },
      extra: { ...s.extra, ...(patch.extra || {}) },
      image: patch.image !== undefined ? patch.image : s.image,
    }));
  };
  const finish = () => {
    done.current = true;
    clearDraft(key);
  };
  return { ...state, update, finish };
}
