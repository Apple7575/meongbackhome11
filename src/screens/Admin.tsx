import { useStore } from "../app/useStore.ts";
import { commit } from "../app/actions.ts";
import { read, perform } from "../client-store.js";
import { toast } from "../app/toast.ts";
import { Top, ListHeader, ListRow, Badge, Button, ButtonLink, EmptyState, Thumb } from "../ui/index.tsx";
import { formatTime } from "../format.ts";
import s from "./stories.module.css";
import { errorText } from "../errors.ts";
import type { Store } from "../types.ts";
type Item = Store["moderation"][number];
// 신고 이유는 '이유 · 자세한 내용'으로 저장돼 있다.
const split = (reason: string) => {
  const at = reason.indexOf(" · ");
  return at < 0 ? { reason, detail: "" } : { reason: reason.slice(0, at), detail: reason.slice(at + 3) };
};
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
  // 문제 있는 신고를 지우지 않고 숨긴다. 숨긴 신고는 운영자에게만 보이고, 다시 보이게 할 수 있다.
  const hide = async (dogId: string, hidden: boolean) => {
    try {
      await perform("/api/admin/hide", { collection: "dogs", id: dogId, hidden });
      toast(hidden ? "신고를 숨겼어요. 운영자에게만 보여요." : "신고를 다시 보이게 했어요.");
    } catch (e) {
      toast(errorText(e));
    }
  };
  const newest = (a: Item, b: Item) => new Date(b.time).getTime() - new Date(a.time).getTime();
  const open = db.moderation.filter((m) => !m.resolved).sort(newest);
  const done = db.moderation.filter((m) => m.resolved).sort(newest);
  // 어떤 신고에 대한 것인지 강아지 이름·사진으로 보여주고, 누르면 그 신고로 간다.
  const row = (m: Item) => {
    const dog = db.dogs.find((d) => d.id === m.target);
    const { reason, detail } = split(m.reason);
    return (
      <ListRow key={m.id}
        left={<Thumb src={dog?.image} />}
        title={reason}
        description={[dog ? `${dog.name} · ${dog.breed}` : "삭제된 신고", formatTime(m.time), detail].filter(Boolean).join(" · ")}
        right={<>
          {dog && <ButtonLink href={`#/dog/${dog.id}`} variant="weak" size="sm" aria-label={`${dog.name} 신고 보기`}>보기</ButtonLink>}
          {dog && !dog.demo && <Button variant="weak" size="sm" aria-pressed={!!dog.hidden} onClick={() => hide(dog.id, !dog.hidden)}>{dog.hidden ? "숨김 해제" : "숨기기"}</Button>}
          {m.resolved ? <Badge tone="green">처리 완료</Badge> : <Button variant="weak" size="sm" onClick={() => resolve(m.id)}>처리 완료</Button>}
        </>} />
    );
  };
  return (
    <div className={s.admin}>
      <Top title="신고 접수 관리" subtitle="내용을 확인하고 처리 상태를 남겨주세요." />
      <ListHeader title={open.length ? `처리할 신고 ${open.length}` : "처리할 신고"} />
      {open.length ? open.map(row) : <EmptyState title="모두 처리했어요" description="새로 접수되면 여기에 보여요." />}
      {done.length > 0 && (
        <>
          <ListHeader title={`처리한 신고 ${done.length}`} />
          {done.map(row)}
        </>
      )}
    </div>
  );
}
