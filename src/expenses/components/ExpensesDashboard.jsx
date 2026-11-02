import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtBRL, toNumber } from "../../utils/formatters.js";
import { fmtCompact } from "../../utils/money.js";
import { resolveCategoryVisual } from "../config/categories.js";
import { resolveSourceVisual } from "../config/sources.js";
import { EmptyState } from "../../components/AppShell.jsx";
import { normalizeDescriptionKey } from "../utils/expenses.js";

const WINDOWS = [1, 3, 6, 12, 24];

function ChartCard({ title, subtitle, right, children, className = "" }) {
  return (
    <div className={`card p-4 ${className}`}>
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">{title}</h3>
          {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function MoneyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-pop">
      <div className="mb-1 font-semibold capitalize text-ink">{label}</div>
      {payload
        .filter((p) => p.value)
        .map((p) => (
          <div key={p.dataKey || p.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color || p.fill || p.payload?.color }} />
              {p.name}
            </span>
            <span className="num font-semibold text-ink">{fmtBRL(p.value)}</span>
          </div>
        ))}
    </div>
  );
}

function Stat({ label, value, tone = "text-ink", sub }) {
  return (
    <div className="card p-3">
      <div className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className={`num mt-0.5 text-lg font-semibold ${tone}`}>{value}</div>
      {sub && <div className="text-[0.7rem] text-muted">{sub}</div>}
    </div>
  );
}

export function ExpensesDashboard({ monthly, categories = [], sources = [], budget = 0 }) {
  const [monthsToShow, setMonthsToShow] = useState(6);
  const [groupBy, setGroupBy] = useState("category");
  const [showTotals, setShowTotals] = useState(false);
  const [excluded, setExcluded] = useState(() => new Set(categories.map((c) => c.name).filter((n) => /investimento/i.test(n))));

  const categoryNames = useMemo(() => categories.map((c) => c.name).filter(Boolean), [categories]);
  const colorOf = (name) => (groupBy === "category" ? resolveCategoryVisual(name, categories).color : resolveSourceVisual(name, sources).color);
  const catColor = (name) => resolveCategoryVisual(name, categories).color;

  const visible = useMemo(() => {
    const slice = monthsToShow ? monthly.slice(-monthsToShow) : monthly;
    return slice.map((m) => ({
      ...m,
      items: (m.items || []).filter((item) => !(item.categories || []).some((c) => excluded.has(c))),
    }));
  }, [monthly, monthsToShow, excluded]);

  const monthlyChart = visible.map((m) => {
    const spent = m.items.filter((i) => toNumber(i.value) < 0).reduce((a, i) => a + Math.abs(toNumber(i.value)), 0);
    const earned = m.items.filter((i) => toNumber(i.value) > 0).reduce((a, i) => a + toNumber(i.value), 0);
    return { month: m.label, Despesas: spent, Receitas: earned, Saldo: earned - spent };
  });

  const grouped = useMemo(() => {
    const totals = {};
    visible.forEach((month) => {
      month.items
        .filter((i) => toNumber(i.value) < 0)
        .forEach((item) => {
          const abs = Math.abs(toNumber(item.value));
          const keys = groupBy === "category" ? item.categories : item.sources;
          const list = Array.isArray(keys) && keys.length ? keys : [groupBy === "category" ? "Sem categoria" : "Sem fonte"];
          const share = abs / list.length;
          list.forEach((k) => (totals[k] = (totals[k] || 0) + share));
        });
    });
    const count = visible.length || 1;
    return Object.entries(totals)
      .map(([name, value]) => ({ name, value, averagePerMonth: value / count, color: colorOf(name) }))
      .filter((i) => i.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [visible, groupBy, categories, sources]);

  const pieData = useMemo(() => {
    const total = grouped.reduce((s, i) => s + i.value, 0);
    const threshold = total * 0.02;
    const main = [];
    let others = 0;
    grouped.forEach((i) => (i.value >= threshold ? main.push(i) : (others += i.value)));
    if (others > 0) main.push({ name: "Outros (<2%)", value: others, averagePerMonth: others / (visible.length || 1), color: "rgb(var(--c-faint))" });
    return main;
  }, [grouped, visible.length]);

  const stackedData = useMemo(() => {
    const top = grouped.slice(0, 6).map((g) => g.name);
    return visible.map((m) => {
      const row = { month: m.label, Outros: 0 };
      m.items
        .filter((i) => toNumber(i.value) < 0)
        .forEach((item) => {
          const abs = Math.abs(toNumber(item.value));
          const keys = groupBy === "category" ? item.categories : item.sources;
          const list = Array.isArray(keys) && keys.length ? keys : [groupBy === "category" ? "Sem categoria" : "Sem fonte"];
          const share = abs / list.length;
          list.forEach((k) => {
            const key = top.includes(k) ? k : "Outros";
            row[key] = (row[key] || 0) + share;
          });
        });
      return row;
    });
  }, [visible, grouped, groupBy]);
  const stackedKeys = grouped.slice(0, 6).map((g) => g.name).concat(stackedData.some((r) => r.Outros) ? ["Outros"] : []);

  const topDescriptions = useMemo(() => {
    const map = new Map();
    visible.forEach((m) =>
      m.items
        .filter((i) => toNumber(i.value) < 0)
        .forEach((i) => {
          const key = normalizeDescriptionKey(i.description);
          if (!key) return;
          const cur = map.get(key) || { name: i.description, total: 0, count: 0, categories: i.categories || [] };
          cur.total += Math.abs(toNumber(i.value));
          cur.count += 1;
          map.set(key, cur);
        })
    );
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [visible]);

  const totalSpent = monthlyChart.reduce((a, m) => a + m.Despesas, 0);
  const totalEarned = monthlyChart.reduce((a, m) => a + m.Receitas, 0);
  const avgSpent = totalSpent / (visible.length || 1);
  const current = monthlyChart.at(-1);
  const previous = monthlyChart.at(-2);
  const mom = current && previous && previous.Despesas ? (current.Despesas - previous.Despesas) / previous.Despesas : null;

  if (!monthly.length) {
    return <EmptyState title="Sem transações para analisar.">Importe uma fatura ou adicione transações na aba Nova Transação.</EmptyState>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <div className="pill-toggle" role="group" aria-label="Período">
          {WINDOWS.map((n) => (
            <button key={n} type="button" aria-pressed={monthsToShow === n} onClick={() => setMonthsToShow(n)}>{n}m</button>
          ))}
          <button type="button" aria-pressed={monthsToShow === 0} onClick={() => setMonthsToShow(0)}>Tudo</button>
        </div>
        <div className="pill-toggle" role="group" aria-label="Agrupar por">
          <button type="button" aria-pressed={groupBy === "category"} onClick={() => setGroupBy("category")}>Categorias</button>
          <button type="button" aria-pressed={groupBy === "source"} onClick={() => setGroupBy("source")}>Fontes</button>
        </div>
        <div className="pill-toggle" role="group" aria-label="Valores">
          <button type="button" aria-pressed={!showTotals} onClick={() => setShowTotals(false)}>Média/mês</button>
          <button type="button" aria-pressed={showTotals} onClick={() => setShowTotals(true)}>Total</button>
        </div>
        <details className="relative">
          <summary className="btn btn-xs cursor-pointer list-none">
            Ocultar categorias{excluded.size ? ` (${excluded.size})` : ""}
          </summary>
          <div className="absolute left-0 z-30 mt-1 flex max-h-64 w-64 flex-col gap-1 overflow-auto rounded-xl border border-line bg-surface p-2 shadow-pop">
            {categoryNames.map((name) => (
              <label key={name} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-surface-2">
                <input
                  type="checkbox"
                  checked={excluded.has(name)}
                  onChange={(e) =>
                    setExcluded((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(name);
                      else next.delete(name);
                      return next;
                    })
                  }
                />
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: catColor(name) }} />
                {name}
              </label>
            ))}
          </div>
        </details>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Despesas no período" value={fmtBRL(totalSpent)} tone="text-neg" sub={`${visible.length} mês(es)`} />
        <Stat label="Receitas no período" value={fmtBRL(totalEarned)} tone="text-pos" />
        <Stat label="Saldo" value={fmtBRL(totalEarned - totalSpent)} tone={totalEarned - totalSpent >= 0 ? "text-pos" : "text-neg"} />
        <Stat label="Média mensal de despesas" value={fmtBRL(avgSpent)} sub={mom !== null ? `${mom >= 0 ? "▲" : "▼"} ${Math.abs(mom * 100).toFixed(0)}% vs. mês anterior` : undefined} />
        <Stat
          label={budget > 0 ? "Meta mensal" : "Maior categoria"}
          value={budget > 0 ? fmtBRL(budget) : grouped[0]?.name || "–"}
          tone={budget > 0 && current && current.Despesas > budget ? "text-neg" : "text-ink"}
          sub={budget > 0 && current ? `${current.month}: ${Math.round((current.Despesas / budget) * 100)}% usado` : grouped[0] ? fmtBRL(grouped[0].averagePerMonth) + "/mês" : "Defina em Configurações"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <ChartCard title="Despesas e receitas por mês" subtitle={budget > 0 ? `Linha tracejada = meta de ${fmtBRL(budget)}` : undefined} className="lg:col-span-3">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={monthlyChart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={fmtCompact} tickLine={false} axisLine={false} width={56} />
                <Tooltip content={<MoneyTooltip />} />
                <Legend />
                <Bar dataKey="Despesas" fill="rgb(var(--c-neg))" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Receitas" fill="rgb(var(--c-pos))" radius={[3, 3, 0, 0]} />
                <Line type="monotone" dataKey="Saldo" stroke="rgb(var(--c-ink))" strokeWidth={2} dot={{ r: 2 }} />
                {budget > 0 && <ReferenceLine y={budget} stroke="rgb(var(--c-accent))" strokeDasharray="5 5" />}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title={`Despesas por ${groupBy === "category" ? "categoria" : "fonte"}`} subtitle={showTotals ? "Totais do período" : "Média mensal"} className="lg:col-span-2">
          {pieData.length ? (
            <div className="flex flex-col gap-3">
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={2} stroke="rgb(var(--c-surface))">
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<MoneyTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="max-h-56 space-y-1 overflow-auto text-xs">
                {grouped.map((item) => {
                  const total = grouped.reduce((s, i) => s + i.value, 0);
                  const pct = total ? (item.value / total) * 100 : 0;
                  return (
                    <li key={item.name} className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-surface-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="flex-1 truncate font-medium text-ink">{item.name}</span>
                      <span className="num w-10 text-right text-muted">{pct.toFixed(0)}%</span>
                      <span className="num w-24 text-right font-semibold text-ink">{fmtBRL(showTotals ? item.value : item.averagePerMonth)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <EmptyState title="Sem despesas no período." />
          )}
        </ChartCard>

        <ChartCard title={`Para onde foi o dinheiro, mês a mês`} subtitle={`Top 6 ${groupBy === "category" ? "categorias" : "fontes"} empilhadas`} className="lg:col-span-3">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stackedData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={fmtCompact} tickLine={false} axisLine={false} width={56} />
                <Tooltip content={<MoneyTooltip />} />
                <Legend />
                {stackedKeys.map((key) => (
                  <Bar key={key} dataKey={key} stackId="s" fill={key === "Outros" ? "rgb(var(--c-faint))" : colorOf(key)} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Maiores gastos recorrentes" subtitle="Por descrição, no período" className="lg:col-span-2">
          {topDescriptions.length ? (
            <ul className="space-y-1.5 text-xs">
              {topDescriptions.map((d) => {
                const max = topDescriptions[0].total || 1;
                return (
                  <li key={d.name}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium text-ink" title={d.name}>{d.name}</span>
                      <span className="num shrink-0 text-muted">{d.count}x · <strong className="text-ink">{fmtBRL(d.total)}</strong></span>
                    </div>
                    <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <div className="h-full rounded-full" style={{ width: `${(d.total / max) * 100}%`, backgroundColor: d.categories[0] ? catColor(d.categories[0]) : "rgb(var(--c-faint))" }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState title="Sem despesas no período." />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
