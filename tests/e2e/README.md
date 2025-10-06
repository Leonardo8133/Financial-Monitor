# Testes End-to-End

Este diretório contém testes end-to-end usando Playwright para testar os fluxos completos das aplicações.

## Como executar

### Pré-requisitos
- Node.js instalado
- Dependências instaladas: `npm install`
- Playwright instalado: `npx playwright install`

### Comandos disponíveis

```bash
# Executar todos os testes E2E
npm run test:e2e

# Executar com interface visual (recomendado para desenvolvimento)
npm run test:e2e:ui

# Executar com browser visível (para debug)
npm run test:e2e:headed

# Executar apenas testes de investimentos
npx playwright test tests/e2e/investments.spec.js

# Executar apenas testes de gastos
npx playwright test tests/e2e/expenses.spec.js
```

## Testes incluídos

### Investments App (`investments.spec.js`)
- ✅ Inserção manual de novas entradas
- ✅ Carregamento de arquivos JSON (import/export)
- ✅ Geração de relatório PDF
- ✅ Navegação entre abas mantendo estado

### Expenses App (`expenses.spec.js`)
- ✅ Adição manual de gastos
- ✅ Mapeamento e importação de CSV
- ✅ Importação de PDFs com templates (Nubank, Itaú, Telecom)
- ✅ Mapeamento customizado de CSV
- ✅ Geração de relatório PDF
- ✅ Navegação entre abas mantendo estado

## Configuração

Os testes são configurados para:
- Usar localhost:5173 como base URL
- Iniciar automaticamente o servidor de desenvolvimento
- Usar Chromium como browser padrão
- Limpar localStorage antes de cada teste
- Gerar relatórios HTML dos resultados

## Arquivos temporários

Os testes criam arquivos temporários para simular uploads:
- `test-import.json` - para teste de importação de investimentos
- `test-expenses.csv` - para teste de CSV de gastos
- `test-nubank.pdf` - para teste de PDF template
- `test-custom-mapping.csv` - para teste de mapeamento customizado

Estes arquivos são automaticamente removidos após os testes.
