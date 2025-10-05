import { DEFAULT_CATEGORIES } from "./categories.js";
import { DEFAULT_SOURCES } from "./sources.js";

export const EXPENSES_LS_KEY = "leo-expenses-v1";

export const EXPENSES_STORAGE_SEED = {
  expenses: [],
  categories: DEFAULT_CATEGORIES,
  sources: DEFAULT_SOURCES,
  personalInfo: {
    fullName: "",
    email: "",
    householdSize: 1,
  },
  settings: {
    defaultTab: "dashboard",
    monthlyBudget: 0,
    currency: "BRL",
  },
  createdAt: new Date().toISOString(),
};

export function ensureExpensesDefaults(store = {}) {
  return {
    ...EXPENSES_STORAGE_SEED,
    ...store,
    expenses: Array.isArray(store?.expenses) ? store.expenses : [],
    categories:
      Array.isArray(store?.categories) && store.categories.length
        ? store.categories
        : EXPENSES_STORAGE_SEED.categories,
    sources:
      Array.isArray(store?.sources) && store.sources.length
        ? store.sources
        : EXPENSES_STORAGE_SEED.sources,
    personalInfo: { ...EXPENSES_STORAGE_SEED.personalInfo, ...(store?.personalInfo || {}) },
    settings: { ...EXPENSES_STORAGE_SEED.settings, ...(store?.settings || {}) },
    createdAt: store?.createdAt || EXPENSES_STORAGE_SEED.createdAt,
  };
}
