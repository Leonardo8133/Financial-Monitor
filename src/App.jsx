import { useEffect, useMemo, useRef, useState } from "react";
import { Dashboard } from "./components/Dashboard.jsx";
import { Entrada } from "./components/Entrada.jsx";
import { Historico } from "./components/Historico.jsx";
import { KPICard } from "./components/KPICard.jsx";
import { demoBanks, demoCreatedAt, demoEntries } from "./data/demoEntries.js";
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
import {
  computeDerivedEntries,
  computeTotals,
  createDraftEntry,
  makeId,
  withId,
} from "./utils/entries.js";
import { DEFAULT_BANKS, ensureBankInLibrary } from "./config/banks.js";

const STORAGE_SEED = {
  entries: [],
  banks: DEFAULT_BANKS,
  createdAt: new Date().toISOString(),
};

export default function App() {
  const [store, setStore] = useLocalStorageState(LS_KEY, STORAGE_SEED);
  const entries = Array.isArray(store.entries) ? store.entries : [];
  const banks = Array.isArray(store.banks) && store.banks.length ? store.banks : DEFAULT_BANKS;
  const createdAt = store.createdAt ?? STORAGE_SEED.createdAt;

  const [tab, setTab] = useState("dashboard");
  const [drafts, setDrafts] = useState(() => [createDraftEntry()]);
  const fileRef = useRef(null);

  const setEntries = (updater) => {
    setStore((prev) => {
      const currentEntries = Array.isArray(prev.entries) ? prev.entries : [];
      const candidateEntries = typeof updater === "function" ? updater(currentEntries) : updater;
      const nextEntries = Array.isArray(candidateEntries) ? candidateEntries : [];
      const currentBanks = Array.isArray(prev.banks) && prev.banks.length ? prev.banks : DEFAULT_BANKS;
      const mergedBanks = mergeBanksFromEntries(nextEntries, currentBanks);
      return { ...prev, entries: nextEntries, banks: mergedBanks };
    });
  };

  const setCreatedAt = (value) => {
    setStore((prev) => ({ ...prev, createdAt: value }));
  };

  useEffect(() => {
    if (Array.isArray(store)) {
      const normalized = store.map(withId);
      setStore({
        entries: normalized,
        banks: mergeBanksFromEntries(normalized, DEFAULT_BANKS),
        createdAt: new Date().toISOString(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entriesWithIds = useMemo(
    () => entries.map((entry) => (entry.id ? entry : withId(entry))),
    [entries]
  );

  useEffect(() => {
    const needsIds = entries.some((entry) => !entry.id);
    if (needsIds) {
      setEntries(entriesWithIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!store.createdAt) {
      setCreatedAt(new Date().toISOString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.createdAt]);

  const derivedEntries = useMemo(
    () => computeDerivedEntries(entriesWithIds),
    [entriesWithIds]
  );

  const monthly = useMemo(() => {
    const byMonth = new Map();
    for (const entry of derivedEntries) {
      const key = yyyymm(entry.date);
      if (!key) continue;
      const base =
        byMonth.get(key) || {
          ym: key,
          invested: 0,
          inAccount: 0,
          cashFlow: 0,
          yieldValue: 0,
          previousTotal: 0,
        };
      base.invested += toNumber(entry.invested);
      base.inAccount += toNumber(entry.inAccount);
      base.cashFlow += toNumber(entry.cashFlow);
      if (entry.yieldValue !== null && entry.yieldValue !== undefined) {
        base.yieldValue += entry.yieldValue;
        base.previousTotal += entry.previousTotal ?? 0;
      }
      byMonth.set(key, base);
    }

    return Array.from(byMonth.values())
      .map((month) => ({
        ...month,
        yieldPct: month.previousTotal ? month.yieldValue / month.previousTotal : null,
      }))
      .sort((a, b) => (a.ym < b.ym ? -1 : 1));
  }, [derivedEntries]);

  const monthlyLookup = useMemo(
    () => new Map(monthly.map((m) => [m.ym, m])),
    [monthly]
  );

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
        yieldPct: null,
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

  const totals = useMemo(() => computeTotals(derivedEntries), [derivedEntries]);
  const lastMonth = timeline.at(-1);

  function handleSubmitDrafts(rows) {
    const prepared = rows
      .filter((row) => row.bank && row.date)
      .map((row) => ({
        id: makeId(),
        bank: row.bank.trim(),
        date: row.date,
        invested: toNumber(row.invested),
        inAccount: toNumber(row.inAccount),
        cashFlow: toNumber(row.cashFlow),
      }));
    if (!prepared.length) return;

    setEntries((prev) => [...prev, ...prepared]);
    setDrafts([createDraftEntry()]);
    setTab("historico");
  }

  function exportJson() {
    const summary = computeTotals(derivedEntries);
    const strippedEntries = entriesWithIds.map(({ id, yieldValue, yieldPct, previousTotal, computedTotal, ...rest }) => rest);
    const payload = {
      version: 2,
      created_at: createdAt,
      exported_at: new Date().toISOString(),
      banks,
      inputs: [
        {
          summary,
          entries: strippedEntries,
        },
      ],
    };
    download(
      `investimentos_${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2)
    );
  }

  function downloadTemplate() {
    const template = {
      version: 2,
      created_at: new Date().toISOString(),
      banks: [
        { name: "Banco Exemplo", color: "#2563EB", icon: "🏦" },
      ],
      inputs: [
        {
          summary: {
            total_invested: 1000,
            total_in_account: 0,
            total_input: 1000,
            total_yield_value: 0,
          },
          entries: [
            {
              bank: "Banco Exemplo",
              date: "2025-01-15",
              inAccount: 0,
              invested: 1000,
              cashFlow: 1000,
            },
          ],
        },
      ],
    };
    download("template_investimentos.json", JSON.stringify(template, null, 2));
  }

  function importJsonFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data)) {
          const normalized = data.map(withId);
          setStore((prev) => ({
            ...prev,
            entries: normalized,
            banks: mergeBanksFromEntries(normalized, prev.banks || DEFAULT_BANKS),
          }));
        } else if (data && Array.isArray(data.inputs)) {
          const inputEntries = data.inputs.flatMap((section) => section.entries || []);
          const normalized = inputEntries.map(withId);
          const incomingBanks = Array.isArray(data.banks) && data.banks.length ? data.banks : banks;
          const created = data.created_at || createdAt || new Date().toISOString();
          setStore({
            entries: normalized,
            banks: mergeBanksFromEntries(normalized, incomingBanks),
            createdAt: created,
          });
        } else if (data && Array.isArray(data.entries)) {
          const normalized = data.entries.map(withId);
          setStore((prev) => ({
            ...prev,
            entries: normalized,
            banks: mergeBanksFromEntries(normalized, prev.banks || DEFAULT_BANKS),
          }));
        } else {
          window.alert(
            "Arquivo inválido. Esperado JSON com a chave 'inputs' ou um array de lançamentos."
          );
        }
      } catch (e) {
        window.alert("Falha ao ler JSON: " + e.message);
      }
    };
    reader.readAsText(file);
  }

  function loadDemo() {
    if (!entries.length && window.confirm("Carregar dados de exemplo? Você pode apagar depois.")) {
      const normalized = demoEntries.map(withId);
      setStore({
        entries: normalized,
        banks: mergeBanksFromEntries(normalized, demoBanks),
        createdAt: demoCreatedAt,
      });
    }
  }

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
              <ActionButton onClick={downloadTemplate}>Template</ActionButton>
              <ActionButton
                onClick={() => {
                  if (window.confirm("Tem certeza que deseja apagar todos os lançamentos?")) setEntries([]);
                }}
              >
                Limpar
              </ActionButton>
            </div>
            <div className="flex items-center justify-end gap-2">
              <TabButton active={tab === "dashboard"} onClick={() => setTab("dashboard")}>
                Dashboard
              </TabButton>
              <TabButton active={tab === "historico"} onClick={() => setTab("historico")}>Histórico</TabButton>
              <TabButton active={tab === "entrada"} onClick={() => setTab("entrada")}>Nova Entrada</TabButton>
            </div>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <KPICard title="Total Investido" value={fmtBRL(totals.total_invested)} subtitle="Soma atual de 'Valor em Investimentos'" />
          <KPICard
            title="Investido último mês"
            value={fmtBRL(lastMonth?.invested ?? 0)}
            subtitle={lastMonth ? `Referente a ${lastMonth.label}` : "Sem dados do mês"}
          />
          <KPICard
            title="Rendimento último mês"
            value={
              lastMonth && lastMonth.yieldValue !== null && lastMonth.yieldValue !== undefined
                ? fmtBRL(lastMonth.yieldValue)
                : "–"
            }
            secondaryValue={
              lastMonth && lastMonth.yieldPct !== null && lastMonth.yieldPct !== undefined
                ? fmtPct(lastMonth.yieldPct)
                : ""
            }
            tone={resolveTone(lastMonth?.yieldValue)}
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

        {tab === "historico" && (
          <Historico
            entries={entriesWithIds}
            computedEntries={derivedEntries}
            setEntries={setEntries}
            banks={banks}
          />
        )}

        {tab === "entrada" && (
          <Entrada drafts={drafts} setDrafts={setDrafts} onSubmit={handleSubmitDrafts} banks={banks} />
        )}

        <footer className="mt-10 text-center text-xs text-slate-500">
          <p>
            Dica: clique em <strong>Exportar</strong> para salvar um arquivo local. Você pode importar depois para continuar de
            onde parou.
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

function resolveTone(value) {
  if (value === null || value === undefined) return "neutral";
  if (value < 0) return "negative";
  if (value > 0) return "positive";
  return "neutral";
}

function mergeBanksFromEntries(entries, baseBanks = DEFAULT_BANKS) {
  let next = Array.isArray(baseBanks) ? [...baseBanks] : [...DEFAULT_BANKS];
  for (const entry of entries) {
    next = ensureBankInLibrary(entry.bank, next);
  }
  return next;
}
