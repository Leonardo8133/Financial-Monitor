import { toNumber, yyyymm } from "../../utils/formatters.js";

export function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}

export function withId(expense) {
  if (expense.id) return expense;
  const { locked, ...rest } = expense;
  return { ...rest, id: makeId() };
}

export function computeDerivedExpenses(expenses = []) {
  return expenses.map((e) => ({ ...e, absValue: Math.abs(toNumber(e.value)) }));
}

export function computeTotals(expenses = []) {
  return expenses.reduce(
    (acc, e) => {
      const value = toNumber(e.value);
      if (value < 0) {
        acc.total_spent += Math.abs(value);
      } else {
        acc.total_earned += value;
      }
      return acc;
    },
    { total_spent: 0, total_earned: 0 }
  );
}

export function normalizeDescriptionKey(description = "") {
  return String(description || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Learns from history: for each description, the most recent categories, sources
 * and value. Used to autofill the entry form.
 */
export function buildDescriptionMemory(expenses = []) {
  const memory = new Map();
  const sorted = expenses
    .filter((e) => e && e.description)
    .slice()
    .sort((a, b) => ((a.date || "") < (b.date || "") ? -1 : 1));
  for (const e of sorted) {
    const key = normalizeDescriptionKey(e.description);
    if (!key) continue;
    const prev = memory.get(key);
    memory.set(key, {
      description: e.description,
      categories: Array.isArray(e.categories) && e.categories.length ? e.categories : prev?.categories || [],
      sources: Array.isArray(e.sources) && e.sources.length ? e.sources : prev?.sources || [],
      value: toNumber(e.value),
      lastDate: e.date,
      count: (prev?.count || 0) + 1,
    });
  }
  return memory;
}

export function buildMonthlyExpenses(expenses = []) {
  const byMonth = new Map();
  for (const e of expenses) {
    const key = yyyymm(e.date);
    if (!key) continue;
    const base = byMonth.get(key) || { ym: key, total: 0, spent: 0, earned: 0, byCategory: {}, bySource: {}, items: [] };
    const value = toNumber(e.value);
    const absValue = Math.abs(value);
    base.total += absValue;
    base.items.push(e);
    if (value < 0) {
      base.spent += absValue;
      const categoriesList = Array.isArray(e.categories) && e.categories.length ? e.categories : ["(sem categoria)"];
      const share = absValue / categoriesList.length;
      for (const cat of categoriesList) base.byCategory[cat] = (base.byCategory[cat] || 0) + share;
    } else {
      base.earned += value;
    }
    const sourcesList = Array.isArray(e.sources) && e.sources.length ? e.sources : ["(sem fonte)"];
    const shareS = absValue / sourcesList.length;
    for (const src of sourcesList) base.bySource[src] = (base.bySource[src] || 0) + shareS;
    byMonth.set(key, base);
  }
  return Array.from(byMonth.values()).sort((a, b) => (a.ym < b.ym ? -1 : 1));
}
