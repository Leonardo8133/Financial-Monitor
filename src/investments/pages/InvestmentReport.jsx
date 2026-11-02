import { useCallback, useMemo } from "react";
import { ReportPage } from "../../pages/ReportPage.jsx";
import { useUnifiedStore } from "../../store/unifiedStore.js";
import { buildInvestmentTimeline, computeCurrentPosition } from "../../utils/investmentAnalytics.js";
import { computeDerivedEntries } from "../../utils/entries.js";
import { fmtBRL, fmtDate, fmtPct, yyyymm } from "../../utils/formatters.js";
import { createInvestmentReportDocument } from "../../utils/pdf.jsx";

export default function InvestmentReport() {
  const { store } = useUnifiedStore();
  const inv = store.investimentos;
  const availableMonths = useMemo(() => Array.from(new Set(inv.entries.map((e) => yyyymm(e.date)).filter(Boolean))).sort(), [inv.entries]);

  const buildReport = useCallback(
    ({ months, generatedAt }) => {
      const set = new Set(months);
      const entries = computeDerivedEntries(inv.entries).filter((e) => set.has(yyyymm(e.date)));
      const timeline = buildInvestmentTimeline(inv.entries, { aggregation: "carry", groupBy: "bank" }).filter((m) => set.has(m.ym));
      const position = computeCurrentPosition(inv.entries.filter((e) => yyyymm(e.date) <= months.at(-1)));
      const yieldTotal = timeline.reduce((a, m) => a + (m.yieldValue ?? 0), 0);
      const cashTotal = timeline.reduce((a, m) => a + (m.cashFlow ?? 0), 0);
      const first = timeline[0];
      const last = timeline.at(-1);
      const growth = first && first.previousTotal ? (last.total - first.previousTotal) / first.previousTotal : null;

      const monthlyRows = timeline
        .filter((m) => m.hasEntries || m.total)
        .slice()
        .reverse()
        .map((m) => [m.label, fmtBRL(m.total), fmtBRL(m.inAccount), fmtBRL(m.cashFlow), m.yieldValue !== null ? fmtBRL(m.yieldValue) : "–", m.yieldPct !== null ? fmtPct(m.yieldPct) : "–"]);
      const bankRows = position.banks.map((b) => [b.name, fmtDate(b.date), fmtBRL(b.invested), fmtBRL(b.inAccount), fmtBRL(b.total), `${b.percentage}%`]);
      const entryRows = entries
        .slice()
        .sort((a, b) => (a.date < b.date ? 1 : -1))
        .slice(0, 40)
        .map((e) => [fmtDate(e.date), e.bank, e.source || "–", fmtBRL(e.invested), fmtBRL(e.inAccount), fmtBRL(e.cashFlow), e.yieldValue !== null ? fmtBRL(e.yieldValue) : "–"]);

      return {
        fileName: "relatorio-investimentos",
        title: "Relatório de Investimentos",
        generatedAt,
        itemCount: entries.length,
        period: months.length ? { start: months[0], end: months.at(-1) } : null,
        personalInfo: inv.personalInfo,
        notes: inv.settings.reportNotes,
        kpis: [
          { label: "Patrimônio ao final", value: fmtBRL(position.total), sub: position.asOf ? `em ${fmtDate(position.asOf)}` : "" },
          { label: "Rendimento no período", value: fmtBRL(yieldTotal), tone: yieldTotal >= 0 ? "text-pos" : "text-neg" },
          { label: "Aportes líquidos", value: fmtBRL(cashTotal), tone: cashTotal >= 0 ? "text-pos" : "text-neg" },
          { label: "Crescimento", value: growth !== null ? fmtPct(growth) : "–", sub: `${months.length} meses` },
        ],
        sections: [
          { title: "Posição por banco", columns: ["Banco", "Data", "Investido", "Em conta", "Total", "%"], rows: bankRows, align: ["left", "left", "right", "right", "right", "right"] },
          { title: "Resumo mensal", columns: ["Mês", "Total", "Em conta", "Aportes", "Rendimento", "%"], rows: monthlyRows, align: ["left", "right", "right", "right", "right", "right"] },
          { title: "Lançamentos (mais recentes)", columns: ["Data", "Banco", "Fonte", "Investido", "Em conta", "Aporte", "Rendimento"], rows: entryRows, align: ["left", "left", "left", "right", "right", "right", "right"] },
        ],
      };
    },
    [inv]
  );

  return (
    <ReportPage
      title="Relatório de Investimentos"
      backTo="/investimentos"
      backLabel="Investimentos"
      availableMonths={availableMonths}
      buildReport={buildReport}
      createDocument={createInvestmentReportDocument}
    />
  );
}
