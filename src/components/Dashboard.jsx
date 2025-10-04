import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtBRL } from "../utils/formatters.js";

export function Dashboard({ monthly }) {
  const monthlyChart = monthly.map((m) => ({
    month: m.label,
    Investido: Math.max(0, m.invested),
    "Em Conta": Math.max(0, m.inAccount),
    "Entradas/Saídas": m.cashFlow,
    Rendimento: m.yieldValue,
  }));

  const tsChart = monthly.map((m) => ({
    ts: m.midDateValue,
    label: m.label,
    Investido: m.invested,
    "Em Conta": m.inAccount,
    Rendimento: m.yieldValue,
  }));

  const formatTick = (value) =>
    value
      ? new Date(value).toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
      : "";

  const formatLabel = (value, payload) =>
    payload?.[0]?.payload?.label ||
    (value ? new Date(value).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }) : "");

  const domain = tsChart.length ? ["dataMin", "dataMax"] : [0, 1];

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
    </div>
  );
}
