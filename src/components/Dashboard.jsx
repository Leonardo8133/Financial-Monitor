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

  // Diferença líquida por fonte: uma linha por fonte com valor absoluto de (entradas - saídas)
  const perSourceNet = safeMonthly.map((m) => {
    const perSource = new Map();
    (Array.isArray(m.sources) ? m.sources : []).forEach((s) => {
      const name = s.name;
      const cf = s.cashFlow ?? 0;
      perSource.set(name, (perSource.get(name) ?? 0) + cf);
    });
    const row = { ts: m.midDateValue, label: m.label };
    uniqueSourceNames.forEach((name) => {
      row[name] = Math.abs(perSource.get(name) ?? 0);
    });
    return row;
  });
  const hasFlowData = perSourceNet.some((row) => uniqueSourceNames.some((name) => (row[name] ?? 0) !== 0));

  // Apenas rendimento mensal por fonte
  const yieldChart = safeMonthly.map((m) => {
    const row = { ts: m.midDateValue, label: m.label };
    (Array.isArray(m.sources) ? m.sources : []).forEach((s) => {
      const name = s.name;
      const yv = s.yieldValue ?? 0;
      row[name] = yv;
    });
    return row;
  });
  const hasYieldData = yieldChart.some((row) => uniqueSourceNames.some((name) => (row[name] ?? 0) !== 0));

  

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
      row[name] = monthValue;
    });

    row.Total = monthInvestedSum;

    return row;
  });
  const hasInvestmentData = investmentChart.some((row) => row.Total > 0);

  const lastMonthSources = safeMonthly.length ? safeMonthly[safeMonthly.length - 1].sources || [] : [];
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

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <div className="rounded-2xl bg-white p-4 shadow">
        <h3 className="mb-2 text-sm font-semibold">Fluxo líquido por fonte ao longo do tempo</h3>
        <div className="h-72">
          {hasFlowData ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={perSourceNet}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ts" type="number" domain={domain} tickFormatter={formatTick} />
                <YAxis tickFormatter={formatShortK} />
                <Tooltip formatter={(value) => fmtBRL(value)} labelFormatter={formatLabel} />
                <Legend />
                {uniqueSourceNames.map((name) => (
                  <Line key={name} type="monotone" dataKey={name} name={name} stroke={colorBySource.get(name)} strokeWidth={2} dot={false} />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              Adicione lançamentos com entradas ou saídas para visualizar este gráfico.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow">
        <h3 className="mb-2 text-sm font-semibold">Rendimento mensal por fonte</h3>
        <div className="h-72">
          {hasYieldData ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={yieldChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ts" type="number" domain={domain} tickFormatter={formatTick} />
                <YAxis tickFormatter={formatShortK} width={70} />
                <Tooltip formatter={(value) => fmtBRL(value)} labelFormatter={formatLabel} />
                <Legend />
                {uniqueSourceNames.map((name) => (
                  <Bar key={name} dataKey={name} name={name} fill={colorBySource.get(name)} />
                ))}
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
              Registre lançamentos consecutivos para calcular rendimentos mensais por fonte.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow xl:col-span-2">
        <h3 className="mb-2 text-sm font-semibold">Total investido por mês</h3>
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
                <YAxis tickFormatter={formatShortK} />
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
                {uniqueSourceNames.map((name, index) => (
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
