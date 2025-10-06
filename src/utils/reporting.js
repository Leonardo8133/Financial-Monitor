import { enumerateMonths, monthLabel, yyyymm } from "./formatters.js";

function sanitizePersonalInfo(personalInfo = {}) {
  const entries = Object.entries(personalInfo || {}).map(([key, value]) => {
    if (typeof value === "string") {
      return [key, value.trim()];
    }
    return [key, value];
  });

  return Object.fromEntries(
    entries.filter(([, value]) => {
      if (value === null || value === undefined) return false;
      if (typeof value === "string") return value.trim().length > 0;
      if (typeof value === "number") return !Number.isNaN(value);
      return Boolean(value);
    })
  );
}

function defaultDateSelector(item) {
  return item?.date;
}

function toDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function computeRange(monthKeys) {
  if (!monthKeys.length) {
    return { months: [], startYm: undefined, endYm: undefined };
  }

  const unique = Array.from(new Set(monthKeys)).sort();
  const endYm = unique[unique.length - 1];
  const [year, month] = endYm.split("-").map(Number);
  const endDate = new Date(year, month - 1, 1);
  endDate.setHours(0, 0, 0, 0);
  const startDate = new Date(endDate);
  startDate.setMonth(startDate.getMonth() - 11);
  const startYm = yyyymm(startDate);
  const months = enumerateMonths(startYm, endYm);
  return { months, startYm, endYm };
}

export function buildReportDataset({
  items = [],
  personalInfo = {},
  notes = "",
  exportedAt = new Date(),
  dateSelector = defaultDateSelector,
  computeMonthlySummary = () => ({}),
  computeTotals = () => ({}),
} = {}) {
  const validItems = (Array.isArray(items) ? items : []).filter((item) => {
    const dateValue = dateSelector(item);
    return Boolean(yyyymm(dateValue));
  });

  const monthKeys = validItems.map((item) => yyyymm(dateSelector(item))).filter(Boolean);
  const { months, startYm, endYm } = computeRange(monthKeys);
  const monthSet = new Set(months);

  const filteredItems = validItems
    .filter((item) => monthSet.size === 0 || monthSet.has(yyyymm(dateSelector(item))))
    .sort((a, b) => {
      const dateA = toDate(dateSelector(a));
      const dateB = toDate(dateSelector(b));
      const timeA = dateA ? dateA.getTime() : 0;
      const timeB = dateB ? dateB.getTime() : 0;
      return timeB - timeA;
    });

  const monthlySummaries = months
    .map((ym) => {
      const monthItems = filteredItems.filter((item) => yyyymm(dateSelector(item)) === ym);
      if (!monthItems.length) {
        return null;
      }
      const summary = computeMonthlySummary(monthItems, ym) || {};
      return {
        ym,
        label: monthLabel(ym),
        items: monthItems,
        ...summary,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (a.ym > b.ym ? -1 : a.ym < b.ym ? 1 : 0));

  const totals = computeTotals(filteredItems) || {};
  const sanitizedInfo = sanitizePersonalInfo(personalInfo);
  const normalizedNotes = (notes ?? "").toString().trim();
  const exportDate = toDate(exportedAt) || new Date();

  return {
    exportedAt: exportDate.toISOString(),
    items: filteredItems,
    totals,
    monthlySummaries,
    notes: normalizedNotes,
    personalInfo: sanitizedInfo,
    startYm,
    endYm,
    itemCount: filteredItems.length,
  };
}

