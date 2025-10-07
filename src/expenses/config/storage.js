import { DEFAULT_CATEGORIES } from "./categories.js";
import { DEFAULT_SOURCES } from "./sources.js";
import { DEFAULT_DESCRIPTION_CATEGORY_MAPPINGS, mergeDescriptionMappings } from "./descriptionMappings.js";

export const EXPENSES_LS_KEY = "financial-monitor-expenses-v1";

export const EXPENSES_STORAGE_SEED = {
  expenses: [],
  categories: DEFAULT_CATEGORIES,
  sources: DEFAULT_SOURCES,
  descriptionCategoryMappings: DEFAULT_DESCRIPTION_CATEGORY_MAPPINGS,
  ignoredDescriptions: [], // Lista de palavras-chave para ignorar na importação
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
  const mergedMappings = mergeDescriptionMappings(
    DEFAULT_DESCRIPTION_CATEGORY_MAPPINGS,
    Array.isArray(store?.descriptionCategoryMappings) ? store.descriptionCategoryMappings : []
  );
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
    descriptionCategoryMappings: mergedMappings,
    ignoredDescriptions: Array.isArray(store?.ignoredDescriptions) ? store.ignoredDescriptions : [],
    personalInfo: { ...EXPENSES_STORAGE_SEED.personalInfo, ...(store?.personalInfo || {}) },
    settings: { ...EXPENSES_STORAGE_SEED.settings, ...(store?.settings || {}) },
    createdAt: store?.createdAt || EXPENSES_STORAGE_SEED.createdAt,
  };
}
