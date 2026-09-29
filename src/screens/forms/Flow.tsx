import { useEffect } from "react";
import type { ReactNode } from "react";
import { Button } from "../../ui/index.tsx";
import s from "./forms.module.css";
export interface FlowProps {
  step: number;
  total: number;
  title: string;
  description?: string;
  error?: string;
  busy?: boolean;
  nextLabel: string;
  onBack: () => void;
  onNext: () => void;
  children: ReactNode;
}
// 한 화면에 질문 하나: 진행 막대 · 질문 · 이유 한 줄 · 입력 · 하단 고정 이전/다음.
export default function Flow({ step, total, title, description, error, busy, nextLabel, onBack, onNext, children }: FlowProps) {
  // scrollTo()는 최신 브라우저에서 Promise를 돌려주므로 중괄호로 감싸 정리 함수로 쓰이지 않게 한다.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);
  return (
    <form className={s.flow} noValidate onSubmit={(e) => { e.preventDefault(); onNext(); }}>
      <div className={s.progress} role="progressbar" aria-label="진행" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step + 1}>
        <span style={{ width: `${((step + 1) / total) * 100}%` }} />
      </div>
      <p className={s.count}>{step + 1} / {total}</p>
      <h1 className={s.title}>{title}</h1>
      {description && <p className={s.desc}>{description}</p>}
      <div className={s.body}>{children}</div>
      {error && <p className={s.error} role="alert">{error}</p>}
      <div className={s.cta}>
        {step > 0 && <Button variant="weak" size="lg" onClick={onBack}>이전</Button>}
        <Button type="submit" size="lg" disabled={busy}>{busy ? "잠시만요…" : nextLabel}</Button>
      </div>
    </form>
  );
}
