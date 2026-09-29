import { useState } from "react";
import BottomSheet from "../../ui/BottomSheet.tsx";
import { Button } from "../../ui/index.tsx";
import { commit } from "../../app/actions.ts";
import { read } from "../../client-store.js";
import { toast } from "../../app/toast.ts";
import { REGIONS } from "../../domain.js";
import s from "./sheets.module.css";
import { errorText } from "../../errors.ts";
export default function AreasSheet({ onClose }: { onClose: () => void }) {
  const [picked, setPicked] = useState(() => [...read().areas]);
  const toggle = (r: string) => setPicked((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]));
  const save = async () => {
    read().areas = picked;
    try {
      await commit();
      onClose();
      toast(picked.length ? "관심 지역을 저장했어요." : "관심 지역을 모두 뺐어요.");
    } catch (e) {
      toast(errorText(e));
    }
  };
  return (
    <BottomSheet open title="관심 지역" onClose={onClose}>
      <div className={s.body}>
        <p className={s.intro}>고른 지역에 새 실종 신고가 올라오면 알려드려요. 여러 곳을 골라도 돼요.</p>
        <div className={s.grid} role="group" aria-label="관심 지역">
          {REGIONS.slice(1).map((r) => (
            <button key={r} type="button" className={s.option} aria-pressed={picked.includes(r)} onClick={() => toggle(r)}>{r}</button>
          ))}
        </div>
        <Button size="lg" full onClick={save}>{picked.length ? `${picked.length}곳 저장하기` : "저장하기"}</Button>
      </div>
    </BottomSheet>
  );
}
