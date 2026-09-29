// 글 하나를 받아 저장하는 작은 시트들: 수색 상황 남기기 · 문제 신고.
import { useState } from "react";
import type { FormEvent } from "react";
import BottomSheet from "../../ui/BottomSheet.tsx";
import { Button } from "../../ui/index.tsx";
import { commit } from "../../app/actions.ts";
import { toast } from "../../app/toast.ts";
import { read, id as newId } from "../../client-store.js";
import { errorText } from "../../errors.ts";
import s from "./sheets.module.css";
const REASONS = ["허위·잘못된 정보", "중복 신고", "부적절한 사진·내용", "금전 요구·사기 의심", "기타"];
function useSave(onClose: () => void, done: string) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (apply: () => void) => {
    setBusy(true);
    apply();
    try {
      await commit();
      onClose();
      toast(done);
    } catch (e) {
      setError(errorText(e));
      setBusy(false);
    }
  };
  return { error, setError, busy, save };
}
export function UpdateSheet({ dogId, onClose }: { dogId: string; onClose: () => void }) {
  const [text, setText] = useState("");
  const { error, setError, busy, save } = useSave(onClose, "수색 상황을 남겼어요.");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return setError("확인한 내용을 적어주세요.");
    save(() => read().updates.unshift({ id: newId("update"), dogId, text: text.trim(), time: new Date().toISOString() }));
  };
  return (
    <BottomSheet open title="수색 상황 남기기" onClose={onClose}>
      <form className={`${s.body} ${s.form}`} onSubmit={submit} noValidate>
        <label className={s.field}>
          <span className={s.label}>지금까지 확인한 내용</span>
          <textarea className={s.input} name="text" rows={4} maxLength={1000} value={text} onChange={(e) => setText(e.target.value)}
            placeholder="예: 오후 4시에 공원 동쪽 산책로를 확인했어요." style={{ padding: "14px 16px" }} />
        </label>
        {error && <p className={s.error} role="alert">{error}</p>}
        <Button type="submit" size="lg" full disabled={busy}>남기기</Button>
      </form>
    </BottomSheet>
  );
}
export function FlagSheet({ dogId, onClose }: { dogId: string; onClose: () => void }) {
  const [reason, setReason] = useState(REASONS[0]);
  const [detail, setDetail] = useState("");
  const { error, busy, save } = useSave(onClose, "신고를 접수했어요. 운영자가 확인할게요.");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    save(() => read().moderation.push({
      id: newId("flag"), target: dogId, reason: `${reason}${detail.trim() ? " · " + detail.trim() : ""}`,
      time: new Date().toISOString(), resolved: false,
    }));
  };
  return (
    <BottomSheet open title="문제 신고하기" onClose={onClose}>
      <form id="flag-form" className={`${s.body} ${s.form}`} onSubmit={submit} noValidate>
        <div className={s.grid} role="group" aria-label="신고 이유" style={{ gridTemplateColumns: "1fr" }}>
          {REASONS.map((r) => (
            <button key={r} type="button" className={s.option} aria-pressed={reason === r} onClick={() => setReason(r)}>{r}</button>
          ))}
        </div>
        <label className={s.field}>
          <span className={s.label}>더 알려줄 내용 (선택)</span>
          <textarea className={s.input} name="detail" rows={3} maxLength={1000} value={detail} onChange={(e) => setDetail(e.target.value)} style={{ padding: "14px 16px" }} />
        </label>
        <p className={s.intro}>접수한 내용은 운영자에게만 전달돼요.</p>
        {error && <p className={s.error} role="alert">{error}</p>}
        <Button type="submit" size="lg" full disabled={busy}>신고 접수</Button>
      </form>
    </BottomSheet>
  );
}
