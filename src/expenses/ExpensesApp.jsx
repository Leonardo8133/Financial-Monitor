import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExpensesDashboard } from "./components/ExpensesDashboard.jsx";
import { ExpensesEntrada } from "./components/ExpensesEntrada.jsx";
import { ExpensesHistorico } from "./components/ExpensesHistorico.jsx";
import { ActionButton } from "../components/ActionButton.jsx";
import { Tabs } from "../components/Tab.jsx";
import { ImportModal } from "../components/ImportModal.jsx";
import { useLocalStorageState } from "../hooks/useLocalStorageState.js";
import { DEFAULT_CATEGORIES, ensureCategoryInLibrary } from "./config/categories.js";
import { DEFAULT_SOURCES, ensureSourceInLibrary } from "./config/sources.js";
import { computeDerivedExpenses, computeTotals, withId, makeId } from "./utils/expenses.js";
import { download, fmtBRL, monthLabel, enumerateMonths, midOfMonth, yyyymm, toNumber } from "../utils/formatters.js";
import { ArrowDownTrayIcon, ArrowUpTrayIcon, DocumentIcon, PlusIcon, TableCellsIcon, ChartBarIcon, ArrowPathIcon } from "@heroicons/react/24/outline";

const EXPENSES_LS_KEY = "leo-expenses-v1";

const STORAGE_SEED = {
  expenses: [],
  categories: DEFAULT_CATEGORIES,
  sources: DEFAULT_SOURCES,
  createdAt: new Date().toISOString(),
};

export default function ExpensesApp() {
  const [store, setStore] = useLocalStorageState(EXPENSES_LS_KEY, STORAGE_SEED);
  const expenses = Array.isArray(store.expenses) ? store.expenses : [];
  const categories = Array.isArray(store.categories) && store.categories.length ? store.categories : DEFAULT_CATEGORIES;
  const sources = Array.isArray(store.sources) && store.sources.length ? store.sources : DEFAULT_SOURCES;
  const createdAt = store.createdAt ?? STORAGE_SEED.createdAt;

  const [tab, setTab] = useState("dashboard");
  const [drafts, setDrafts] = useState(() => [createDraftExpense()]);
  const [importModalOpen, setImportModalOpen] = useState(false);

  function setExpenses(updater) {
    setStore((prev) => {
      const currentExpenses = Array.isArray(prev.expenses) ? prev.expenses : [];
      const candidateExpenses = typeof updater === "function" ? updater(currentExpenses) : updater;
      const nextExpenses = Array.isArray(candidateExpenses) ? candidateExpenses : [];
      const currentSources = Array.isArray(prev.sources) && prev.sources.length ? prev.sources : DEFAULT_SOURCES;
      const currentCategories = Array.isArray(prev.categories) && prev.categories.length ? prev.categories : DEFAULT_CATEGORIES;
      const mergedSources = mergeSourcesFromExpenses(nextExpenses, currentSources);
      const mergedCategories = mergeCategoriesFromExpenses(nextExpenses, currentCategories);
      return { ...prev, expenses: nextExpenses, sources: mergedSources, categories: mergedCategories };
    });
  }

  function setCreatedAt(value) {
    setStore((prev) => ({ ...prev, createdAt: value }));
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
      version: 1,
      created_at: createdAt,
      exported_at: new Date().toISOString(),
      categories,
      sources,
      inputs: [
        {
          summary: totals,
          expenses: expensesWithIds.map(({ id, ...rest }) => rest),
        },
      ],
    };
    download(`gastos_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2));
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
        const { errors, items, incomingCategories, incomingSources, created } = validateExpensesPayload(data);
        if (errors.length) {
          window.alert(`Erros ao validar JSON:\n- ${errors.join("\n- ")}`);
          return;
        }
        const normalized = items.map((e) => withId({ ...e, value: Number(String(e.value).replace(/\./g, "").replace(/,/g, ".")) }));
        const cats = incomingCategories && incomingCategories.length ? incomingCategories : categories;
        const srcs = incomingSources && incomingSources.length ? incomingSources : sources;
        const createdAtValue = created || createdAt || new Date().toISOString();
        setStore({
          expenses: normalized,
          categories: mergeCategoriesFromExpenses(normalized, cats),
          sources: mergeSourcesFromExpenses(normalized, srcs),
          createdAt: createdAtValue,
        });
        setImportModalOpen(false);
      } catch (e) {
        window.alert("Falha ao ler JSON: " + e.message);
      }
    };
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const template = {
      version: 1,
      created_at: new Date().toISOString(),
      categories: [
        { name: "Alimentação", color: "", icon: "🍔" },
      ],
      sources: [
        { name: "Pessoal", color: "", icon: "💼" },
      ],
      inputs: [
        {
          summary: { total_spent: 123.45 },
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
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Controle de Gastos – Leo</h1>
            <p className="text-sm text-slate-600">Suba arquivos (CSV/XLSX/PDF), categorize e acompanhe seus gastos por mês. Seus dados ficam no navegador.</p>
          </div>
          <div className="flex items-center justify-end gap-4">
            <div className="flex items-center gap-2">
              <ActionButton icon={ArrowDownTrayIcon} onClick={exportJson}>Exportar</ActionButton>
              <ActionButton icon={ArrowUpTrayIcon} onClick={() => setImportModalOpen(true)}>Importar</ActionButton>
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
      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={importJsonFile}
        onDownloadTemplate={downloadTemplate}
      />
    </div>
  );
}
