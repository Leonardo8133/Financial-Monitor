# Graph Report - .  (2026-04-12)

## Corpus Check
- 75 files · ~76,585 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 239 nodes · 301 edges · 39 communities detected
- Extraction: 77% EXTRACTED · 22% INFERRED · 0% AMBIGUOUS · INFERRED: 67 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]

## God Nodes (most connected - your core abstractions)
1. `normalizeUnifiedStorage()` - 18 edges
2. `Investments Dashboard Screen` - 18 edges
3. `Controle de Gastos Screen` - 10 edges
4. `Nova Entrada Form (Add Investment Entry Form)` - 10 edges
5. `Nova Despesa Form (Add Expense Form)` - 9 edges
6. `App Entry Point (main.jsx)` - 8 edges
7. `isRecord()` - 8 edges
8. `Monitor de Investimentos Dashboard` - 8 edges
9. `ExpensesEntrada (Transaction Entry Form)` - 7 edges
10. `Sources Config (DEFAULT_SOURCES)` - 7 edges

## Surprising Connections (you probably didn't know these)
- `configuracoes-padrao.json default config file` --references--> `New User Initialization Pattern`  [INFERRED]
  docs/CONFIGURACOES.md → src/utils/defaultConfigLoader.js
- `Architecture Overview` --references--> `PDF Report Generation`  [INFERRED]
  docs/ARCHITECTURE_OVERVIEW.md → src/utils/pdf.jsx
- `Playwright E2E Config` --references--> `App Entry Point (main.jsx)`  [INFERRED]
  playwright.config.js → src/main.jsx
- `Tailwind CSS Config` --conceptually_related_to--> `App Entry Point (main.jsx)`  [INFERRED]
  tailwind.config.js → src/main.jsx
- `Default Config E2E Test` --references--> `configuracoes-padrao.json default config file`  [EXTRACTED]
  tests/e2e/default-config.spec.js → docs/CONFIGURACOES.md

## Hyperedges (group relationships)
- **Unified Data Schema (investimentos + gastos)** — scripts_consolemerge, scripts_mergedata, scripts_testunifiedexport, scripts_testunifiedexportbothapps, localstorage_unifiedkey, localstorage_mergedkey [EXTRACTED 0.95]
- **Test Infrastructure** — vitestconfig_config, viteconfig_config, setuptests_setup, components_kpicard_test [EXTRACTED 0.90]
- **Shared UI Component Library** — components_actionbutton, components_backtohomebutton, components_currencyinput, components_errorpage, components_homepage, components_icons, components_importmodal, components_kpicard, components_select, components_tab [EXTRACTED 0.95]
- **Top-Level React Router Routes** — main_entrypoint, components_homepage, components_errorpage, investments_app, expenses_app, investments_settings, expenses_settings, investments_report, expenses_report [EXTRACTED 1.00]
- **LocalStorage Data Keys** — localstorage_investmentskey, localstorage_expenseskey, localstorage_mergedkey, localstorage_unifiedkey [INFERRED 0.85]
- **Expenses Module Core (App + Config + Utils)** — expensesapp_expensesapp, categories_categories, sources_sources, descriptionmappings_descriptionmappings, storage_storage, expenses_utils_expenses [INFERRED 0.90]
- **File Import Pipeline (Uploader + CSV Templates + PDF Templates)** — uploader_uploader, importtemplates_importtemplates, pdftemplates_pdftemplates [EXTRACTED 1.00]
- **Expenses UI Tabs (Dashboard, HistÃ³rico, Entrada, Financiamentos)** — expensesapp_expensesapp, expensesdashboard_expensesdashboard, expenseshistorico_expenseshistorico, expensesentrada_expensesentrada, financingcalculator_financingcalculator [EXTRACTED 1.00]
- **Description-to-Category Auto-Mapping System** — descriptionmappings_descriptionmappings, expensesapp_expensesapp, expensesentrada_expensesentrada, expensessettings_expensessettings [INFERRED 0.85]
- **Expenses Test Suite** — expensesapp_test_expensesapptest, uploader_test_uploadertest, pdftemplates_test_pdftemplatestest [EXTRACTED 1.00]
- **Investment Data Flow via useLocalStorageState + UnifiedStorage** — investments_InvestmentsApp, hooks_useLocalStorageState, investments_config_investmentStorage, investments_pages_InvestmentSettings, investments_pages_InvestmentReport [INFERRED 0.90]
- **Bank and Source Visual Resolution Pattern** — investments_config_banks, investments_config_sources, investments_components_Dashboard, investments_components_Entrada, investments_components_Historico [EXTRACTED 1.00]
- **Entry Form and History View Interaction** — investments_components_Entrada, investments_components_Historico, investments_InvestmentsApp, hooks_useOpenDatePickerProps, investments_components_TableCells [EXTRACTED 1.00]
- **Offline Privacy Pattern (Network Blocking)** — hooks_useOfflineMode, investments_InvestmentsApp [EXTRACTED 1.00]
- **Unified Storage System** — unifiedstorage_migrateToUnifiedStorage, unifiedstorage_ensureUnifiedDefaults, unifiedstorage_ensureUnifiedDefaultsWithConfig, unifiedstorage_exportUnifiedData, unifiedstorage_importUnifiedData, unifiedstorage_resetDataAndLoadDefaults, defaultconfigloader_initializeNewUserConfig, concept_unified_storage [INFERRED 0.90]
- **Investment Entry Computation Pipeline** — entries_computeDerivedEntries, entries_computeTotals, formatters_toNumber, concept_investment_yield_derivation [INFERRED 0.88]
- **PDF Report Generation Pipeline** — reporting_buildReportDataset, pdf_createInvestmentReportDocument, pdf_createExpensesReportDocument, concept_report_dataset, concept_pdf_report [INFERRED 0.85]
- **Default Config Bootstrap for New Users** — defaultconfigloader_loadDefaultConfigFromFile, defaultconfigloader_isNewUser, defaultconfigloader_applyDefaultConfigForNewUser, defaultconfigloader_initializeNewUserConfig, concept_default_config_json, concept_new_user_init [INFERRED 0.90]
- **E2E Test Suite** — e2e_basictest, e2e_defaultconfig, e2e_expenses, e2e_investments [EXTRACTED 1.00]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.21
Nodes (23): createUnifiedDataFromLegacy(), ensureUnifiedDefaults(), ensureUnifiedDefaultsWithConfig(), exportUnifiedData(), hasItems(), hasMeaningfulLegacyData(), isRecord(), isUnifiedStorageCandidate() (+15 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (25): Adicionar Despesas (Add Expenses) Button, Categoria (Category) Dropdown Field, Controle de Gastos Page, Data (Date) Field, Descricao (Description) Field, Despesa ID Field, Top Action Buttons (Exportar, Importar, Relatorio PDF), Fonte (Source/Payment Method) Dropdown Field (+17 more)

### Community 2 - "Community 2"
Cohesion: 0.15
Nodes (20): Configuracoes Action Button, Exportar Action Button, Importar Action Button, Relatorio PDF Action Button, Fluxo por Fonte ao Longo do Tempo Chart, Rendimento Mensal por Fonte Chart, Empty State (No Data), Investments Dashboard Screen (+12 more)

### Community 3 - "Community 3"
Cohesion: 0.21
Nodes (18): Categories Config (DEFAULT_CATEGORIES), Description Mappings Config, Expenses Utilities (makeId, withId, computeDerivedExpenses, computeTotals), ExpensesApp(), ExpensesApp Test Suite, ExpensesDashboard Component, ExpensesEntrada (Transaction Entry Form), ExpensesHistorico (Transaction History) (+10 more)

### Community 4 - "Community 4"
Cohesion: 0.15
Nodes (16): PDF Report Generation, Report Dataset Builder, Unified Storage Architecture, Architecture Overview, Financial Monitor README, Expenses App Guide, Unified System Documentation, Expenses App E2E Tests (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.17
Nodes (16): ConfiguraÃ§Ãµes Button, Dashboard Tab, DistribuiÃ§Ã£o por Fonte de Investimento Chart, Empty State (No Data Loaded), Exportar Button, Fluxo por Fonte ao Longo do Tempo Chart, HistÃ³rico Tab, Importar Button (+8 more)

### Community 6 - "Community 6"
Cohesion: 0.16
Nodes (15): Configuracoes Button, Controle de Gastos Screen, Dashboard Tab, Distribuicao por Categoria Chart, Empty/Debug State (no chart data), Exportar Button, Financiamentos Tab, Gasto Total por Mes Chart (+7 more)

### Community 7 - "Community 7"
Cohesion: 0.29
Nodes (12): useLocalStorageState Hook, useOpenDatePickerProps Hook, Dashboard Component, Entrada Component, Field Component, Historico Component, TableCells (Th/Td) Components, Banks Config (DEFAULT_BANKS, resolveBankVisual, ensureBankInLibrary) (+4 more)

### Community 8 - "Community 8"
Cohesion: 0.2
Nodes (12): Controle de Gastos Screen, Expense Entry Row (Supermercado Extra, R$150.50), Expenses History View (After Add), Export / Import / Configuracoes Controls, Expense Filter Bar, Historico (History) Tab - Active, Export / Import / Relatorio PDF Controls (Investments), Historico Tab - Active (Investments) (+4 more)

### Community 9 - "Community 9"
Cohesion: 0.2
Nodes (10): ErrorPage Component, HomePage Component, ExpensesReport Page, ExpensesSettings Page, InvestmentReport Page, InvestmentSettings Page, App Entry Point (main.jsx), Playwright E2E Config (+2 more)

### Community 10 - "Community 10"
Cohesion: 0.25
Nodes (9): configuracoes-padrao.json default config file, New User Initialization Pattern, EMPTY_CONFIG fallback constant, applyDefaultConfigForNewUser, initializeNewUserConfig, isNewUser, loadDefaultConfigFromFile, Default Configurations Guide (+1 more)

### Community 11 - "Community 11"
Cohesion: 0.46
Nodes (8): LocalStorage Key: financial-monitor-expenses-v1, LocalStorage Key: financial-monitor-investments-v1, LocalStorage Key: financial-monitor-merged-v1, LocalStorage Key: financial-monitor-unified-v1, Console Merge Script, Merge Data Script, Test Unified Export Script, Test Unified Export Both Apps Script

### Community 12 - "Community 12"
Cohesion: 0.4
Nodes (6): KPICard Component, KPICard Unit Tests, Test Setup File, Formatters Utility (fmtBRL), Vite Build Config, Vitest Unit Test Config

### Community 13 - "Community 13"
Cohesion: 0.5
Nodes (2): InvestmentsApp(), resolveTone()

### Community 14 - "Community 14"
Cohesion: 0.6
Nodes (5): Transaction Entry Form (Lancamentos em preparacao), Investment Monitor Dashboard - Main View, LocalStorage Data Persistence Note, Navigation Buttons (Dashboard, Historico, Nova Entrada, Exportar, Importar, Template, Limpar), Financial Summary Cards (Total Invested, Last Month Invested, Last Month Return, Last Month Entries, Last Month Account Balance)

### Community 15 - "Community 15"
Cohesion: 0.5
Nodes (4): Investment Yield Derivation, computeDerivedEntries, computeTotals, toNumber

### Community 16 - "Community 16"
Cohesion: 0.67
Nodes (3): ActionButton Component, BackToHomeButton Component, Icons Library

### Community 17 - "Community 17"
Cohesion: 0.67
Nodes (0): 

### Community 18 - "Community 18"
Cohesion: 0.67
Nodes (3): createDraftEntry, makeId, withId

### Community 19 - "Community 19"
Cohesion: 0.67
Nodes (1): MockFileReader

### Community 20 - "Community 20"
Cohesion: 1.0
Nodes (2): Projecoes Component, Projecoes Tests

### Community 21 - "Community 21"
Cohesion: 1.0
Nodes (1): CurrencyInput Component

### Community 22 - "Community 22"
Cohesion: 1.0
Nodes (1): ImportModal Component

### Community 23 - "Community 23"
Cohesion: 1.0
Nodes (1): Select Component

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (1): Tabs Component

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (1): FinancingCalculator Component

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (1): useOfflineMode Hook

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (1): InvestmentsApp Tests

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (1): PersonalInfoModal Component

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (1): Investment Storage Config (INVESTMENT_STORAGE_SEED, ensureInvestmentDefaults)

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (1): fmtPct

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (1): midOfMonth

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (1): download

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (1): LS_KEY constant

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (1): Basic E2E Tests

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (1): E2E Tests README

## Ambiguous Edges - Review These
- `Merge Data Script` → `LocalStorage Key: financial-monitor-unified-v1`  [AMBIGUOUS]
  scripts/merge-data.js · relation: conceptually_related_to

## Knowledge Gaps
- **86 isolated node(s):** `Playwright E2E Config`, `PostCSS Config`, `ActionButton Component`, `BackToHomeButton Component`, `CurrencyInput Component` (+81 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 20`** (2 nodes): `Projecoes Component`, `Projecoes Tests`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 21`** (1 nodes): `CurrencyInput Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 22`** (1 nodes): `ImportModal Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 23`** (1 nodes): `Select Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (1 nodes): `Tabs Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (1 nodes): `FinancingCalculator Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (1 nodes): `useOfflineMode Hook`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (1 nodes): `useUnifiedAppBootstrap.test.jsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (1 nodes): `InvestmentsApp Tests`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (1 nodes): `PersonalInfoModal Component`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (1 nodes): `Investment Storage Config (INVESTMENT_STORAGE_SEED, ensureInvestmentDefaults)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (1 nodes): `entries.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (1 nodes): `fmtPct`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (1 nodes): `midOfMonth`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (1 nodes): `download`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (1 nodes): `LS_KEY constant`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (1 nodes): `formatters.test.js`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (1 nodes): `Basic E2E Tests`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (1 nodes): `E2E Tests README`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Merge Data Script` and `LocalStorage Key: financial-monitor-unified-v1`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What connects `Playwright E2E Config`, `PostCSS Config`, `ActionButton Component` to the rest of the system?**
  _86 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._