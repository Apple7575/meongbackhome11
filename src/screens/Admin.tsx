import { useStore } from "../app/useStore.ts";
import { commit } from "../app/actions.ts";
import { read } from "../client-store.js";
import { toast } from "../app/toast.ts";
import { Top, ListHeader, ListRow, Badge, Button, EmptyState } from "../ui/index.tsx";
import { formatTime } from "../format.ts";
import s from "./stories.module.css";
import { errorText } from "../errors.ts";
// 권한은 서버가 다시 확인한다. 화면은 운영자에게만 목록을 보여준다.
export default function Admin() {
  const db = useStore();
  if (db.user?.role !== "admin")
    return (
      <EmptyState title="운영자 전용 화면이에요" description="운영 계정으로 로그인하면 접수된 신고를 관리할 수 있어요."
        action={<Button data-action="account">로그인</Button>} />
    );
  const resolve = async (id: string) => {
    const item = read().moderation.find((m) => m.id === id);
    if (!item) return;
    item.resolved = true;
    try {
      await commit();
      toast("처리 완료로 바꿨어요.");
    } catch (e) {
      toast(errorText(e));
    }
  };
  return (
    <div className={s.admin}>
      <Top title="신고 접수 관리" subtitle="내용을 확인하고 처리 상태를 남겨주세요." />
      <ListHeader title={`접수된 신고 ${db.moderation.length}`} />
      {db.moderation.length ? (
        db.moderation.map((m) => (
          <ListRow key={m.id} title={m.reason} description={`${formatTime(m.time)} · ${m.target}`}
            right={m.resolved ? <Badge tone="green">처리 완료</Badge> : <Button variant="weak" size="sm" onClick={() => resolve(m.id)}>처리 완료</Button>} />
        ))
      ) : (
        <EmptyState title="접수된 신고가 없어요" />
      )}
    </div>
  );
}
