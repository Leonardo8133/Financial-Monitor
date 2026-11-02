// Money helpers shared by inputs, tables and charts.

let activeCurrency = "BRL";
const LOCALE = "pt-BR";

export function setActiveCurrency(code) {
  if (typeof code === "string" && code.trim()) activeCurrency = code.trim().toUpperCase();
}

export function getActiveCurrency() {
  return activeCurrency;
}

export function currencySymbol(code = activeCurrency) {
  try {
    const parts = new Intl.NumberFormat(LOCALE, { style: "currency", currency: code }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value || code;
  } catch {
    return code;
  }
}

export function fmtMoney(value, { currency = activeCurrency, signed = false, decimals = 2 } = {}) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "–";
  const n = Number(value);
  try {
    const text = new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);
    return signed && n > 0 ? `+${text}` : text;
  } catch {
    return `${n.toFixed(decimals)}`;
  }
}

/** Short form for chart axes: 1.2 mil, 3,4 mi */
export function fmtCompact(value) {
  const n = Number(value) || 0;
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toLocaleString(LOCALE, { maximumFractionDigits: 1 })} mi`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toLocaleString(LOCALE, { maximumFractionDigits: 1 })} mil`;
  return `${sign}${abs.toLocaleString(LOCALE, { maximumFractionDigits: 0 })}`;
}

export function fmtNumber(value, decimals = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString(LOCALE, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/**
 * Parses what a human types for money in Brazil (and tolerates US style).
 *   "1.234,56" -> 1234.56   "1234,5" -> 1234.5   "1,234.56" -> 1234.56
 *   "R$ -12,30" -> -12.3    "1.000" -> 1000      "12.5" -> 12.5
 */
export function parseMoney(input, { allowNegative = true } = {}) {
  if (typeof input === "number") return Number.isFinite(input) ? input : 0;
  if (input === null || input === undefined) return 0;
  let s = String(input).trim();
  if (!s) return 0;
  const negative = /^\s*[-(]/.test(s) || /-\s*$/.test(s);
  s = s.replace(/[^\d.,]/g, "");
  if (!s) return 0;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  let integer = s;
  let fraction = "";

  if (lastComma !== -1 && lastDot !== -1) {
    // Both present: the one that appears last is the decimal separator.
    const decimalPos = Math.max(lastComma, lastDot);
    integer = s.slice(0, decimalPos);
    fraction = s.slice(decimalPos + 1);
  } else if (lastComma !== -1) {
    const commas = s.split(",").length - 1;
    const after = s.length - lastComma - 1;
    if (commas === 1 && after <= 2) {
      integer = s.slice(0, lastComma);
      fraction = s.slice(lastComma + 1);
    }
    // multiple commas or 3 digits after -> thousands separators
  } else if (lastDot !== -1) {
    const dots = s.split(".").length - 1;
    const after = s.length - lastDot - 1;
    if (dots === 1 && after !== 3) {
      integer = s.slice(0, lastDot);
      fraction = s.slice(lastDot + 1);
    } else if (dots === 1 && after === 3) {
      // "1.000" -> treat as thousands (BR default)
      integer = s;
      fraction = "";
    }
  }

  integer = integer.replace(/[.,]/g, "") || "0";
  fraction = fraction.replace(/[.,]/g, "");
  const num = Number(`${integer}.${fraction || "0"}`);
  if (!Number.isFinite(num)) return 0;
  return negative && allowNegative ? -num : num;
}

/** Converts a number to the editing string "1234,56" (no thousands separators). */
export function toEditingString(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return "";
  const fixed = Math.abs(n).toFixed(2);
  const [int, frac] = fixed.split(".");
  const cleanFrac = frac.replace(/0+$/, "");
  return `${n < 0 ? "-" : ""}${int}${cleanFrac ? "," + cleanFrac : ""}`;
}

export function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}
