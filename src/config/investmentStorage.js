import { DEFAULT_BANKS } from "./banks.js";
import { DEFAULT_SOURCES } from "./sources.js";

export const INVESTMENT_STORAGE_SEED = {
  entries: [],
  banks: DEFAULT_BANKS,
  sources: DEFAULT_SOURCES,
  personalInfo: {
    fullName: "",
    email: "",
    document: "",
    phone: "",
  },
  settings: {
    defaultTab: "dashboard",
    defaultFocusArea: "investimentos",
    reportNotes: "",
  },
  createdAt: new Date().toISOString(),
};

export function ensureInvestmentDefaults(store = {}) {
  return {
    ...INVESTMENT_STORAGE_SEED,
    ...store,
    banks:
      Array.isArray(store?.banks) && store.banks.length
        ? store.banks
        : INVESTMENT_STORAGE_SEED.banks,
    sources:
      Array.isArray(store?.sources) && store.sources.length
        ? store.sources
        : INVESTMENT_STORAGE_SEED.sources,
    personalInfo: { ...INVESTMENT_STORAGE_SEED.personalInfo, ...(store?.personalInfo || {}) },
    settings: { ...INVESTMENT_STORAGE_SEED.settings, ...(store?.settings || {}) },
    entries: Array.isArray(store?.entries) ? store.entries : [],
    createdAt: store?.createdAt || INVESTMENT_STORAGE_SEED.createdAt,
  };
}
