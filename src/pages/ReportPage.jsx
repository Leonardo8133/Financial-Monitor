import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { pdf as pdfRenderer } from "@react-pdf/renderer";
import { AppShell, PageHeader } from "../components/AppShell.jsx";
import { Select } from "../components/Select.jsx";
import { useToast } from "../components/Toast.jsx";
import { DocumentArrowDownIcon } from "../components/icons.jsx";
import { fmtBRL, fmtDate, fmtPct, monthLabel, shiftMonth, timestampForFile, yyyymm } from "../utils/formatters.js";

const WINDOW_OPTIONS = [1, 2, 3, 6, 12, 24].map((n) => ({ value: n, label: n === 1 ? "Último mês" : `Últimos ${n} meses` }));

/**
 * Shared report page: on-screen summary + PDF download.
 * buildReport({ months, store }) -> { title, kpis, sections: [{title, columns, rows, align}], notes, personalInfo, period }
 * createDocument(report) -> react-pdf <Document>
 */
export function ReportPage({ title, backTo, backLabel, availableMonths, buildReport, createDocument }) {
  const [monthsWindow, setMonthsWindow] = useState(12);
  const [endYm, setEndYm] = useState("");
  const [busy, setBusy] = useState(false);
  const { toast, showToast } = useToast();

  const lastYm = availableMonths.at(-1) || "";
  const effectiveEnd = endYm || lastYm;
  const months = useMemo(() => {
    if (!effectiveEnd) return [];
    const out = [];
    for (let i = monthsWindow - 1; i >= 0; i -= 1) out.push(shiftMonth(effectiveEnd, -i));
    return out;
  }, [effectiveEnd, monthsWindow]);

  const report = useMemo(() => buildReport({ months, generatedAt: new Date() }), [buildReport, months]);
  const hasData = report.itemCount > 0;

  async function downloadPdf(openInTab = false) {
    setBusy(true);
    try {
      const blob = await pdfRenderer(createDocument(report)).toBlob();
      const url = URL.createObjectURL(blob);
      if (openInTab) {
        const win = window.open(url, "_blank", "noopener");
        if (!win) showToast("O navegador bloqueou a nova aba. Use o botão Baixar PDF.", { tone: "error" });
      } else {
        const a = document.createElement("a");
        a.href = url;
        a.download = `${report.fileName || "relatorio"}_${timestampForFile()}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        showToast("PDF gerado.", { tone: "success" });
      }
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      console.error(error);
      showToast("Não foi possível gerar o PDF.", { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell width="max-w-5xl">
      {toast}
      <PageHeader title={title} description={report.period ? `Período: ${monthLabel(report.period.start)} – ${monthLabel(report.period.end)}` : "Sem lançamentos com data."}>
        <Link to={backTo} className="btn">← {backLabel}</Link>
        <button type="button" className="btn" onClick={() => window.print()} disabled={!hasData}>Imprimir</button>
        <button type="button" className="btn" onClick={() => downloadPdf(true)} disabled={!hasData || busy}>Abrir PDF</button>
        <button type="button" className="btn-primary" onClick={() => downloadPdf(false)} disabled={!hasData || busy}>
          <DocumentArrowDownIcon className="h-4 w-4" />
          {busy ? "Gerando..." : "Baixar PDF"}
        </button>
      </PageHeader>

      <div className="no-print mb-4 flex flex-wrap items-end gap-3">
        <Select label="Janela" value={monthsWindow} options={WINDOW_OPTIONS} onChange={(e) => setMonthsWindow(Number(e.target.value))} className="w-48" />
        <label className="block">
          <span className="label">Mês final</span>
          <select className="input w-auto" value={effectiveEnd} onChange={(e) => setEndYm(e.target.value)}>
            {availableMonths.slice().reverse().map((ym) => (
              <option key={ym} value={ym}>{monthLabel(ym)}</option>
            ))}
          </select>
        </label>
      </div>

      {!hasData ? (
        <div className="rounded-xl border border-dashed border-line p-8 text-center text-sm text-muted">Nenhum registro no período selecionado.</div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {report.kpis.map((k) => (
              <div key={k.label} className="card p-3">
                <div className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">{k.label}</div>
                <div className={`num mt-0.5 text-lg font-semibold ${k.tone || "text-ink"}`}>{k.value}</div>
                {k.sub && <div className="text-[0.7rem] text-muted">{k.sub}</div>}
              </div>
            ))}
          </div>
          {report.sections.map((section) => (
            <div key={section.title} className="card p-4">
              <h3 className="mb-2 text-sm font-semibold text-ink">{section.title}</h3>
              {section.rows.length ? (
                <div className="overflow-x-auto">
                  <table className="table-base">
                    <thead>
                      <tr>
                        {section.columns.map((c, i) => (
                          <th key={c} className={section.align?.[i] === "right" ? "text-right" : ""}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row, ri) => (
                        <tr key={ri}>
                          {row.map((cell, ci) => (
                            <td key={ci} className={section.align?.[ci] === "right" ? "num text-right" : ""}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted">Sem dados.</p>
              )}
            </div>
          ))}
          {report.notes && (
            <div className="card p-4 text-sm text-muted">
              <h3 className="mb-1 text-sm font-semibold text-ink">Observações</h3>
              <p className="whitespace-pre-wrap">{report.notes}</p>
            </div>
          )}
          <p className="text-xs text-faint">Gerado em {fmtDate(report.generatedAt)} {report.personalInfo?.fullName ? `para ${report.personalInfo.fullName}` : ""}</p>
        </div>
      )}
    </AppShell>
  );
}

export { fmtBRL, fmtPct, yyyymm };
