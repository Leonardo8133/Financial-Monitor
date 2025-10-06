import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePDF } from "@react-pdf/renderer";
import { DocumentArrowDownIcon } from "../../components/icons.jsx";
import { useLocalStorageState } from "../../hooks/useLocalStorageState.js";
import { buildReportDataset } from "../../utils/reporting.js";
import { monthLabel, toNumber } from "../../utils/formatters.js";
import { EXPENSES_LS_KEY, EXPENSES_STORAGE_SEED, ensureExpensesDefaults } from "../config/storage.js";
import { computeDerivedExpenses, computeTotals } from "../utils/expenses.js";
import { createExpensesReportDocument } from "../../utils/pdf.jsx";

function sumExpensesMonthly(expenses = []) {
  return expenses.reduce(
    (acc, expense) => {
      acc.total += Math.abs(toNumber(expense.value));
      return acc;
    },
    { total: 0 }
  );
}

function buildBreakdown(expenses = [], key) {
  const map = new Map();
  expenses.forEach((expense) => {
    const label = expense[key] || (key === "category" ? "Sem categoria" : "Sem fonte");
    const current = map.get(label) || 0;
    map.set(label, current + Math.abs(toNumber(expense.value)));
  });
  return Array.from(map.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

export default function ExpensesReport() {
  const [generatedAt] = useState(() => new Date());
  const [storeState] = useLocalStorageState(EXPENSES_LS_KEY, EXPENSES_STORAGE_SEED);
  const store = ensureExpensesDefaults(storeState);
  const derivedExpenses = useMemo(() => computeDerivedExpenses(store.expenses || []), [store.expenses]);

  const report = useMemo(
    () =>
      buildReportDataset({
        items: derivedExpenses,
        personalInfo: store.personalInfo,
        notes: "",
        exportedAt: generatedAt,
        computeMonthlySummary: (items) => sumExpensesMonthly(items),
        computeTotals,
      }),
    [derivedExpenses, store.personalInfo, generatedAt]
  );

  const categoryBreakdown = useMemo(() => buildBreakdown(report.items, "category"), [report.items]);
  const sourceBreakdown = useMemo(() => buildBreakdown(report.items, "source"), [report.items]);

  const document = useMemo(
    () =>
      createExpensesReportDocument({
        exportedAt: report.exportedAt,
        personalInfo: report.personalInfo,
        totals: report.totals,
        monthlySummaries: report.monthlySummaries,
        notes: report.notes,
        expenses: report.items,
        categoryBreakdown,
        sourceBreakdown,
      }),
    [
      report.exportedAt,
      report.personalInfo,
      report.totals,
      report.monthlySummaries,
      report.notes,
      report.items,
      categoryBreakdown,
      sourceBreakdown,
    ]
  );

  const { url, loading, error, update } = usePDF({ document });
  const [pendingOpen, setPendingOpen] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);

  useEffect(() => {
    if (typeof update === "function") {
      update(document);
    }
  }, [document, update]);

  useEffect(() => {
    if (!pendingOpen || loading || !url) return;
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (opened) {
      opened.focus();
      setPopupBlocked(false);
      setPendingOpen(false);
    } else {
      setPopupBlocked(true);
      setPendingOpen(false);
    }
  }, [pendingOpen, loading, url]);

  useEffect(() => {
    if (error) {
      setPendingOpen(false);
    }
  }, [error]);

  const handleOpenPdf = () => {
    if (loading || !url) {
      setPendingOpen(true);
      return;
    }
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (opened) {
      opened.focus();
      setPopupBlocked(false);
      setPendingOpen(false);
    } else {
      setPopupBlocked(true);
    }
  };

  const hasPeriod = report.startYm && report.endYm;

  return (
    <div className="min-h-screen bg-slate-50 p-6 text-slate-800">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Relatório PDF de Gastos</h1>
            <p className="text-sm text-slate-600">
              Gere um documento consolidado das despesas registradas nos últimos 12 meses.
            </p>
            {hasPeriod ? (
              <p className="text-xs text-slate-500">
                Intervalo considerado: {monthLabel(report.startYm)} – {monthLabel(report.endYm)}
              </p>
            ) : (
              <p className="text-xs text-slate-500">Cadastre despesas com data para liberar o PDF.</p>
            )}
          </div>
          <Link
            to="/gastos"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            ← Voltar para gastos
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-600">
              O relatório abre em uma nova aba. Caso o navegador bloqueie pop-ups, libere a visualização para continuar.
            </p>
            <div>
              <button
                type="button"
                onClick={handleOpenPdf}
                disabled={loading || report.itemCount === 0}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <DocumentArrowDownIcon className="h-5 w-5" />
                {loading ? "Gerando..." : "Relatório PDF"}
              </button>
            </div>
            {popupBlocked && (
              <p className="text-sm text-amber-600">
                Não foi possível abrir a nova aba. Desative o bloqueio de pop-ups e tente novamente.
              </p>
            )}
            {error && <p className="text-sm text-red-600">Não foi possível gerar o PDF. Tente novamente em instantes.</p>}
            {report.itemCount === 0 && (
              <p className="text-sm text-slate-500">
                Nenhuma despesa com data registrada nos últimos 12 meses. Adicione novos lançamentos antes de gerar o PDF.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

