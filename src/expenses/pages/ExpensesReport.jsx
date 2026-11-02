import { useCallback, useMemo } from "react";
import { ReportPage } from "../../pages/ReportPage.jsx";
import { useUnifiedStore } from "../../store/unifiedStore.js";
import { buildMonthlyExpenses } from "../utils/expenses.js";
import { fmtBRL, fmtDate, monthLabel, toNumber, yyyymm } from "../../utils/formatters.js";
import { createExpensesReportDocument } from "../../utils/pdf.jsx";

export default function ExpensesReport() {
  const { store } = useUnifiedStore();
  const gas = store.gastos;
  const availableMonths = useMemo(() => Array.from(new Set(gas.expenses.map((e) => yyyymm(e.date)).filter(Boolean))).sort(), [gas.expenses]);

  const buildReport = useCallback(
    ({ months, generatedAt }) => {
      const set = new Set(months);
      const items = gas.expenses.filter((e) => set.has(yyyymm(e.date)));
      const monthly = buildMonthlyExpenses(items);
      const spent = monthly.reduce((a, m) => a + m.spent, 0);
      const earned = monthly.reduce((a, m) => a + m.earned, 0);
      const count = Math.max(1, monthly.length);

      const byCategory = {};
      const bySource = {};
      monthly.forEach((m) => {
        Object.entries(m.byCategory).forEach(([k, v]) => (byCategory[k] = (byCategory[k] || 0) + v));
        Object.entries(m.bySource).forEach(([k, v]) => (bySource[k] = (bySource[k] || 0) + v));
      });
      const categoryRows = Object.entries(byCategory)
        .sort((a, b) => b[1] - a[1])
        .map(([name, total]) => [name, fmtBRL(total / count), fmtBRL(total), `${spent ? ((total / spent) * 100).toFixed(1) : 0}%`]);
      const sourceRows = Object.entries(bySource)
        .sort((a, b) => b[1] - a[1])
        .map(([name, total]) => [name, fmtBRL(total)]);
      const monthlyRows = monthly
        .slice()
        .reverse()
        .map((m) => [monthLabel(m.ym), fmtBRL(m.spent), fmtBRL(m.earned), fmtBRL(m.earned - m.spent), String(m.items.length)]);
      const lastMonth = monthly.at(-1);
      const lastMonthRows = lastMonth
        ? Object.entries(lastMonth.byCategory)
            .sort((a, b) => b[1] - a[1])
            .map(([name, total]) => [name, fmtBRL(total), `${lastMonth.spent ? ((total / lastMonth.spent) * 100).toFixed(1) : 0}%`])
        : [];
      const topRows = items
        .filter((e) => toNumber(e.value) < 0)
        .sort((a, b) => Math.abs(toNumber(b.value)) - Math.abs(toNumber(a.value)))
        .slice(0, 30)
        .map((e) => [fmtDate(e.date), e.description, (e.categories || []).join(", ") || "–", (e.sources || []).join(", ") || "–", fmtBRL(Math.abs(toNumber(e.value)))]);

      return {
        fileName: "relatorio-gastos",
        title: "Relatório de Gastos",
        generatedAt,
        itemCount: items.length,
        period: months.length ? { start: months[0], end: months.at(-1) } : null,
        personalInfo: gas.personalInfo,
        notes: gas.settings.reportNotes,
        kpis: [
          { label: "Despesas", value: fmtBRL(spent), tone: "text-neg", sub: `${fmtBRL(spent / count)}/mês` },
          { label: "Receitas", value: fmtBRL(earned), tone: "text-pos" },
          { label: "Saldo", value: fmtBRL(earned - spent), tone: earned - spent >= 0 ? "text-pos" : "text-neg" },
          { label: "Meta mensal", value: gas.settings.monthlyBudget ? fmtBRL(gas.settings.monthlyBudget) : "–", sub: gas.settings.monthlyBudget && lastMonth ? `${Math.round((lastMonth.spent / gas.settings.monthlyBudget) * 100)}% em ${monthLabel(lastMonth.ym)}` : "" },
        ],
        sections: [
          { title: "Resumo mensal", columns: ["Mês", "Despesas", "Receitas", "Saldo", "Itens"], rows: monthlyRows, align: ["left", "right", "right", "right", "right"] },
          { title: "Despesas por categoria no período", columns: ["Categoria", "Média mensal", "Total", "%"], rows: categoryRows, align: ["left", "right", "right", "right"] },
          ...(lastMonth ? [{ title: `Último mês (${monthLabel(lastMonth.ym)}) por categoria`, columns: ["Categoria", "Total", "%"], rows: lastMonthRows, align: ["left", "right", "right"] }] : []),
          { title: "Por fonte", columns: ["Fonte", "Total"], rows: sourceRows, align: ["left", "right"] },
          { title: "Maiores despesas", columns: ["Data", "Descrição", "Categoria", "Fonte", "Valor"], rows: topRows, align: ["left", "left", "left", "left", "right"] },
        ],
      };
    },
    [gas]
  );

  return (
    <ReportPage title="Relatório de Gastos" backTo="/gastos" backLabel="Gastos" availableMonths={availableMonths} buildReport={buildReport} createDocument={createExpensesReportDocument} />
  );
}
