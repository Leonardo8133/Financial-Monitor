import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { usePDF, pdf as pdfRenderer } from "@react-pdf/renderer";
import { DocumentArrowDownIcon } from "../../components/icons.jsx";
import { Select } from "../../components/Select.jsx";
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
  const [monthsWindow, setMonthsWindow] = useState(12);
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
        monthsWindow,
      }),
    [derivedExpenses, store.personalInfo, generatedAt, monthsWindow]
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
        monthsWindow,
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
      monthsWindow,
    ]
  );

  const { url, loading, error, update } = usePDF({ document });
  const [pendingOpen, setPendingOpen] = useState(false);
  const [popupBlocked, setPopupBlocked] = useState(false);
  const openWindowRef = useRef(null);
  const timeoutRef = useRef(null);
  const [manualUrl, setManualUrl] = useState(null);
  const revokeRef = useRef(null);

  useEffect(() => {
    if (typeof update === "function") {
      update(document);
    }
    // Reset manual url when document changes
    if (revokeRef.current) {
      URL.revokeObjectURL(revokeRef.current);
      revokeRef.current = null;
    }
    setManualUrl(null);
  }, [document, update]);

  useEffect(() => {
    if (!pendingOpen || loading || !url) return;
    const pendingWin = openWindowRef.current;
    if (pendingWin && !pendingWin.closed) {
      try {
        pendingWin.location.href = url;
        pendingWin.focus();
        setPopupBlocked(false);
      } catch (_) {
        const opened = window.open(url, "_blank", "noopener,noreferrer");
        if (opened) {
          opened.focus();
          setPopupBlocked(false);
        } else {
          setPopupBlocked(true);
        }
      }
      openWindowRef.current = null;
      setPendingOpen(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }
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

  // If the hook URL is not ready, generate a fallback blob and navigate
  useEffect(() => {
    if (!pendingOpen || url || loading) return;
    let cancelled = false;
    (async () => {
      try {
        const blob = await pdfRenderer(document).toBlob();
        if (cancelled) return;
        const blobUrl = URL.createObjectURL(blob);
        revokeRef.current = blobUrl;
        setManualUrl(blobUrl);
        const pendingWin = openWindowRef.current;
        if (pendingWin && !pendingWin.closed) {
          try {
            pendingWin.location.href = blobUrl;
            pendingWin.focus();
            setPopupBlocked(false);
            openWindowRef.current = null;
            setPendingOpen(false);
          } catch (_) {}
        }
      } catch (_) {
        // ignore; error path handled by hook's error state
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pendingOpen, loading, url, document]);

  useEffect(() => {
    if (error) {
      setPendingOpen(false);
      if (openWindowRef.current && !openWindowRef.current.closed) {
        try {
          openWindowRef.current.document.title = "Falha ao gerar PDF";
          openWindowRef.current.document.body.innerHTML = "<p style=\"font:14px system-ui; color:#b91c1c; padding:16px\">Falha ao gerar PDF. Feche esta aba e tente novamente.</p>";
        } catch (_) {}
      }
      openWindowRef.current = null;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [error]);

  const handleOpenPdf = () => {
    if (typeof update === "function") {
      try { update(document); } catch (_) {}
    }
    if (!loading && url) {
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (opened) {
        opened.focus();
        setPopupBlocked(false);
        setPendingOpen(false);
      } else {
        setPopupBlocked(true);
      }
      return;
    }
    const opened = window.open("about:blank", "_blank");
    if (opened) {
      try {
        opened.document.title = "Gerando PDF...";
        opened.document.body.innerHTML = "<p style=\"font:14px system-ui; color:#334155; padding:16px\">Gerando PDF... aguarde.</p>";
      } catch (_) {}
      openWindowRef.current = opened;
      setPendingOpen(true);
      setPopupBlocked(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        if (openWindowRef.current && !url) {
          setPopupBlocked(true);
          try {
            openWindowRef.current.document.body.innerHTML = "<p style=\"font:14px system-ui; color:#b45309; padding:16px\">Demorando mais que o esperado. Volte e use o link manual para abrir o PDF quando estiver pronto.</p>";
          } catch (_) {}
        }
      }, 10000);
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
              Gere um documento consolidado das transações registradas nos últimos 12 meses.
            </p>
            {hasPeriod ? (
              <p className="text-xs text-slate-500">
                Intervalo considerado: {monthLabel(report.startYm)} – {monthLabel(report.endYm)}
              </p>
            ) : (
              <p className="text-xs text-slate-500">Cadastre transações com data para liberar o PDF.</p>
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
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-600">Período (meses):
                <Select
                  value={monthsWindow}
                  onChange={(e) => setMonthsWindow(Math.max(1, Math.min(12, Number(e.target.value) || 12)))}
                  options={Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1}` }))}
                  className="ml-2"
                  size="sm"
                />
              </label>
            </div>
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
                {(url || manualUrl) ? (
                  <>
                    {" "}Ou <a className="underline" href={url || manualUrl} target="_blank" rel="noopener noreferrer">clique aqui</a> para abrir manualmente.
                  </>
                ) : null}
              </p>
            )}
            {!popupBlocked && (url || manualUrl) && (
              <p className="text-xs text-slate-500">
                Se a nova aba não abrir automaticamente, <a className="underline" href={url || manualUrl} target="_blank" rel="noopener noreferrer">clique aqui</a>.
              </p>
            )}
            {error && <p className="text-sm text-red-600">Não foi possível gerar o PDF. Tente novamente em instantes.</p>}
            {report.itemCount === 0 && (
              <p className="text-sm text-slate-500">
                Nenhuma transação com data registrada nos últimos 12 meses. Adicione novos lançamentos antes de gerar o PDF.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

