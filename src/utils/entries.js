import { emptyEntry } from "../data/demoEntries.js";
import { toNumber } from "./formatters.js";

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
  const today = new Date().toISOString().split('T')[0];
  return { 
    ...emptyEntry, 
    date: today,
    ...overrides, 
    id: makeId(), 
    locked: false 
  };
}

export function computeDerivedEntries(entries = []) {
  const sorted = entries
    .map((entry) => ({ ...entry }))
    .sort((a, b) => {
      const da = new Date(a.date ?? 0).getTime();
      const db = new Date(b.date ?? 0).getTime();
      if (da === db) {
        return (a.bank ?? "").localeCompare(b.bank ?? "");
      }
      return da - db;
    });

  const lastByBank = new Map();
  const computed = new Map();

  for (const entry of sorted) {
    const key = (entry.bank ?? "").toLowerCase();
    const previous = lastByBank.get(key);
    const invested = toNumber(entry.invested);
    const inAccount = toNumber(entry.inAccount);
    const cashFlow = toNumber(entry.cashFlow);
    const currentTotal = invested + inAccount;

    let yieldValue = null;
    let yieldPct = null;
    let previousTotal = null;

    if (previous) {
      previousTotal = toNumber(previous.invested) + toNumber(previous.inAccount);
      yieldValue = currentTotal - (previousTotal + cashFlow);
      if (previousTotal !== 0) {
        yieldPct = yieldValue / previousTotal;
      }
    }

    const enriched = {
      ...entry,
      yieldValue,
      yieldPct,
      computedTotal: currentTotal,
      previousTotal,
    };

    computed.set(entry.id, enriched);
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
