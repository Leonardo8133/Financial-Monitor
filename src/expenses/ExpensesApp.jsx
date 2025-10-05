import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ExpensesDashboard } from "./components/ExpensesDashboard.jsx";
import { ExpensesEntrada } from "./components/ExpensesEntrada.jsx";
import { ExpensesHistorico } from "./components/ExpensesHistorico.jsx";
import { ActionButton } from "../components/ActionButton.jsx";
import { Tabs } from "../components/Tab.jsx";
import { useLocalStorageState } from "../hooks/useLocalStorageState.js";
import { DEFAULT_CATEGORIES, ensureCategoryInLibrary } from "./config/categories.js";
import { DEFAULT_SOURCES, ensureSourceInLibrary } from "./config/sources.js";
import { computeDerivedExpenses, computeTotals, withId, makeId } from "./utils/expenses.js";
import { download, fmtBRL, monthLabel, enumerateMonths, midOfMonth, yyyymm } from "../utils/formatters.js";
import { ArrowDownTrayIcon, ArrowUpTrayIcon, DocumentIcon, PlusIcon, TableCellsIcon, ChartBarIcon } from "@heroicons/react/24/outline";
import {
  EXPENSES_LS_KEY,
  EXPENSES_STORAGE_SEED,
  ensureExpensesDefaults,
} from "./config/storage.js";

export default function ExpensesApp() {
  const [storeState, setStore] = useLocalStorageState(EXPENSES_LS_KEY, EXPENSES_STORAGE_SEED);
  const store = ensureExpensesDefaults(storeState);
  const expenses = store.expenses;
  const categories = store.categories;
  const sources = store.sources;
  const createdAt = store.createdAt;
  const personalInfo = store.personalInfo;
  const settings = store.settings;

  const [tab, setTab] = useState(settings.defaultTab || "dashboard");
  const [drafts, setDrafts] = useState(() => [createDraftExpense()]);
  const fileRef = useRef(null);
  const defaultsRef = useRef(settings.defaultTab);

  useEffect(() => {
    if (settings.defaultTab && defaultsRef.current !== settings.defaultTab) {
      defaultsRef.current = settings.defaultTab;
      setTab(settings.defaultTab);
    }
  }, [settings.defaultTab]);

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
          summary: totals,
          expenses: expensesWithIds.map(({ id, ...rest }) => rest),
        },
      ],
    };
    download(`gastos_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2));
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

  function handleSubmitDrafts(rows) {
    const prepared = rows
      .filter((r) => r.date && r.description)
      .map((r) => ({
        id: makeId(),
        date: r.date,
        description: r.description.trim(),
        category: r.category.trim(),
        source: r.source.trim(),
        value: Number(r.value) || 0,
      }));
    if (!prepared.length) return;
    setExpenses((prev) => [...prev, ...prepared]);
    setDrafts([createDraftExpense()]);
    setTab("historico");
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 p-6 text-slate-800">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Controle de Gastos – Leo</h1>
            <p className="text-sm text-slate-600">Suba arquivos (CSV/XLSX/PDF), categorize e acompanhe seus gastos por mês. Seus dados ficam no navegador.</p>
          </div>
          <div className="flex items-center justify-end gap-4">
            <div className="flex items-center gap-2">
              <ActionButton icon={ArrowDownTrayIcon} onClick={exportJson}>Exportar</ActionButton>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:border-slate-300 hover:text-slate-900">
                <ArrowUpTrayIcon className="h-5 w-5" />
                Importar
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => e.target.files && e.target.files[0] && importJsonFile(e.target.files[0])}
                />
              </label>
              <Link
                to="/gastos/configuracoes"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
              >
                <span aria-hidden="true">⚙️</span>
                Configurações
              </Link>
              <Link to="/investimentos" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-50">Ir para Investimentos</Link>
            </div>
          </div>
          <Tabs
            tabs={[
              { key: 'dashboard', label: 'Dashboard', icon: <ChartBarIcon className="h-5 w-5" /> },
              { key: 'historico', label: 'Histórico', icon: <TableCellsIcon className="h-5 w-5" /> },
              { key: 'entrada', label: 'Nova Despesa', icon: <PlusIcon className="h-5 w-5" /> },
            ]}
            activeTab={tab}
            onChange={setTab}
          />
        </header>

        {tab === 'dashboard' && <ExpensesDashboard monthly={timeline} totals={totals} />}
        {tab === 'historico' && (
          <ExpensesHistorico expenses={expensesWithIds} derived={derived} setExpenses={setExpenses} categories={categories} sources={sources} />
        )}
        {tab === 'entrada' && (
          <ExpensesEntrada drafts={drafts} setDrafts={setDrafts} onSubmit={handleSubmitDrafts} categories={categories} sources={sources} setStore={setStore} />
        )}

        <footer className="mt-10 text-center text-xs text-slate-500">
          <p>Seus gastos e bibliotecas de categorias/fontes são salvos no localStorage.</p>
        </footer>
      </div>
    </div>
  );
}
