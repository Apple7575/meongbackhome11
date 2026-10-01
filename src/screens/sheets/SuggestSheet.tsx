import { useState } from "react";
import BottomSheet from "../../ui/BottomSheet.tsx";
import { Button, ListRow, Thumb, EmptyState } from "../../ui/index.tsx";
import Icon from "../../ui/Icon.tsx";
import { useStore } from "../../app/useStore.ts";
import { toast } from "../../app/toast.ts";
import { api } from "../../client-store.js";
import { nearbyMissing } from "../../domain.js";
import { distanceText, relativeTime } from "../../format.ts";
import { errorText } from "../../errors.ts";
import s from "./sheets.module.css";
const MAX = 3;
// 목격자가 사진을 보고 "이 아이 같아요"를 고르면 그 보호자에게만 알린다(최대 3곳).
export default function SuggestSheet({ reportId, onClose }: { reportId: string; onClose: () => void }) {
  const db = useStore();
  const report = db.reports.find((r) => r.id === reportId);
  const list = report ? nearbyMissing(report, db.dogs, { isOwn: (d) => !!d.canManage }) : [];
  const [picked, setPicked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX ? (toast(`최대 ${MAX}곳까지 고를 수 있어요.`), p) : [...p, id]));
  const send = async () => {
    setBusy(true);
    try {
      const { sent } = (await api(`/api/reports/${reportId}/suggest`, { dogIds: picked })) as { sent: number };
      toast(sent ? `보호자 ${sent}명에게 알렸어요. 고마워요.` : "이미 알린 보호자예요.");
      onClose();
    } catch (e) {
      toast(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <BottomSheet open title="혹시 이 아이인가요?" onClose={onClose}>
      <div className={s.body}>
        {list.length ? (
          <>
            <p className={s.intro}>근처에서 찾고 있는 아이들이에요. 사진을 보고 닮은 아이를 골라주세요. 고른 보호자에게만 알림이 가요.</p>
            <div role="group" aria-label="닮은 실종 신고 고르기">
              {list.map(({ dog, km }) => (
                <ListRow key={dog.id} as="button" aria-pressed={picked.includes(dog.id)} onClick={() => toggle(dog.id)}
                  left={<Thumb src={dog.image} size={72} />}
                  title={`${dog.name} · ${dog.breed}`}
                  description={`${distanceText(km)} · ${relativeTime(dog.time)} 실종 · ${dog.color}`}
                  right={<span className={picked.includes(dog.id) ? s.checkOn : s.check} aria-hidden="true"><Icon name="Check" size={18} /></span>} />
              ))}
            </div>
            <Button size="lg" full disabled={!picked.length || busy} onClick={send}>
              {picked.length ? `고른 ${picked.length}곳에 알리기` : "닮은 아이를 골라주세요"}
            </Button>
            <Button variant="weak" size="lg" full onClick={onClose}>닮은 아이가 없어요</Button>
          </>
        ) : (
          <EmptyState title="근처에 찾고 있는 아이가 없어요" description="새 실종 신고가 올라오면 비슷한 제보를 자동으로 알려드려요."
            action={<Button variant="weak" onClick={onClose}>닫기</Button>} />
        )}
      </div>
    </BottomSheet>
  );
}
