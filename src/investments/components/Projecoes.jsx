import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtBRL, fmtPct } from "../../utils/formatters.js";
import { fmtCompact } from "../../utils/money.js";
import { CurrencyInput } from "../../components/CurrencyInput.jsx";

const MAX_GOAL_MONTHS = 600;

function withPrecision(value, decimals = 2, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  const factor = 10 ** decimals;
  return Math.round(numeric * factor) / factor;
}

function decimalToPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  return withPrecision(value * 100, 2, 0);
}

function percentToDecimal(value) {
  const numeric = typeof value === "string" ? Number.parseFloat(value.replace(",", ".")) : Number(value);
  return Number.isFinite(numeric) ? numeric / 100 : 0;
}

function readNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatGoalMessage(goalMonths) {
  if (goalMonths === null) return "a meta não é alcançada em 50 anos";
  const years = goalMonths / 12;
  const wholeYears = Math.floor(years);
  const remainingMonths = Math.round((years - wholeYears) * 12);
  const yearLabel = wholeYears > 0 ? `${wholeYears} ano${wholeYears > 1 ? "s" : ""}` : "";
  const monthLabel = remainingMonths > 0 ? `${remainingMonths} mês${remainingMonths > 1 ? "es" : ""}` : "";
  return [yearLabel, monthLabel].filter(Boolean).join(" e ") || "menos de um mês";
}

function ResultItem({ title, value, description, tone = "text-ink" }) {
  return (
    <div className="panel p-3" title={description}>
      <div className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">{title}</div>
      <div className={`num mt-1 text-lg font-semibold ${tone}`}>{value}</div>
      <p className="mt-0.5 text-[0.7rem] text-muted">{description}</p>
    </div>
  );
}

function PctInput({ label, value, onChange, min, max, step = "0.01", hint }) {
  return (
    <label className="block min-w-0">
      <span className="label">{label}</span>
      <div className="relative">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
          className="input num pr-7"
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-faint">%</span>
      </div>
      {hint && <span className="mt-0.5 block text-[0.68rem] text-faint">{hint}</span>}
    </label>
  );
}

export function Projecoes({ timeline = [], defaults = {} }) {
  const safeTimeline = Array.isArray(timeline) ? timeline : [];
  const safeDefaults = defaults ?? {};

  const trailingStats = useMemo(() => {
    const trailing = safeTimeline.slice(-6);
    const yieldValues = trailing
      .map((month) => (month?.yieldPct !== null && month?.yieldPct !== undefined ? month.yieldPct : null))
      .filter((value) => value !== null && Number.isFinite(value));
    const cashFlowValues = trailing.map((month) => month?.cashFlow ?? 0).filter((value) => Number.isFinite(value));
    const yieldAverage = yieldValues.length > 0 ? yieldValues.reduce((acc, value) => acc + value, 0) / yieldValues.length : null;
    const cashFlowAverage = cashFlowValues.length > 0 ? cashFlowValues.reduce((acc, value) => acc + value, 0) / cashFlowValues.length : 0;
    const variance =
      yieldValues.length > 1
        ? yieldValues.reduce((acc, value) => acc + (value - (yieldAverage ?? 0)) ** 2, 0) / (yieldValues.length - 1)
        : 0;
    const last = safeTimeline[safeTimeline.length - 1] || {};
    return {
      monthsConsidered: trailing.length,
      yieldAverage,
      cashFlowAverage,
      volatility: variance > 0 ? Math.sqrt(variance) : 0,
      lastMonth: { total: Math.max(last.total ?? last.invested ?? 0, 0), yieldPct: last.yieldPct ?? null },
    };
  }, [safeTimeline]);

  const [form, setForm] = useState(() => ({
    initialBalance: safeDefaults.initialBalance ?? trailingStats.lastMonth.total ?? 0,
    monthlyContribution: Math.max(safeDefaults.monthlyContribution ?? trailingStats.cashFlowAverage ?? 0, 0),
    horizonMonths: safeDefaults.horizonMonths ?? 60,
    monthlyReturnPct: withPrecision(decimalToPercent(safeDefaults.monthlyReturn ?? trailingStats.yieldAverage ?? 0.008)),
    inflationPct: withPrecision(decimalToPercent(safeDefaults.inflationRate ?? 0.04)),
    contributionGrowthPct: withPrecision(decimalToPercent(safeDefaults.contributionGrowth ?? 0.02)),
    goalAmount: safeDefaults.goalAmount ?? 1000000,
    withdrawalRatePct: withPrecision(decimalToPercent(0.01)),
  }));
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    // When the data behind the defaults changes (new entries), refresh the suggested values once.
    setForm((prev) => ({
      ...prev,
      initialBalance: safeDefaults.initialBalance ?? prev.initialBalance,
    }));
  }, [safeDefaults.initialBalance]);

  const projection = useMemo(() => {
    const horizon = Math.max(Math.floor(readNumber(form.horizonMonths, 0)), 0);
    const monthlyRate = percentToDecimal(form.monthlyReturnPct);
    const contributionGrowthAnnual = percentToDecimal(form.contributionGrowthPct);
    const inflationAnnual = percentToDecimal(form.inflationPct);
    const withdrawalRate = percentToDecimal(form.withdrawalRatePct);
    const initialBalance = Math.max(readNumber(form.initialBalance, 0), 0);
    let contribution = Math.max(readNumber(form.monthlyContribution, 0), 0);
    const monthlyContributionGrowth = Math.pow(1 + contributionGrowthAnnual, 1 / 12) - 1;
    const monthlyInflation = Math.pow(1 + inflationAnnual, 1 / 12) - 1;
    const goal = Math.max(readNumber(form.goalAmount, 0), 0);
    const annualRate = Math.pow(1 + monthlyRate, 12) - 1;

    let balance = initialBalance;
    let contributionTotal = initialBalance;
    const checkpoints = [];
    const series = [{ month: 0, label: "Hoje", Patrimônio: balance, Aportado: contributionTotal }];

    for (let month = 1; month <= horizon; month += 1) {
      balance += contribution;
      contributionTotal += contribution;
      balance *= 1 + monthlyRate;
      if (month === horizon || month % 12 === 0) {
        checkpoints.push({ month, balance, contributionTotal, monthlyYield: balance * monthlyRate });
        series.push({ month, label: month % 12 === 0 ? `${month / 12}º ano` : `${month}º mês`, Patrimônio: balance, Aportado: contributionTotal });
      }
      if (month < horizon) contribution *= 1 + monthlyContributionGrowth;
    }

    let goalMonths = null;
    if (goal > 0) {
      let simulatedBalance = initialBalance;
      let simulatedContribution = Math.max(readNumber(form.monthlyContribution, 0), 0);
      let monthCounter = 0;
      while (monthCounter < MAX_GOAL_MONTHS && simulatedBalance < goal) {
        monthCounter += 1;
        simulatedBalance += simulatedContribution;
        simulatedBalance *= 1 + monthlyRate;
        simulatedContribution *= 1 + monthlyContributionGrowth;
      }
      if (simulatedBalance >= goal) goalMonths = monthCounter;
    }

    return {
      horizon,
      monthlyRate,
      annualRate,
      nominalBalance: balance,
      realBalance: horizon ? balance / Math.pow(1 + monthlyInflation, horizon) : balance,
      totalContribution: contributionTotal,
      totalYield: balance - contributionTotal,
      finalContribution: contribution,
      checkpoints,
      series,
      goal,
      goalMonths,
      passiveIncomeMonthly: balance * withdrawalRate,
      withdrawalRate,
    };
  }, [form]);

  const goalMessage = projection.goal > 0 ? formatGoalMessage(projection.goalMonths) : null;
  const money = (key) => (value) => setForm((prev) => ({ ...prev, [key]: withPrecision(Math.max(value, 0), 2, prev[key]) }));
  const pct = (key, { min = -50 } = {}) => (event) =>
    setForm((prev) => ({ ...prev, [key]: withPrecision(Math.max(readNumber(event.target.value, prev[key]), min), 2, prev[key]) }));

  return (
    <section className="space-y-4">
      <div className="card-pad">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink">Projeção de patrimônio</h2>
            <p className="text-sm text-muted">
              Juros compostos mensais a partir do seu patrimônio atual, aportes e rentabilidade histórica. Ajuste os campos para testar cenários.
            </p>
          </div>
          <button type="button" onClick={() => setShowAdvanced((prev) => !prev)} className="btn btn-sm self-start">
            {showAdvanced ? "Ocultar avançado" : "Campos avançados"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <label className="block min-w-0">
            <span className="label">Patrimônio atual</span>
            <CurrencyInput tone={false} value={form.initialBalance} onChange={money("initialBalance")} />
          </label>
          <label className="block min-w-0">
            <span className="label">Aporte mensal</span>
            <CurrencyInput tone={false} value={form.monthlyContribution} onChange={money("monthlyContribution")} />
            {trailingStats.monthsConsidered > 0 && (
              <span className="mt-0.5 block text-[0.68rem] text-faint">Média {trailingStats.monthsConsidered}m: {fmtBRL(trailingStats.cashFlowAverage || 0)}</span>
            )}
          </label>
          <label className="block min-w-0">
            <span className="label">Horizonte (meses)</span>
            <input
              type="number"
              min="1"
              max="600"
              step="6"
              value={form.horizonMonths}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, horizonMonths: Math.max(Math.floor(readNumber(event.target.value, prev.horizonMonths) || 1), 1) }))
              }
              className="input num"
            />
            <span className="mt-0.5 block text-[0.68rem] text-faint">{(form.horizonMonths / 12).toFixed(1)} anos</span>
          </label>
          <PctInput
            label="Rentabilidade mensal"
            value={form.monthlyReturnPct}
            onChange={pct("monthlyReturnPct")}
            min="-50"
            max="50"
            hint={
              trailingStats.yieldAverage !== null
                ? `Média 6m: ${fmtPct(trailingStats.yieldAverage)}${trailingStats.volatility ? ` · volat. ${fmtPct(trailingStats.volatility)}` : ""}`
                : "Equivale a " + fmtPct(projection.annualRate) + " ao ano"
            }
          />
          <label className="block min-w-0">
            <span className="label">Meta de patrimônio</span>
            <CurrencyInput tone={false} value={form.goalAmount} onChange={money("goalAmount")} />
          </label>
        </div>

        {showAdvanced && (
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 md:grid-cols-3">
            <PctInput label="Inflação anual" value={form.inflationPct} onChange={pct("inflationPct", { min: 0 })} min="0" max="30" step="0.1" />
            <PctInput label="Crescimento anual dos aportes" value={form.contributionGrowthPct} onChange={pct("contributionGrowthPct")} min="-50" max="50" step="0.1" />
            <PctInput label="Taxa de retirada mensal" value={form.withdrawalRatePct} onChange={pct("withdrawalRatePct", { min: 0 })} min="0" max="20" step="0.1" hint="Para estimar renda passiva" />
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ResultItem title="Patrimônio projetado" value={fmtBRL(projection.nominalBalance)} description="Valor nominal ao final do horizonte" tone="text-accent" />
        <ResultItem title="Em poder de compra atual" value={fmtBRL(projection.realBalance)} description="Descontando a inflação informada" />
        <ResultItem title="Total aportado" value={fmtBRL(projection.totalContribution)} description="Patrimônio atual + aportes do período" />
        <ResultItem title="Rendimentos acumulados" value={fmtBRL(projection.totalYield)} description={`Taxa anual equivalente: ${fmtPct(projection.annualRate)}`} tone="text-pos" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-4 lg:col-span-2">
          <h3 className="mb-2 text-sm font-semibold text-ink">Evolução projetada</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={projection.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="proj-balance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgb(var(--c-accent))" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="rgb(var(--c-accent))" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={fmtCompact} tickLine={false} axisLine={false} width={56} />
                <Tooltip formatter={(value) => fmtBRL(value)} />
                <Legend />
                <Area type="monotone" dataKey="Patrimônio" stroke="rgb(var(--c-accent))" fill="url(#proj-balance)" strokeWidth={2} />
                <Area type="monotone" dataKey="Aportado" stroke="rgb(var(--c-muted))" fill="transparent" strokeDasharray="4 4" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-4">
          <h3 className="text-sm font-semibold text-ink">Meta e renda passiva</h3>
          {projection.goal > 0 ? (
            <p className="mt-2 text-sm text-muted">
              Para alcançar <strong className="text-ink">{fmtBRL(projection.goal)}</strong> seriam necessários aproximadamente{" "}
              <strong className="text-ink">{goalMessage}</strong>.
              {projection.goalMonths === null ? " Ajuste aportes ou rentabilidade." : ""}
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted">Defina uma meta para estimar o tempo necessário.</p>
          )}
          <div className="mt-3 rounded-lg bg-surface-2 p-3 text-xs text-muted">
            <div>Renda passiva estimada ao final:</div>
            <div className="num mt-0.5 text-base font-semibold text-ink">{fmtBRL(projection.passiveIncomeMonthly)}/mês</div>
            <div className="mt-1">Retirando {fmtPct(projection.withdrawalRate)} ao mês do patrimônio projetado.</div>
          </div>
          {projection.checkpoints.length > 0 && (
            <ul className="mt-3 max-h-48 space-y-1 overflow-auto text-xs">
              {projection.checkpoints.map((c) => (
                <li key={c.month} className="flex items-center justify-between rounded-md bg-surface-2 px-2 py-1">
                  <span className="text-muted">{c.month % 12 === 0 ? `${c.month / 12}º ano` : `${c.month}º mês`}</span>
                  <span className="num font-semibold text-ink">{fmtBRL(c.balance)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <p className="text-xs text-faint">Estimativas, não garantia de performance. Teste cenários otimista, conservador e intermediário.</p>
    </section>
  );
}
