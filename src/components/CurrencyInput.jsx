import { useEffect, useRef, useState } from "react";

export function CurrencyInput({
  value,
  onChange,
  placeholder = "0,00",
  allowNegative = false,
  disabled = false,
  className = "",
  inputClassName = "",
  ...props
}) {
  const inputRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [displayValue, setDisplayValue] = useState("");

  function formatCurrency(val) {
    if (val === null || val === undefined || Number.isNaN(Number(val))) return "";
    const n = Number(val);
    try {
      return new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n);
    } catch {
      return String(n);
    }
  }

  function toEditingString(val) {
    if (val === null || val === undefined || Number.isNaN(Number(val))) return "";
    const n = Number(val);
    const [intPart, fracPartRaw] = n.toFixed(2).split(".");
    const fracPart = fracPartRaw.replace(/0+$/g, "");
    let s = intPart;
    if (fracPart.length) s += "," + fracPart;
    return s;
  }

  function parseEditingString(str) {
    if (!str) return 0;
    let s = String(str).trim();
    s = s.replace(/\./g, ",");
    s = s.replace(/[^0-9,-]/g, "");
    s = s.replace(/(?!^)-/g, "");
    if (!allowNegative) s = s.replace(/-/g, "");
    const firstComma = s.indexOf(",");
    if (firstComma !== -1) {
      s = s.slice(0, firstComma + 1) + s.slice(firstComma + 1).replace(/,/g, "");
    }
    const normalized = s.replace(",", ".");
    const num = Number(normalized);
    if (!Number.isFinite(num)) return 0;
    return num;
  }

  useEffect(() => {
    if (!isEditing) {
      setDisplayValue(
        value === null || value === undefined ? "" : formatCurrency(value)
      );
    }
  }, [value, isEditing]);

  const handleFocus = () => {
    setIsEditing(true);
    setDisplayValue(toEditingString(value));
  };

  const handleBlur = () => {
    setIsEditing(false);
    setDisplayValue(
      value === null || value === undefined ? "" : formatCurrency(value)
    );
  };

  const handleChange = (e) => {
    const raw = e.target.value;
    setDisplayValue(raw);
    const parsed = parseEditingString(raw);
    onChange?.(parsed);
  };

  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">R$</span>
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        disabled={disabled}
        value={displayValue}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        placeholder={placeholder}
        className={`w-full rounded-xl border px-6 py-1.5 text-xs outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100 ${
          Number(value) > 0
            ? "bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold"
            : Number(value) < 0
            ? "bg-red-50 border-red-200 text-red-700 font-semibold"
            : "border-slate-200"
        } ${inputClassName}`}
        {...props}
      />
    </div>
  );
}
