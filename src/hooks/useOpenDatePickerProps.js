import { useCallback } from "react";

export function useOpenDatePickerProps() {
  const openPicker = useCallback((input) => {
    if (!input || input.type !== "date" || input.disabled) return;
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
      } catch (_) {
        // ignore
      }
    } else {
      input.focus();
    }
  }, []);

  const onMouseDown = useCallback((event) => {
    if (event.button !== 0) return; // only left click
    openPicker(event.currentTarget);
  }, [openPicker]);

  const onFocus = useCallback((event) => {
    openPicker(event.currentTarget);
  }, [openPicker]);

  return { onMouseDown, onFocus };
}


