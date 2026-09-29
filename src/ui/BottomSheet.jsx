import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import s from "./ui.module.css";
const FOCUSABLE = 'button,a[href],input,select,textarea,[tabindex="0"]';
export default function BottomSheet({ open, title, onClose, children }) {
  const ref = useRef(null);
  const dragFrom = useRef(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    ref.current?.querySelector("h2")?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab") return;
      const items = [...ref.current.querySelectorAll(FOCUSABLE)].filter((el) => !el.disabled);
      if (!items.length) return;
      const first = items[0], last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);
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
