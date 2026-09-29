import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import s from "./ui.module.css";
const FOCUSABLE = 'button,a[href],input,select,textarea,[tabindex="0"]';
export interface BottomSheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}
export default function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  const ref = useRef<HTMLElement>(null);
  const dragFrom = useRef<number | null>(null);
  const titleId = useId();
  // 닫기 함수가 렌더마다 바뀌어도 포커스를 다시 옮기지 않도록 참조로 보관한다.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector("h2")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key !== "Tab") return;
      const items = [...(ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter((el) => !(el as HTMLButtonElement).disabled);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open]);
  if (!open) return null;
  return createPortal(
    <div className={s.sheetBackdrop} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <section ref={ref} className={s.sheet} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div
          className={s.handle}
          aria-hidden="true"
          onPointerDown={(e) => (dragFrom.current = e.clientY)}
          onPointerUp={(e) => {
            if (dragFrom.current != null && e.clientY - dragFrom.current > 60) onClose();
            dragFrom.current = null;
          }}
        />
        <h2 id={titleId} tabIndex={-1} className={s.sheetTitle}>{title}</h2>
        {children}
      </section>
    </div>,
    document.body,
  );
}
