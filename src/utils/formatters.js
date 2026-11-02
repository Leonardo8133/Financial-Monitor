import { fmtMoney } from "./money.js";

export const LS_KEY = "financial-monitor-investments-v1";

export function fmtBRL(value) {
  return fmtMoney(value);
}

export function fmtPct(value, decimals = 2) {
  if (value === null || value === undefined || Number.isNaN(value) || !Number.isFinite(Number(value))) return "–";
  return new Intl.NumberFormat("pt-BR", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function toNumber(v) {
  if (v === "" || v === null || v === undefined) return 0;
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const n = String(v).replace(/\./g, "").replace(/,/g, ".").replace(/[^0-9.-]/g, "");
  const out = Number(n);
  return Number.isFinite(out) ? out : 0;
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Parses an ISO date (YYYY-MM-DD) as a local date to avoid timezone shifts. */
export function parseISODate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const str = String(value);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function fmtDate(value) {
  const d = parseISODate(value);
  return d ? d.toLocaleDateString("pt-BR") : "–";
}

export function yyyymm(date) {
  const d = parseISODate(date);
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
}

export function monthLongLabel(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}

export function midOfMonth(ym) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 15);
}

export function enumerateMonths(startYm, endYm) {
  if (!startYm || !endYm) return [];
  const [startY, startM] = startYm.split("-").map(Number);
  const [endY, endM] = endYm.split("-").map(Number);
  const months = [];
  let y = startY;
  let m = startM;
  let guard = 0;
  while ((y < endY || (y === endY && m <= endM)) && guard < 1200) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
    guard += 1;
  }
  return months;
}

export function shiftMonth(ym, delta) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function download(filename, text, type = "application/json;charset=utf-8") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function timestampForFile(date = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(
    date.getMinutes()
  )}`;
}

/** Accepts "2025-01-31", "31/01/2025", "31-01-2025", Excel serials, Date objects. Returns ISO or "". */
export function normalizeDateInput(value) {
  if (value === null || value === undefined || value === "") return "";
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "" : toISO(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    // Excel serial date (days since 1899-12-30)
    if (value > 20000 && value < 80000) {
      const d = new Date(Math.round((value - 25569) * 86400 * 1000));
      return toISO(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    }
    return "";
  }
  const str = String(value).trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(str);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/.exec(str);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2})$/.exec(str);
  if (m) return `20${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  const d = new Date(str);
  return Number.isNaN(d.getTime()) ? "" : toISO(d);
}

function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
