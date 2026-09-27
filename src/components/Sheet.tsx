import { useEffect, useId, useRef, type ReactNode } from 'react';

/**
 * Bottom sheet built on the native <dialog> element: focus handling, Escape-to-close and the
 * backdrop come from the browser. Tapping the backdrop closes it too.
 */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet-body">
        <div className="sheet-handle" aria-hidden />
        <header className="sheet-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="btn primary small" onClick={onClose}>
            Done
          </button>
        </header>
        {open && children}
      </div>
    </dialog>
  );
}
