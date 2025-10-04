import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
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
  const monthlyChart = monthly.map((m) => ({
    month: m.label,
    Investido: Math.max(0, m.invested),
    "Em Conta": Math.max(0, m.inAccount),
    "Entradas/Saídas": m.cashFlow,
    Rendimento: m.yieldValue ?? 0,
  }));

  const tsChart = monthly.map((m) => ({
    ts: m.midDateValue,
    label: m.label,
    Investido: m.invested,
    "Em Conta": m.inAccount,
    Rendimento: m.yieldValue ?? 0,
  }));

  const formatTick = (value) =>
    value
      ? new Date(value).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
      : "";

  const formatLabel = (value, payload) =>
    payload?.[0]?.payload?.label ||
    (value ? new Date(value).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : "");

  const domain = tsChart.length ? ["dataMin", "dataMax"] : [0, 1];

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
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-2xl bg-white p-4 shadow">
        <h3 className="mb-2 text-sm font-semibold">Investido x Em Conta por mês</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => fmtBRL(v)} />
              <Tooltip formatter={(v) => fmtBRL(v)} />
              <Legend />
              <Bar dataKey="Investido" />
              <Bar dataKey="Em Conta" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow">
        <h3 className="mb-2 text-sm font-semibold">Rendimento acumulado (por dia)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={tsChart}>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopOpacity={0.4} />
                  <stop offset="95%" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ts" type="number" domain={domain} tickFormatter={formatTick} />
              <YAxis tickFormatter={(v) => fmtBRL(v)} />
              <Tooltip
                formatter={(v) => fmtBRL(v)}
                labelFormatter={formatLabel}
              />
              <Legend />
              <Area type="monotone" dataKey="Rendimento" fillOpacity={1} fill="url(#grad1)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow lg:col-span-2">
        <h3 className="mb-2 text-sm font-semibold">Time series – Investido x Em Conta</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={tsChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="ts" type="number" domain={domain} tickFormatter={formatTick} />
              <YAxis tickFormatter={(v) => fmtBRL(v)} />
              <Tooltip
                formatter={(v) => fmtBRL(v)}
                labelFormatter={formatLabel}
              />
              <Legend />
              <Line type="monotone" dataKey="Investido" dot={false} />
              <Line type="monotone" dataKey="Em Conta" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow lg:col-span-2">
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
