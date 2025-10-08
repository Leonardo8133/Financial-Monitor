import { mergeDescriptionMappings } from "./descriptionMappings.js";

export const EXPENSES_LS_KEY = "financial-monitor-expenses-v1";

// Seed mínimo sem configurações padrão embutidas
// As configurações virão do arquivo configuracoes-padrao.json
export const EXPENSES_STORAGE_SEED = {
  expenses: [],
  categories: [],
  sources: [],
  descriptionCategoryMappings: [],
  ignoredDescriptions: [],
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
    categories: Array.isArray(store?.categories) ? store.categories : [],
    sources: Array.isArray(store?.sources) ? store.sources : [],
    descriptionCategoryMappings: Array.isArray(store?.descriptionCategoryMappings) ? store.descriptionCategoryMappings : [],
    ignoredDescriptions: Array.isArray(store?.ignoredDescriptions) ? store.ignoredDescriptions : [],
    personalInfo: { ...EXPENSES_STORAGE_SEED.personalInfo, ...(store?.personalInfo || {}) },
    settings: { ...EXPENSES_STORAGE_SEED.settings, ...(store?.settings || {}) },
    createdAt: store?.createdAt || EXPENSES_STORAGE_SEED.createdAt,
  };
}
