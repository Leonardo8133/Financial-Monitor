// Script de teste para verificar a unificação de dados
// Execute no console do navegador

function testUnifiedExport() {
  try {
    console.log('🧪 Testando sistema de dados unificados...');
    
    // 1. Verificar se existem dados unificados
    const unifiedData = localStorage.getItem('financial-monitor-unified-v1');
    if (unifiedData) {
      const parsed = JSON.parse(unifiedData);
      console.log('✅ Dados unificados encontrados:', parsed);
      
      // Verificar estrutura
      if (parsed.investimentos && parsed.gastos) {
        console.log('✅ Estrutura unificada válida');
        console.log(`📊 Investimentos: ${parsed.investimentos.entries?.length || 0} entradas`);
        console.log(`📊 Gastos: ${parsed.gastos.expenses?.length || 0} entradas`);
        console.log(`🏦 Bancos: ${parsed.investimentos.banks?.length || 0} bancos`);
        console.log(`📂 Categorias: ${parsed.gastos.categories?.length || 0} categorias`);
        console.log(`💰 Fontes (Investimentos): ${parsed.investimentos.sources?.length || 0} fontes`);
        console.log(`💰 Fontes (Gastos): ${parsed.gastos.sources?.length || 0} fontes`);
      } else {
        console.log('❌ Estrutura unificada inválida');
      }
    } else {
      console.log('⚠️ Nenhum dado unificado encontrado');
      
      // Verificar dados legados
      const investmentData = localStorage.getItem('financial-monitor-investments-v1');
      const expensesData = localStorage.getItem('financial-monitor-expenses-v1');
      
      if (investmentData || expensesData) {
        console.log('📋 Dados legados encontrados - migração necessária');
        console.log('💡 Execute a migração manualmente se necessário');
      } else {
        console.log('📋 Nenhum dado encontrado - sistema limpo');
      }
    }
    
    // 2. Testar exportação
    console.log('\n🔄 Testando exportação...');
    const exportData = {
      version: 3,
      type: "unified",
      exported_at: new Date().toISOString(),
      data: unifiedData ? JSON.parse(unifiedData) : null
    };
    
    console.log('📤 Dados de exportação preparados:', exportData);
    
    return {
      success: true,
      hasUnifiedData: !!unifiedData,
      exportData: exportData
    };
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return { success: false, error: error.message };
  }
}

// Executar teste
const result = testUnifiedExport();
console.log('\n📋 Resultado do teste:', result);




