import { emptyEntry } from "../investments/data/demoEntries.js";
import { toNumber, todayISO, yyyymm } from "./formatters.js";

export function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}

export function withId(entry) {
  if (entry.id) return entry;
  const { locked, ...rest } = entry;
  return { ...rest, id: makeId() };
}

export function createDraftEntry(overrides = {}) {
  return {
    ...emptyEntry,
    date: todayISO(),
    ...overrides,
    id: makeId(),
  };
}

/** Max distance (in calendar months) between two snapshots of a bank for a yield to be computed. */
export const MAX_YIELD_GAP_MONTHS = 2;

export function monthsBetween(dateA, dateB) {
  const a = yyyymm(dateA);
  const b = yyyymm(dateB);
  if (!a || !b) return null;
  const [ya, ma] = a.split("-").map(Number);
  const [yb, mb] = b.split("-").map(Number);
  return (yb - ya) * 12 + (mb - ma);
}

/**
 * Adds yieldValue / yieldPct / previousTotal to each entry by comparing with the
 * previous snapshot of the same bank: yield = total - (previousTotal + cashFlow).
 * When the previous snapshot is more than MAX_YIELD_GAP_MONTHS months older, the
 * yield is not computed (it would mix several months): `yieldGapMonths` tells why.
 */
export function computeDerivedEntries(entries = [], { maxGapMonths = MAX_YIELD_GAP_MONTHS } = {}) {
  const sorted = entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => {
      const da = a.entry.date || "";
      const db = b.entry.date || "";
      if (da === db) return a.index - b.index;
      return da < db ? -1 : 1;
    })
    .map((x) => x.entry);

  const lastByBank = new Map();
  const computed = new Map();

  for (const entry of sorted) {
    const key = (entry.bank ?? "").trim().toLowerCase();
    const previous = lastByBank.get(key);
    const invested = toNumber(entry.invested);
    const inAccount = toNumber(entry.inAccount);
    const cashFlow = toNumber(entry.cashFlow);
    const currentTotal = invested + inAccount;

    let yieldValue = null;
    let yieldPct = null;
    let previousTotal = null;
    let yieldGapMonths = null;

    if (previous) {
      previousTotal = toNumber(previous.invested) + toNumber(previous.inAccount);
      const gap = monthsBetween(previous.date, entry.date);
      if (gap !== null && gap > maxGapMonths) {
        yieldGapMonths = gap;
      } else {
        yieldValue = currentTotal - (previousTotal + cashFlow);
        if (previousTotal !== 0) {
          yieldPct = yieldValue / previousTotal;
        }
      }
    }

    computed.set(entry.id, {
      ...entry,
      yieldValue,
      yieldPct,
      computedTotal: currentTotal,
      previousTotal,
      previousDate: previous?.date ?? null,
      yieldGapMonths,
    });
    lastByBank.set(key, entry);
  }

  return entries.map(
    (entry) =>
      computed.get(entry.id) ?? {
        ...entry,
        yieldValue: null,
        yieldPct: null,
        computedTotal: toNumber(entry.invested) + toNumber(entry.inAccount),
        previousTotal: null,
        previousDate: null,
        yieldGapMonths: null,
      }
  );
}

export function computeTotals(entries = []) {
  return entries.reduce(
    (acc, entry) => {
      const invested = toNumber(entry.invested);
      const inAccount = toNumber(entry.inAccount);
      const cashFlow = toNumber(entry.cashFlow);
      const yieldValue = toNumber(entry.yieldValue);

      acc.total_invested += invested;
      acc.total_in_account += inAccount;
      acc.total_input += cashFlow;
      if (entry.yieldValue !== null && entry.yieldValue !== undefined) {
        acc.total_yield_value += yieldValue;
      }
      return acc;
    },
    {
      total_invested: 0,
      total_in_account: 0,
      total_input: 0,
      total_yield_value: 0,
    }
  );
}
