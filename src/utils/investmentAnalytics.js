import { enumerateMonths, midOfMonth, monthLabel, toNumber, yyyymm } from "./formatters.js";
import { computeDerivedEntries } from "./entries.js";

const bankKey = (name) => (name || "").trim().toLowerCase();
const groupName = (entry, groupBy) => {
  const raw = groupBy === "source" ? entry.source : entry.bank;
  return (raw || (groupBy === "source" ? "Sem fonte" : "Sem banco")).trim() || "Sem banco";
};

function sortByDate(entries) {
  return entries
    .map((e, index) => ({ e, index }))
    .sort((a, b) => (a.e.date < b.e.date ? -1 : a.e.date > b.e.date ? 1 : a.index - b.index))
    .map((x) => x.e);
}

/** Latest snapshot per bank (by date). */
export function latestSnapshotPerBank(entries = [], upToYm) {
  const map = new Map();
  for (const entry of sortByDate(entries)) {
    if (!entry.date || !entry.bank) continue;
    if (upToYm && yyyymm(entry.date) > upToYm) continue;
    map.set(bankKey(entry.bank), entry);
  }
  return map;
}

/** Current position = sum of the latest snapshot of each bank. */
export function computeCurrentPosition(entries = []) {
  const latest = latestSnapshotPerBank(entries);
  const banks = Array.from(latest.values())
    .map((e) => ({
      name: e.bank,
      source: e.source,
      date: e.date,
      invested: toNumber(e.invested),
      inAccount: toNumber(e.inAccount),
      total: toNumber(e.invested) + toNumber(e.inAccount),
    }))
    .sort((a, b) => b.total - a.total);
  const invested = banks.reduce((a, b) => a + b.invested, 0);
  const inAccount = banks.reduce((a, b) => a + b.inAccount, 0);
  const total = invested + inAccount;
  const asOf = banks.reduce((max, b) => (b.date > max ? b.date : max), "");
  return {
    total,
    invested,
    inAccount,
    asOf,
    banks: banks.map((b) => ({ ...b, percentage: total ? Math.round((b.total / total) * 1000) / 10 : 0 })),
  };
}

/**
 * Monthly timeline.
 *  aggregation "carry": each month uses the latest snapshot of every bank up to that month
 *                       (a bank not updated in a month keeps its last value).
 *  aggregation "month": only entries dated in that month are summed (legacy behaviour).
 */
export function buildInvestmentTimeline(entries = [], { aggregation = "carry", groupBy = "bank" } = {}) {
  const valid = entries.filter((e) => e && e.date && yyyymm(e.date));
  if (!valid.length) return [];
  const derived = computeDerivedEntries(valid);
  const byId = new Map(derived.map((d) => [d.id, d]));
  const months = Array.from(new Set(valid.map((e) => yyyymm(e.date)))).sort();
  const allMonths = enumerateMonths(months[0], months[months.length - 1]);
  const sorted = sortByDate(valid);

  // Precompute entries per month
  const entriesByMonth = new Map();
  for (const e of sorted) {
    const ym = yyyymm(e.date);
    if (!entriesByMonth.has(ym)) entriesByMonth.set(ym, []);
    entriesByMonth.get(ym).push(e);
  }

  const carried = new Map(); // bankKey -> entry
  let previousTotal = 0;
  const result = [];
  let cursor = 0;

  for (const ym of allMonths) {
    const monthEntries = entriesByMonth.get(ym) || [];
    // advance carried snapshots
    while (cursor < sorted.length && yyyymm(sorted[cursor].date) <= ym) {
      const e = sorted[cursor];
      carried.set(bankKey(e.bank), e);
      cursor += 1;
    }

    const positionEntries = aggregation === "carry" ? Array.from(carried.values()) : monthEntries;
    const groups = new Map();
    const bump = (name, field, amount) => {
      const g = groups.get(name) || { name, invested: 0, inAccount: 0, total: 0, cashFlow: 0, yieldValue: 0, previousTotal: 0 };
      g[field] += amount;
      groups.set(name, g);
    };

    let invested = 0;
    let inAccount = 0;
    for (const e of positionEntries) {
      const inv = toNumber(e.invested);
      const acc = toNumber(e.inAccount);
      invested += inv;
      inAccount += acc;
      const name = groupName(e, groupBy);
      bump(name, "invested", inv);
      bump(name, "inAccount", acc);
      bump(name, "total", inv + acc);
    }

    let cashFlow = 0;
    let yieldValue = 0;
    let yieldBase = 0;
    let hasYield = false;
    let gapBanks = 0;
    for (const e of monthEntries) {
      const d = byId.get(e.id) || e;
      if (d.yieldGapMonths) gapBanks += 1;
      const cf = toNumber(e.cashFlow);
      cashFlow += cf;
      const name = groupName(e, groupBy);
      bump(name, "cashFlow", cf);
      if (d.yieldValue !== null && d.yieldValue !== undefined) {
        hasYield = true;
        yieldValue += d.yieldValue;
        yieldBase += d.previousTotal ?? 0;
        bump(name, "yieldValue", d.yieldValue);
        bump(name, "previousTotal", d.previousTotal ?? 0);
      }
    }

    const total = invested + inAccount;
    const midDate = midOfMonth(ym);
    result.push({
      ym,
      label: monthLabel(ym),
      midDate,
      midDateValue: midDate.getTime(),
      invested,
      inAccount,
      total,
      cashFlow,
      yieldValue: hasYield ? yieldValue : null,
      yieldPct: hasYield && yieldBase ? yieldValue / yieldBase : null,
      previousTotal,
      entryCount: monthEntries.length,
      hasEntries: monthEntries.length > 0,
      // banks whose previous snapshot is too old (> MAX_YIELD_GAP_MONTHS) and got no yield
      yieldGapBanks: gapBanks,
      groups: Array.from(groups.values()).map((g) => ({
        ...g,
        yieldPct: g.previousTotal ? g.yieldValue / g.previousTotal : null,
      })),
    });
    previousTotal = total;
  }
  return result;
}

export function summarizeTimeline(timeline = []) {
  const withEntries = timeline.filter((m) => m.hasEntries);
  const last = withEntries.at(-1) || null;
  const prev = withEntries.at(-2) || null;
  const last12 = timeline.slice(-12);
  const yieldLast12 = last12.reduce((a, m) => a + (m.yieldValue ?? 0), 0);
  const pctValues = last12.map((m) => m.yieldPct).filter((v) => v !== null && Number.isFinite(v));
  const avgPct = pctValues.length ? pctValues.reduce((a, v) => a + v, 0) / pctValues.length : null;
  const cashLast12 = last12.reduce((a, m) => a + (m.cashFlow || 0), 0);
  return {
    last,
    prev,
    yieldLast12,
    avgMonthlyPct: avgPct,
    cashFlowLast12: cashLast12,
    totalDelta: last && prev && prev.total ? (last.total - prev.total) / prev.total : null,
  };
}

/** For the entry form: last known snapshot per bank, newest first. */
export function lastSnapshotsList(entries = []) {
  return Array.from(latestSnapshotPerBank(entries).values()).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function findDuplicateSnapshots(entries = [], drafts = []) {
  const existing = new Map(entries.map((e) => [`${bankKey(e.bank)}|${(e.date || "").slice(0, 10)}`, e]));
  const dups = [];
  for (const d of drafts) {
    const key = `${bankKey(d.bank)}|${(d.date || "").slice(0, 10)}`;
    const match = existing.get(key);
    if (match && d.bank && d.date) dups.push({ draft: d, existing: match });
  }
  return dups;
}
