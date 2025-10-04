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

export function Dashboard({ monthly, sourceSummary = [], sources = [] }) {
  const safeMonthly = Array.isArray(monthly) ? monthly : [];

  const formatTick = (value) =>
    value ? new Date(value).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) : "";

  const formatLabel = (value, payload) =>
    payload?.[0]?.payload?.label ||
    (value ? new Date(value).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : "");

  const domain = safeMonthly.length ? ["dataMin", "dataMax"] : [0, 1];

  const flowChart = safeMonthly.map((m) => ({
    ts: m.midDateValue,
    label: m.label,
    Entradas: m.cashFlow > 0 ? m.cashFlow : 0,
    Saidas: m.cashFlow < 0 ? m.cashFlow : 0,
  }));
  const hasFlowData = flowChart.some((row) => row.Entradas !== 0 || row.Saidas !== 0);

  let cumulativeYield = 0;
  const yieldChart = safeMonthly.map((m) => {
    const monthlyYield = m.yieldValue ?? 0;
    cumulativeYield += monthlyYield;
    return {
      ts: m.midDateValue,
      label: m.label,
      RendimentoMensal: monthlyYield,
      RendimentoAcumulado: cumulativeYield,
    };
  });
  const hasYieldData = yieldChart.some(
    (row) => row.RendimentoMensal !== 0 || row.RendimentoAcumulado !== 0
  );

  const sourceLibrary = Array.isArray(sources) ? sources : [];
  const extraSourceNames = safeMonthly
    .flatMap((m) => (Array.isArray(m.sources) ? m.sources.map((source) => source.name) : []))
    .filter(Boolean);
  const uniqueSourceNames = Array.from(
    new Set([...sourceLibrary.map((source) => source.name), ...extraSourceNames])
  );

  const colorBySource = new Map(
    uniqueSourceNames.map((name) => [name, resolveSourceVisual(name, sourceLibrary).color])
  );

  const cumulativeBySource = new Map(uniqueSourceNames.map((name) => [name, 0]));
  let cumulativeTotal = 0;
  const investmentChart = safeMonthly.map((m) => {
    const row = { ts: m.midDateValue, label: m.label };
    const monthlySources = new Map(
      (Array.isArray(m.sources) ? m.sources : []).map((source) => [source.name, source.invested])
    );
    let monthInvestedSum = 0;

    uniqueSourceNames.forEach((name) => {
      const monthValue = monthlySources.get(name) ?? 0;
      monthInvestedSum += monthValue;
      const updated = (cumulativeBySource.get(name) ?? 0) + monthValue;
      cumulativeBySource.set(name, updated);
      row[name] = updated;
    });

    cumulativeTotal += monthInvestedSum;
    row.Total = cumulativeTotal;

    return row;
  });
  const hasInvestmentData = investmentChart.some((row) => row.Total > 0);

  const sourceChart = Array.isArray(sourceSummary)
    ? sourceSummary
        .filter((item) => item.invested > 0)
        .map((item) => {
          const visual = resolveSourceVisual(item.name, sourceLibrary);
          return {
            name: item.name,
            value: item.invested,
            percentage: item.percentage,
            color: visual.color,
          };
        })
    : [];
  const hasSourceData = sourceChart.length > 0;

  const totalGradientId = "total-invested-area";
  const flowInGradientId = "flow-in-gradient";
  const flowOutGradientId = "flow-out-gradient";

  const sourceLibrary = Array.isArray(sources) ? sources : [];
  const sourceChart = Array.isArray(sourceSummary)
    ? sourceSummary
        .filter((item) => item.invested > 0)
        .map((item) => {
          const visual = resolveSourceVisual(item.name, sourceLibrary);
          return {
            name: item.name,
            value: item.invested,
            percentage: item.percentage,
            color: visual.color,
          };
        })
    : [];
  const hasSourceData = sourceChart.length > 0;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div className="rounded-2xl bg-white p-4 shadow">
        <h3 className="mb-2 text-sm font-semibold">Entrada e saída ao longo do tempo</h3>
        <div className="h-72">
          {hasFlowData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={flowChart}>
                <defs>
                  <linearGradient id={flowInGradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id={flowOutGradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ts" type="number" domain={domain} tickFormatter={formatTick} />
                <YAxis tickFormatter={(value) => fmtBRL(value)} />
                <Tooltip formatter={(value) => fmtBRL(value)} labelFormatter={formatLabel} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="Entradas"
                  name="Entradas"
                  stroke="#10b981"
                  fill={`url(#${flowInGradientId})`}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="Saidas"
                  name="Saídas"
                  stroke="#ef4444"
                  fill={`url(#${flowOutGradientId})`}
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              Adicione lançamentos com entradas ou saídas para visualizar este gráfico.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow">
        <h3 className="mb-2 text-sm font-semibold">Rendimento ao longo do tempo</h3>
        <div className="h-72">
          {hasYieldData ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={yieldChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ts" type="number" domain={domain} tickFormatter={formatTick} />
                <YAxis yAxisId="left" tickFormatter={(value) => fmtBRL(value)} width={70} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(value) => fmtBRL(value)}
                  width={70}
                />
                <Tooltip formatter={(value) => fmtBRL(value)} labelFormatter={formatLabel} />
                <Legend />
                <Bar
                  yAxisId="left"
                  dataKey="RendimentoMensal"
                  name="Rendimento mensal"
                  fill="#6366f1"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="RendimentoAcumulado"
                  name="Rendimento acumulado"
                  stroke="#0f172a"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              Registre lançamentos consecutivos para calcular rendimentos mensais e acumulados.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow xl:col-span-2">
        <h3 className="mb-2 text-sm font-semibold">Total investido ao longo do tempo</h3>
        <div className="h-80">
          {hasInvestmentData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={investmentChart}>
                <defs>
                  <linearGradient id={totalGradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0.05} />
                  </linearGradient>
                  {uniqueSourceNames.map((name, index) => {
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
                <YAxis tickFormatter={(value) => fmtBRL(value)} />
                <Tooltip formatter={(value) => fmtBRL(value)} labelFormatter={formatLabel} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="Total"
                  name="Total acumulado"
                  stroke="#0f172a"
                  strokeWidth={2}
                  fill={`url(#${totalGradientId})`}
                />
                {uniqueSourceNames.map((name, index) => (
                  <Area
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={colorBySource.get(name)}
                    strokeWidth={1.5}
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

      <div className="rounded-2xl bg-white p-4 shadow xl:col-span-2">
        <h3 className="mb-4 text-sm font-semibold">Distribuição por fonte de investimento</h3>
        {hasSourceData ? (
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="h-64 w-full md:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip formatter={(value) => fmtBRL(value)} />
                  <Pie data={sourceChart} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={3}>
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
    </div>
  );
}
