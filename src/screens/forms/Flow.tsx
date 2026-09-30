import { useEffect, useState } from "react";
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
  // 키보드가 올라오면 하단 버튼을 키보드 바로 위로 올린다.
  // 안드로이드는 viewport의 interactive-widget으로 화면이 줄어 0이 되고, iOS는 가려진 높이만큼 올린다.
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const vv = window.visualViewport;
    const root = document.documentElement;
    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const covered = vv ? Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop)) : 0;
        root.style.setProperty("--keyboard", `${covered}px`);
        // 안드로이드는 화면 자체가 줄어 가려진 높이가 0이므로 입력칸에 초점이 있는지도 함께 본다.
        const typing = document.activeElement?.matches("input:not([type=file]):not([type=range]), textarea") ?? false;
        setKeyboard(covered > 80 || (typing && !!vv && vv.height < screen.height * 0.6));
      });
    };
    // iOS는 키보드가 뜬 뒤 화면을 한 번 더 움직이므로 잠깐 동안 여러 번 다시 잰다.
    const settle = () => { fit(); setTimeout(fit, 150); setTimeout(fit, 400); };
    vv?.addEventListener("resize", fit);
    vv?.addEventListener("scroll", fit);
    addEventListener("scroll", fit, { passive: true });
    addEventListener("focusin", settle);
    addEventListener("focusout", settle);
    fit();
    return () => {
      cancelAnimationFrame(frame);
      vv?.removeEventListener("resize", fit);
      vv?.removeEventListener("scroll", fit);
      removeEventListener("scroll", fit);
      removeEventListener("focusin", settle);
      removeEventListener("focusout", settle);
      root.style.removeProperty("--keyboard");
    };
  }, []);
  // 키보드의 '다음'이나 하단 버튼을 누르면, 아래에 아직 비어 있는 입력칸이 있을 때 그 칸으로 먼저 옮긴다.
  const submit = (form: HTMLFormElement) => {
    const active = document.activeElement;
    if (active instanceof HTMLInputElement && form.contains(active)) {
      const fields = [...form.querySelectorAll<HTMLInputElement>("input[type=text], input:not([type])")];
      const at = fields.indexOf(active);
      const next = at < 0 ? undefined : fields.slice(at + 1).find((el) => !el.value.trim());
      if (next) {
        next.focus();
        return;
      }
    }
    onNext();
  };
  return (
    <form className={s.flow} noValidate onSubmit={(e) => { e.preventDefault(); submit(e.currentTarget); }}>
      <div className={s.progress} role="progressbar" aria-label="진행" aria-valuemin={1} aria-valuemax={total} aria-valuenow={step + 1}>
        <span style={{ width: `${((step + 1) / total) * 100}%` }} />
      </div>
      <p className={s.count}>{step + 1} / {total}</p>
      <h1 className={s.title}>{title}</h1>
      {description && <p className={s.desc}>{description}</p>}
      <div className={s.body}>{children}</div>
      {error && <p className={s.error} role="alert">{error}</p>}
      <div className={keyboard ? `${s.cta} ${s.ctaKeyboard}` : s.cta}>
        {step > 0 && !keyboard && <Button variant="weak" size="lg" onClick={onBack}>이전</Button>}
        {/* 누를 때 입력칸의 초점을 빼앗지 않아 키보드가 내려갔다 올라오지 않는다. */}
        <Button type="submit" size="lg" disabled={busy} onMouseDown={(e) => e.preventDefault()}>{busy ? "잠시만요…" : nextLabel}</Button>
      </div>
    </form>
  );
}
