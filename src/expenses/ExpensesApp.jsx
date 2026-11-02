import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell, PageHeader } from "../components/AppShell.jsx";
import { ExpensesDashboard } from "./components/ExpensesDashboard.jsx";
import { ExpensesEntrada } from "./components/ExpensesEntrada.jsx";
import { ExpensesHistorico } from "./components/ExpensesHistorico.jsx";
import { ExpensesViews } from "./components/ExpensesViews.jsx";
import { FinancingCalculator } from "./components/FinancingCalculator.jsx";
import { ActionButton } from "../components/ActionButton.jsx";
import { Tabs } from "../components/Tab.jsx";
import { ImportModal } from "../components/ImportModal.jsx";
import { ConfirmDialog, Modal } from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";
import { useUnifiedStore } from "../store/unifiedStore.js";
import { useOfflineMode } from "../hooks/useOfflineMode.js";
import { ensureCategoryInLibrary } from "./config/categories.js";
import { ensureSourceInLibrary } from "./config/sources.js";
import { mergeDescriptionMappings, normalizeMappingKeyword } from "./config/descriptionMappings.js";
import { buildDescriptionMemory, buildMonthlyExpenses, computeDerivedExpenses, computeTotals, makeId } from "./utils/expenses.js";
import { normalizeExpense } from "../utils/unifiedStorage.js";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  CalculatorIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  PlusIcon,
  TableCellsIcon,
  FilterIcon,
} from "../components/icons.jsx";
import { download, enumerateMonths, fmtBRL, fmtDate, midOfMonth, monthLabel, toNumber, todayISO } from "../utils/formatters.js";
import { applyImport, buildExpensesTemplate, exportStoreJson } from "../utils/importExport.js";

const TABS = ["dashboard", "historico", "visoes", "entrada", "financiamentos"];

export default function ExpensesApp() {
  const navigate = useNavigate();
  const { tab: tabParam } = useParams();
  const { store, ready, setStore, updateExpenses } = useUnifiedStore();
  const { toast, showToast } = useToast();
  useOfflineMode();

  const expensesData = store.gastos;
  const { expenses, categories, sources, settings } = expensesData;
  const descriptionCategoryMappings = expensesData.descriptionCategoryMappings || [];
  const ignoredDescriptions = expensesData.ignoredDescriptions || [];

  const tab = TABS.includes(tabParam) ? tabParam : TABS.includes(settings.defaultTab) ? settings.defaultTab : "dashboard";
  const setTab = useCallback((next) => navigate(next === "dashboard" ? "/gastos" : `/gastos/${next}`), [navigate]);

  const lastUsedSource = useMemo(() => {
    const sorted = expenses.slice().sort((a, b) => ((a.date || "") < (b.date || "") ? 1 : -1));
    return sorted.find((e) => e.sources?.length)?.sources?.[0] || sources?.[0]?.name || "";
  }, [expenses, sources]);

  const createDraftExpense = useCallback(
    (overrides = {}) =>
      normalizeExpense({
        id: makeId(),
        date: todayISO(),
        description: "",
        categories: [],
        sources: lastUsedSource ? [lastUsedSource] : [],
        value: 0,
        isExpense: true,
        ...overrides,
      }),
    [lastUsedSource]
  );

  const [drafts, setDrafts] = useState(() => [createDraftExpense()]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [duplicateModal, setDuplicateModal] = useState(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const setExpenses = useCallback(
    (updater) => {
      updateExpenses((prev) => {
        const current = Array.isArray(prev.expenses) ? prev.expenses : [];
        const candidate = typeof updater === "function" ? updater(current) : updater;
        const next = (Array.isArray(candidate) ? candidate : []).map(normalizeExpense).filter(Boolean);
        return {
          ...prev,
          expenses: next,
          sources: mergeSourcesFromExpenses(next, prev.sources),
          categories: mergeCategoriesFromExpenses(next, prev.categories),
        };
      });
    },
    [updateExpenses]
  );

  const addCategory = useCallback(
    (name) => updateExpenses((prev) => ({ ...prev, categories: ensureCategoryInLibrary(name, prev.categories) })),
    [updateExpenses]
  );
  const addSource = useCallback(
    (name) => updateExpenses((prev) => ({ ...prev, sources: ensureSourceInLibrary(name, prev.sources) })),
    [updateExpenses]
  );

  const findCategoriesForDescription = useCallback(
    (description = "") => {
      const normalized = normalizeMappingKeyword(description);
      if (!normalized) return [];
      const matches = descriptionCategoryMappings.filter((entry) => {
        const keyword = normalizeMappingKeyword(entry.keyword);
        if (!keyword) return false;
        return entry.exactMatch ? normalized === keyword : normalized.includes(keyword);
      });
      const set = new Set();
      for (const match of matches) for (const cat of match.categories || []) if (cat) set.add(cat);
      return Array.from(set);
    },
    [descriptionCategoryMappings]
  );

  const upsertDescriptionMapping = useCallback(
    (keyword, categoriesList = [], exactMatch) => {
      const normalizedKeyword = normalizeMappingKeyword(keyword);
      const filtered = Array.isArray(categoriesList) ? categoriesList.filter(Boolean) : [];
      if (!normalizedKeyword || !filtered.length) return;
      updateExpenses((prev) => ({
        ...prev,
        descriptionCategoryMappings: mergeDescriptionMappings(prev.descriptionCategoryMappings, [
          { keyword: normalizedKeyword, categories: filtered, ...(exactMatch !== undefined ? { exactMatch } : {}) },
        ]),
      }));
    },
    [updateExpenses]
  );

  const mappingActions = useMemo(
    () => ({
      add: (keyword, cats, exactMatch) => upsertDescriptionMapping(keyword, cats, exactMatch),
      update: (originalKeyword, next) =>
        updateExpenses((prev) => ({
          ...prev,
          descriptionCategoryMappings: prev.descriptionCategoryMappings.map((m) =>
            m.keyword === originalKeyword
              ? { keyword: normalizeMappingKeyword(next.keyword), categories: next.categories.filter(Boolean), exactMatch: Boolean(next.exactMatch) }
              : m
          ),
        })),
      remove: (keyword) =>
        updateExpenses((prev) => ({
          ...prev,
          descriptionCategoryMappings: prev.descriptionCategoryMappings.filter((m) => m.keyword !== keyword),
        })),
    }),
    [updateExpenses, upsertDescriptionMapping]
  );

  const descriptionMemory = useMemo(() => buildDescriptionMemory(expenses), [expenses]);
  const derived = useMemo(() => computeDerivedExpenses(expenses), [expenses]);
  const monthly = useMemo(() => buildMonthlyExpenses(derived), [derived]);
  const timeline = useMemo(() => {
    if (monthly.length === 0) return [];
    const months = enumerateMonths(monthly[0].ym, monthly[monthly.length - 1].ym);
    return months.map((ym) => {
      const data = monthly.find((m) => m.ym === ym) || { ym, total: 0, spent: 0, earned: 0, byCategory: {}, bySource: {}, items: [] };
      const midDate = midOfMonth(ym);
      return { ...data, label: monthLabel(ym), midDate, midDateValue: midDate.getTime() };
    });
  }, [monthly]);
  const totals = useMemo(() => computeTotals(derived), [derived]);

  function exportJson() {
    exportStoreJson(store);
    showToast("Backup JSON exportado.", { tone: "success" });
  }

  function downloadTemplate() {
    download("template_gastos.json", JSON.stringify(buildExpensesTemplate(), null, 2));
  }

  function handleImport(analysis, mode) {
    const { store: nextStore, report } = applyImport(store, analysis, mode);
    setStore(nextStore);
    setImportModalOpen(false);
    showToast(
      mode === "replace"
        ? "Dados importados (substituição)."
        : `Importação concluída: ${report.expensesAdded} transação(ões) e ${report.entriesAdded} lançamento(s) novos.`,
      { tone: "success" }
    );
  }

  function finishSubmit(prepared) {
    setExpenses((prev) => [...prev, ...prepared]);
    setDrafts([createDraftExpense({ date: prepared.at(-1)?.date || todayISO() })]);
    setDuplicateModal(null);
    showToast(`${prepared.length} transação(ões) salva(s).`, { tone: "success" });
    setTab("historico");
  }

  function handleSubmitDrafts(rows) {
    const prepared = rows
      .filter((r) => r.date && r.description && r.description.trim())
      .map((r) => {
        const normalized = normalizeExpense({ ...r, id: makeId(), description: r.description.trim(), value: toNumber(r.value) });
        const cats = normalized.categories.length ? normalized.categories : findCategoriesForDescription(normalized.description);
        return { ...normalized, categories: cats, category: cats[0] || "" };
      });
    if (!prepared.length) {
      showToast("Preencha data, descrição e valor em pelo menos uma linha.", { tone: "error" });
      return;
    }

    const duplicates = [];
    for (const newItem of prepared) {
      const existing = expenses.find(
        (e) =>
          (newItem.externalId && e.externalId === newItem.externalId) ||
          e.date === newItem.date &&
          (e.description || "").toLowerCase() === newItem.description.toLowerCase() &&
          Math.abs((e.value || 0) - (newItem.value || 0)) < 0.01
      );
      if (existing) duplicates.push({ new: newItem, existing });
    }

    if (duplicates.length > 0) {
      setDuplicateModal({
        duplicates,
        onDeleteAndAdd: () => {
          const ids = new Set(duplicates.map((d) => d.existing.id));
          setExpenses((prev) => prev.filter((e) => !ids.has(e.id)));
          finishSubmit(prepared);
        },
        onSkipDuplicates: () => {
          const dupNew = new Set(duplicates.map((d) => d.new));
          const rest = prepared.filter((p) => !dupNew.has(p));
          if (!rest.length) {
            setDuplicateModal(null);
            showToast("Nada novo para adicionar.");
            return;
          }
          finishSubmit(rest);
        },
        onAddAnyway: () => finishSubmit(prepared),
      });
      return;
    }
    finishSubmit(prepared);
  }

  function clearExpenses() {
    updateExpenses((prev) => ({ ...prev, expenses: [] }));
    showToast("Transações removidas.");
  }

  const historyProps = {
    expenses,
    derived,
    setExpenses,
    categories,
    sources,
    onClearAll: () => setConfirmClear(true),
    onCreateCategory: addCategory,
    onCreateSource: addSource,
    onGoToEntry: () => setTab("entrada"),
    onSaveDescriptionMapping: upsertDescriptionMapping,
  };

  const monthExpenseCount = useMemo(() => {
    const ym = todayISO().slice(0, 7);
    return expenses.filter((e) => (e.date || "").startsWith(ym)).length;
  }, [expenses]);

  return (
    <AppShell>
      {toast}
      <PageHeader title="Gastos" description="Importe extratos e faturas (CSV, XLSX ou PDF), categorize e acompanhe seus gastos por mês.">
        <ActionButton icon={ArrowDownTrayIcon} onClick={exportJson} title="Baixa um backup JSON com todos os dados">
          Exportar
        </ActionButton>
        <ActionButton icon={ArrowUpTrayIcon} onClick={() => setImportModalOpen(true)} title="Importa um backup JSON ou template">
          Importar
        </ActionButton>
        <Link to="/gastos/relatorio" className="btn" title="Resumo imprimível e PDF">
          <DocumentArrowDownIcon className="h-4 w-4" />
          Relatório
        </Link>
      </PageHeader>

      <Tabs
        className="mb-4"
        tabs={[
          { key: "dashboard", label: "Dashboard", icon: <ChartBarIcon className="h-4 w-4" /> },
          { key: "historico", label: "Histórico", icon: <TableCellsIcon className="h-4 w-4" />, badge: expenses.length },
          { key: "visoes", label: "Visões", icon: <FilterIcon className="h-4 w-4" />, tooltip: "Histórico com filtros salvos" },
          { key: "entrada", label: "Nova Transação", icon: <PlusIcon className="h-4 w-4" /> },
          { key: "financiamentos", label: "Financiamentos", icon: <CalculatorIcon className="h-4 w-4" /> },
        ]}
        activeTab={tab}
        onChange={setTab}
      />

      {tab === "dashboard" && (
        <ExpensesDashboard key={ready ? "ready" : "loading"} monthly={timeline} totals={totals} categories={categories} sources={sources} budget={settings.monthlyBudget || 0} />
      )}
      {tab === "historico" && (
        <ExpensesHistorico
          {...historyProps}
          onSaveView={({ name, filters }) => {
            const existing = (expensesData.views || []).find((v) => v.name.toLowerCase() === name.toLowerCase());
            updateExpenses((prev) => ({
              ...prev,
              views: existing
                ? prev.views.map((v) => (v.id === existing.id ? { ...v, filters } : v))
                : [...(prev.views || []), { id: `view-${Date.now().toString(36)}`, name, icon: "", filters }],
            }));
            showToast(`Visão "${name}" salva. Veja na aba Visões.`, { tone: "success" });
          }}
        />
      )}
      {tab === "visoes" && (
        <ExpensesViews
          {...historyProps}
          views={expensesData.views || []}
          onChangeViews={(views) => updateExpenses((prev) => ({ ...prev, views }))}
        />
      )}
      {tab === "entrada" && (
        <ExpensesEntrada
          drafts={drafts}
          setDrafts={setDrafts}
          createDraft={createDraftExpense}
          onSubmit={handleSubmitDrafts}
          categories={categories}
          sources={sources}
          suggestCategories={findCategoriesForDescription}
          descriptionMemory={descriptionMemory}
          onSaveDescriptionMapping={upsertDescriptionMapping}
          descriptionMappings={descriptionCategoryMappings}
          mappingActions={mappingActions}
          ignoredDescriptions={ignoredDescriptions}
          onCreateCategory={addCategory}
          onCreateSource={addSource}
          monthCount={monthExpenseCount}
          referenceRates={settings.fxRates || {}}
        />
      )}
      {tab === "financiamentos" && <FinancingCalculator />}

      {!ready && <p className="mt-6 text-center text-xs text-muted">Carregando dados...</p>}

      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onApply={handleImport}
        onDownloadTemplate={downloadTemplate}
        templateLabel="Template de gastos"
      />
      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={clearExpenses}
        title="Apagar todas as transações?"
        message="Categorias, fontes, mapeamentos e os dados de investimentos são mantidos. Exporte um backup antes."
        confirmLabel="Apagar transações"
        danger
      />
      <Modal
        open={Boolean(duplicateModal)}
        onClose={() => setDuplicateModal(null)}
        title="Transações duplicadas encontradas"
        description="Estas transações já existem no histórico (mesma data, descrição e valor)."
        footer={
          duplicateModal && (
            <>
              <button type="button" className="btn" onClick={() => setDuplicateModal(null)}>Cancelar</button>
              <button type="button" className="btn" onClick={duplicateModal.onSkipDuplicates}>Pular duplicadas</button>
              <button type="button" className="btn" onClick={duplicateModal.onAddAnyway}>Adicionar mesmo assim</button>
              <button type="button" className="btn-danger" onClick={duplicateModal.onDeleteAndAdd}>Substituir existentes</button>
            </>
          )
        }
      >
        {duplicateModal && (
          <ul className="max-h-56 space-y-1 overflow-auto rounded-lg bg-surface-2 p-2 text-sm">
            {duplicateModal.duplicates.map((dup, index) => (
              <li key={index} className="flex items-center justify-between gap-2">
                <span className="truncate">
                  <span className="num text-muted">{fmtDate(dup.new.date)}</span> · {dup.new.description}
                </span>
                <span className={`num font-semibold ${dup.new.value < 0 ? "text-neg" : "text-pos"}`}>{fmtBRL(dup.new.value)}</span>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </AppShell>
  );
}

function mergeSourcesFromExpenses(expensesArr, baseSources = []) {
  let next = Array.isArray(baseSources) ? [...baseSources] : [];
  for (const e of expensesArr) {
    for (const src of Array.isArray(e.sources) ? e.sources : [e.source]) next = ensureSourceInLibrary(src, next);
  }
  return next;
}

function mergeCategoriesFromExpenses(expensesArr, baseCategories = []) {
  let next = Array.isArray(baseCategories) ? [...baseCategories] : [];
  for (const e of expensesArr) {
    for (const cat of Array.isArray(e.categories) ? e.categories : [e.category]) next = ensureCategoryInLibrary(cat, next);
  }
  return next;
}
