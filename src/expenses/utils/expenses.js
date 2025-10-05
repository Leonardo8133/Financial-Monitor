import { toNumber } from "../../utils/formatters.js";

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
      const value = Math.abs(toNumber(e.value));
      acc.total_spent += value;
      return acc;
    },
    { total_spent: 0 }
  );
}
