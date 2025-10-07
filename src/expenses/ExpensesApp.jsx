import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ExpensesDashboard } from "./components/ExpensesDashboard.jsx";
import { ExpensesEntrada } from "./components/ExpensesEntrada.jsx";
import { ExpensesHistorico } from "./components/ExpensesHistorico.jsx";
import { FinancingCalculator } from "./components/FinancingCalculator.jsx";
import { ActionButton } from "../components/ActionButton.jsx";
import { BackToHomeButton } from "../components/BackToHomeButton.jsx";
import { Tabs } from "../components/Tab.jsx";
import { ImportModal } from "../components/ImportModal.jsx";
import { useLocalStorageState } from "../hooks/useLocalStorageState.js";
import { useOfflineMode } from "../hooks/useOfflineMode.js";
import { DEFAULT_CATEGORIES, ensureCategoryInLibrary } from "./config/categories.js";
import { DEFAULT_SOURCES, ensureSourceInLibrary } from "./config/sources.js";
import {
  DEFAULT_DESCRIPTION_CATEGORY_MAPPINGS,
  mergeDescriptionMappings,
  normalizeMappingKeyword,
} from "./config/descriptionMappings.js";
import { computeDerivedExpenses, computeTotals, withId, makeId } from "./utils/expenses.js";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  PlusIcon,
  TableCellsIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  SettingsIcon,
} from "../components/icons.jsx";
import { CalculatorIcon } from "@heroicons/react/24/outline";
import { download, fmtBRL, monthLabel, enumerateMonths, midOfMonth, yyyymm, toNumber } from "../utils/formatters.js";
import {
  EXPENSES_LS_KEY,
  EXPENSES_STORAGE_SEED,
  ensureExpensesDefaults,
} from "./config/storage.js";
import { UNIFIED_LS_KEY, ensureUnifiedDefaults, migrateToUnifiedStorage } from "../utils/unifiedStorage.js";

// merge artifact removed: duplicate icon import

// removed duplicated local storage constants to use values from config/storage

export default function ExpensesApp() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Migrar para dados unificados se necessário
  const [unifiedState, setUnifiedStore] = useLocalStorageState(UNIFIED_LS_KEY, null);
  const [legacyState, setLegacyStore] = useLocalStorageState(EXPENSES_LS_KEY, EXPENSES_STORAGE_SEED);
  
  // Se não há dados unificados, migrar dos dados legados
  const storeState = unifiedState || migrateToUnifiedStorage();
  const store = ensureUnifiedDefaults(storeState);
  
  // Extrair dados de gastos
  const expensesData = store.gastos;
  const expenses = expensesData.expenses;
  const categories = expensesData.categories;
  const sources = expensesData.sources;
  const createdAt = expensesData.createdAt;
  const personalInfo = expensesData.personalInfo;
  const settings = expensesData.settings;
  const descriptionCategoryMappings = expensesData.descriptionCategoryMappings || [];

  // Ativar modo offline
  useOfflineMode();

  const focusOptions = [
    {
      key: "investimentos",
      label: "Investimentos",
      tooltip: "Ir para o painel de investimentos",
    },
    {
      key: "gastos",
      label: "Gastos",
      tooltip: "Você está na área de gastos",
    },
  ];
  const focusArea = "gastos";

  // Determinar a aba ativa baseada na URL
  const getCurrentTab = () => {
    const path = location.pathname;
    if (path.includes('/gastos/configuracoes')) return 'configuracoes';
    if (path.includes('/gastos/financiamentos')) return 'financiamentos';
    if (path.includes('/gastos')) return 'dashboard';
    return 'dashboard';
  };

  const [tab, setTab] = useState(getCurrentTab());
  const [drafts, setDrafts] = useState(() => [createDraftExpense()]);
  const defaultsRef = useRef(settings.defaultTab);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [duplicateModal, setDuplicateModal] = useState(null);
  
  useEffect(() => {
    if (settings.defaultTab && defaultsRef.current !== settings.defaultTab) {
      defaultsRef.current = settings.defaultTab;
      setTab(settings.defaultTab);
    }
  }, [settings.defaultTab]);

  // Atualizar aba quando a URL mudar
  useEffect(() => {
    setTab(getCurrentTab());
  }, [location.pathname]);

  useEffect(() => {
    if (Array.isArray(storeState)) {
      const normalized = storeState.map(withId);
      setUnifiedStore((prev) => {
        const safePrev = ensureUnifiedDefaults(prev);
        return {
          ...safePrev,
          gastos: {
            ...safePrev.gastos,
            expenses: normalized,
            categories: mergeCategoriesFromExpenses(normalized, DEFAULT_CATEGORIES),
            sources: mergeSourcesFromExpenses(normalized, DEFAULT_SOURCES),
          },
        };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function normalizeExpense(expense) {
    if (!expense) return expense;
    const baseCategories = Array.isArray(expense.categories)
      ? expense.categories.filter(Boolean)
      : expense.category
      ? [expense.category].filter(Boolean)
      : [];
    const baseSources = Array.isArray(expense.sources)
      ? expense.sources.filter(Boolean)
      : expense.source
      ? [expense.source].filter(Boolean)
      : [];
    return {
      ...expense,
      categories: baseCategories,
      sources: baseSources.length ? baseSources : [],
      category: baseCategories[0] || "",
      source: baseSources[0] || "",
      locked: Boolean(expense.locked),
    };
  }

  function setExpenses(updater) {
    setUnifiedStore((prev) => {
      const safePrev = ensureUnifiedDefaults(prev);
      const currentExpenses = Array.isArray(safePrev.gastos.expenses) ? safePrev.gastos.expenses : [];
      const candidateExpenses = typeof updater === "function" ? updater(currentExpenses) : updater;
      const nextExpensesRaw = Array.isArray(candidateExpenses) ? candidateExpenses : [];
      const nextExpenses = nextExpensesRaw.map(normalizeExpense);
      const currentSources =
        Array.isArray(safePrev.gastos.sources) && safePrev.gastos.sources.length ? safePrev.gastos.sources : DEFAULT_SOURCES;
      const currentCategories =
        Array.isArray(safePrev.gastos.categories) && safePrev.gastos.categories.length ? safePrev.gastos.categories : DEFAULT_CATEGORIES;
      const mergedSources = mergeSourcesFromExpenses(nextExpenses, currentSources);
      const mergedCategories = mergeCategoriesFromExpenses(nextExpenses, currentCategories);
      return {
        ...safePrev,
        gastos: {
          ...safePrev.gastos,
          expenses: nextExpenses,
          sources: mergedSources,
          categories: mergedCategories,
        },
      };
    });
  }

  function setCreatedAt(value) {
    setUnifiedStore((prev) => {
      const safePrev = ensureUnifiedDefaults(prev);
      return {
        ...safePrev,
        gastos: {
          ...safePrev.gastos,
          createdAt: value,
        },
      };
    });
  }

  function createDraftExpense(overrides = {}) {
    const defaultSource = sources?.[0]?.name || "";
    const base = {
      id: makeId(),
      date: "",
      description: "",
      categories: [],
      sources: defaultSource ? [defaultSource] : [],
      category: "",
      source: defaultSource,
      value: 0,
      locked: false,
    };
    const next = { ...base, ...overrides };
    return normalizeExpense(next);
  }

  function mergeSourcesFromExpenses(expensesArr, baseSources = DEFAULT_SOURCES) {
    let next = Array.isArray(baseSources) ? [...baseSources] : [...DEFAULT_SOURCES];
    for (const e of expensesArr) {
      if (Array.isArray(e.sources)) {
        for (const src of e.sources) {
          next = ensureSourceInLibrary(src, next);
        }
      } else {
        next = ensureSourceInLibrary(e.source, next);
      }
    }
    return next;
  }

  function mergeCategoriesFromExpenses(expensesArr, baseCategories = DEFAULT_CATEGORIES) {
    let next = Array.isArray(baseCategories) ? [...baseCategories] : [...DEFAULT_CATEGORIES];
    for (const e of expensesArr) {
      if (Array.isArray(e.categories)) {
        for (const cat of e.categories) {
          next = ensureCategoryInLibrary(cat, next);
        }
      } else {
        next = ensureCategoryInLibrary(e.category, next);
      }
    }
    return next;
  }

  function findCategoriesForDescription(description = "") {
    const normalized = normalizeMappingKeyword(description);
    if (!normalized) return [];
    
    const matches = descriptionCategoryMappings.filter((entry) => {
      const keyword = normalizeMappingKeyword(entry.keyword);
      const exactMatch = entry.exactMatch !== undefined ? entry.exactMatch : false;
      
      if (exactMatch) {
        return normalized === keyword;
      } else {
        return normalized.includes(keyword);
      }
    });
    
    if (!matches.length) return [];
    const categoriesSet = new Set();
    for (const match of matches) {
      if (!Array.isArray(match.categories)) continue;
      for (const cat of match.categories) {
        if (cat) categoriesSet.add(cat);
      }
    }
    return Array.from(categoriesSet);
  }

  function upsertDescriptionMapping(keyword, categoriesList = []) {
    const normalizedKeyword = normalizeMappingKeyword(keyword);
    const filteredCategories = Array.isArray(categoriesList)
      ? categoriesList.filter(Boolean)
      : [];
    if (!normalizedKeyword || !filteredCategories.length) return;
    setUnifiedStore((prev) => {
      const safePrev = ensureUnifiedDefaults(prev);
      const merged = mergeDescriptionMappings(safePrev.gastos.descriptionCategoryMappings, [
        { keyword: normalizedKeyword, categories: filteredCategories },
      ]);
      return {
        ...safePrev,
        gastos: {
          ...safePrev.gastos,
          descriptionCategoryMappings: merged,
        },
      };
    });
  }

  const expensesWithIds = useMemo(
    () => expenses.map((e) => {
      const normalized = normalizeExpense(e);
      return normalized.id ? normalized : withId(normalized);
    }),
    [expenses]
  );

  const derived = useMemo(() => computeDerivedExpenses(expensesWithIds), [expensesWithIds]);

  const monthly = useMemo(() => {
    const byMonth = new Map();
    for (const e of derived) {
      const key = yyyymm(e.date);
      if (!key) continue;
      const base = byMonth.get(key) || { ym: key, total: 0, byCategory: {}, bySource: {}, items: [] };
      const value = Number(e.value) || 0;
      const absValue = Math.abs(value);
      base.total += absValue;
      base.items.push(e);
      
      // Só adiciona às categorias se for despesa (valor negativo)
      if (value < 0) {
        const categoriesList = Array.isArray(e.categories) && e.categories.length
          ? e.categories
          : e.category
          ? [e.category]
          : ["(sem categoria)"];
        for (const cat of categoriesList) {
          const keyName = cat || "(sem categoria)";
          base.byCategory[keyName] = (base.byCategory[keyName] || 0) + absValue;
        }
      }
      
      const sourcesList = Array.isArray(e.sources) && e.sources.length
        ? e.sources
        : e.source
        ? [e.source]
        : ["(sem fonte)"];
      for (const src of sourcesList) {
        const keyName = src || "(sem fonte)";
        base.bySource[keyName] = (base.bySource[keyName] || 0) + absValue;
      }
      byMonth.set(key, base);
    }
    return Array.from(byMonth.values()).sort((a, b) => (a.ym < b.ym ? -1 : 1));
  }, [derived]);

  const timeline = useMemo(() => {
    if (monthly.length === 0) return [];
    const months = enumerateMonths(monthly[0].ym, monthly[monthly.length - 1].ym);
    return months.map((ym) => {
      const data = monthly.find((m) => m.ym === ym) || { ym, total: 0 };
      const midDate = midOfMonth(ym);
      return { ...data, label: monthLabel(ym), midDate, midDateValue: midDate.getTime() };
    });
  }, [monthly]);

  const totals = useMemo(() => computeTotals(derived), [derived]);

  const handleTabChange = (newTab) => {
    setTab(newTab);
    if (newTab === 'configuracoes') {
      navigate('/gastos/configuracoes');
    } else if (newTab === 'financiamentos') {
      navigate('/gastos/financiamentos');
    } else {
      navigate('/gastos');
    }
  };

  const handleFocusChange = (newFocus) => {
    if (newFocus === 'investimentos') {
      navigate('/investimentos');
      return;
    }
    navigate('/gastos');
  };

  function exportJson() {
    // Exportar dados unificados
    const unifiedData = JSON.parse(localStorage.getItem(UNIFIED_LS_KEY) || '{}');
    const payload = {
      version: 3,
      type: "unified",
      exported_at: new Date().toISOString(),
      data: unifiedData,
    };
    const now = new Date();
    const timestamp = `${now.toISOString().slice(0, 10)}_${now.toTimeString().slice(0, 8).replace(/:/g, '-')}`;
    download(`export-financial-monitor-unified-${timestamp}.json`, JSON.stringify(payload, null, 2));
  }


  function validateExpensesPayload(data) {
    const errors = [];
    let items = [];
    let incomingCategories = null;
    let incomingSources = null;
    let created = null;

    if (Array.isArray(data)) {
      items = data;
    } else if (data && typeof data === "object") {
      incomingCategories = Array.isArray(data.categories) ? data.categories : null;
      incomingSources = Array.isArray(data.sources) ? data.sources : null;
      created = typeof data.created_at === "string" ? data.created_at : null;

      if (Array.isArray(data.inputs)) {
        items = data.inputs.flatMap((section) => Array.isArray(section.expenses) ? section.expenses : []);
        if (!items.length) errors.push("'inputs' não contém nenhuma lista 'expenses'.");
      } else if (Array.isArray(data.expenses)) {
        items = data.expenses;
      } else {
        errors.push("Estrutura inválida. Use { inputs: [{ expenses: [...] }] } ou { expenses: [...] }.");
      }
    } else {
      errors.push("JSON raiz deve ser um objeto ou um array.");
    }

    // Validar itens
    const itemErrors = [];
    items.forEach((e, idx) => {
      const where = `Item #${idx + 1}`;
      if (!e || typeof e !== "object") { itemErrors.push(`${where}: não é um objeto.`); return; }
      if (!e.date) itemErrors.push(`${where}: campo obrigatório ausente: 'date'.`);
      else if (isNaN(new Date(e.date))) itemErrors.push(`${where}: 'date' inválido (use AAAA-MM-DD).`);
      if (!e.description) itemErrors.push(`${where}: campo obrigatório ausente: 'description'.`);
      if (e.value === undefined || e.value === null || String(e.value).trim() === "") {
        itemErrors.push(`${where}: 'value' ausente (pode ser 0, positivo ou negativo).`);
      } else if (!Number.isFinite(Number(String(e.value).replace(/\./g, "").replace(/,/g, ".")))) {
        itemErrors.push(`${where}: 'value' inválido (use número, ex.: -123.45).`);
      }
    });
    errors.push(...itemErrors);

    return { errors, items, incomingCategories, incomingSources, created };
  }

  function importJsonFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        
        // Verificar se é um arquivo unificado
        if (data.type === "unified" && data.data) {
          // Importar dados unificados
          setUnifiedStore(data.data);
          setImportModalOpen(false);
          return;
        }
        
        if (data && Array.isArray(data.inputs)) {
          const inputExpenses = data.inputs.flatMap((section) => section.expenses || []);
          const normalized = inputExpenses.map(withId);
          const incomingCategories = Array.isArray(data.categories) && data.categories.length ? data.categories : categories;
          const incomingSources = Array.isArray(data.sources) && data.sources.length ? data.sources : sources;
          const created = data.created_at || createdAt || new Date().toISOString();
          setUnifiedStore((prev) => {
            const safePrev = ensureUnifiedDefaults(prev);
            const nextCategories = mergeCategoriesFromExpenses(normalized, incomingCategories);
            const nextSources = mergeSourcesFromExpenses(normalized, incomingSources);
            const nextPersonal = {
              ...safePrev.gastos.personalInfo,
              ...(data.personal_info || {}),
            };
            const nextSettings = {
              ...safePrev.gastos.settings,
              ...(data.settings || {}),
            };
            return {
              ...safePrev,
              gastos: {
                ...safePrev.gastos,
                expenses: normalized,
                categories: nextCategories,
                sources: nextSources,
                personalInfo: nextPersonal,
                settings: nextSettings,
                createdAt: created,
              },
            };
          });
        } else if (Array.isArray(data.expenses)) {
          const normalized = data.expenses.map(withId);
          setUnifiedStore((prev) => {
            const safePrev = ensureUnifiedDefaults(prev);
            return {
              ...safePrev,
              gastos: {
                ...safePrev.gastos,
                expenses: normalized,
                categories: mergeCategoriesFromExpenses(normalized, safePrev.gastos.categories),
                sources: mergeSourcesFromExpenses(normalized, safePrev.gastos.sources),
              },
            };
          });
        } else {
          window.alert("Arquivo inválido. Esperado JSON com a chave 'inputs' ou um array de transações.");
        }
      } catch (e) {
        window.alert("Falha ao ler JSON: " + e.message);
      }
    };
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const template = {
      version: 2,
      created_at: new Date().toISOString(),
      categories: [
        { name: "Alimentação", color: "", icon: "🍔" },
      ],
      sources: [
        { name: "Pessoal", color: "", icon: "💼" },
      ],
      personal_info: {
        fullName: "Nome do Usuário",
        email: "usuario@exemplo.com",
        householdSize: 1,
      },
      settings: {
        defaultTab: "dashboard",
        monthlyBudget: 0,
        currency: "BRL",
      },
      inputs: [
        {
          expenses: [
            {
              date: "2025-01-31",
              description: "Supermercado",
              category: "Alimentação",
              source: "Pessoal",
              value: -123.45,
            },
          ],
        },
      ],
    };
    download("template_gastos.json", JSON.stringify(template, null, 2));
  }

  function handleSubmitDrafts(rows) {
    const prepared = rows
      .filter((r) => r.date && r.description)
      .map((r) => {
        const normalized = normalizeExpense({
          ...r,
          id: makeId(),
          date: r.date,
          description: r.description.trim(),
          value: toNumber(r.value),
        });
        const categories = normalized.categories.length
          ? normalized.categories
          : findCategoriesForDescription(normalized.description);
        return {
          ...normalized,
          categories,
          category: categories[0] || "",
        };
      });
    if (!prepared.length) return;

    // Verificar duplicatas
    const duplicates = [];
    for (const newItem of prepared) {
      const existing = expenses.find(existing => 
        existing.date === newItem.date &&
        existing.description.toLowerCase() === newItem.description.toLowerCase() &&
        Math.abs((existing.value || 0) - (newItem.value || 0)) < 0.01 // tolerância para valores decimais
      );
      if (existing) {
        duplicates.push({
          new: newItem,
          existing: existing
        });
      }
    }

    // Se há duplicatas, mostrar modal de opções
    if (duplicates.length > 0) {
      setDuplicateModal({
        duplicates,
        onDeleteAndAdd: () => {
          // Deletar duplicatas existentes
          const duplicateIds = duplicates.map(dup => dup.existing.id);
          setExpenses(prev => prev.filter(expense => !duplicateIds.includes(expense.id)));
          setExpenses((prev) => [...prev, ...prepared]);
          setDrafts([createDraftExpense()]);
          setTab("historico");
          setDuplicateModal(null);
        },
        onAddAnyway: () => {
          // Adicionar mesmo com duplicatas
          setExpenses((prev) => [...prev, ...prepared]);
          setDrafts([createDraftExpense()]);
          setTab("historico");
          setDuplicateModal(null);
        },
        onCancel: () => {
          setDuplicateModal(null);
        }
      });
      return; // Não prosseguir com a adição normal
    }

    setExpenses((prev) => [...prev, ...prepared]);
    setDrafts([createDraftExpense()]);
    setTab("historico");
  }

  function DuplicateModal({ modal }) {
    if (!modal) return null;

    const { duplicates, onDeleteAndAdd, onAddAnyway, onCancel } = modal;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">
            Transações Duplicadas Encontradas
          </h3>
          
          <div className="mb-4">
            <p className="text-sm text-slate-600 mb-3">
              As seguintes transações já existem no histórico:
            </p>
            <div className="bg-slate-50 rounded-lg p-3 max-h-48 overflow-y-auto">
              <ul className="space-y-2 text-sm">
                {duplicates.map((dup, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className="text-slate-500">•</span>
                    <div className="flex-1">
                      <span className="font-medium">{dup.new.date}</span>
                      <span className="text-slate-600"> - {dup.new.description}</span>
                    </div>
                    <span className={`font-semibold ${dup.new.value < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {fmtBRL(dup.new.value)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={onDeleteAndAdd}
              className="w-full bg-red-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Deletar duplicatas e adicionar novas
            </button>
            
            <button
              onClick={onAddAnyway}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Adicionar mesmo com duplicatas
            </button>
            
            <button
              onClick={onCancel}
              className="w-full bg-slate-200 text-slate-700 py-2 px-4 rounded-lg font-medium hover:bg-slate-300 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 p-6 text-slate-800">
      <DuplicateModal modal={duplicateModal} />
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 space-y-4">
          <BackToHomeButton />
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">Controle de Gastos</h1>
                <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 text-[0.7rem] font-semibold text-slate-600 shadow-sm">
                  {focusOptions.map((option) => {
                    const active = option.key === focusArea;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => handleFocusChange(option.key)}
                        className={`rounded-full px-3 py-1 transition ${
                          active ? "bg-slate-900 text-white shadow" : "hover:bg-slate-100"
                        }`}
                        title={option.tooltip}
                        aria-pressed={active}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="text-sm text-slate-600">
                Suba arquivos (CSV/XLSX/PDF), categorize e acompanhe seus gastos por mês. Seus dados ficam no navegador.
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-end">
              <div className="flex flex-wrap items-center gap-2">
                <ActionButton icon={ArrowDownTrayIcon} onClick={exportJson} title="Baixe um arquivo JSON com os gastos registrados">
                  Exportar
                </ActionButton>
                <ActionButton
                  icon={ArrowUpTrayIcon}
                  onClick={() => setImportModalOpen(true)}
                  title="Importe um arquivo JSON previamente exportado"
                >
                  Importar
                </ActionButton>
                <Link
                  to="/gastos/relatorio"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                >
                  <DocumentArrowDownIcon className="h-5 w-5" />
                  Relatório PDF
                </Link>
                <Link
                  to="/gastos/configuracoes"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                >
                  <SettingsIcon className="h-5 w-5" />
                  Configurações
                </Link>
              </div>
            </div>
          </div>
          <Tabs
            tabs={[
              { key: 'dashboard', label: 'Dashboard', icon: <ChartBarIcon className="h-5 w-5" /> },
              { key: 'historico', label: 'Histórico', icon: <TableCellsIcon className="h-5 w-5" /> },
              { key: 'entrada', label: 'Nova Transação', icon: <PlusIcon className="h-5 w-5" /> },
              { key: 'financiamentos', label: 'Financiamentos', icon: <CalculatorIcon className="h-5 w-5" /> },
            ]}
            activeTab={tab}
            onChange={handleTabChange}
          />
        </header>

        {tab === 'dashboard' && <ExpensesDashboard monthly={timeline} totals={totals} categories={categories} sources={sources} />}
        {tab === 'historico' && (
          <ExpensesHistorico expenses={expensesWithIds} derived={derived} setExpenses={setExpenses} categories={categories} sources={sources} />
        )}
        {tab === 'entrada' && (
        <ExpensesEntrada
          drafts={drafts}
          setDrafts={setDrafts}
          onSubmit={handleSubmitDrafts}
          categories={categories}
          sources={sources}
          setStore={setUnifiedStore}
          suggestCategories={findCategoriesForDescription}
          onSaveDescriptionMapping={upsertDescriptionMapping}
          descriptionMappings={descriptionCategoryMappings}
          ignoredDescriptions={store.ignoredDescriptions || []}
        />
        )}
        {tab === 'financiamentos' && <FinancingCalculator />}

        <footer className="mt-10 text-center text-xs text-slate-500">
          <p>Seus gastos e bibliotecas de categorias/fontes são salvos no localStorage.</p>
        </footer>
      </div>
      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={importJsonFile}
        onDownloadTemplate={downloadTemplate}
      />
    </div>
  );
}
