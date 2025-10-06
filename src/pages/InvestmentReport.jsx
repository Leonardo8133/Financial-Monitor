import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePDF } from "@react-pdf/renderer";
import { DocumentArrowDownIcon } from "../components/icons.jsx";
import { useLocalStorageState } from "../hooks/useLocalStorageState.js";
import { LS_KEY, toNumber, monthLabel } from "../utils/formatters.js";
import { computeDerivedEntries, computeTotals } from "../utils/entries.js";
import { createInvestmentReportDocument } from "../utils/pdf.jsx";
import { buildReportDataset } from "../utils/reporting.js";
import { INVESTMENT_STORAGE_SEED, ensureInvestmentDefaults } from "../config/investmentStorage.js";

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

function buildSourceBreakdown(entries = []) {
  const map = new Map();
  entries.forEach((entry) => {
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
  const [storeState] = useLocalStorageState(LS_KEY, INVESTMENT_STORAGE_SEED);
  const store = ensureInvestmentDefaults(storeState);
  const derivedEntries = useMemo(() => computeDerivedEntries(store.entries || []), [store.entries]);

  const report = useMemo(
    () =>
      buildReportDataset({
        items: derivedEntries,
        personalInfo: store.personalInfo,
        notes: store.settings?.reportNotes ?? "",
        exportedAt: generatedAt,
        computeMonthlySummary: sumInvestmentMonthly,
        computeTotals,
      }),
    [derivedEntries, store.personalInfo, store.settings?.reportNotes, generatedAt]
  );

  const sourceBreakdown = useMemo(() => buildSourceBreakdown(report.items), [report.items]);

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
      }),
    [report.exportedAt, report.personalInfo, report.totals, report.monthlySummaries, report.notes, report.items, sourceBreakdown]
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

