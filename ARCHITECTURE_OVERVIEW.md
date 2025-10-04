# Visão Geral de Arquitetura

Este repositório contém duas aplicações SPA (Vite + React + Tailwind) que compartilham componentes e utilitários.

- App de Investimentos (rotas `/` e `/investimentos`)
  - Arquivos principais: `src/App.jsx`, `src/components/*`, `src/utils/*`, `src/config/banks.js`
  - Persistência: `localStorage` com chave `leo-investments-v1`
  - Exporta/Importa JSON com lista de lançamentos e bancos

- App de Gastos (rota `/gastos`)
  - Arquivos principais: `src/expenses/ExpensesApp.jsx`, `src/expenses/components/*`, `src/expenses/utils/*`, `src/expenses/config/*`
  - Persistência: `localStorage` com chave `leo-expenses-v1`
  - Exporta/Importa JSON com lista de despesas, categorias e fontes

## Navegação
- Definida em `src/main.jsx` usando `react-router-dom`. Links cruzados:
  - Em `src/App.jsx` há um botão "Ir para Gastos".
  - Em `src/expenses/ExpensesApp.jsx` há um link "Ir para Investimentos".

## Upload e Mapeamento
- Componente `src/expenses/components/Uploader.jsx` aceita `.csv`, `.xlsx/.xlsm` e `.pdf`.
- Parsing:
  - CSV: `papaparse`
  - XLSX/XLSM: `xlsx`
  - PDF: `pdfjs-dist` (extração básica de texto)
- O usuário mapeia cabeçalhos para campos: `date`, `description`, `category`, `source`, `value`.

## Modelos e Regras
- Investimentos: entradas com `bank`, `date`, `inAccount`, `invested`, `cashFlow`, com derivação de `yieldValue`/`yieldPct`.
- Gastos: despesas com `date`, `description`, `category`, `source`, `value` (negativo para saída). Gráficos usam valor absoluto.
- Bibliotecas:
  - `src/config/banks.js` (Investimentos)
  - `src/expenses/config/categories.js` e `src/expenses/config/sources.js` (Gastos)
  - Ao salvar/importar, novas categorias/fontes são mescladas e persistidas, e incluídas no JSON exportado.

## Onde está cada coisa
- UI compartilhada: `src/components` (ex.: `ActionButton.jsx`, `Tab.jsx`, `Field.jsx`)
- Utilidades compartilhadas: `src/utils/formatters.js`
- Hooks: `src/hooks/useLocalStorageState.js`
- Testes existentes: `src/components/KPICard.test.jsx`, utilitários em `src/utils/*.test.js`

## Extensões futuras
- Adicionar filtros por categoria/fonte no dashboard de gastos
- Suporte a múltiplos perfis de dados (namespace no localStorage)
- Exportação CSV dos dados de gastos

## Contexto para outras IAs
- Esta visão geral resume a arquitetura e os pontos de integração; ler somente este arquivo e `README_EXPENSES.md` deve ser suficiente para compreender:
  - Como navegar entre apps
  - Como os dados são armazenados
  - Onde estão os pontos de importação/exportação
  - Onde editar as bibliotecas de categorias/fontes e bancos
