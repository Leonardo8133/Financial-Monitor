import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/** Tiny toast helper: const { toast, showToast } = useToast(); render {toast}. */
export function useToast() {
  const [message, setMessage] = useState(null);
  const timer = useRef(null);

  const showToast = useCallback((text, { tone = "info", duration = 3500, action } = {}) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage({ text, tone, action });
    timer.current = setTimeout(() => setMessage(null), duration);
  }, []);

  useEffect(() => () => timer.current && clearTimeout(timer.current), []);

  const toast = message
    ? createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex justify-center px-4">
          <div
            role="status"
            className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-2.5 text-sm shadow-pop fade-in ${
              message.tone === "error"
                ? "border-neg/40 bg-surface text-neg"
                : message.tone === "success"
                ? "border-pos/40 bg-surface text-ink"
                : "border-line bg-surface text-ink"
            }`}
          >
            <span>{message.text}</span>
            {message.action && (
              <button
                type="button"
                className="font-semibold text-accent hover:underline"
                onClick={() => {
                  message.action.onClick?.();
                  setMessage(null);
                }}
              >
                {message.action.label}
              </button>
            )}
          </div>
        </div>,
        document.body
      )
    : null;

  return { toast, showToast };
}
