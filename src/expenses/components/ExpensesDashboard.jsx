import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell } from "recharts";
import { fmtBRL } from "../../utils/formatters.js";

export function ExpensesDashboard({ monthly, totals }) {
  const monthlyChart = monthly.map((m) => ({ month: m.label, Total: m.total }));
  const latest = monthly.at(-1);
  const categoryData = latest ? Object.entries(latest.byCategory || {}).map(([name, value]) => ({ name, value })) : [];

  const COLORS = ["#10B981", "#2563EB", "#EF4444", "#8B5CF6", "#F59E0B", "#6B7280", "#1F2937"]; 

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-2xl bg-white p-4 shadow">
        <h3 className="mb-2 text-sm font-semibold">Gasto total por mês</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyChart}>
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(v) => fmtBRL(v)} />
              <Tooltip formatter={(v) => fmtBRL(v)} />
              <Legend />
              <Bar dataKey="Total" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow">
        <h3 className="mb-2 text-sm font-semibold">Distribuição por categoria (mês mais recente)</h3>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" outerRadius={120} label>
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => fmtBRL(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl bg-white p-4 shadow lg:col-span-2">
        <h3 className="mb-2 text-sm font-semibold">Total acumulado</h3>
        <div className="text-2xl font-bold">{fmtBRL(totals.total_spent)}</div>
      </div>
    </div>
  );
}
