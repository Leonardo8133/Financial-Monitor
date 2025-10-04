import { useEffect, useMemo, useRef, useState } from "react";
import { Dashboard } from "./components/Dashboard.jsx";
import { Entrada } from "./components/Entrada.jsx";
import { Historico } from "./components/Historico.jsx";
import { KPICard } from "./components/KPICard.jsx";
import { demoEntries } from "./data/demoEntries.js";
import { useLocalStorageState } from "./hooks/useLocalStorageState.js";
import {
  download,
  enumerateMonths,
  fmtBRL,
  fmtPct,
  LS_KEY,
  midOfMonth,
  monthLabel,
  toNumber,
  yyyymm,
} from "./utils/formatters.js";
import { createDraftEntry, makeId, withId } from "./utils/entries.js";

export default function App() {
  const [entries, setEntries] = useLocalStorageState(LS_KEY, []);
  const [tab, setTab] = useState("dashboard");
  const [drafts, setDrafts] = useState(() => [createDraftEntry()]);
  const fileRef = useRef(null);

  const monthly = useMemo(() => {
    const byMonth = new Map();
    for (const entry of entries) {
      const key = yyyymm(entry.date);
      if (!key) continue;
      const base = byMonth.get(key) || {
        ym: key,
        invested: 0,
        inAccount: 0,
        cashFlow: 0,
        yieldValue: 0,
        investedBase: 0,
      };
      const invested = toNumber(entry.invested);
      base.invested += invested;
      base.investedBase += Math.max(0, invested);
      base.inAccount += toNumber(entry.inAccount);
      base.cashFlow += toNumber(entry.cashFlow);
      base.yieldValue += toNumber(entry.yieldValue);
      byMonth.set(key, base);
    }
    return Array.from(byMonth.values())
      .map((month) => ({
        ...month,
        yieldPct: month.investedBase ? month.yieldValue / month.investedBase : 0,
      }))
      .sort((a, b) => (a.ym < b.ym ? -1 : 1));
  }, [entries]);

  const monthlyLookup = useMemo(() => new Map(monthly.map((m) => [m.ym, m])), [monthly]);

  const timeline = useMemo(() => {
    if (monthly.length === 0) return [];
    const months = enumerateMonths(monthly[0].ym, monthly[monthly.length - 1].ym);
    return months.map((ym) => {
      const data = monthlyLookup.get(ym) || {
        ym,
        invested: 0,
        inAccount: 0,
        cashFlow: 0,
        yieldValue: 0,
        yieldPct: 0,
      };
      const midDate = midOfMonth(ym);
      return {
        ...data,
        label: monthLabel(ym),
        midDate,
        midDateValue: midDate.getTime(),
      };
    });
  }, [monthly, monthlyLookup]);

  const totals = useMemo(
    () =>
      entries.reduce(
        (acc, e) => {
          acc.invested += toNumber(e.invested);
          acc.inAccount += toNumber(e.inAccount);
          acc.cashFlow += toNumber(e.cashFlow);
          acc.yieldValue += toNumber(e.yieldValue);
          return acc;
        },
        { invested: 0, inAccount: 0, cashFlow: 0, yieldValue: 0 }
      ),
    [entries]
  );

  const lastMonth = timeline.at(-1);

  function handleSubmitDrafts(rows) {
    const prepared = rows
      .filter((row) => row.bank && row.date)
      .map((row) => ({
        ...row,
        id: makeId(),
        locked: undefined,
        invested: toNumber(row.invested),
        inAccount: toNumber(row.inAccount),
        cashFlow: toNumber(row.cashFlow),
        yieldValue: toNumber(row.yieldValue),
        yieldPct: Number(row.yieldPct) || 0,
      }));
    if (!prepared.length) return;
    setEntries((prev) => [...prev, ...prepared]);
    setDrafts([createDraftEntry()]);
    setTab("historico");
  }

  function exportJson() {
    const payload = { version: 1, exportedAt: new Date().toISOString(), entries };
    download(`investimentos_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2));
  }

  function downloadTemplate() {
    const template = [
      {
        bank: "Banco Exemplo",
        date: "2025-01-15",
        inAccount: 0,
        invested: 1000,
        cashFlow: 1000,
        yieldValue: 10,
        yieldPct: 0.01,
      },
    ];
    download("template_investimentos.json", JSON.stringify(template, null, 2));
  }

  function importJsonFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data)) {
          setEntries(data.map(withId));
        } else if (data && Array.isArray(data.entries)) {
          setEntries(data.entries.map(withId));
        } else {
          alert("Arquivo inválido. Esperado JSON com { entries: [...] } ou um array de lançamentos.");
        }
      } catch (e) {
        alert("Falha ao ler JSON: " + e.message);
      }
    };
    reader.readAsText(file);
  }

  function loadDemo() {
    if (!entries.length && window.confirm("Carregar dados de exemplo? Você pode apagar depois.")) {
      setEntries(demoEntries.map(withId));
    }
  }

  useEffect(() => {
    setEntries((prev) => {
      const needsIds = prev.some((entry) => !entry.id);
      if (!needsIds) return prev;
      return prev.map(withId);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen w-full bg-slate-50 p-6 text-slate-800">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Monitor de Investimentos – Leo</h1>
            <p className="text-sm text-slate-600">
              Adicione lançamentos, visualize o histórico por mês e gere gráficos. Seus dados ficam apenas no seu navegador
              (localStorage).
            </p>
          </div>
          <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
            <div className="flex items-center justify-end gap-2">
              <TabButton active={tab === "dashboard"} onClick={() => setTab("dashboard")}>
                Dashboard
              </TabButton>
              <TabButton active={tab === "historico"} onClick={() => setTab("historico")}>Histórico</TabButton>
              <TabButton active={tab === "entrada"} onClick={() => setTab("entrada")}>Nova Entrada</TabButton>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <ActionButton onClick={exportJson}>Exportar</ActionButton>
              <label className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium shadow-sm transition hover:border-slate-300 hover:text-slate-900">
                Importar
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => e.target.files && e.target.files[0] && importJsonFile(e.target.files[0])}
                />
              </label>
              <ActionButton onClick={downloadTemplate}>Baixar template</ActionButton>
              <ActionButton
                onClick={() => {
                  if (window.confirm("Tem certeza que deseja apagar todos os lançamentos?")) setEntries([]);
                }}
              >
                Limpar dados
              </ActionButton>
            </div>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KPICard
            title="Total Investido"
            value={fmtBRL(totals.invested)}
            subtitle="Soma atual de 'Valor em Investimentos'"
          />
          <KPICard
            title="Investido último mês"
            value={fmtBRL(lastMonth?.invested ?? 0)}
            subtitle={lastMonth ? `Referente a ${lastMonth.label}` : "Sem dados do mês"}
          />
          <KPICard
            title="Rendimento último mês"
            value={fmtBRL(lastMonth?.yieldValue ?? 0)}
            secondaryValue={fmtPct(lastMonth?.yieldPct ?? 0)}
            tone={lastMonth?.yieldValue >= 0 ? "positive" : "negative"}
            subtitle={lastMonth ? `Período ${lastMonth.label}` : "Sem dados do mês"}
          />
          <KPICard
            title="Entrada/Saída último mês"
            value={fmtBRL(lastMonth?.cashFlow ?? 0)}
            tone={(lastMonth?.cashFlow ?? 0) >= 0 ? "positive" : "negative"}
            subtitle={lastMonth ? `Período ${lastMonth.label}` : "Sem dados do mês"}
          />
          <KPICard
            title="Total em Conta último mês"
            value={fmtBRL(lastMonth?.inAccount ?? 0)}
            subtitle={lastMonth ? `Período ${lastMonth.label}` : "Sem dados do mês"}
          />
        </section>

        <section className="mb-6 flex flex-wrap items-center gap-2">
          <button onClick={loadDemo} className="rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs text-slate-600">
            Carregar dados de exemplo
          </button>
        </section>

        {tab === "dashboard" && <Dashboard monthly={timeline} />}

        {tab === "historico" && <Historico entries={entries} setEntries={setEntries} />}

        {tab === "entrada" && <Entrada drafts={drafts} setDrafts={setDrafts} onSubmit={handleSubmitDrafts} />}

        <footer className="mt-10 text-center text-xs text-slate-500">
          <p>
            Dica: clique em <strong>Exportar</strong> para salvar um arquivo local. Você pode importar depois para continuar de onde
            parou.
          </p>
        </footer>
      </div>
    </div>
  );
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
        active ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

function ActionButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
    >
      {children}
    </button>
  );
}

