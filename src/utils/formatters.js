export const LS_KEY = "leo-investments-v1";

export function fmtBRL(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
  } catch {
    return `${value}`;
  }
}

export function fmtPct(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "–";
  return new Intl.NumberFormat("pt-BR", { style: "percent", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

export function toNumber(v) {
  if (v === "" || v === null || v === undefined) return 0;
  const n = typeof v === "string" ? v.replace(/\./g, "").replace(/,/g, ".").replace(/[^0-9.-]/g, "") : v;
  const out = Number(n);
  return Number.isFinite(out) ? out : 0;
}

export function yyyymm(date) {
  const d = new Date(date);
  if (isNaN(d)) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(ym) {
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("pt-BR", { month: "short", year: "numeric" });
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
  while (y < endY || (y === endY && m <= endM)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}

export function download(filename, text) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
