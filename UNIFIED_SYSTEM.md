# Sistema Unificado de Dados

## Visão Geral

O sistema agora utiliza um único arquivo JSON para armazenar dados de **Investimentos** e **Gastos**, permitindo exportação e importação unificada.

## Estrutura dos Dados

```json
{
  "investimentos": {
    "entries": [...],           // Entradas de investimentos
    "banks": [...],             // Bancos cadastrados
    "sources": [...],           // Fontes de renda
    "personalInfo": {...},      // Informações pessoais
    "settings": {...},          // Configurações
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "gastos": {
    "expenses": [...],          // Despesas
    "categories": [...],        // Categorias
    "sources": [...],          // Fontes de gastos
    "personalInfo": {...},     // Informações pessoais
    "settings": {...},         // Configurações
    "descriptionCategoryMappings": [...], // Mapeamentos automáticos
    "ignoredDescriptions": [...],         // Descrições ignoradas
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "unifiedAt": "2024-01-15T12:00:00.000Z",
  "version": "1.0.0"
}
```

## Funcionalidades

### ✅ Exportação Unificada
- **App de Investimentos**: botão "Exportar" salva dados unificados
- **App de Gastos**: botão "Exportar" salva dados unificados  
- **Arquivo único**: `export-financial-monitor-unified-YYYY-MM-DD.json`
- **Versão 3**: formato unificado com metadados
- **Consistência**: ambos os apps geram arquivos idênticos

### ✅ Importação Unificada
- **Detecção automática**: reconhece arquivos unificados
- **Migração automática**: converte dados legados se necessário
- **Compatibilidade**: suporta arquivos antigos e novos

### ✅ Migração Automática
- **Primeira execução**: migra dados existentes automaticamente
- **Dados preservados**: nenhuma informação é perdida
- **Transparente**: usuário não precisa fazer nada

## Como Usar

### Exportar Dados
**Opção 1 - App de Investimentos:**
1. Acesse a seção "Investimentos"
2. Clique em "Exportar" 
3. Arquivo unificado será baixado

**Opção 2 - App de Gastos:**
1. Acesse a seção "Gastos"
2. Clique em "Exportar"
3. Arquivo unificado será baixado

**Resultado:** Ambos geram o mesmo arquivo unificado!

### Importar Dados
**Opção 1 - App de Investimentos:**
1. Acesse a seção "Investimentos"
2. Clique em "Importar"
3. Selecione arquivo unificado
4. Dados serão carregados para ambos os sistemas

**Opção 2 - App de Gastos:**
1. Acesse a seção "Gastos"
2. Clique em "Importar"
3. Selecione arquivo unificado
4. Dados serão carregados para ambos os sistemas

**Resultado:** Importação funciona em qualquer app!

### Verificar Migração
Execute no console do navegador:
```javascript
// Verificar se dados unificados existem
const unified = localStorage.getItem('financial-monitor-unified-v1');
console.log('Dados unificados:', unified ? '✅ Encontrados' : '❌ Não encontrados');

// Verificar estrutura
if (unified) {
  const data = JSON.parse(unified);
  console.log('Investimentos:', data.investimentos?.entries?.length || 0, 'entradas');
  console.log('Gastos:', data.gastos?.expenses?.length || 0, 'entradas');
}
```

## Vantagens

- **Backup único**: um arquivo contém tudo
- **Sincronização**: dados sempre consistentes
- **Facilidade**: exportar/importar uma vez só
- **Flexibilidade**: pode deletar configurações padrão
- **Compatibilidade**: funciona com dados existentes

## Troubleshooting

### Dados não aparecem após importação
- Verifique se o arquivo é do tipo "unified" (versão 3)
- Execute migração manual se necessário

### Erro de migração
- Limpe localStorage e recomece
- Ou importe dados antigos manualmente

### Configurações padrão não podem ser deletadas
- Sistema atualizado: agora é possível deletar tudo
- Avisos visuais aparecem quando restar apenas 1 item
