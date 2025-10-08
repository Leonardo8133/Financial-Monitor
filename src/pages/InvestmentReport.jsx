import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { usePDF, pdf as pdfRenderer } from "@react-pdf/renderer";
import { DocumentArrowDownIcon } from "../components/icons.jsx";
import { useLocalStorageState } from "../hooks/useLocalStorageState.js";
import { toNumber, monthLabel } from "../utils/formatters.js";
import { computeDerivedEntries, computeTotals } from "../utils/entries.js";
import { createInvestmentReportDocument } from "../utils/pdf.jsx";
import { buildReportDataset } from "../utils/reporting.js";
import { ensureUnifiedDefaults } from "../utils/unifiedStorage.js";

function sumInvestmentMonthly(items = []) {
  return items.reduce(
    (acc, item) => {
      acc.invested += toNumber(item.invested);
      acc.inAccount += toNumber(item.inAccount);
      acc.cashFlow += toNumber(item.cashFlow);
      if (item.yieldValue !== null && item.yieldValue !== undefined) {
        acc.yieldValue += toNumber(item.yieldValue);
      }
      return acc;
    },
    { invested: 0, inAccount: 0, cashFlow: 0, yieldValue: 0 }
  );
}

function buildSourceBreakdown(entries = [], monthlySummaries = []) {
  // Use only the last month's data
  const lastMonth = monthlySummaries.length > 0 ? monthlySummaries[0] : null;
  if (!lastMonth || !lastMonth.items) return [];
  
  const map = new Map();
  lastMonth.items.forEach((entry) => {
    const key = entry.source || "Sem fonte";
    const current = map.get(key) || { invested: 0, inAccount: 0 };
    current.invested += toNumber(entry.invested);
    current.inAccount += toNumber(entry.inAccount);
    map.set(key, current);
  });
  return Array.from(map.entries())
    .map(([name, values]) => ({ name, invested: values.invested, inAccount: values.inAccount }))
    .sort((a, b) => b.invested + b.inAccount - (a.invested + a.inAccount));
}

export default function InvestmentReport() {
  const [generatedAt] = useState(() => new Date());
  const [monthsWindow, setMonthsWindow] = useState(12);
  const [unifiedState] = useLocalStorageState("financial-monitor-unified-v1", {});
  const store = ensureUnifiedDefaults(unifiedState);
  const derivedEntries = useMemo(() => computeDerivedEntries(store.investimentos?.entries || []), [store.investimentos?.entries]);

  const report = useMemo(
    () =>
      buildReportDataset({
        items: derivedEntries,
        personalInfo: store.investimentos?.personalInfo || {},
        notes: store.investimentos?.settings?.reportNotes ?? "",
        exportedAt: generatedAt,
        computeMonthlySummary: sumInvestmentMonthly,
        computeTotals,
        monthsWindow,
      }),
    [derivedEntries, store.investimentos?.personalInfo, store.investimentos?.settings?.reportNotes, generatedAt, monthsWindow]
  );

  const sourceBreakdown = useMemo(() => buildSourceBreakdown(report.items, report.monthlySummaries), [report.items, report.monthlySummaries]);

  const document = useMemo(
    () =>
      createInvestmentReportDocument({
        exportedAt: report.exportedAt,
        personalInfo: report.personalInfo,
        totals: report.totals,
        monthlySummaries: report.monthlySummaries,
        notes: report.notes,
        entries: report.items,
        sourceBreakdown,
        monthsWindow,
      }),
    [report.exportedAt, report.personalInfo, report.totals, report.monthlySummaries, report.notes, report.items, sourceBreakdown, monthsWindow]
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
      } catch (_) {}
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
            <h1 className="text-2xl font-bold text-slate-900">Relatório PDF de Investimentos</h1>
            <p className="text-sm text-slate-600">
              Gere um documento com o resumo dos últimos 12 meses para compartilhar ou arquivar.
            </p>
            {hasPeriod ? (
              <p className="text-xs text-slate-500">
                Intervalo considerado: {monthLabel(report.startYm)} – {monthLabel(report.endYm)}
              </p>
            ) : (
              <p className="text-xs text-slate-500">Adicione lançamentos com data para gerar o PDF.</p>
            )}
          </div>
          <Link
            to="/investimentos"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
          >
            ← Voltar para investimentos
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4">
            <p className="text-sm text-slate-600">
              O relatório abre em uma nova aba. Caso o navegador bloqueie pop-ups, permita temporariamente para concluir o
              download.
            </p>
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-600">Período (meses):
                <select
                  value={monthsWindow}
                  onChange={(e) => setMonthsWindow(Math.max(1, Math.min(12, Number(e.target.value) || 12)))}
                  className="ml-2 rounded border border-slate-200 px-2 py-1 text-xs"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
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
                Não foi possível abrir a nova aba. Desbloqueie pop-ups para o Financial Monitor e tente novamente.
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
                Nenhum lançamento com data registrada nos últimos 12 meses. Atualize seus dados antes de gerar o PDF.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

