import { useState } from "react";
import BottomSheet from "../../ui/BottomSheet.tsx";
import { Button } from "../../ui/index.tsx";
import { commit } from "../../app/actions.ts";
import { read, id as newId } from "../../client-store.js";
import { toast } from "../../app/toast.ts";
import { PhotoPicker } from "../forms/fields.tsx";
import s from "./sheets.module.css";
import type { FormEvent } from "react";
import { errorText } from "../../errors.ts";
export default function StorySheet({ onClose }: { onClose: () => void }) {
  const [image, setImage] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !text.trim()) return setError("제목과 이야기를 적어주세요.");
    setBusy(true);
    read().stories.unshift({ id: newId("story"), title: title.trim(), text: text.trim(), image, time: new Date().toISOString() });
    try {
      await commit();
      onClose();
      toast("따뜻한 이야기를 저장했어요.");
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };
  return (
    <BottomSheet open title="다시 만난 이야기" onClose={onClose}>
      <form className={`${s.body} ${s.form}`} onSubmit={save} noValidate>
        <PhotoPicker value={image} onChange={setImage} onError={setError} label="사진 올리기 (선택)" />
        <label className={s.field}>
          <span className={s.label}>제목</span>
          <input className={s.input} name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="예: 이웃의 제보로 보리를 찾았어요" />
        </label>
        <label className={s.field}>
          <span className={s.label}>이야기</span>
          <textarea className={s.input} name="text" rows={6} value={text} onChange={(e) => setText(e.target.value)} maxLength={3000}
            placeholder="어떻게 다시 만났나요? 도움이 된 일과 고마운 마음을 나눠주세요." style={{ padding: "14px 16px" }} />
        </label>
        {error && <p className={s.error} role="alert">{error}</p>}
        <Button type="submit" size="lg" full disabled={busy}>이야기 남기기</Button>
      </form>
    </BottomSheet>
  );
}
