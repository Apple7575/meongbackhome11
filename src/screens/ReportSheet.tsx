import { useState } from "react";
import { useStore } from "../app/useStore.ts";
import { commit } from "../app/actions.ts";
import { read as readStore } from "../client-store.js";
import { toast } from "../main.js";
import BottomSheet from "../ui/BottomSheet.tsx";
import { ListHeader, ListRow, Badge, Button } from "../ui/index.tsx";
import Icon from "../ui/Icon.tsx";
import { REPORT_STATUSES, headingLabel } from "../domain.js";
import { formatTime } from "../format.ts";
import s from "./report.module.css";
import type { FormEvent } from "react";
import type { Report } from "../types.ts";
import { errorText } from "../errors.ts";
export const movement = (r: Report) =>
  r.stationary ? "머물러 있었어요" : r.heading == null ? "방향 정보 없음" : `${headingLabel(r.heading)}으로 이동`;
async function change(apply: () => void, done?: string) {
  try {
    apply();
    await commit();
    if (done) toast(done);
  } catch (e) {
    toast(errorText(e));
  }
}
export default function ReportSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const db = useStore();
  const [text, setText] = useState("");
  const r = db.reports.find((x) => x.id === id);
  if (!r) return null;
  const dog = db.dogs.find((d) => d.id === r.dogId);
  const mine = db.dogs.filter((d) => d.canManage && d.status === "missing");
  // 저장·실시간 갱신이 저장소 객체를 바꾸므로, 고치는 순간의 최신 객체를 찾는다.
  const find = () => readStore().reports.find((x) => x.id === id);
  const send = (e: FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    change(() => {
      const target = find();
      if (target) (target.messages ||= []).push({ text: value, time: new Date().toISOString() });
    });
    setText("");
  };
  return (
    <BottomSheet open title="목격 제보" onClose={onClose}>
      <div className={s.body}>
        {r.demo && <p className={s.notice}>예시 제보예요. 상태 변경은 해당 보호자만 할 수 있어요.</p>}
        {r.image && <img className={s.photo} src={r.image} alt="제보 사진" />}
        <div className={s.head}>
          <Badge>{r.kind}</Badge>
          {!r.canManage && <Badge tone={r.status === "관련 목격" ? "green" : "grey"}>{r.status}</Badge>}
        </div>
        <h3 className={s.title}>{r.location}</h3>
        <p className={s.meta}>{formatTime(r.time)} · {movement(r)}</p>
        <p className={s.desc}>{r.description || "추가 설명이 없어요."}</p>
      </div>
      {r.canManage && (
        <>
          <ListHeader title="보호자 확인" />
          <div className={s.options} role="group" aria-label="보호자 확인">
            {REPORT_STATUSES.map((v) => (
              <button key={v} type="button" className={s.option} aria-pressed={r.status === v}
                onClick={() => change(() => { const t = find(); if (t) t.status = v; }, "제보 상태를 바꿨어요.")}>{v}</button>
            ))}
          </div>
        </>
      )}
      {dog ? (
        <ListRow href={`#/dog/${dog.id}`} title={`${dog.name}의 신고 보기`} />
      ) : (
        mine.length > 0 && !r.previewOnly && (
          <>
            <ListHeader title="내 신고에 연결" />
            <div className={s.links}>
              {mine.map((d) => (
                <Button key={d.id} variant="weak" size="sm" onClick={() => change(() => { const t = find(); if (t) t.dogId = d.id; }, "내 신고에 제보를 연결했어요.")}>{d.name}</Button>
              ))}
            </div>
          </>
        )
      )}
      <ListHeader title="대화" />
      {r.canChat ? (
        <div className={s.chat}>
          <p className={s.hint}>보호자와 제보한 이웃만 볼 수 있어요.</p>
          {(r.messages || []).map((m, i) => (
            <p key={i} className={s.bubble} data-chat-bubble="">{m.text}<small>{formatTime(m.time)}</small></p>
          ))}
          <form id="message-form" className={s.input} onSubmit={send}>
            <input name="message" value={text} onChange={(e) => setText(e.target.value)} aria-label="메시지" placeholder="궁금한 점을 남겨보세요" maxLength={1000} required />
            <button type="submit" className={s.send} aria-label="메시지 보내기"><Icon name="Send" size={20} /></button>
          </form>
        </div>
      ) : r.previewOnly && r.exampleConversation?.length ? (
        <div className={s.chat}>
          <p className={s.hint}>기능 설명용 예시 대화예요. 실제 대화가 아니에요.</p>
          {r.exampleConversation.map((m, i) => (
            <p key={i} className={s.bubble} data-chat-bubble=""><small>{m.who}</small>{m.text}</p>
          ))}
        </div>
      ) : (
        <p className={s.hint}>보호자와 이 제보를 작성한 이웃만 대화할 수 있어요.</p>
      )}
    </BottomSheet>
  );
}
