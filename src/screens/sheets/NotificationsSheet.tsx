import { useEffect } from "react";
import BottomSheet from "../../ui/BottomSheet.tsx";
import { ListRow, IconCircle, EmptyState, Button } from "../../ui/index.tsx";
import { useStore } from "../../app/useStore.ts";
import { commit } from "../../app/actions.ts";
import { openSheet } from "../../app/sheets.ts";
import { read } from "../../client-store.js";
import { relativeTime } from "../../format.ts";
import s from "./sheets.module.css";
import type { Notice } from "../../types.ts";
export default function NotificationsSheet({ onClose }: { onClose: () => void }) {
  const db = useStore();
  const list = db.notifications;
  // 여는 순간 모두 읽음으로 저장한다(옛 알림함과 같음).
  useEffect(() => {
    const unread = read().notifications.filter((n) => !n.read);
    if (!unread.length) return;
    unread.forEach((n) => (n.read = true));
    commit().catch(() => {});
  }, []);
  const open = (n: Notice) => {
    onClose();
    location.hash = n.dogId ? `/dog/${n.dogId}` : "/sightings";
  };
  return (
    <BottomSheet open title="알림" onClose={onClose}>
      {list.length ? (
        list.map((n) => (
          <ListRow key={n.id} as="button" onClick={() => open(n)} left={<IconCircle name="Bell" tone={n.read ? "grey" : "coral"} />}
            title={n.title} description={`${n.body} · ${relativeTime(n.time)}`} />
        ))
      ) : (
        <EmptyState title="아직 도착한 알림이 없어요" description="관심 지역을 고르면 새 실종 소식을 알려드려요." />
      )}
      <div className={s.body}>
        <Button variant="weak" full onClick={() => { onClose(); openSheet("areas"); }}>관심 지역 고르기</Button>
      </div>
    </BottomSheet>
  );
}
