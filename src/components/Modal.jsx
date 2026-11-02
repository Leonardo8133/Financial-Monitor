import { useEffect } from "react";
import { createPortal } from "react-dom";
import { XIcon } from "./icons.jsx";

export function Modal({ open, onClose, title, description, children, footer, size = "md", closeOnBackdrop = true }) {
  useEffect(() => {
    if (!open) return undefined;
    function handleKey(event) {
      if (event.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", handleKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  const width = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-3xl", xl: "max-w-5xl" }[size] || "max-w-lg";

  const node = (
    <div className="modal-backdrop fade-in" onMouseDown={closeOnBackdrop ? onClose : undefined}>
      <div
        className={`modal-box ${width}`}
        onMouseDown={(event) => event.stopPropagation()}
        // Portals bubble React events to the parent tree; keep keys (except Escape) inside the dialog.
        onKeyDown={(event) => {
          if (event.key !== "Escape") event.stopPropagation();
        }}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
      >
        {(title || onClose) && (
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              {title && <h3 className="text-base font-semibold text-ink">{title}</h3>}
              {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
            </div>
            {onClose && (
              <button type="button" onClick={onClose} className="btn-ghost btn-xs -mr-1 -mt-1" aria-label="Fechar">
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
        <div>{children}</div>
        {footer && <div className="mt-4 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );

  return createPortal(node, document.body);
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = "Confirmar", danger = false }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className={danger ? "btn-danger" : "btn-primary"}
            onClick={() => {
              onConfirm?.();
              onClose?.();
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm text-muted">{message}</p>
    </Modal>
  );
}
