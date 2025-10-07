// Script para juntar dados de investimentos e gastos em um único arquivo
// Execute este script no console do navegador

function mergeInvestmentAndExpenseData() {
  try {
    // Chaves do localStorage
    const INVESTMENT_KEY = "financial-monitor-investments-v1";
    const EXPENSES_KEY = "financial-monitor-expenses-v1";
    const MERGED_KEY = "financial-monitor-merged-v1";
    
    // Buscar dados existentes
    const investmentData = JSON.parse(localStorage.getItem(INVESTMENT_KEY) || '{}');
    const expensesData = JSON.parse(localStorage.getItem(EXPENSES_KEY) || '{}');
    
    console.log('Dados de investimentos encontrados:', investmentData);
    console.log('Dados de gastos encontrados:', expensesData);
    
    // Criar estrutura unificada
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
      // Metadados do merge
      mergedAt: new Date().toISOString(),
      version: "1.0.0"
    };
    
    // Salvar dados unificados
    localStorage.setItem(MERGED_KEY, JSON.stringify(mergedData));
    
    console.log('✅ Dados unificados salvos com sucesso!');
    console.log('Estrutura criada:', mergedData);
    
    // Estatísticas
    const investmentEntries = mergedData.investimentos.entries.length;
    const expenseEntries = mergedData.gastos.expenses.length;
    
    console.log(`📊 Estatísticas do merge:`);
    console.log(`- Investimentos: ${investmentEntries} entradas`);
    console.log(`- Gastos: ${expenseEntries} entradas`);
    console.log(`- Total: ${investmentEntries + expenseEntries} entradas`);
    
    return mergedData;
    
  } catch (error) {
    console.error('❌ Erro ao fazer merge dos dados:', error);
    return null;
  }
}

// Executar o merge
const result = mergeInvestmentData();

if (result) {
  console.log('🎉 Merge concluído! Os dados estão disponíveis na chave "financial-monitor-merged-v1"');
} else {
  console.log('❌ Falha no merge. Verifique os dados no localStorage.');
}

