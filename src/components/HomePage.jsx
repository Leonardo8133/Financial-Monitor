import { useMemo } from "react";
import { Link } from "react-router-dom";
import { AppShell } from "./AppShell.jsx";
import { useUnifiedStore } from "../store/unifiedStore.js";
import { computeCurrentPosition, buildInvestmentTimeline } from "../utils/investmentAnalytics.js";
import { fmtBRL, monthLabel, yyyymm } from "../utils/formatters.js";
import { ChartBarIcon, WalletIcon, SettingsIcon } from "./icons.jsx";

export function HomePage() {
  const { store } = useUnifiedStore();
  const entries = store.investimentos.entries;
  const expenses = store.gastos.expenses;

  const position = useMemo(() => computeCurrentPosition(entries), [entries]);
  const timeline = useMemo(() => buildInvestmentTimeline(entries, { aggregation: "carry" }), [entries]);
  const lastMonth = timeline.at(-1);

  const monthStats = useMemo(() => {
    const months = Array.from(new Set(expenses.map((e) => yyyymm(e.date)).filter(Boolean))).sort();
    const ym = months.at(-1);
    if (!ym) return null;
    const items = expenses.filter((e) => yyyymm(e.date) === ym);
    const spent = items.filter((e) => Number(e.value) < 0).reduce((a, e) => a + Math.abs(Number(e.value)), 0);
    const earned = items.filter((e) => Number(e.value) > 0).reduce((a, e) => a + Number(e.value), 0);
    return { ym, spent, earned, count: items.length };
  }, [expenses]);

  const budget = store.gastos.settings.monthlyBudget || 0;
  const name = store.investimentos.personalInfo.fullName || store.gastos.personalInfo.fullName;

  return (
    <AppShell width="max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink md:text-3xl">{name ? `Olá, ${name.split(" ")[0]}` : "Monitor Financeiro"}</h1>
        <p className="mt-1 text-sm text-muted">Seus dados ficam só neste navegador. Exporte um backup de vez em quando.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link to="/investimentos" className="card group p-5 transition hover:border-accent/50 hover:shadow-pop">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-lg font-semibold text-ink">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 text-accent">
                <ChartBarIcon className="h-5 w-5" />
              </span>
              Investimentos
            </span>
            <span className="text-faint transition group-hover:translate-x-0.5">→</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat label="Patrimônio atual" value={fmtBRL(position.total)} />
            <Stat
              label={lastMonth ? `Rendimento ${lastMonth.label}` : "Rendimento"}
              value={lastMonth && lastMonth.yieldValue != null ? fmtBRL(lastMonth.yieldValue) : "–"}
              tone={lastMonth?.yieldValue > 0 ? "text-pos" : lastMonth?.yieldValue < 0 ? "text-neg" : ""}
            />
          </div>
          <p className="mt-3 text-xs text-muted">
            {entries.length ? `${entries.length} lançamentos · ${position.banks.length} bancos` : "Comece registrando o saldo de cada banco."}
          </p>
        </Link>

        <Link to="/gastos" className="card group p-5 transition hover:border-accent/50 hover:shadow-pop">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-lg font-semibold text-ink">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-pos/15 text-pos">
                <WalletIcon className="h-5 w-5" />
              </span>
              Gastos
            </span>
            <span className="text-faint transition group-hover:translate-x-0.5">→</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat label={monthStats ? `Despesas ${monthLabel(monthStats.ym)}` : "Despesas"} value={monthStats ? fmtBRL(monthStats.spent) : "–"} tone="text-neg" />
            <Stat label="Receitas" value={monthStats ? fmtBRL(monthStats.earned) : "–"} tone="text-pos" />
          </div>
          {budget > 0 && monthStats && (
            <div className="mt-3">
              <div className="flex justify-between text-[0.7rem] text-muted">
                <span>Meta mensal</span>
                <span className="num">{Math.round((monthStats.spent / budget) * 100)}% de {fmtBRL(budget)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
                <div
                  className={`h-full rounded-full ${monthStats.spent > budget ? "bg-neg" : "bg-pos"}`}
                  style={{ width: `${Math.min(100, (monthStats.spent / budget) * 100)}%` }}
                />
              </div>
            </div>
          )}
          <p className="mt-3 text-xs text-muted">
            {expenses.length ? `${expenses.length} transações registradas` : "Importe uma fatura ou adicione transações."}
          </p>
        </Link>
      </div>

      <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
        <Link to="/investimentos/entrada" className="btn justify-start">
          + Novo lançamento de investimento
        </Link>
        <Link to="/gastos/entrada" className="btn justify-start">
          + Nova transação / importar fatura
        </Link>
        <Link to="/configuracoes" className="btn justify-start">
          <SettingsIcon className="h-4 w-4" /> Configurações, tema e backup
        </Link>
      </div>
    </AppShell>
  );
}

function Stat({ label, value, tone = "" }) {
  return (
    <div className="rounded-xl bg-surface-2 p-3">
      <div className="text-[0.65rem] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className={`num mt-0.5 text-base font-semibold ${tone || "text-ink"}`}>{value}</div>
    </div>
  );
}
