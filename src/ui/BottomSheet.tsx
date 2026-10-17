import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import s from "./ui.module.css";
const FOCUSABLE = 'button,a[href],input,select,textarea,[tabindex="0"]';
// 시트 안의 '닫기' 버튼도 내려가는 모습을 보여주며 닫을 수 있게 한다.
const Dismiss = createContext<() => void>(() => {});
export const useSheetDismiss = () => useContext(Dismiss);
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
  // 사용자가 직접 닫을 때(바깥 누르기·Esc·끌어내리기)는 내려가는 모습을 보여준 뒤 닫는다.
  const [closing, setClosing] = useState(false);
  const dismiss = () => {
    if (closing) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return closeRef.current();
    setClosing(true);
    setTimeout(() => closeRef.current(), 200);
  };
  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector("h2")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismissRef.current();
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
    <div className={closing ? `${s.sheetBackdrop} ${s.closing}` : s.sheetBackdrop} onClick={(e) => e.target === e.currentTarget && dismiss()}>
      <section ref={ref} className={s.sheet} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div
          className={s.handle}
          aria-hidden="true"
          onPointerDown={(e) => (dragFrom.current = e.clientY)}
          onPointerUp={(e) => {
            if (dragFrom.current != null && e.clientY - dragFrom.current > 60) dismiss();
            dragFrom.current = null;
          }}
        />
        <h2 id={titleId} tabIndex={-1} className={s.sheetTitle}>{title}</h2>
        <Dismiss.Provider value={dismiss}>{children}</Dismiss.Provider>
      </section>
    </div>,
    document.body,
  );
}
