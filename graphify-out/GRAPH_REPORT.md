# Graph Report - Financial-Monitor  (2026-11-02)

## Corpus Check
- 115 files · ~91,411 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 10 file(s) not represented in the graph (top: .csv 6, (none) 3, .css 1)

## Summary
- 805 nodes · 2264 edges · 36 communities (24 shown, 12 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 80 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9ce21332`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Uploader
- Nova Entrada Form (Add Investment Entry Form)
- Investments Dashboard Screen
- ExpensesEntrada
- ExpensesApp.jsx
- Monitor de Investimentos Dashboard
- Controle de Gastos Screen
- Entrada Component
- Expenses History View (After Add)
- Financial Monitor — plano e histórico
- unifiedStorage.js
- Merge Data Script
- InvestmentsApp.jsx
- package.json
- Investment Monitor Dashboard - Main View
- icons.jsx
- ExpensesHistorico.jsx
- dependencies
- Projecoes Component
- fmtBRL
- devDependencies
- scripts
- @playwright/test
- setupTests.js
- Investment Storage Config (INVESTMENT_STORAGE_SEED, ensureInvestmentDefaults)
- console-merge.js
- merge-data.js
- test-unified-export.js
- SettingsPage.jsx
- test-unified-export-both-apps.js
- investmentStorage.js
- Basic E2E Tests
- E2E Tests README
- CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `ExpensesApp()` - 54 edges
2. `InvestmentsApp()` - 52 edges
3. `toNumber()` - 52 edges
4. `ExpensesHistorico()` - 48 edges
5. `fmtBRL()` - 45 edges
6. `ExpensesEntrada()` - 37 edges
7. `Uploader()` - 36 edges
8. `react` - 33 edges
9. `normalizeUnifiedStorage()` - 33 edges
10. `Entrada()` - 29 edges

## Surprising Connections (you probably didn't know these)
- `Feito (out/2026)` --references--> `ensureExpensesDefaults()`  [INFERRED]
  tasks/todo.md → src/expenses/config/storage.js
- `New User Initialization Pattern` --references--> `configuracoes-padrao.json default config file`  [INFERRED]
  src/utils/defaultConfigLoader.js → docs/CONFIGURACOES.md
- `PDF Report Generation` --references--> `Architecture Overview`  [INFERRED]
  src/utils/pdf.jsx → docs/ARCHITECTURE_OVERVIEW.md
- `initializeNewUserConfig()` --references--> `Default Config E2E Test`  [INFERRED]
  src/utils/defaultConfigLoader.js → tests/e2e/default-config.spec.js
- `createInvestmentReportDocument()` --references--> `Investments App E2E Tests`  [INFERRED]
  src/utils/pdf.jsx → tests/e2e/investments.spec.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Test Infrastructure** — vitestconfig_config, viteconfig_config, src_setuptests_setup, src_components_kpicard_test [EXTRACTED 0.90]
- **Shared UI Component Library** — src_components_actionbutton, src_components_backtohomebutton, src_components_currencyinput, src_components_errorpage, src_components_homepage, src_components_icons, src_components_importmodal, src_components_kpicard, src_components_select, src_components_tab [EXTRACTED 0.95]
- **Unified Data Schema (investimentos + gastos)** — scripts_consolemerge, scripts_mergedata, scripts_testunifiedexport, scripts_testunifiedexportbothapps, localstorage_unifiedkey, localstorage_mergedkey [EXTRACTED 0.95]
- **Bank and Source Visual Resolution Pattern** — investments_config_banks, investments_config_sources, investments_components_Dashboard, investments_components_Entrada, investments_components_Historico [EXTRACTED 1.00]
- **E2E Test Suite** — e2e_basictest, e2e_defaultconfig, e2e_expenses, e2e_investments [EXTRACTED 1.00]
- **Expenses Test Suite** — src_expenses_expensesapp_test_expensesapptest, src_expenses_components_uploader_test_uploadertest, src_expenses_utils_pdftemplates_test_pdftemplatestest [EXTRACTED 1.00]
- **File Import Pipeline (Uploader + CSV Templates + PDF Templates)** — src_expenses_components_uploader_uploader, src_expenses_utils_importtemplates_importtemplates, src_expenses_utils_pdftemplates_pdftemplates [EXTRACTED 1.00]
- **LocalStorage Data Keys** — localstorage_investmentskey, localstorage_expenseskey, localstorage_mergedkey, localstorage_unifiedkey [INFERRED 0.85]
- **PDF Report Generation Pipeline** — src_utils_reporting_buildreportdataset, src_utils_pdf_createinvestmentreportdocument, src_utils_pdf_createexpensesreportdocument, concept_report_dataset, concept_pdf_report [INFERRED 0.85]
- **Investment Entry Computation Pipeline** — src_utils_entries_computederivedentries, src_utils_entries_computetotals, src_utils_formatters_tonumber, concept_investment_yield_derivation [INFERRED 0.88]
- **Default Config Bootstrap for New Users** — src_utils_defaultconfigloader_loaddefaultconfigfromfile, src_utils_defaultconfigloader_isnewuser, src_utils_defaultconfigloader_applydefaultconfigfornewuser, src_utils_defaultconfigloader_initializenewuserconfig, concept_default_config_json, concept_new_user_init [INFERRED 0.90]

## Communities (36 total, 12 thin omitted)

### Community 0 - "Uploader"
Cohesion: 0.06
Nodes (56): papaparse, @testing-library/react, vitest, DEFAULT_MAPPING, inferHeaderRowIndex(), normalizeText(), parseList(), Uploader Test Suite (+48 more)

### Community 1 - "Nova Entrada Form (Add Investment Entry Form)"
Cohesion: 0.09
Nodes (25): Adicionar Despesas (Add Expenses) Button, Categoria (Category) Dropdown Field, Controle de Gastos Page, Data (Date) Field, Descricao (Description) Field, Despesa ID Field, Top Action Buttons (Exportar, Importar, Relatorio PDF), Fonte (Source/Payment Method) Dropdown Field (+17 more)

### Community 2 - "Investments Dashboard Screen"
Cohesion: 0.15
Nodes (20): Configuracoes Action Button, Exportar Action Button, Importar Action Button, Relatorio PDF Action Button, Fluxo por Fonte ao Longo do Tempo Chart, Rendimento Mensal por Fonte Chart, Empty State (No Data), Investments Dashboard Screen (+12 more)

### Community 3 - "ExpensesEntrada"
Cohesion: 0.13
Nodes (20): ExpensesEntrada(), addRow(), applyMemory(), handleBulkApplyMappings(), handleDescriptionBlur(), handleDescriptionChange(), handleKeyDown(), handleSubmit() (+12 more)

### Community 4 - "ExpensesApp.jsx"
Cohesion: 0.07
Nodes (54): PDF Report Generation, Report Dataset Builder, Unified Storage Architecture, Architecture Overview, Financial Monitor README, Expenses App Guide, Unified System Documentation, Expenses App E2E Tests (+46 more)

### Community 5 - "Monitor de Investimentos Dashboard"
Cohesion: 0.17
Nodes (16): ConfiguraÃ§Ãµes Button, Dashboard Tab, DistribuiÃ§Ã£o por Fonte de Investimento Chart, Empty State (No Data Loaded), Exportar Button, Fluxo por Fonte ao Longo do Tempo Chart, HistÃ³rico Tab, Importar Button (+8 more)

### Community 6 - "Controle de Gastos Screen"
Cohesion: 0.16
Nodes (15): Configuracoes Button, Controle de Gastos Screen, Dashboard Tab, Distribuicao por Categoria Chart, Empty/Debug State (no chart data), Exportar Button, Financiamentos Tab, Gasto Total por Mes Chart (+7 more)

### Community 7 - "Entrada Component"
Cohesion: 0.22
Nodes (9): Dashboard Component, Entrada Component, Field Component, Historico Component, TableCells (Th/Td) Components, Banks Config (DEFAULT_BANKS, resolveBankVisual, ensureBankInLibrary), Sources Config (DEFAULT_SOURCES, resolveSourceVisual, ensureSourceInLibrary), Demo Entries Data (+1 more)

### Community 8 - "Expenses History View (After Add)"
Cohesion: 0.20
Nodes (12): Controle de Gastos Screen, Expense Entry Row (Supermercado Extra, R$150.50), Expenses History View (After Add), Export / Import / Configuracoes Controls, Expense Filter Bar, Historico (History) Tab - Active, Export / Import / Relatorio PDF Controls (Investments), Historico Tab - Active (Investments) (+4 more)

### Community 9 - "Financial Monitor — plano e histórico"
Cohesion: 0.40
Nodes (4): ensureExpensesDefaults(), Feito (out/2026), Financial Monitor — plano e histórico, Pendente

### Community 10 - "unifiedStorage.js"
Cohesion: 0.05
Nodes (87): configuracoes-padrao.json default config file, New User Initialization Pattern, Default Configurations Guide, Default Config E2E Test, ArrowUpTrayIcon(), ImportModal(), handleFile(), EXPENSES_LS_KEY (+79 more)

### Community 11 - "Merge Data Script"
Cohesion: 0.46
Nodes (8): LocalStorage Key: financial-monitor-expenses-v1, LocalStorage Key: financial-monitor-investments-v1, LocalStorage Key: financial-monitor-merged-v1, LocalStorage Key: financial-monitor-unified-v1, Console Merge Script, Merge Data Script, Test Unified Export Script, Test Unified Export Both Apps Script

### Community 12 - "InvestmentsApp.jsx"
Cohesion: 0.08
Nodes (58): Investment Yield Derivation, PlusIcon(), resolveTone(), BankSelect(), bankKey(), Entrada(), addRow(), draftFromSnapshot() (+50 more)

### Community 13 - "package.json"
Cohesion: 0.11
Nodes (16): name, private, type, version, autoprefixer, @headlessui/react, @heroicons/react, html2pdf.js (+8 more)

### Community 14 - "Investment Monitor Dashboard - Main View"
Cohesion: 0.60
Nodes (5): Transaction Entry Form (Lancamentos em preparacao), Investment Monitor Dashboard - Main View, LocalStorage Data Persistence Note, Navigation Buttons (Dashboard, Historico, Nova Entrada, Exportar, Importar, Template, Limpar), Financial Summary Cards (Total Invested, Last Month Invested, Last Month Return, Last Month Entries, Last Month Account Balance)

### Community 16 - "icons.jsx"
Cohesion: 0.10
Nodes (37): ExpensesReport Page, InvestmentReport Page, Playwright E2E Config, PostCSS Config, AppShell(), THEME_CYCLE, ThemeToggle(), BackToHomeButton() (+29 more)

### Community 17 - "ExpensesHistorico.jsx"
Cohesion: 0.07
Nodes (47): react, TrashIcon(), ConfirmDialog(), Modal(), PIX_PATTERNS, ExpensesHistorico(), cancelEdit(), confirmSaveView() (+39 more)

### Community 19 - "dependencies"
Cohesion: 0.15
Nodes (13): dependencies, @headlessui/react, @heroicons/react, html2pdf.js, papaparse, pdfjs-dist, react, react-dom (+5 more)

### Community 21 - "fmtBRL"
Cohesion: 0.07
Nodes (59): recharts, EmptyState(), CurrencyInput(), commit(), handleBlur(), handleChange(), handleFocus(), handleKeyDown() (+51 more)

### Community 23 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, autoprefixer, jsdom, @playwright/test, postcss, tailwindcss, @testing-library/jest-dom, @testing-library/react (+3 more)

### Community 24 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, preview, test, test:e2e, test:e2e:headed, test:e2e:ui (+1 more)

### Community 28 - "setupTests.js"
Cohesion: 0.18
Nodes (3): @testing-library/jest-dom, createMemoryStorage(), ensureStorage()

### Community 31 - "console-merge.js"
Cohesion: 0.50
Nodes (3): expensesData, investmentData, mergedData

### Community 34 - "SettingsPage.jsx"
Cohesion: 0.07
Nodes (38): react-dom, @react-pdf/renderer, react-router-dom, ErrorPage(), Select(), useToast(), DEFAULT_DESCRIPTION_CATEGORY_MAPPINGS, mergeDescriptionMappings() (+30 more)

## Ambiguous Edges - Review These
- `Merge Data Script` → `LocalStorage Key: financial-monitor-unified-v1`  [AMBIGUOUS]
  scripts/merge-data.js · relation: conceptually_related_to

## Knowledge Gaps
- **150 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+145 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 220 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Merge Data Script` and `LocalStorage Key: financial-monitor-unified-v1`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `react` connect `ExpensesHistorico.jsx` to `Uploader`, `SettingsPage.jsx`, `ExpensesApp.jsx`, `Entrada Component`, `unifiedStorage.js`, `InvestmentsApp.jsx`, `package.json`, `icons.jsx`, `fmtBRL`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `ExpensesHistorico()` (e.g. with `Categories Config (DEFAULT_CATEGORIES)` and `Sources Config (DEFAULT_SOURCES)`) actually correct?**
  _`ExpensesHistorico()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _150 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Uploader` be split into smaller, more focused modules?**
  _Cohesion score 0.05741626794258373 - nodes in this community are weakly interconnected._
- **Why does `toNumber()` connect `ExpensesApp.jsx` to `Uploader`, `ExpensesEntrada`, `InvestmentsApp.jsx`, `ExpensesHistorico.jsx`, `fmtBRL`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Should `Nova Entrada Form (Add Investment Entry Form)` be split into smaller, more focused modules?**
  _Cohesion score 0.09333333333333334 - nodes in this community are weakly interconnected._