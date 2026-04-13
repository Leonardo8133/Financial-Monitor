import { LS_KEY } from './formatters.js';
import { EXPENSES_LS_KEY } from '../expenses/config/storage.js';
import { initializeNewUserConfig, loadDefaultConfigFromFile } from './defaultConfigLoader.js';

export const UNIFIED_LS_KEY = 'financial-monitor-unified-v1';

export const UNIFIED_STORAGE_SEED = {
  investimentos: {
    entries: [],
    banks: [],
    sources: [],
    personalInfo: {
      fullName: '',
      email: '',
      document: '',
      phone: '',
    },
    settings: {
      defaultTab: 'dashboard',
      defaultFocusArea: 'investimentos',
      reportNotes: '',
    },
    createdAt: new Date().toISOString(),
  },
  gastos: {
    expenses: [],
    categories: [],
    sources: [],
    personalInfo: {
      fullName: '',
      email: '',
      householdSize: 1,
    },
    settings: {
      defaultTab: 'dashboard',
      defaultFocusArea: 'gastos',
      monthlyBudget: 0,
      currency: 'BRL',
    },
    descriptionCategoryMappings: [],
    ignoredDescriptions: [],
    createdAt: new Date().toISOString(),
  },
  unifiedAt: new Date().toISOString(),
  version: '1.0.0',
};

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeText(value, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeDateString(value, fallback) {
  if (typeof value !== 'string' || !value.trim()) {
    return fallback;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function normalizeRecordArray(value) {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeNamedCollection(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((item) => {
      const name = normalizeText(item.name).trim();
      if (!name) {
        return null;
      }

      return {
        ...item,
        name,
        color: normalizeText(item.color),
        icon: normalizeText(item.icon),
      };
    })
    .filter(Boolean);
}

function normalizeDescriptionMappings(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isRecord)
    .map((entry) => {
      const keyword = normalizeText(entry.keyword).trim();
      const categories = normalizeStringArray(entry.categories);
      if (!keyword || !categories.length) {
        return null;
      }

      return {
        ...entry,
        keyword,
        categories,
        exactMatch: Boolean(entry.exactMatch),
      };
    })
    .filter(Boolean);
}

function normalizeInvestmentsPersonalInfo(value) {
  const personalInfo = isRecord(value) ? value : {};
  return {
    fullName: normalizeText(personalInfo.fullName),
    email: normalizeText(personalInfo.email),
    document: normalizeText(personalInfo.document),
    phone: normalizeText(personalInfo.phone),
  };
}

function normalizeInvestmentsSettings(value) {
  const settings = isRecord(value) ? value : {};
  return {
    defaultTab: normalizeText(settings.defaultTab, UNIFIED_STORAGE_SEED.investimentos.settings.defaultTab),
    defaultFocusArea: normalizeText(
      settings.defaultFocusArea,
      UNIFIED_STORAGE_SEED.investimentos.settings.defaultFocusArea
    ),
    reportNotes: normalizeText(settings.reportNotes),
  };
}

function normalizeExpensesPersonalInfo(value) {
  const personalInfo = isRecord(value) ? value : {};
  return {
    fullName: normalizeText(personalInfo.fullName),
    email: normalizeText(personalInfo.email),
    householdSize: normalizeNumber(
      personalInfo.householdSize,
      UNIFIED_STORAGE_SEED.gastos.personalInfo.householdSize
    ),
  };
}

function normalizeExpensesSettings(value) {
  const settings = isRecord(value) ? value : {};
  return {
    defaultTab: normalizeText(settings.defaultTab, UNIFIED_STORAGE_SEED.gastos.settings.defaultTab),
    defaultFocusArea: normalizeText(
      settings.defaultFocusArea,
      UNIFIED_STORAGE_SEED.gastos.settings.defaultFocusArea
    ),
    monthlyBudget: normalizeNumber(
      settings.monthlyBudget,
      UNIFIED_STORAGE_SEED.gastos.settings.monthlyBudget
    ),
    currency: normalizeText(settings.currency, UNIFIED_STORAGE_SEED.gastos.settings.currency),
  };
}

function parseStoredJson(rawValue, fallback = null) {
  if (typeof rawValue !== 'string' || !rawValue.trim() || rawValue === 'null') {
    return fallback;
  }

  try {
    return JSON.parse(rawValue);
  } catch {
    return fallback;
  }
}

function hasItems(value) {
  return Array.isArray(value) && value.length > 0;
}

function hasMeaningfulLegacyData(investmentData, expensesData) {
  const investmentPersonalInfo = isRecord(investmentData.personalInfo) ? investmentData.personalInfo : {};
  const expensesPersonalInfo = isRecord(expensesData.personalInfo) ? expensesData.personalInfo : {};

  return (
    hasItems(investmentData.entries) ||
    hasItems(investmentData.banks) ||
    hasItems(investmentData.sources) ||
    hasItems(expensesData.expenses) ||
    hasItems(expensesData.categories) ||
    hasItems(expensesData.sources) ||
    hasItems(expensesData.descriptionCategoryMappings) ||
    hasItems(expensesData.ignoredDescriptions) ||
    Boolean(normalizeText(investmentPersonalInfo.fullName)) ||
    Boolean(normalizeText(investmentPersonalInfo.email)) ||
    Boolean(normalizeText(expensesPersonalInfo.fullName)) ||
    Boolean(normalizeText(expensesPersonalInfo.email))
  );
}

function createUnifiedDataFromLegacy(investmentData, expensesData) {
  return normalizeUnifiedStorage({
    investimentos: {
      entries: investmentData.entries,
      banks: investmentData.banks,
      sources: investmentData.sources,
      personalInfo: investmentData.personalInfo,
      settings: investmentData.settings,
      createdAt: investmentData.createdAt,
    },
    gastos: {
      expenses: expensesData.expenses,
      categories: expensesData.categories,
      sources: expensesData.sources,
      personalInfo: expensesData.personalInfo,
      settings: expensesData.settings,
      descriptionCategoryMappings: expensesData.descriptionCategoryMappings,
      ignoredDescriptions: expensesData.ignoredDescriptions,
      createdAt: expensesData.createdAt,
    },
    unifiedAt: new Date().toISOString(),
  });
}

export function isUnifiedStorageCandidate(value) {
  return isRecord(value) && (isRecord(value.investimentos) || isRecord(value.gastos));
}

export function normalizeUnifiedStorage(value) {
  const store = isRecord(value) ? value : {};
  const investimentos = isRecord(store.investimentos) ? store.investimentos : {};
  const gastos = isRecord(store.gastos) ? store.gastos : {};

  return {
    ...UNIFIED_STORAGE_SEED,
    ...store,
    investimentos: {
      ...UNIFIED_STORAGE_SEED.investimentos,
      ...investimentos,
      entries: normalizeRecordArray(investimentos.entries),
      banks: normalizeNamedCollection(investimentos.banks),
      sources: normalizeNamedCollection(investimentos.sources),
      personalInfo: normalizeInvestmentsPersonalInfo(investimentos.personalInfo),
      settings: normalizeInvestmentsSettings(investimentos.settings),
      createdAt: normalizeDateString(investimentos.createdAt, UNIFIED_STORAGE_SEED.investimentos.createdAt),
    },
    gastos: {
      ...UNIFIED_STORAGE_SEED.gastos,
      ...gastos,
      expenses: normalizeRecordArray(gastos.expenses),
      categories: normalizeNamedCollection(gastos.categories),
      sources: normalizeNamedCollection(gastos.sources),
      personalInfo: normalizeExpensesPersonalInfo(gastos.personalInfo),
      settings: normalizeExpensesSettings(gastos.settings),
      descriptionCategoryMappings: normalizeDescriptionMappings(gastos.descriptionCategoryMappings),
      ignoredDescriptions: normalizeStringArray(gastos.ignoredDescriptions),
      createdAt: normalizeDateString(gastos.createdAt, UNIFIED_STORAGE_SEED.gastos.createdAt),
    },
    unifiedAt: normalizeDateString(store.unifiedAt, UNIFIED_STORAGE_SEED.unifiedAt),
    version: normalizeText(store.version, UNIFIED_STORAGE_SEED.version),
  };
}

export async function migrateToUnifiedStorage() {
  try {
    const existingUnifiedRaw = localStorage.getItem(UNIFIED_LS_KEY);
    const existingUnified = parseStoredJson(existingUnifiedRaw);
    const investmentData = parseStoredJson(localStorage.getItem(LS_KEY), {});
    const expensesData = parseStoredJson(localStorage.getItem(EXPENSES_LS_KEY), {});

    if (isUnifiedStorageCandidate(existingUnified)) {
      const normalizedUnified = await ensureUnifiedDefaultsWithConfig(existingUnified);
      localStorage.setItem(UNIFIED_LS_KEY, JSON.stringify(normalizedUnified));
      return normalizedUnified;
    }

    if (existingUnifiedRaw && !existingUnified) {
      localStorage.removeItem(UNIFIED_LS_KEY);
    }

    if (hasMeaningfulLegacyData(investmentData, expensesData)) {
      const unifiedData = createUnifiedDataFromLegacy(investmentData, expensesData);
      localStorage.setItem(UNIFIED_LS_KEY, JSON.stringify(unifiedData));
      console.log('✅ Dados migrados para estrutura unificada');
      return unifiedData;
    }

    const initializedData = await initializeNewUserConfig(UNIFIED_LS_KEY);
    if (initializedData) {
      const normalizedInitializedData = normalizeUnifiedStorage(initializedData);
      localStorage.setItem(UNIFIED_LS_KEY, JSON.stringify(normalizedInitializedData));
      return normalizedInitializedData;
    }

    return normalizeUnifiedStorage(UNIFIED_STORAGE_SEED);
  } catch (error) {
    console.error('Erro ao migrar para storage unificado:', error);
    return normalizeUnifiedStorage(UNIFIED_STORAGE_SEED);
  }
}

export function ensureUnifiedDefaults(store) {
  return normalizeUnifiedStorage(store);
}

export async function ensureUnifiedDefaultsWithConfig(store) {
  if (!store) {
    console.log('🔄 Store vazio, carregando configurações padrão...');
    const initialized = await initializeNewUserConfig(UNIFIED_LS_KEY);
    return normalizeUnifiedStorage(initialized || UNIFIED_STORAGE_SEED);
  }

  const normalizedStore = normalizeUnifiedStorage(store);
  const needsDefaultBanks = !hasItems(normalizedStore.investimentos.banks);
  const needsDefaultSources = !hasItems(normalizedStore.investimentos.sources);
  const needsDefaultCategories = !hasItems(normalizedStore.gastos.categories);
  const needsDefaultExpenseSources = !hasItems(normalizedStore.gastos.sources);
  const needsDefaultMappings = !hasItems(normalizedStore.gastos.descriptionCategoryMappings);
  const needsDefaultIgnored = !hasItems(normalizedStore.gastos.ignoredDescriptions);

  if (
    !needsDefaultBanks &&
    !needsDefaultSources &&
    !needsDefaultCategories &&
    !needsDefaultExpenseSources &&
    !needsDefaultMappings &&
    !needsDefaultIgnored
  ) {
    return normalizedStore;
  }

  console.log('🔄 Dados incompletos detectados, carregando configurações padrão...');
  const normalizedDefaults = normalizeUnifiedStorage(await loadDefaultConfigFromFile());

  return normalizeUnifiedStorage({
    ...normalizedStore,
    investimentos: {
      ...normalizedStore.investimentos,
      banks: needsDefaultBanks ? normalizedDefaults.investimentos.banks : normalizedStore.investimentos.banks,
      sources: needsDefaultSources
        ? normalizedDefaults.investimentos.sources
        : normalizedStore.investimentos.sources,
      personalInfo: {
        ...normalizedDefaults.investimentos.personalInfo,
        ...normalizedStore.investimentos.personalInfo,
      },
      settings: {
        ...normalizedDefaults.investimentos.settings,
        ...normalizedStore.investimentos.settings,
      },
    },
    gastos: {
      ...normalizedStore.gastos,
      categories: needsDefaultCategories ? normalizedDefaults.gastos.categories : normalizedStore.gastos.categories,
      sources: needsDefaultExpenseSources ? normalizedDefaults.gastos.sources : normalizedStore.gastos.sources,
      descriptionCategoryMappings: needsDefaultMappings
        ? normalizedDefaults.gastos.descriptionCategoryMappings
        : normalizedStore.gastos.descriptionCategoryMappings,
      ignoredDescriptions: needsDefaultIgnored
        ? normalizedDefaults.gastos.ignoredDescriptions
        : normalizedStore.gastos.ignoredDescriptions,
      personalInfo: {
        ...normalizedDefaults.gastos.personalInfo,
        ...normalizedStore.gastos.personalInfo,
      },
      settings: {
        ...normalizedDefaults.gastos.settings,
        ...normalizedStore.gastos.settings,
      },
    },
  });
}

export function exportUnifiedData() {
  try {
    const unifiedData = normalizeUnifiedStorage(parseStoredJson(localStorage.getItem(UNIFIED_LS_KEY), {}));
    const dataStr = JSON.stringify(unifiedData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `financial-monitor-unified-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return true;
  } catch (error) {
    console.error('Erro ao exportar dados unificados:', error);
    return false;
  }
}

export function importUnifiedData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (!isUnifiedStorageCandidate(data)) {
          throw new Error('Arquivo não contém estrutura unificada válida');
        }

        const normalizedData = normalizeUnifiedStorage(data);
        localStorage.setItem(UNIFIED_LS_KEY, JSON.stringify(normalizedData));
        resolve(normalizedData);
      } catch (error) {
        reject(new Error('Erro ao processar arquivo: ' + error.message));
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'));
    };

    reader.readAsText(file);
  });
}

export async function resetDataAndLoadDefaults() {
  try {
    console.log('🔄 Resetando dados e carregando configurações padrão...');
    
    // Limpar localStorage
    localStorage.removeItem(UNIFIED_LS_KEY);
    localStorage.removeItem(LS_KEY);
    localStorage.removeItem(EXPENSES_LS_KEY);
    
    // Carregar configurações padrão
    const initializedData = await initializeNewUserConfig(UNIFIED_LS_KEY);
    
    if (initializedData) {
      const normalizedData = normalizeUnifiedStorage(initializedData);
      localStorage.setItem(UNIFIED_LS_KEY, JSON.stringify(normalizedData));
      console.log('✅ Dados resetados e configurações padrão carregadas');
      return normalizedData;
    }
    
    throw new Error('Falha ao carregar configurações padrão');
  } catch (error) {
    console.error('Erro ao resetar dados:', error);
    throw error;
  }
}
