// 내가 올린 실종 신고·목격 제보를 지우기 전에 한 번 더 묻는다. 지우면 되돌릴 수 없다.
import { useState } from "react";
import BottomSheet from "../../ui/BottomSheet.tsx";
import { Button } from "../../ui/index.tsx";
import { perform } from "../../client-store.js";
import { toast } from "../../app/toast.ts";
import { errorText } from "../../errors.ts";
import s from "./sheets.module.css";
type Kind = "dogs" | "reports";
const TEXT: Record<Kind, { title: string; intro: string; done: string }> = {
  dogs: { title: "실종 신고를 삭제할까요?", intro: "신고와 수색 상황이 지워지고 되돌릴 수 없어요. 이웃이 남긴 목격 제보는 남아 있어요.", done: "실종 신고를 삭제했어요." },
  reports: { title: "목격 제보를 삭제할까요?", intro: "제보와 그 안의 대화가 지워지고 되돌릴 수 없어요.", done: "목격 제보를 삭제했어요." },
};
export default function DeleteDocSheet({ collection, id, onClose }: { collection: Kind; id: string; onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const t = TEXT[collection];
  const remove = async () => {
    setBusy(true);
    try {
      await perform("/api/docs/delete", { collection, id });
      onClose();
      // 지운 신고의 상세 화면에 남지 않게 마이홈으로 옮긴다.
      if (collection === "dogs") location.replace("#/my");
      toast(t.done);
    } catch (e) {
      toast(errorText(e));
      setBusy(false);
    }
  };
  return (
    <BottomSheet open title={t.title} onClose={onClose}>
      <div className={s.body}>
        <p className={s.intro}>{t.intro}</p>
        <Button size="lg" full disabled={busy} onClick={remove}>삭제하기</Button>
        <Button variant="weak" size="lg" full onClick={onClose}>취소</Button>
      </div>
    </BottomSheet>
  );
}
