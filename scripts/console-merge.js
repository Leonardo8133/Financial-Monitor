// Cole este código no console do navegador para juntar seus dados

// 1. Buscar dados existentes
const investmentData = JSON.parse(localStorage.getItem('financial-monitor-investments-v1') || '{}');
const expensesData = JSON.parse(localStorage.getItem('financial-monitor-expenses-v1') || '{}');

// 2. Criar estrutura unificada
const mergedData = {
  investimentos: {
    entries: investmentData.entries || [],
    banks: investmentData.banks || [],
    sources: investmentData.sources || [],
    personalInfo: investmentData.personalInfo || {},
    settings: investmentData.settings || {},
    createdAt: investmentData.createdAt || new Date().toISOString()
  },
  gastos: {
    expenses: expensesData.expenses || [],
    categories: expensesData.categories || [],
    sources: expensesData.sources || [],
    personalInfo: expensesData.personalInfo || {},
    settings: expensesData.settings || {},
    descriptionCategoryMappings: expensesData.descriptionCategoryMappings || [],
    ignoredDescriptions: expensesData.ignoredDescriptions || [],
    createdAt: expensesData.createdAt || new Date().toISOString()
  },
  mergedAt: new Date().toISOString(),
  version: "1.0.0"
};

// 3. Salvar dados unificados
localStorage.setItem('financial-monitor-merged-v1', JSON.stringify(mergedData));

// 4. Mostrar estatísticas
console.log('✅ Dados unificados!');
console.log(`📊 Investimentos: ${mergedData.investimentos.entries.length} entradas`);
console.log(`📊 Gastos: ${mergedData.gastos.expenses.length} entradas`);
console.log('🔑 Chave: financial-monitor-merged-v1');

