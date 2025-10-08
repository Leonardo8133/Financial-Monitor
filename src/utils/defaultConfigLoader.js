// Estrutura mínima vazia como fallback
const EMPTY_CONFIG = {
  investimentos: {
    personalInfo: { fullName: "", email: "", document: "", phone: "" },
    settings: { defaultTab: "dashboard", defaultFocusArea: "investimentos", reportNotes: "" },
    banks: [],
    sources: []
  },
  gastos: {
    personalInfo: { fullName: "", email: "", householdSize: 1 },
    settings: { defaultTab: "dashboard", monthlyBudget: 0, currency: "BRL" },
    categories: [],
    sources: [],
    descriptionCategoryMappings: [],
    ignoredDescriptions: []
  }
};

/**
 * Carrega configurações padrão do arquivo JSON externo
 * @returns {Promise<Object>} Configurações padrão
 */
export async function loadDefaultConfigFromFile() {
  try {
    const response = await fetch('/configuracoes-padrao.json');
    if (response.ok) {
      const config = await response.json();
      console.log('✅ Configurações carregadas do arquivo configuracoes-padrao.json');
      return config;
    } else {
      console.warn('⚠️ Arquivo configuracoes-padrao.json não encontrado');
      return EMPTY_CONFIG;
    }
  } catch (error) {
    console.warn('⚠️ Erro ao carregar configuracoes-padrao.json:', error);
    return EMPTY_CONFIG;
  }
}

/**
 * Detecta se é um usuário novo (sem dados salvos)
 * @param {string} storageKey - Chave do localStorage
 * @returns {boolean} True se é usuário novo
 */
export function isNewUser(storageKey) {
  const existingData = localStorage.getItem(storageKey);
  if (!existingData) return true;
  
  try {
    const data = JSON.parse(existingData);
    // Verifica se tem dados significativos (não apenas arrays vazios)
    const hasInvestments = data.investimentos?.entries?.length > 0;
    const hasExpenses = data.gastos?.expenses?.length > 0;
    const hasBanks = data.investimentos?.banks?.length > 0;
    const hasCategories = data.gastos?.categories?.length > 0;
    const hasPersonalInfo = data.investimentos?.personalInfo?.fullName || data.gastos?.personalInfo?.fullName;
    
    return !(hasInvestments || hasExpenses || hasBanks || hasCategories || hasPersonalInfo);
  } catch {
    return true;
  }
}

/**
 * Aplica configurações padrão para usuário novo
 * @param {Object} defaultConfig - Configurações padrão
 * @param {Object} existingData - Dados existentes
 * @returns {Object} Dados com configurações aplicadas
 */
export function applyDefaultConfigForNewUser(defaultConfig, existingData = {}) {
  return {
    ...existingData,
    investimentos: {
      entries: existingData.investimentos?.entries || [],
      banks: existingData.investimentos?.banks?.length > 0 
        ? existingData.investimentos.banks 
        : defaultConfig.investimentos.banks,
      sources: existingData.investimentos?.sources?.length > 0 
        ? existingData.investimentos.sources 
        : defaultConfig.investimentos.sources,
      personalInfo: {
        ...defaultConfig.investimentos.personalInfo,
        ...(existingData.investimentos?.personalInfo || {})
      },
      settings: {
        ...defaultConfig.investimentos.settings,
        ...(existingData.investimentos?.settings || {})
      },
      createdAt: existingData.investimentos?.createdAt || new Date().toISOString(),
    },
    gastos: {
      expenses: existingData.gastos?.expenses || [],
      categories: existingData.gastos?.categories?.length > 0 
        ? existingData.gastos.categories 
        : defaultConfig.gastos.categories,
      sources: existingData.gastos?.sources?.length > 0 
        ? existingData.gastos.sources 
        : defaultConfig.gastos.sources,
      personalInfo: {
        ...defaultConfig.gastos.personalInfo,
        ...(existingData.gastos?.personalInfo || {})
      },
      settings: {
        ...defaultConfig.gastos.settings,
        ...(existingData.gastos?.settings || {})
      },
      descriptionCategoryMappings: existingData.gastos?.descriptionCategoryMappings || [],
      ignoredDescriptions: existingData.gastos?.ignoredDescriptions || [],
      createdAt: existingData.gastos?.createdAt || new Date().toISOString(),
    },
    unifiedAt: existingData.unifiedAt || new Date().toISOString(),
    version: existingData.version || "1.0.0",
  };
}

/**
 * Inicializa configurações para usuário novo
 * @param {string} storageKey - Chave do localStorage
 * @returns {Promise<Object>} Dados inicializados
 */
export async function initializeNewUserConfig(storageKey) {
  if (!isNewUser(storageKey)) {
    // Não é usuário novo, retorna dados existentes
    const existing = localStorage.getItem(storageKey);
    return existing ? JSON.parse(existing) : null;
  }
  
  console.log('🆕 Usuário novo detectado, carregando configurações do arquivo JSON...');
  
  // Carrega configurações do arquivo JSON
  const configFromFile = await loadDefaultConfigFromFile();
  
  // Aplica configurações para usuário novo
  const initializedData = applyDefaultConfigForNewUser(configFromFile);
  
  // Salva no localStorage
  localStorage.setItem(storageKey, JSON.stringify(initializedData));
  
  console.log('✅ Configurações do arquivo JSON aplicadas para usuário novo');
  return initializedData;
}
