import { useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtBRL, fmtPct } from "../../utils/formatters.js";
import { fmtCompact } from "../../utils/money.js";
import { CurrencyInput } from "../../components/CurrencyInput.jsx";

/**
 * Price (fixed installment) and SAC (fixed amortization) simulators with optional
 * down payment and extra monthly amortization.
 */
export function simulateFinancing({ principal, downPayment = 0, annualRatePct, monthlyRatePct, termMonths, system = "price", extraPayment = 0 }) {
  const financed = Math.max(principal - downPayment, 0);
  const n = Math.max(Math.floor(termMonths), 0);
  const i = monthlyRatePct !== undefined && monthlyRatePct !== null ? monthlyRatePct / 100 : Math.pow(1 + annualRatePct / 100, 1 / 12) - 1;
  if (!financed || !n) return null;

  const baseInstallment = system === "price" ? (i > 0 ? (financed * i) / (1 - Math.pow(1 + i, -n)) : financed / n) : null;
  const fixedAmortization = financed / n;

  const rows = [];
  let balance = financed;
  let month = 0;
  let totalPaid = 0;
  let totalInterest = 0;
  while (balance > 0.005 && month < 1200) {
    month += 1;
    const interest = balance * i;
    let amortization = system === "price" ? baseInstallment - interest : fixedAmortization;
    amortization += extraPayment;
    if (amortization > balance) amortization = balance;
    const payment = amortization + interest;
    balance -= amortization;
    totalPaid += payment;
    totalInterest += interest;
    rows.push({ month, payment, interest, amortization, balance: Math.max(balance, 0) });
  }

  // Baseline without extra payment, for the savings figure
  let baseline = null;
  if (extraPayment > 0) {
    baseline = simulateFinancing({ principal, downPayment, annualRatePct, monthlyRatePct, termMonths, system, extraPayment: 0 });
  }

  return {
    financed,
    monthlyRate: i,
    annualRate: Math.pow(1 + i, 12) - 1,
    firstInstallment: rows[0]?.payment ?? 0,
    lastInstallment: rows.at(-1)?.payment ?? 0,
    months: rows.length,
    totalPaid: totalPaid + downPayment,
    totalInterest,
    rows,
    interestSaved: baseline ? baseline.totalInterest - totalInterest : 0,
    monthsSaved: baseline ? baseline.months - rows.length : 0,
  };
}

export function FinancingCalculator() {
  const [form, setForm] = useState({
    principal: 0,
    downPayment: 0,
    rateMode: "annual",
    rate: 12,
    termMonths: 60,
    system: "price",
    extraPayment: 0,
  });
  const [showTable, setShowTable] = useState(false);

  const result = useMemo(() => {
    if (!form.principal || !form.termMonths) return null;
    return simulateFinancing({
      principal: form.principal,
      downPayment: form.downPayment,
      annualRatePct: form.rateMode === "annual" ? form.rate : undefined,
      monthlyRatePct: form.rateMode === "monthly" ? form.rate : undefined,
      termMonths: form.termMonths,
      system: form.system,
      extraPayment: form.extraPayment,
    });
  }, [form]);

  const set = (key) => (value) => setForm((prev) => ({ ...prev, [key]: value }));
  const chartData = useMemo(() => {
    if (!result) return [];
    const step = Math.max(1, Math.ceil(result.rows.length / 60));
    return result.rows.filter((r, idx) => idx % step === 0 || idx === result.rows.length - 1).map((r) => ({ month: `${r.month}º`, "Saldo devedor": r.balance, Juros: r.interest, Amortização: r.amortization }));
  }, [result]);

  return (
    <div className="space-y-4">
      <div className="card-pad">
        <h2 className="text-base font-semibold text-ink">Simulador de financiamento</h2>
        <p className="text-sm text-muted">Compare Price (parcela fixa) e SAC (amortização fixa) e veja o efeito de amortizações extras.</p>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <label className="block">
            <span className="label">Valor do bem</span>
            <CurrencyInput tone={false} value={form.principal} onChange={set("principal")} />
          </label>
          <label className="block">
            <span className="label">Entrada</span>
            <CurrencyInput tone={false} value={form.downPayment} onChange={set("downPayment")} />
          </label>
          <label className="block">
            <span className="label">Taxa de juros</span>
            <div className="flex">
              <input type="number" step="0.01" min="0" value={form.rate} onChange={(e) => set("rate")(Number(e.target.value) || 0)} className="input num rounded-r-none" />
              <select value={form.rateMode} onChange={(e) => set("rateMode")(e.target.value)} className="input w-auto rounded-l-none border-l-0 pr-7">
                <option value="annual">% a.a.</option>
                <option value="monthly">% a.m.</option>
              </select>
            </div>
          </label>
          <label className="block">
            <span className="label">Prazo (meses)</span>
            <input type="number" min="1" max="600" value={form.termMonths} onChange={(e) => set("termMonths")(Math.max(0, Number(e.target.value) || 0))} className="input num" />
          </label>
          <label className="block">
            <span className="label">Sistema</span>
            <div className="pill-toggle w-full">
              <button type="button" className="flex-1" aria-pressed={form.system === "price"} onClick={() => set("system")("price")}>Price</button>
              <button type="button" className="flex-1" aria-pressed={form.system === "sac"} onClick={() => set("system")("sac")}>SAC</button>
            </div>
          </label>
          <label className="block">
            <span className="label">Amortização extra / mês</span>
            <CurrencyInput tone={false} value={form.extraPayment} onChange={set("extraPayment")} />
          </label>
        </div>
      </div>

      {result ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Card label={form.system === "price" ? "Parcela" : "Primeira parcela"} value={fmtBRL(result.firstInstallment)} sub={form.system === "sac" ? `última ${fmtBRL(result.lastInstallment)}` : `${result.months} meses`} tone="text-accent" />
            <Card label="Valor financiado" value={fmtBRL(result.financed)} sub={`${fmtPct(result.monthlyRate)} a.m. · ${fmtPct(result.annualRate)} a.a.`} />
            <Card label="Total de juros" value={fmtBRL(result.totalInterest)} tone="text-neg" sub={`${((result.totalInterest / result.financed) * 100).toFixed(0)}% do financiado`} />
            <Card label="Total pago" value={fmtBRL(result.totalPaid)} sub="inclui a entrada" />
            <Card
              label="Com amortização extra"
              value={form.extraPayment > 0 ? `${result.months} meses` : "–"}
              tone="text-pos"
              sub={form.extraPayment > 0 ? `economiza ${fmtBRL(result.interestSaved)} e ${result.monthsSaved} meses` : "Informe um valor extra"}
            />
          </div>

          <div className="card p-4">
            <h3 className="mb-2 text-sm font-semibold text-ink">Evolução do saldo devedor</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="fin-balance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="rgb(var(--c-accent))" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="rgb(var(--c-accent))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={fmtCompact} tickLine={false} axisLine={false} width={56} />
                  <Tooltip formatter={(v) => fmtBRL(v)} />
                  <Legend />
                  <Area type="monotone" dataKey="Saldo devedor" stroke="rgb(var(--c-accent))" fill="url(#fin-balance)" strokeWidth={2} />
                  <Area type="monotone" dataKey="Juros" stroke="rgb(var(--c-neg))" fill="transparent" strokeWidth={1.5} />
                  <Area type="monotone" dataKey="Amortização" stroke="rgb(var(--c-pos))" fill="transparent" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-4">
            <button type="button" className="btn btn-sm" onClick={() => setShowTable((v) => !v)}>
              {showTable ? "Ocultar tabela" : `Ver tabela completa (${result.rows.length} parcelas)`}
            </button>
            {showTable && (
              <div className="mt-3 max-h-96 overflow-auto">
                <table className="table-base">
                  <thead className="sticky top-0">
                    <tr>
                      <th>Mês</th>
                      <th className="text-right">Parcela</th>
                      <th className="text-right">Amortização</th>
                      <th className="text-right">Juros</th>
                      <th className="text-right">Saldo devedor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((r) => (
                      <tr key={r.month}>
                        <td className="num">{r.month}</td>
                        <td className="num text-right font-medium">{fmtBRL(r.payment)}</td>
                        <td className="num text-right text-pos">{fmtBRL(r.amortization)}</td>
                        <td className="num text-right text-neg">{fmtBRL(r.interest)}</td>
                        <td className="num text-right text-muted">{fmtBRL(r.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">Informe o valor do bem e o prazo para simular.</div>
      )}
    </div>
  );
}

function Card({ label, value, sub, tone = "text-ink" }) {
  return (
    <div className="card p-3">
      <div className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className={`num mt-0.5 text-lg font-semibold ${tone}`}>{value}</div>
      {sub && <div className="text-[0.7rem] text-muted">{sub}</div>}
    </div>
  );
}
