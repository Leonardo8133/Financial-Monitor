import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtBRL } from "../utils/formatters.js";
import { resolveSourceVisual } from "../config/sources.js";

// Função para formatar valores em K
const formatValueInK = (value) => {
  if (value === 0) return "0";
  const absValue = Math.abs(value);
  if (absValue >= 1000) {
    const kValue = (value / 1000).toFixed(1);
    return kValue.endsWith('.0') ? kValue.slice(0, -2) + 'k' : kValue + 'k';
  }
  return value.toString();
};

const areArraysShallowEqual = (a = [], b = []) => {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false;
  }
  return true;
};

export function Dashboard({ monthly, sourceSummary = [], sources = [], isPdfMode }) {
  const safeMonthly = useMemo(() => (Array.isArray(monthly) ? monthly : []), [monthly]);
  const timeframeOptions = ["3m", "6m", "12m", "24m", "all"];

  const formatTick = (value) =>
    value ? new Date(value).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) : "";

  const formatLabel = (value, payload) =>
    payload?.[0]?.payload?.label ||
    (value ? new Date(value).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : "");

  const formatShortK = (value) => {
    const numeric = Number(value) || 0;
    const abs = Math.abs(numeric);
    if (abs >= 1000) {
      const short = abs / 1000;
      const rounded = Math.round(short * 10) / 10;
      return `${rounded}k`;
    }
    return `${abs}`;
  };

  const sourceLibrary = useMemo(() => (Array.isArray(sources) ? sources : []), [sources]);
  const uniqueSourceNames = useMemo(() => {
    const extraSourceNames = safeMonthly
      .flatMap((m) => (Array.isArray(m.sources) ? m.sources.map((source) => source.name) : []))
      .filter(Boolean);
    return Array.from(
      new Set([...sourceLibrary.map((source) => source.name), ...extraSourceNames])
    );
  }, [safeMonthly, sourceLibrary]);

  const [timeframe, setTimeframe] = useState("12m");
  const [selectedSources, setSelectedSources] = useState(() => [...uniqueSourceNames]);
  const [enabledCharts, setEnabledCharts] = useState({
    flow: true,
    yield: true,
    invested: true,
    distribution: true,
  });

  useEffect(() => {
    setSelectedSources((prev) => {
      if (uniqueSourceNames.length === 0) {
        return prev.length === 0 ? prev : [];
      }
      if (prev.length === 0) {
        return [...uniqueSourceNames];
      }
      const next = prev.filter((name) => uniqueSourceNames.includes(name));
      if (next.length === 0) {
        return [...uniqueSourceNames];
      }
      if (areArraysShallowEqual(next, prev)) {
        return prev;
      }
      return next;
    });
  }, [uniqueSourceNames]);

  const filteredMonthly = useMemo(() => {
    const limit = timeframe === "all" ? safeMonthly.length : Number.parseInt(timeframe, 10);
    const baseData = limit > 0 ? safeMonthly.slice(-limit) : safeMonthly;
    const active = (selectedSources.length ? selectedSources : uniqueSourceNames).filter(Boolean);
    return baseData.map((month) => {
      const monthSources = Array.isArray(month.sources) ? month.sources : [];
      return {
        ...month,
        sources: monthSources.filter((source) => active.includes(source.name)),
      };
    });
  }, [safeMonthly, timeframe, selectedSources, uniqueSourceNames]);

  const activeSources = (selectedSources.length ? selectedSources : uniqueSourceNames).filter(Boolean);

  const domain = filteredMonthly.length ? ["dataMin", "dataMax"] : [0, 1];

  const colorBySource = new Map(
    uniqueSourceNames.map((name) => [name, resolveSourceVisual(name, sourceLibrary).color])
  );

  const formatTimeframeLabel = (value) => {
    if (value === "all") return "Tudo";
    const months = Number.parseInt(value, 10);
    if (!Number.isFinite(months)) return value;
    if (months % 12 === 0 && months >= 12) {
      const years = months / 12;
      return `${years} ano${years > 1 ? "s" : ""}`;
    }
    return `${months} mês${months > 1 ? "es" : ""}`;
  };

  const toggleSource = (name) => {
    setSelectedSources((prev) => {
      if (prev.includes(name)) {
        return prev.filter((item) => item !== name);
      }
      return [...prev, name];
    });
  };

  const selectAllSources = () => setSelectedSources([...uniqueSourceNames]);
  const clearSources = () => setSelectedSources([]);

  const toggleChartVisibility = (key) => {
    setEnabledCharts((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Diferença líquida por fonte: uma linha por fonte com valor absoluto de (entradas - saídas)
  const perSourceNet = filteredMonthly.map((m) => {
    const perSource = new Map();
    (Array.isArray(m.sources) ? m.sources : []).forEach((s) => {
      const name = s.name;
      const cf = s.cashFlow ?? 0;
      perSource.set(name, (perSource.get(name) ?? 0) + cf);
    });
    const row = { ts: m.midDateValue, label: m.label };
    activeSources.forEach((name) => {
      row[name] = Math.abs(perSource.get(name) ?? 0);
    });
    return row;
  });
  const hasFlowData = perSourceNet.some((row) => activeSources.some((name) => (row[name] ?? 0) !== 0));

  // Apenas rendimento mensal por fonte
  const yieldChart = filteredMonthly.map((m) => {
    const row = { ts: m.midDateValue, label: m.label };
    (Array.isArray(m.sources) ? m.sources : []).forEach((s) => {
      const name = s.name;
      const yv = s.yieldValue ?? 0;
      if (activeSources.includes(name)) {
        row[name] = yv;
      }
    });
    return row;
  });
  const hasYieldData = yieldChart.some((row) => activeSources.some((name) => (row[name] ?? 0) !== 0));

  const investmentChart = filteredMonthly.map((m) => {
    const row = { ts: m.midDateValue, label: m.label };
    const monthlySources = new Map(
      (Array.isArray(m.sources) ? m.sources : []).map((source) => [source.name, source.invested])
    );
    let monthInvestedSum = 0;

    activeSources.forEach((name) => {
      const monthValue = monthlySources.get(name) ?? 0;
      monthInvestedSum += monthValue;
      row[name] = monthValue;
    });

    row.Total = monthInvestedSum;

    return row;
  });
  const hasInvestmentData = investmentChart.some((row) => row.Total > 0);

  const lastMonthSources = filteredMonthly.length
    ? filteredMonthly[filteredMonthly.length - 1].sources || []
    : [];
  const sourceChart = Array.isArray(lastMonthSources)
    ? lastMonthSources
        .filter((item) => (item.invested ?? 0) > 0)
        .map((item) => {
          const visual = resolveSourceVisual(item.name, sourceLibrary);
          return {
            name: item.name,
            value: item.invested ?? 0,
            percentage: 0,
            color: visual.color,
          };
        })
    : [];
  const hasSourceData = sourceChart.length > 0;

  const totalGradientId = "total-invested-area";

  const chartToggles = [
    { key: "flow", label: "Fluxo" },
    { key: "yield", label: "Rendimento" },
    { key: "invested", label: "Investimentos" },
    { key: "distribution", label: "Distribuição" },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Período</span>
            {timeframeOptions.map((option) => {
              const isActive = timeframe === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setTimeframe(option)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    isActive
                      ? "bg-blue-600 text-white shadow"
                      : "bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700"
                  }`}
                  aria-pressed={isActive}
                >
                  {formatTimeframeLabel(option)}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold uppercase tracking-wide">Gráficos</span>
            {chartToggles.map((chart) => {
              const isActive = enabledCharts[chart.key];
              return (
                <button
                  key={chart.key}
                  type="button"
                  onClick={() => toggleChartVisibility(chart.key)}
                  className={`rounded-full px-3 py-1 font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    isActive
                      ? "bg-emerald-500 text-white shadow"
                      : "bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-600"
                  }`}
                  aria-pressed={isActive}
                >
                  {chart.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fontes</span>
            <button
              type="button"
              onClick={selectAllSources}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Todas
            </button>
            <button
              type="button"
              onClick={clearSources}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Limpar
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {uniqueSourceNames.map((name) => {
              const isActive = activeSources.includes(name);
              const color = colorBySource.get(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleSource(name)}
                  className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                    isActive
                      ? "border-transparent bg-blue-600 text-white shadow"
                      : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700"
                  }`}
                  aria-pressed={isActive}
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  />
                  {name}
                </button>
              );
            })}
            {uniqueSourceNames.length === 0 && (
              <span className="text-xs text-slate-500">Nenhuma fonte cadastrada ainda.</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      {enabledCharts.flow ? (
        <div className="rounded-2xl bg-white p-4 shadow">
          <h3 className="mb-2 text-sm font-semibold">Fluxo por fonte ao longo do tempo</h3>
          <div className="h-72">
            {hasFlowData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={perSourceNet} isAnimationActive={!isPdfMode}>
                  <defs>
                    {activeSources.map((name, index) => {
                      const gradientId = `flow-source-${index}`;
                      const color = colorBySource.get(name);
                      return (
                        <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ts" type="number" domain={domain} tickFormatter={formatTick} />
                  <YAxis tickFormatter={(value) => formatValueInK(value)} />
                  <Tooltip formatter={(value) => fmtBRL(value)} labelFormatter={formatLabel} />
                  <Legend />
                  {activeSources.map((name, index) => (
                    <Area
                      key={name}
                      type="monotone"
                      dataKey={name}
                      name={name}
                      stroke={colorBySource.get(name)}
                      fill={`url(#flow-source-${index})`}
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                Adicione lançamentos com fontes para visualizar este gráfico.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-4 shadow">
          <h3 className="mb-2 text-sm font-semibold">Fluxo por fonte ao longo do tempo</h3>
          <div className="flex h-72 items-center justify-center text-sm text-slate-500">
            Gráfico oculto. Ative na barra de filtros acima.
          </div>
        </div>
      )}

      {enabledCharts.yield ? (
        <div className="rounded-2xl bg-white p-4 shadow">
          <h3 className="mb-2 text-sm font-semibold">Rendimento mensal por fonte</h3>
          <div className="h-72">
            {hasYieldData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={yieldChart} isAnimationActive={!isPdfMode}>
                  <defs>
                    {activeSources.map((name, index) => {
                      const gradientId = `yield-source-${index}`;
                      const color = colorBySource.get(name);
                      return (
                        <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                          <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ts" type="number" domain={domain} tickFormatter={formatTick} />
                  <YAxis tickFormatter={(value) => formatValueInK(value)} />
                  <Tooltip formatter={(value) => fmtBRL(value)} labelFormatter={formatLabel} />
                  <Legend />
                  {activeSources.map((name, index) => (
                    <Area
                      key={name}
                      type="monotone"
                      dataKey={name}
                      name={name}
                      stroke={colorBySource.get(name)}
                      fill={`url(#yield-source-${index})`}
                      strokeWidth={2}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                Registre lançamentos consecutivos para calcular rendimentos mensais por fonte.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-4 shadow">
          <h3 className="mb-2 text-sm font-semibold">Rendimento mensal por fonte</h3>
          <div className="flex h-72 items-center justify-center text-sm text-slate-500">
            Gráfico oculto. Ative na barra de filtros acima.
          </div>
        </div>
      )}

      {enabledCharts.invested ? (
        <div className="rounded-2xl bg-white p-4 shadow xl:col-span-2">
          <h3 className="mb-2 text-sm font-semibold">Total investido por mês</h3>
          <div className="h-80">
            {hasInvestmentData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={investmentChart} isAnimationActive={!isPdfMode}>
                  <defs>
                    <linearGradient id={totalGradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0.05} />
                    </linearGradient>
                    {activeSources.map((name, index) => {
                      const gradientId = `source-area-${index}`;
                      const color = colorBySource.get(name);
                      return (
                        <linearGradient key={gradientId} id={gradientId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ts" type="number" domain={domain} tickFormatter={formatTick} />
                  <YAxis tickFormatter={(value) => formatValueInK(value)} />
                  <Tooltip formatter={(value) => fmtBRL(value)} labelFormatter={formatLabel} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="Total"
                    name="Total do mês"
                    stroke="#0f172a"
                    strokeWidth={2}
                    fill={`url(#${totalGradientId})`}
                  />
                  {activeSources.map((name, index) => (
                    <Area
                      key={name}
                      type="monotone"
                      dataKey={name}
                      stroke={colorBySource.get(name)}
                      strokeWidth={1.5}
                      stackId="sources"
                      fill={`url(#source-area-${index})`}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                Inclua lançamentos com fontes de investimento para acompanhar a evolução acumulada.
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-4 shadow xl:col-span-2">
          <h3 className="mb-2 text-sm font-semibold">Total investido por mês</h3>
          <div className="flex h-80 items-center justify-center text-sm text-slate-500">
            Gráfico oculto. Ative na barra de filtros acima.
          </div>
        </div>
      )}

      {enabledCharts.distribution ? (
        <div className="rounded-2xl bg-white p-4 shadow xl:col-span-2">
          <h3 className="mb-4 text-sm font-semibold">Distribuição por fonte de investimento</h3>
          {hasSourceData ? (
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="h-64 w-full md:w-1/2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip formatter={(value) => fmtBRL(value)} />
                    <Pie
                      data={sourceChart}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      isAnimationActive={!isPdfMode}
                    >
                      {sourceChart.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1">
                <ul className="space-y-2 text-sm">
                  {sourceChart.map((entry) => (
                    <li key={entry.name} className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-2">
                      <span className="flex items-center gap-2 font-medium text-slate-700">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} aria-hidden="true" />
                        {entry.name}
                      </span>
                      <span className="text-right">
                        <span className="block text-sm font-semibold text-slate-900">{fmtBRL(entry.value)}</span>
                        <span className="block text-xs text-slate-500">{entry.percentage}% do total</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              Adicione lançamentos com fonte para visualizar esta distribuição.
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-4 shadow xl:col-span-2">
          <h3 className="mb-4 text-sm font-semibold">Distribuição por fonte de investimento</h3>
          <div className="flex h-64 items-center justify-center text-sm text-slate-500">
            Gráfico oculto. Ative na barra de filtros acima.
          </div>
        </div>
      )}
    </div>
  </div>
);
}
