import { LS_KEY } from "./formatters.js";
import { EXPENSES_LS_KEY } from "../expenses/config/storage.js";
import { initializeNewUserConfig } from "./defaultConfigLoader.js";

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
    const existingUnified = localStorage.getItem(UNIFIED_LS_KEY);
    if (existingUnified) {
      return JSON.parse(existingUnified);
    }
    
    // Verificar se é usuário novo e inicializar com configurações padrão
    const initializedData = await initializeNewUserConfig(UNIFIED_LS_KEY);
    if (initializedData) {
      return initializedData;
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

// Função para garantir dados unificados
export function ensureUnifiedDefaults(store = {}) {
  return {
    ...UNIFIED_STORAGE_SEED,
    ...store,
    investimentos: {
      ...UNIFIED_STORAGE_SEED.investimentos,
      ...store.investimentos,
      // Permitir arrays vazios - não forçar restauração dos padrões
      banks: Array.isArray(store.investimentos?.banks) ? store.investimentos.banks : UNIFIED_STORAGE_SEED.investimentos.banks,
      sources: Array.isArray(store.investimentos?.sources) ? store.investimentos.sources : UNIFIED_STORAGE_SEED.investimentos.sources,
      entries: Array.isArray(store.investimentos?.entries) ? store.investimentos.entries : UNIFIED_STORAGE_SEED.investimentos.entries,
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
      ...store.gastos,
      // Permitir arrays vazios - não forçar restauração dos padrões
      categories: Array.isArray(store.gastos?.categories) ? store.gastos.categories : UNIFIED_STORAGE_SEED.gastos.categories,
      sources: Array.isArray(store.gastos?.sources) ? store.gastos.sources : UNIFIED_STORAGE_SEED.gastos.sources,
      expenses: Array.isArray(store.gastos?.expenses) ? store.gastos.expenses : UNIFIED_STORAGE_SEED.gastos.expenses,
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
