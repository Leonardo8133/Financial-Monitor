import { useEffect, useMemo, useState } from "react";
import { fmtBRL, fmtPct } from "../utils/formatters.js";

const MAX_GOAL_MONTHS = 600;

function decimalToPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  return Math.round(value * 10000) / 100;
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
  if (goalMonths === null) return "Com os parâmetros atuais a meta não é alcançada em 50 anos.";
  const years = goalMonths / 12;
  const wholeYears = Math.floor(years);
  const remainingMonths = Math.round((years - wholeYears) * 12);
  const yearLabel = wholeYears > 0 ? `${wholeYears} ano${wholeYears > 1 ? "s" : ""}` : "";
  const monthLabel = remainingMonths > 0 ? `${remainingMonths} mês${remainingMonths > 1 ? "es" : ""}` : "";
  return [yearLabel, monthLabel].filter(Boolean).join(" e ") || "menos de um mês";
}

function ResultItem({ title, value, description, tooltip }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4" title={tooltip || description}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
      <p className="mt-1 text-xs text-slate-600">{description}</p>
    </div>
  );
}

export function Projecoes({ timeline = [], defaults = {} }) {
  const safeTimeline = Array.isArray(timeline) ? timeline : [];
  const safeDefaults = defaults ?? {};

  const trailingStats = useMemo(() => {
    const trailing = safeTimeline.slice(-6);
    const contributionValues = trailing
      .map((month) => month?.invested ?? 0)
      .filter((value) => Number.isFinite(value) && value > 0);
    const yieldValues = trailing
      .map((month) => (month?.yieldPct !== null && month?.yieldPct !== undefined ? month.yieldPct : null))
      .filter((value) => value !== null && Number.isFinite(value));
    const cashFlowValues = trailing
      .map((month) => month?.cashFlow ?? 0)
      .filter((value) => Number.isFinite(value));

    const contributionAverage =
      contributionValues.length > 0
        ? contributionValues.reduce((acc, value) => acc + value, 0) / contributionValues.length
        : 0;
    const yieldAverage =
      yieldValues.length > 0 ? yieldValues.reduce((acc, value) => acc + value, 0) / yieldValues.length : null;
    const cashFlowAverage =
      cashFlowValues.length > 0 ? cashFlowValues.reduce((acc, value) => acc + value, 0) / cashFlowValues.length : 0;

    const variance =
      yieldValues.length > 1
        ? yieldValues.reduce((acc, value) => acc + (value - (yieldAverage ?? 0)) ** 2, 0) / (yieldValues.length - 1)
        : 0;
    const volatility = variance > 0 ? Math.sqrt(variance) : 0;

    const last = safeTimeline[safeTimeline.length - 1] || {};
    return {
      monthsConsidered: trailing.length,
      contributionAverage,
      yieldAverage,
      cashFlowAverage,
      volatility,
      lastMonth: {
        invested: Math.max(last.invested ?? 0, 0),
        yieldPct: last.yieldPct ?? null,
      },
    };
  }, [safeTimeline]);

  const [form, setForm] = useState(() => ({
    initialBalance: Math.round(Math.max(safeDefaults.initialBalance ?? 0, 0) * 100) / 100,
    monthlyContribution: Math.round(
      Math.max(
        safeDefaults.monthlyContribution ?? trailingStats.lastMonth.invested ?? trailingStats.contributionAverage ?? 0,
        0
      ) * 100
    ) / 100,
    horizonMonths: 60,
    monthlyReturnPct: Math.round(
      decimalToPercent(
        safeDefaults.monthlyReturn ?? trailingStats.lastMonth.yieldPct ?? trailingStats.yieldAverage ?? 0.005
      ) * 100
    ) / 100,
    inflationPct: decimalToPercent(safeDefaults.inflationRate ?? 0.04),
    contributionGrowthPct: decimalToPercent(safeDefaults.contributionGrowth ?? 0.02),
    goalAmount: Math.max(
      safeDefaults.goalAmount ?? (Math.max(safeDefaults.initialBalance ?? 0, 0) * 2 || (trailingStats.lastMonth.invested || 500) * 200),
      0
    ),
    withdrawalRatePct: decimalToPercent(0.04),
  }));
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      initialBalance: Math.round(Math.max(safeDefaults.initialBalance ?? prev.initialBalance, 0) * 100) / 100,
      monthlyContribution: Math.round(
        Math.max(
          safeDefaults.monthlyContribution ?? trailingStats.lastMonth.invested ?? prev.monthlyContribution,
          0
        ) * 100
      ) / 100,
      goalAmount:
        safeDefaults.goalAmount !== undefined && safeDefaults.goalAmount !== null
          ? Math.max(safeDefaults.goalAmount, 0)
          : prev.goalAmount,
    }));
  }, [
    safeDefaults.initialBalance,
    safeDefaults.monthlyContribution,
    safeDefaults.goalAmount,
    trailingStats.lastMonth.invested,
  ]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      inflationPct: decimalToPercent(safeDefaults.inflationRate ?? percentToDecimal(prev.inflationPct)),
      contributionGrowthPct: decimalToPercent(
        safeDefaults.contributionGrowth ?? percentToDecimal(prev.contributionGrowthPct)
      ),
    }));
  }, [safeDefaults.inflationRate, safeDefaults.contributionGrowth]);

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

    let balance = initialBalance;
    let contributionTotal = initialBalance;
    const checkpoints = [];

    if (horizon === 0) {
      const annualRate = Math.pow(1 + monthlyRate, 12) - 1;
      return {
        horizon,
        monthlyRate,
        annualRate,
        nominalBalance: balance,
        realBalance: balance,
        totalContribution: contributionTotal,
        totalYield: balance - contributionTotal,
        finalContribution: contribution,
        checkpoints,
        goal: Math.max(readNumber(form.goalAmount, 0), 0),
        goalMonths: null,
        monthlyContributionStart: contribution,
        passiveIncomeMonthly: balance * withdrawalRate / 12,
        withdrawalRate,
      };
    }

    for (let month = 1; month <= horizon; month += 1) {
      balance += contribution;
      contributionTotal += contribution;
      balance *= 1 + monthlyRate;
      if (month === horizon || month % 12 === 0) {
        checkpoints.push({
          month,
          balance,
          contributionTotal,
        });
      }
      if (month < horizon) {
        contribution *= 1 + monthlyContributionGrowth;
      }
    }

    const totalYield = balance - contributionTotal;
    const realBalance = balance / Math.pow(1 + monthlyInflation, horizon);
    const finalContribution = contribution;
    const annualRate = Math.pow(1 + monthlyRate, 12) - 1;
    const goal = Math.max(readNumber(form.goalAmount, 0), 0);

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
      if (simulatedBalance >= goal) {
        goalMonths = monthCounter;
      }
    }

    const passiveIncomeMonthly = balance * withdrawalRate / 12;

    return {
      horizon,
      monthlyRate,
      annualRate,
      nominalBalance: balance,
      realBalance,
      totalContribution: contributionTotal,
      totalYield,
      finalContribution,
      checkpoints,
      goal,
      goalMonths,
      monthlyContributionStart: Math.max(readNumber(form.monthlyContribution, 0), 0),
      passiveIncomeMonthly,
      withdrawalRate,
    };
  }, [form]);

  const goalMessage = projection.goal > 0 ? formatGoalMessage(projection.goalMonths) : null;

  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Projeção de patrimônio</h2>
            <p className="text-sm text-slate-600">
              Utilize seus aportes médios e a rentabilidade histórica para estimar o crescimento do patrimônio. Os cálculos
              assumem juros compostos mensais com possibilidade de ajustes avançados.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAdvanced((prev) => !prev)}
            className="self-start rounded-lg border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
            title="Campos avançados permitem ajustar inflação, crescimento dos aportes, meta e taxa de retirada"
          >
            {showAdvanced ? "Ocultar campos avançados" : "Mostrar campos avançados"}
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm" title="Valor já aplicado atualmente (base para a projeção)">
            Patrimônio atual (R$)
            <input
              type="number"
              min="0"
              step="100"
              value={form.initialBalance}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, initialBalance: Math.max(readNumber(event.target.value, 0), 0) }))
              }
              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <label
            className="flex flex-col gap-1 text-sm"
            title="Aporte médio mensal considerado. Você pode usar o valor sugerido pelos últimos meses."
          >
            Aporte mensal médio (R$)
            <input
              type="number"
              min="0"
              step="50"
              value={form.monthlyContribution}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  monthlyContribution: Math.max(readNumber(event.target.value, 0), 0),
                }))
              }
              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            {trailingStats.monthsConsidered > 0 && (
              <span className="text-xs text-slate-500">
                Média últimos {trailingStats.monthsConsidered} meses: {fmtBRL(trailingStats.contributionAverage || 0)}
              </span>
            )}
          </label>

          <label
            className="flex flex-col gap-1 text-sm"
            title="Quantidade de meses que o patrimônio ficará investido nesta simulação"
          >
            Horizonte (meses)
            <input
              type="number"
              min="1"
              max="600"
              step="1"
              value={form.horizonMonths}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, horizonMonths: Math.max(readNumber(event.target.value, 1), 1) }))
              }
              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <label
            className="flex flex-col gap-1 text-sm"
            title="Valor objetivo que você deseja alcançar ao final da projeção"
          >
            Meta de patrimônio (R$)
            <input
              type="number"
              min="0"
              step="1000"
              value={form.goalAmount}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, goalAmount: Math.max(readNumber(event.target.value, 0), 0) }))
              }
              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <div className="flex flex-col gap-1 text-sm">
            <label
              className="flex items-center justify-between"
              title="Rentabilidade mensal líquida utilizada na projeção"
              htmlFor="monthlyReturnPct"
            >
              <span>Rentabilidade mensal (%)</span>
              <span className="text-xs text-slate-500">
                {safeTimeline.length && safeTimeline[safeTimeline.length - 1].yieldPct !== null && safeTimeline[safeTimeline.length - 1].yieldPct !== undefined
                  ? `Último mês: ${fmtPct(safeTimeline[safeTimeline.length - 1].yieldPct)}`
                  : ""}
              </span>
            </label>
            <input
              type="number"
              min="-50"
              max="50"
              step="0.01"
              id="monthlyReturnPct"
              value={form.monthlyReturnPct}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  monthlyReturnPct: Math.round(readNumber(event.target.value, prev.monthlyReturnPct) * 100) / 100,
                }))
              }
              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            {trailingStats.monthsConsidered > 0 && (
              <span className="text-xs text-slate-500">
                Média últimos {trailingStats.monthsConsidered} meses:{" "}
                {trailingStats.yieldAverage !== null ? fmtPct(trailingStats.yieldAverage) : "–"}
                {trailingStats.volatility > 0 ? ` · Volatilidade: ${fmtPct(trailingStats.volatility)}` : ""}
              </span>
            )}
          </div>
        </div>

        {showAdvanced && (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label
              className="flex flex-col gap-1 text-sm"
              title="Inflação anual estimada para descontar o poder de compra no resultado"
            >
              Inflação anual (%)
              <input
                type="number"
                min="0"
                max="30"
                step="0.1"
                value={form.inflationPct}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, inflationPct: Math.max(readNumber(event.target.value, 0), 0) }))
                }
              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>

            <label
              className="flex flex-col gap-1 text-sm"
              title="Crescimento esperado dos aportes ano a ano, útil para reajustes salariais"
            >
              Crescimento anual dos aportes (%)
              <input
                type="number"
                min="-50"
                max="50"
                step="0.1"
                value={form.contributionGrowthPct}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    contributionGrowthPct: readNumber(event.target.value, prev.contributionGrowthPct),
                  }))
                }
              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>

            

            <label
              className="flex flex-col gap-1 text-sm"
              title="Taxa de retirada segura usada para estimar renda passiva futura"
            >
              Taxa de retirada anual (%)
              <input
                type="number"
                min="0"
                max="20"
                step="0.1"
                value={form.withdrawalRatePct}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, withdrawalRatePct: Math.max(readNumber(event.target.value, 0), 0) }))
                }
              className="w-full rounded-lg border border-slate-200 px-2 py-1 text-xs shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </label>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <ResultItem
          title="Patrimônio projetado (nominal)"
          value={fmtBRL(projection.nominalBalance)}
          description="Valor estimado ao final do período sem descontos de inflação"
          tooltip="Calculado aplicando juros compostos mensais sobre o saldo inicial mais aportes"
        />
        <ResultItem
          title="Patrimônio ajustado"
          value={fmtBRL(projection.realBalance)}
          description="Valor equivalente em poder de compra atual considerando a inflação"
          tooltip="Saldo nominal dividido pelo fator de inflação acumulado"
        />
        <ResultItem
          title="Total aportado"
          value={fmtBRL(projection.totalContribution)}
          description="Somatório do patrimônio atual com todos os aportes projetados"
          tooltip="Soma dos aportes mensais adicionados antes da aplicação da rentabilidade"
        />
        <ResultItem
          title="Rendimentos acumulados"
          value={fmtBRL(projection.totalYield)}
          description="Diferença entre patrimônio projetado e o total investido"
          tooltip="Resultado líquido dos juros compostos após considerar os aportes"
        />
        <ResultItem
          title="Último aporte estimado"
          value={fmtBRL(projection.finalContribution)}
          description="Valor aproximado do aporte no último mês da projeção"
          tooltip="Considera o crescimento anual dos aportes informado"
        />
        <ResultItem
          title="Taxa anual equivalente"
          value={fmtPct(projection.annualRate)}
          description="Conversão da taxa mensal em rentabilidade anual"
          tooltip="(1 + taxa mensal)^12 - 1"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Meta financeira</h3>
          {projection.goal > 0 ? (
            <p className="mt-2 text-sm text-slate-600" title="Projeção considerando aportes e rentabilidade informados">
              Para alcançar {fmtBRL(projection.goal)} seriam necessários aproximadamente {goalMessage}.
              {projection.goalMonths === null
                ? " Ajuste aportes, horizonte ou rentabilidade para atingir a meta."
                : ""}
            </p>
          ) : (
            <p className="mt-2 text-sm text-slate-600">Defina uma meta para avaliar o tempo estimado de alcance.</p>
          )}
          <p className="mt-4 text-xs text-slate-500" title="Estimativa de renda passiva usando a taxa de retirada anual informada">
            Renda passiva mensal estimada: {fmtBRL(projection.passiveIncomeMonthly)} ({fmtPct(projection.withdrawalRate)} ao ano sobre o patrimônio ajustado).
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900" title="Checkpoints com juros compostos e aportes cumulativos">
            Evolução anual aproximada
          </h3>
          {projection.checkpoints.length ? (
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {projection.checkpoints.map((checkpoint) => (
                <li
                  key={checkpoint.month}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
                  title="Saldo acumulado e capital investido até o período indicado"
                >
                  <span>
                    {checkpoint.month % 12 === 0
                      ? `${checkpoint.month / 12}º ano`
                      : `${checkpoint.month}º mês`}
                  </span>
                  <span className="text-right">
                    <span className="block font-semibold text-slate-900">{fmtBRL(checkpoint.balance)}</span>
                    <span className="block text-xs text-slate-500">Aportes acumulados: {fmtBRL(checkpoint.contributionTotal)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-slate-600">Informe um horizonte maior para gerar pontos de acompanhamento.</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-dashed border-blue-200 bg-blue-50 p-4 text-xs text-blue-700">
        <p>
          Os resultados são estimativas e não constituem garantia de performance. Ajuste rentabilidade, inflação e aportes
          para testar cenários otimista, conservador e intermediário.
        </p>
      </div>
    </section>
  );
}
