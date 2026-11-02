import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtBRL, fmtPct } from "../../utils/formatters.js";
import { fmtCompact } from "../../utils/money.js";
import { EmptyState } from "../../components/AppShell.jsx";

const WINDOWS = [
  { value: 6, label: "6m" },
  { value: 12, label: "12m" },
  { value: 24, label: "24m" },
  { value: 0, label: "Tudo" },
];

function ChartCard({ title, subtitle, children, right, className = "" }) {
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

function MoneyTooltip({ active, payload, label, showPct }) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value !== undefined && p.value !== null && p.dataKey !== "pct");
  const pct = payload.find((p) => p.dataKey === "pct");
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-pop">
      <div className="mb-1 font-semibold capitalize text-ink">{label}</div>
      {rows.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5 text-muted">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
            {p.name}
          </span>
          <span className="num font-semibold text-ink">{fmtBRL(p.value)}</span>
        </div>
      ))}
      {showPct && pct && pct.value !== null && (
        <div className="mt-1 border-t border-line pt-1 text-muted">
          Rentabilidade: <span className="num font-semibold text-ink">{fmtPct(pct.value)}</span>
        </div>
      )}
    </div>
  );
}

export function Dashboard({ timeline, position, groupBy, onGroupByChange, aggregation, onAggregationChange, colorFor, banks = [], sources = [], singleSource = false }) {
  const [windowMonths, setWindowMonths] = useState(12);
  const safeTimeline = Array.isArray(timeline) ? timeline : [];
  const visible = windowMonths ? safeTimeline.slice(-windowMonths) : safeTimeline;

  const groupNames = useMemo(() => {
    const names = new Set();
    visible.forEach((m) => m.groups.forEach((g) => names.add(g.name)));
    return Array.from(names);
  }, [visible]);

  const colorOf = (name) => colorFor(name).color;

  const evolutionData = visible.map((m) => {
    const row = { label: m.label, Total: m.total };
    groupNames.forEach((name) => {
      row[name] = m.groups.find((g) => g.name === name)?.total ?? 0;
    });
    return row;
  });

  const yieldData = visible.map((m) => {
    const row = { label: m.label, pct: m.yieldPct };
    groupNames.forEach((name) => {
      row[name] = m.groups.find((g) => g.name === name)?.yieldValue ?? 0;
    });
    return row;
  });
  const hasYield = yieldData.some((row) => groupNames.some((n) => row[n]));

  const flowData = visible.map((m) => ({
    label: m.label,
    Aportes: m.cashFlow,
    Rendimento: m.yieldValue ?? 0,
  }));
  const hasFlow = flowData.some((r) => r.Aportes || r.Rendimento);

  const distribution = useMemo(() => {
    if (groupBy === "bank") {
      return position.banks.map((b) => ({ name: b.name, value: b.total, percentage: b.percentage, color: colorOf(b.name) }));
    }
    const map = new Map();
    position.banks.forEach((b) => {
      const key = b.source || "Sem fonte";
      map.set(key, (map.get(key) || 0) + b.total);
    });
    const total = position.total || 1;
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value, percentage: Math.round((value / total) * 1000) / 10, color: colorOf(name) }))
      .sort((a, b) => b.value - a.value);
  }, [position, groupBy, banks, sources]);

  if (!safeTimeline.length) {
    return (
      <EmptyState title="Sem dados para os gráficos.">Registre o saldo dos seus bancos na aba Nova Entrada para ver a evolução.</EmptyState>
    );
  }

  const controls = (
    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
      <div className="pill-toggle" role="group" aria-label="Período">
        {WINDOWS.map((w) => (
          <button key={w.value} type="button" aria-pressed={windowMonths === w.value} onClick={() => setWindowMonths(w.value)}>
            {w.label}
          </button>
        ))}
      </div>
      {!singleSource && (
        <div className="pill-toggle" role="group" aria-label="Agrupar por">
          <button type="button" aria-pressed={groupBy === "bank"} onClick={() => onGroupByChange("bank")}>Por banco</button>
          <button type="button" aria-pressed={groupBy === "source"} onClick={() => onGroupByChange("source")}>Por fonte</button>
        </div>
      )}
      <div className="pill-toggle" role="group" aria-label="Cálculo mensal" title="Como montar o total de cada mês">
        <button type="button" aria-pressed={aggregation === "carry"} onClick={() => onAggregationChange("carry")} title="Bancos sem lançamento no mês mantêm o último saldo">
          Último saldo
        </button>
        <button type="button" aria-pressed={aggregation === "month"} onClick={() => onAggregationChange("month")} title="Soma apenas os lançamentos do próprio mês">
          Só o mês
        </button>
      </div>
    </div>
  );

  return (
    <div>
      {controls}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Evolução do patrimônio" subtitle={`Total por mês${groupBy === "bank" ? ", empilhado por banco" : ", empilhado por fonte"}`} className="xl:col-span-2">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={evolutionData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  {groupNames.map((name, index) => (
                    <linearGradient key={name} id={`evo-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colorOf(name)} stopOpacity={0.55} />
                      <stop offset="95%" stopColor={colorOf(name)} stopOpacity={0.08} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={fmtCompact} tickLine={false} axisLine={false} width={56} />
                <Tooltip content={<MoneyTooltip />} />
                <Legend />
                {groupNames.map((name, index) => (
                  <Area key={name} type="monotone" dataKey={name} stackId="g" stroke={colorOf(name)} fill={`url(#evo-${index})`} strokeWidth={1.5} />
                ))}
                <Line type="monotone" dataKey="Total" stroke="rgb(var(--c-ink))" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Rendimento mensal" subtitle="Barras por grupo; linha = rentabilidade do mês">
          <div className="h-72">
            {hasYield ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={yieldData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis yAxisId="money" tickFormatter={fmtCompact} tickLine={false} axisLine={false} width={56} />
                  <YAxis yAxisId="pct" orientation="right" tickFormatter={(v) => fmtPct(v, 1)} tickLine={false} axisLine={false} width={48} />
                  <ReferenceLine yAxisId="money" y={0} stroke="rgb(var(--c-faint))" />
                  <Tooltip content={<MoneyTooltip showPct />} />
                  <Legend />
                  {groupNames.map((name) => (
                    <Bar key={name} yAxisId="money" dataKey={name} stackId="y" fill={colorOf(name)} radius={[2, 2, 0, 0]} />
                  ))}
                  <Line yAxisId="pct" type="monotone" dataKey="pct" name="Rentabilidade" stroke="rgb(var(--c-ink))" strokeWidth={2} dot={{ r: 2 }} legendType="line" />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="Ainda sem rendimento calculado.">Registre o mesmo banco em dois meses diferentes.</EmptyState>
            )}
          </div>
        </ChartCard>

        <ChartCard title="Aportes vs. rendimento" subtitle="Quanto veio do seu bolso e quanto veio dos juros">
          <div className="h-72">
            {hasFlow ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={flowData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={fmtCompact} tickLine={false} axisLine={false} width={56} />
                  <ReferenceLine y={0} stroke="rgb(var(--c-faint))" />
                  <Tooltip content={<MoneyTooltip />} />
                  <Legend />
                  <Bar dataKey="Aportes" fill="rgb(var(--c-accent))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Rendimento" fill="rgb(var(--c-pos))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState title="Sem aportes ou rendimentos no período." />
            )}
          </div>
        </ChartCard>

        <ChartCard title={`Distribuição atual por ${groupBy === "bank" ? "banco" : "fonte"}`} subtitle={`Patrimônio: ${fmtBRL(position.total)}`} className="xl:col-span-2">
          {distribution.length ? (
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="h-60 w-full md:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip content={<MoneyTooltip />} />
                    <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={58} outerRadius={95} paddingAngle={2} stroke="rgb(var(--c-surface))">
                      {distribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="flex-1 space-y-1.5 text-sm">
                {distribution.map((entry) => (
                  <li key={entry.name} className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-1.5">
                    <span className="flex items-center gap-2 font-medium text-ink">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                      {entry.name}
                    </span>
                    <span className="text-right">
                      <span className="num block font-semibold text-ink">{fmtBRL(entry.value)}</span>
                      <span className="block text-xs text-muted">{entry.percentage}%</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <EmptyState title="Sem posição atual." />
          )}
        </ChartCard>
      </div>
    </div>
  );
}
