import { LS_KEY } from "./formatters.js";
import { EXPENSES_LS_KEY } from "../expenses/config/storage.js";
import { initializeNewUserConfig, loadDefaultConfigFromFile } from "./defaultConfigLoader.js";

// Chave unificada para dados combinados
export const UNIFIED_LS_KEY = "financial-monitor-unified-v1";

// Estrutura unificada dos dados
export const UNIFIED_STORAGE_SEED = {
  investimentos: {
    entries: [],
    banks: [],
    sources: [],
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
  },
  gastos: {
    expenses: [],
    categories: [],
    sources: [],
    personalInfo: {
      fullName: "",
      email: "",
    },
    settings: {
      defaultTab: "dashboard",
      defaultFocusArea: "gastos",
    },
    descriptionCategoryMappings: [],
    ignoredDescriptions: [],
    createdAt: new Date().toISOString(),
  },
  // Metadados do sistema unificado
  unifiedAt: new Date().toISOString(),
  version: "1.0.0",
};

// Função para migrar dados existentes para estrutura unificada
export async function migrateToUnifiedStorage() {
  try {
    // Verificar se já existe dados unificados
    const existingUnifiedRaw = localStorage.getItem(UNIFIED_LS_KEY);
    if (existingUnifiedRaw) {
      try {
        const parsed = JSON.parse(existingUnifiedRaw);
        const isValid = parsed && typeof parsed === 'object' && (parsed.investimentos || parsed.gastos);
        if (isValid) {
          return parsed;
        }
      } catch {
        // continua
      }
    }
    
    // Verificar se é usuário novo e inicializar com configurações padrão
    const initializedData = await initializeNewUserConfig(UNIFIED_LS_KEY);
    if (initializedData) {
      return initializedData;
    }
    
    // Se não é usuário novo, verificar se precisa carregar configurações padrão
    const currentData = localStorage.getItem(UNIFIED_LS_KEY);
    if (currentData) {
      try {
        const parsed = JSON.parse(currentData);
        const enhancedData = await ensureUnifiedDefaultsWithConfig(parsed);
        if (enhancedData !== parsed) {
          localStorage.setItem(UNIFIED_LS_KEY, JSON.stringify(enhancedData));
          return enhancedData;
        }
        return parsed;
      } catch {
        // continua para migração
      }
    }
    
    // Buscar dados existentes (migração de versões antigas)
    const investmentData = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    const expensesData = JSON.parse(localStorage.getItem(EXPENSES_LS_KEY) || '{}');
    
    // Criar estrutura unificada
    const unifiedData = {
      ...UNIFIED_STORAGE_SEED,
      investimentos: {
        entries: investmentData.entries || [],
        banks: investmentData.banks || [],
        sources: investmentData.sources || [],
        personalInfo: investmentData.personalInfo || UNIFIED_STORAGE_SEED.investimentos.personalInfo,
        settings: investmentData.settings || UNIFIED_STORAGE_SEED.investimentos.settings,
        createdAt: investmentData.createdAt || new Date().toISOString(),
      },
      gastos: {
        expenses: expensesData.expenses || [],
        categories: expensesData.categories || [],
        sources: expensesData.sources || [],
        personalInfo: expensesData.personalInfo || UNIFIED_STORAGE_SEED.gastos.personalInfo,
        settings: expensesData.settings || UNIFIED_STORAGE_SEED.gastos.settings,
        descriptionCategoryMappings: expensesData.descriptionCategoryMappings || [],
        ignoredDescriptions: expensesData.ignoredDescriptions || [],
        createdAt: expensesData.createdAt || new Date().toISOString(),
      },
      unifiedAt: new Date().toISOString(),
    };
    
    // Salvar dados unificados
    localStorage.setItem(UNIFIED_LS_KEY, JSON.stringify(unifiedData));
    
    console.log('✅ Dados migrados para estrutura unificada');
    return unifiedData;
  } catch (error) {
    console.error('Erro ao migrar para storage unificado:', error);
    return UNIFIED_STORAGE_SEED;
  }
}

// Função síncrona para garantir dados unificados (para componentes)
export function ensureUnifiedDefaults(store) {
  // Se store é null ou undefined, retornar seed padrão
  if (!store) {
    return UNIFIED_STORAGE_SEED;
  }
  
  return {
    ...UNIFIED_STORAGE_SEED,
    ...store,
    investimentos: {
      ...UNIFIED_STORAGE_SEED.investimentos,
      ...(store.investimentos || {}),
      banks: Array.isArray(store.investimentos?.banks) ? store.investimentos.banks : [],
      sources: Array.isArray(store.investimentos?.sources) ? store.investimentos.sources : [],
      entries: Array.isArray(store.investimentos?.entries) ? store.investimentos.entries : [],
      personalInfo: {
        ...UNIFIED_STORAGE_SEED.investimentos.personalInfo,
        ...(store.investimentos?.personalInfo || {}),
      },
      settings: {
        ...UNIFIED_STORAGE_SEED.investimentos.settings,
        ...(store.investimentos?.settings || {}),
      },
    },
    gastos: {
      ...UNIFIED_STORAGE_SEED.gastos,
      ...(store.gastos || {}),
      categories: Array.isArray(store.gastos?.categories) ? store.gastos.categories : [],
      sources: Array.isArray(store.gastos?.sources) ? store.gastos.sources : [],
      expenses: Array.isArray(store.gastos?.expenses) ? store.gastos.expenses : [],
      descriptionCategoryMappings: Array.isArray(store.gastos?.descriptionCategoryMappings) ? store.gastos.descriptionCategoryMappings : [],
      ignoredDescriptions: Array.isArray(store.gastos?.ignoredDescriptions) ? store.gastos.ignoredDescriptions : [],
      personalInfo: {
        ...UNIFIED_STORAGE_SEED.gastos.personalInfo,
        ...(store.gastos?.personalInfo || {}),
      },
      settings: {
        ...UNIFIED_STORAGE_SEED.gastos.settings,
        ...(store.gastos?.settings || {}),
      },
    },
  };
}

// Função assíncrona para carregar configurações padrão quando necessário
export async function ensureUnifiedDefaultsWithConfig(store) {
  // Se store é null ou undefined, inicializar com configurações padrão
  if (!store) {
    console.log('🔄 Store vazio, carregando configurações padrão...');
    return await initializeNewUserConfig(UNIFIED_LS_KEY) || UNIFIED_STORAGE_SEED;
  }
  
  // Verificar se precisa carregar configurações padrão (arrays vazios)
  const needsDefaultBanks = !store.investimentos?.banks || store.investimentos.banks.length === 0;
  const needsDefaultSources = !store.investimentos?.sources || store.investimentos.sources.length === 0;
  const needsDefaultCategories = !store.gastos?.categories || store.gastos.categories.length === 0;
  const needsDefaultExpenseSources = !store.gastos?.sources || store.gastos.sources.length === 0;
  const needsDefaultMappings = !store.gastos?.descriptionCategoryMappings || store.gastos.descriptionCategoryMappings.length === 0;
  const needsDefaultIgnored = !store.gastos?.ignoredDescriptions || store.gastos.ignoredDescriptions.length === 0;
  
  if (needsDefaultBanks || needsDefaultSources || needsDefaultCategories || needsDefaultExpenseSources || needsDefaultMappings || needsDefaultIgnored) {
    console.log('🔄 Dados incompletos detectados, carregando configurações padrão...');
    const defaultConfig = await loadDefaultConfigFromFile();
    
    return {
      ...UNIFIED_STORAGE_SEED,
      ...store,
      investimentos: {
        ...UNIFIED_STORAGE_SEED.investimentos,
        ...(store.investimentos || {}),
        banks: needsDefaultBanks ? defaultConfig.investimentos.banks : (store.investimentos?.banks || []),
        sources: needsDefaultSources ? defaultConfig.investimentos.sources : (store.investimentos?.sources || []),
        entries: Array.isArray(store.investimentos?.entries) ? store.investimentos.entries : [],
        personalInfo: {
          ...defaultConfig.investimentos.personalInfo,
          ...(store.investimentos?.personalInfo || {}),
        },
        settings: {
          ...defaultConfig.investimentos.settings,
          ...(store.investimentos?.settings || {}),
        },
      },
      gastos: {
        ...UNIFIED_STORAGE_SEED.gastos,
        ...(store.gastos || {}),
        categories: needsDefaultCategories ? defaultConfig.gastos.categories : (store.gastos?.categories || []),
        sources: needsDefaultExpenseSources ? defaultConfig.gastos.sources : (store.gastos?.sources || []),
        expenses: Array.isArray(store.gastos?.expenses) ? store.gastos.expenses : [],
        descriptionCategoryMappings: needsDefaultMappings ? defaultConfig.gastos.descriptionCategoryMappings : (store.gastos?.descriptionCategoryMappings || []),
        ignoredDescriptions: needsDefaultIgnored ? defaultConfig.gastos.ignoredDescriptions : (store.gastos?.ignoredDescriptions || []),
        personalInfo: {
          ...defaultConfig.gastos.personalInfo,
          ...(store.gastos?.personalInfo || {}),
        },
        settings: {
          ...defaultConfig.gastos.settings,
          ...(store.gastos?.settings || {}),
        },
      },
    };
  }
  
  return {
    ...UNIFIED_STORAGE_SEED,
    ...store,
    investimentos: {
      ...UNIFIED_STORAGE_SEED.investimentos,
      ...(store.investimentos || {}),
      banks: Array.isArray(store.investimentos?.banks) ? store.investimentos.banks : [],
      sources: Array.isArray(store.investimentos?.sources) ? store.investimentos.sources : [],
      entries: Array.isArray(store.investimentos?.entries) ? store.investimentos.entries : [],
      personalInfo: {
        ...UNIFIED_STORAGE_SEED.investimentos.personalInfo,
        ...(store.investimentos?.personalInfo || {}),
      },
      settings: {
        ...UNIFIED_STORAGE_SEED.investimentos.settings,
        ...(store.investimentos?.settings || {}),
      },
    },
    gastos: {
      ...UNIFIED_STORAGE_SEED.gastos,
      ...(store.gastos || {}),
      categories: Array.isArray(store.gastos?.categories) ? store.gastos.categories : [],
      sources: Array.isArray(store.gastos?.sources) ? store.gastos.sources : [],
      expenses: Array.isArray(store.gastos?.expenses) ? store.gastos.expenses : [],
      descriptionCategoryMappings: Array.isArray(store.gastos?.descriptionCategoryMappings) ? store.gastos.descriptionCategoryMappings : [],
      ignoredDescriptions: Array.isArray(store.gastos?.ignoredDescriptions) ? store.gastos.ignoredDescriptions : [],
      personalInfo: {
        ...UNIFIED_STORAGE_SEED.gastos.personalInfo,
        ...(store.gastos?.personalInfo || {}),
      },
      settings: {
        ...UNIFIED_STORAGE_SEED.gastos.settings,
        ...(store.gastos?.settings || {}),
      },
    },
  };
}

// Função para exportar dados unificados
export function exportUnifiedData() {
  try {
    const unifiedData = JSON.parse(localStorage.getItem(UNIFIED_LS_KEY) || '{}');
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

// Função para importar dados unificados
export function importUnifiedData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        // Validar estrutura
        if (!data.investimentos || !data.gastos) {
          throw new Error('Arquivo não contém estrutura unificada válida');
        }
        
        // Salvar dados unificados
        localStorage.setItem(UNIFIED_LS_KEY, JSON.stringify(data));
        
        resolve(data);
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

// Função para resetar dados e carregar configurações padrão
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
      console.log('✅ Dados resetados e configurações padrão carregadas');
      return initializedData;
    }
    
    throw new Error('Falha ao carregar configurações padrão');
  } catch (error) {
    console.error('Erro ao resetar dados:', error);
    throw error;
  }
}
