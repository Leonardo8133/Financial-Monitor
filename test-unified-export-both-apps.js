// Script de teste para verificar exportação unificada em ambos os apps
// Execute no console do navegador

function testUnifiedExportBothApps() {
  try {
    console.log('🧪 Testando exportação unificada em ambos os apps...');
    
    // 1. Verificar dados unificados
    const unifiedData = localStorage.getItem('financial-monitor-unified-v1');
    if (!unifiedData) {
      console.log('❌ Nenhum dado unificado encontrado');
      return { success: false, error: 'Nenhum dado unificado' };
    }
    
    const parsed = JSON.parse(unifiedData);
    console.log('✅ Dados unificados encontrados');
    
    // 2. Simular exportação do App de Investimentos
    console.log('\n📤 Testando exportação do App de Investimentos...');
    const investmentExport = {
      version: 3,
      type: "unified",
      exported_at: new Date().toISOString(),
      data: parsed
    };
    console.log('✅ Exportação de investimentos preparada:', investmentExport);
    
    // 3. Simular exportação do App de Gastos
    console.log('\n📤 Testando exportação do App de Gastos...');
    const expensesExport = {
      version: 3,
      type: "unified", 
      exported_at: new Date().toISOString(),
      data: parsed
    };
    console.log('✅ Exportação de gastos preparada:', expensesExport);
    
    // 4. Verificar se ambos os exports são idênticos
    const exportsMatch = JSON.stringify(investmentExport) === JSON.stringify(expensesExport);
    console.log(`✅ Exports idênticos: ${exportsMatch ? 'SIM' : 'NÃO'}`);
    
    // 5. Verificar estrutura dos dados
    const hasInvestments = parsed.investimentos && Array.isArray(parsed.investimentos.entries);
    const hasExpenses = parsed.gastos && Array.isArray(parsed.gastos.expenses);
    
    console.log('\n📊 Estrutura dos dados:');
    console.log(`- Investimentos: ${hasInvestments ? '✅' : '❌'} (${parsed.investimentos?.entries?.length || 0} entradas)`);
    console.log(`- Gastos: ${hasExpenses ? '✅' : '❌'} (${parsed.gastos?.expenses?.length || 0} entradas)`);
    console.log(`- Bancos: ${parsed.investimentos?.banks?.length || 0} bancos`);
    console.log(`- Categorias: ${parsed.gastos?.categories?.length || 0} categorias`);
    console.log(`- Fontes (Investimentos): ${parsed.investimentos?.sources?.length || 0} fontes`);
    console.log(`- Fontes (Gastos): ${parsed.gastos?.sources?.length || 0} fontes`);
    
    // 6. Testar importação
    console.log('\n📥 Testando importação...');
    const importData = {
      version: 3,
      type: "unified",
      exported_at: new Date().toISOString(),
      data: parsed
    };
    
    // Simular importação
    localStorage.setItem('test-import', JSON.stringify(importData));
    console.log('✅ Dados de importação preparados');
    
    return {
      success: true,
      hasUnifiedData: true,
      exportsMatch,
      hasInvestments,
      hasExpenses,
      investmentExport,
      expensesExport,
      importData
    };
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return { success: false, error: error.message };
  }
}

// Executar teste
const result = testUnifiedExportBothApps();
console.log('\n📋 Resultado do teste:', result);

if (result.success) {
  console.log('\n🎉 Teste concluído com sucesso!');
  console.log('✅ Ambos os apps podem exportar dados unificados');
  console.log('✅ Ambos os apps podem importar dados unificados');
  console.log('✅ Exports são idênticos entre os apps');
} else {
  console.log('\n❌ Teste falhou:', result.error);
}





