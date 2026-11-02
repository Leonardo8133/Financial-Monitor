import { useEffect, useRef, useState } from "react";
import { usePrefs } from "../theme/PrefsProvider.jsx";
import { currencySymbol, fmtNumber, parseMoney, roundMoney, toEditingString } from "../utils/money.js";

/**
 * Money input with two typing modes (user preference, Configurações → Aparência):
 *  - "free":  type naturally ("1.234,56", "1234.5", "-50"); formatted on blur.
 *  - "cents": ATM style; digits fill from the right (1 2 3 4 5 -> 123,45).
 * Extra keys: ArrowUp/Down ±1 (Shift ±10, Alt ±0,01); "-" toggles sign when allowNegative.
 */
export function CurrencyInput({
  value,
  onChange,
  placeholder = "0,00",
  allowNegative = false,
  disabled = false,
  className = "",
  inputClassName = "",
  mode,
  tone = true,
  align = "left",
  size = "md",
  onEnter,
  selectOnFocus = true,
  ...props
}) {
  const { prefs } = usePrefs();
  const activeMode = mode || prefs.moneyMode || "free";
  const inputRef = useRef(null);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState("");
  const numeric = Number(value);
  const safeValue = Number.isFinite(numeric) ? numeric : 0;

  useEffect(() => {
    if (!editing) setText(safeValue === 0 && !value ? "" : fmtNumber(safeValue));
  }, [safeValue, editing, value]);

  function commit(next) {
    const rounded = roundMoney(next);
    const final = allowNegative ? rounded : Math.abs(rounded);
    onChange?.(final);
  }

  function handleFocus(event) {
    setEditing(true);
    if (activeMode === "free") {
      setText(toEditingString(safeValue));
      if (selectOnFocus) requestAnimationFrame(() => event.target?.select?.());
    }
  }

  function handleBlur() {
    setEditing(false);
    setText(safeValue === 0 && !value ? "" : fmtNumber(safeValue));
  }

  function handleChange(event) {
    const raw = event.target.value;
    if (activeMode === "cents") {
      const negative = allowNegative && /-/.test(raw) && !/-/.test(text);
      const digits = raw.replace(/\D/g, "");
      const cents = digits ? Number(digits) : 0;
      let next = cents / 100;
      if (negative ? safeValue >= 0 : safeValue < 0) next = -next;
      if (!digits) next = 0;
      commit(next);
      setText(next === 0 ? "" : fmtNumber(next));
      return;
    }
    setText(raw);
    commit(parseMoney(raw, { allowNegative }));
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && onEnter) {
      event.preventDefault();
      onEnter(event);
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      const step = event.altKey ? 0.01 : event.shiftKey ? 10 : 1;
      const next = safeValue + (event.key === "ArrowUp" ? step : -step);
      commit(next);
      setText(activeMode === "free" ? toEditingString(roundMoney(next)) : fmtNumber(next));
      return;
    }
    if (event.key === "-" && allowNegative && activeMode === "cents") {
      event.preventDefault();
      const next = -safeValue;
      commit(next);
      setText(next === 0 ? "" : fmtNumber(next));
    }
    props.onKeyDown?.(event);
  }

  const toneClass = !tone
    ? "border-line"
    : safeValue > 0
    ? "border-pos/40 bg-pos/5 text-pos font-semibold"
    : safeValue < 0
    ? "border-neg/40 bg-neg/5 text-neg font-semibold"
    : "border-line";
  const sizeClass = size === "sm" ? "py-1 text-xs" : size === "lg" ? "py-3 text-base" : "py-2 text-sm";
  const { onKeyDown: _ignored, ...rest } = props;

  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[0.65rem] font-semibold text-faint">
        {currencySymbol()}
      </span>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        disabled={disabled}
        value={text}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`input num pl-8 ${sizeClass} ${align === "right" ? "text-right" : ""} ${toneClass} ${inputClassName}`}
        title={activeMode === "cents" ? "Digite só números: os centavos entram pela direita" : "Digite o valor (ex.: 1.234,56)"}
        {...rest}
      />
    </div>
  );
}
