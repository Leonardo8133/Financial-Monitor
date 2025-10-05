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
import { OfflineIndicator } from "../components/OfflineIndicator.jsx";
import { useLocalStorageState } from "../hooks/useLocalStorageState.js";
import { useOfflineMode } from "../hooks/useOfflineMode.js";
import { DEFAULT_CATEGORIES, ensureCategoryInLibrary } from "./config/categories.js";
import { DEFAULT_SOURCES, ensureSourceInLibrary } from "./config/sources.js";
import { computeDerivedExpenses, computeTotals, withId, makeId } from "./utils/expenses.js";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  PlusIcon,
  TableCellsIcon,
  ChartBarIcon,
  SettingsIcon,
} from "../components/icons.jsx";
import { CalculatorIcon } from "@heroicons/react/24/outline";
import { download, fmtBRL, monthLabel, enumerateMonths, midOfMonth, yyyymm, toNumber } from "../utils/formatters.js";
import {
  EXPENSES_LS_KEY,
  EXPENSES_STORAGE_SEED,
  ensureExpensesDefaults,
} from "./config/storage.js";

// merge artifact removed: duplicate icon import

// removed duplicated local storage constants to use values from config/storage

export default function ExpensesApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [storeState, setStore] = useLocalStorageState(EXPENSES_LS_KEY, EXPENSES_STORAGE_SEED);
  const store = ensureExpensesDefaults(storeState);
  const expenses = store.expenses;
  const categories = store.categories;
  const sources = store.sources;
  const createdAt = store.createdAt;
  const personalInfo = store.personalInfo;
  const settings = store.settings;

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
      setStore((prev) => {
        const safePrev = ensureExpensesDefaults(prev);
        return {
          ...safePrev,
          expenses: normalized,
          categories: mergeCategoriesFromExpenses(normalized, DEFAULT_CATEGORIES),
          sources: mergeSourcesFromExpenses(normalized, DEFAULT_SOURCES),
        };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setExpenses(updater) {
    setStore((prev) => {
      const safePrev = ensureExpensesDefaults(prev);
      const currentExpenses = Array.isArray(safePrev.expenses) ? safePrev.expenses : [];
      const candidateExpenses = typeof updater === "function" ? updater(currentExpenses) : updater;
      const nextExpenses = Array.isArray(candidateExpenses) ? candidateExpenses : [];
      const currentSources =
        Array.isArray(safePrev.sources) && safePrev.sources.length ? safePrev.sources : DEFAULT_SOURCES;
      const currentCategories =
        Array.isArray(safePrev.categories) && safePrev.categories.length ? safePrev.categories : DEFAULT_CATEGORIES;
      const mergedSources = mergeSourcesFromExpenses(nextExpenses, currentSources);
      const mergedCategories = mergeCategoriesFromExpenses(nextExpenses, currentCategories);
      return {
        ...safePrev,
        expenses: nextExpenses,
        sources: mergedSources,
        categories: mergedCategories,
      };
    });
  }

  function setCreatedAt(value) {
    setStore((prev) => {
      const safePrev = ensureExpensesDefaults(prev);
      return { ...safePrev, createdAt: value };
    });
  }

  function createDraftExpense(overrides = {}) {
    return { id: makeId(), date: "", description: "", category: "", source: "", value: 0, locked: false, ...overrides };
  }

  function mergeSourcesFromExpenses(expensesArr, baseSources = DEFAULT_SOURCES) {
    let next = Array.isArray(baseSources) ? [...baseSources] : [...DEFAULT_SOURCES];
    for (const e of expensesArr) {
      next = ensureSourceInLibrary(e.source, next);
    }
    return next;
  }

  function mergeCategoriesFromExpenses(expensesArr, baseCategories = DEFAULT_CATEGORIES) {
    let next = Array.isArray(baseCategories) ? [...baseCategories] : [...DEFAULT_CATEGORIES];
    for (const e of expensesArr) {
      next = ensureCategoryInLibrary(e.category, next);
    }
    return next;
  }

  const expensesWithIds = useMemo(
    () => expenses.map((e) => (e.id ? e : withId(e))),
    [expenses]
  );

  const derived = useMemo(() => computeDerivedExpenses(expensesWithIds), [expensesWithIds]);

  const monthly = useMemo(() => {
    const byMonth = new Map();
    for (const e of derived) {
      const key = yyyymm(e.date);
      if (!key) continue;
      const base = byMonth.get(key) || { ym: key, total: 0, byCategory: {}, bySource: {} };
      base.total += Math.abs(Number(e.value) || 0);
      const cat = e.category || "(sem categoria)";
      const src = e.source || "(sem fonte)";
      base.byCategory[cat] = (base.byCategory[cat] || 0) + Math.abs(Number(e.value) || 0);
      base.bySource[src] = (base.bySource[src] || 0) + Math.abs(Number(e.value) || 0);
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
    const payload = {
      version: 2,
      created_at: createdAt,
      exported_at: new Date().toISOString(),
      categories,
      sources,
      personal_info: personalInfo,
      settings,
      inputs: [
        {
          expenses: expensesWithIds.map(({ id, ...rest }) => rest),
        },
      ],
    };
    download(`export-gastos-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2));
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
        if (data && Array.isArray(data.inputs)) {
          const inputExpenses = data.inputs.flatMap((section) => section.expenses || []);
          const normalized = inputExpenses.map(withId);
          const incomingCategories = Array.isArray(data.categories) && data.categories.length ? data.categories : categories;
          const incomingSources = Array.isArray(data.sources) && data.sources.length ? data.sources : sources;
          const created = data.created_at || createdAt || new Date().toISOString();
          setStore((prev) => {
            const safePrev = ensureExpensesDefaults(prev);
            const nextCategories = mergeCategoriesFromExpenses(normalized, incomingCategories);
            const nextSources = mergeSourcesFromExpenses(normalized, incomingSources);
            const nextPersonal = {
              ...safePrev.personalInfo,
              ...(data.personal_info || {}),
            };
            const nextSettings = {
              ...safePrev.settings,
              ...(data.settings || {}),
            };
            return {
              ...safePrev,
              expenses: normalized,
              categories: nextCategories,
              sources: nextSources,
              personalInfo: nextPersonal,
              settings: nextSettings,
              createdAt: created,
            };
          });
        } else if (Array.isArray(data.expenses)) {
          const normalized = data.expenses.map(withId);
          setStore((prev) => {
            const safePrev = ensureExpensesDefaults(prev);
            return {
              ...safePrev,
              expenses: normalized,
              categories: mergeCategoriesFromExpenses(normalized, safePrev.categories),
              sources: mergeSourcesFromExpenses(normalized, safePrev.sources),
            };
          });
        } else {
          window.alert("Arquivo inválido. Esperado JSON com a chave 'inputs' ou um array de despesas.");
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
      .map((r) => ({
        id: makeId(),
        date: r.date,
        description: r.description.trim(),
        category: r.category.trim(),
        source: r.source.trim(),
        value: toNumber(r.value),
      }));
    if (!prepared.length) return;
    setExpenses((prev) => [...prev, ...prepared]);
    setDrafts([createDraftExpense()]);
    setTab("historico");
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 p-6 text-slate-800">
      <OfflineIndicator />
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
              { key: 'entrada', label: 'Nova Despesa', icon: <PlusIcon className="h-5 w-5" /> },
              { key: 'financiamentos', label: 'Financiamentos', icon: <CalculatorIcon className="h-5 w-5" /> },
            ]}
            activeTab={tab}
            onChange={handleTabChange}
          />
        </header>

        {tab === 'dashboard' && <ExpensesDashboard monthly={timeline} totals={totals} />}
        {tab === 'historico' && (
          <ExpensesHistorico expenses={expensesWithIds} derived={derived} setExpenses={setExpenses} categories={categories} sources={sources} />
        )}
        {tab === 'entrada' && (
          <ExpensesEntrada drafts={drafts} setDrafts={setDrafts} onSubmit={handleSubmitDrafts} categories={categories} sources={sources} setStore={setStore} />
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
