import { useState } from "react";
import BottomSheet from "../../ui/BottomSheet.tsx";
import { Button } from "../../ui/index.tsx";
import { commit } from "../../app/actions.ts";
import { read } from "../../client-store.js";
import { toast } from "../../app/toast.ts";
import { subjectParticle } from "../../format.ts";
import s from "./sheets.module.css";
import { errorText } from "../../errors.ts";
export default function ReuniteSheet({ dogId, onClose }: { dogId: string; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const dog = read().dogs.find((d) => d.id === dogId);
  if (!dog) return null;
  const confirm = async () => {
    setBusy(true);
    const target = read().dogs.find((d) => d.id === dogId);
    if (!target) return setBusy(false);
    target.status = "reunited";
    target.reunitedAt = new Date().toISOString();
    try {
      await commit();
      onClose();
      toast("다시 만나서 정말 다행이에요. 제보한 이웃에게도 알렸어요.");
    } catch (e) {
      toast(errorText(e));
      setBusy(false);
    }
  };
  return (
    <BottomSheet open title="찾았어요" onClose={onClose}>
      <div className={s.body}>
        <div className={s.center}>
          <img src="/assets/mascot-reunion.webp" alt="" />
          <h3>{dog.name}{subjectParticle(dog.name)} 집으로 돌아왔나요?</h3>
          <p className={s.intro}>신고가 '집에 돌아왔어요'로 바뀌고, 제보한 이웃과 소식을 저장한 분들에게 알림이 가요.</p>
        </div>
        <Button size="lg" full onClick={confirm} disabled={busy}>네, 무사히 만났어요</Button>
      </div>
    </BottomSheet>
  );
}
