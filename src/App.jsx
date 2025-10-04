import { useEffect, useMemo, useRef, useState } from "react";
import { Dashboard } from "./components/Dashboard.jsx";
import { Entrada } from "./components/Entrada.jsx";
import { Historico } from "./components/Historico.jsx";
import { KPICard } from "./components/KPICard.jsx";
import { demoEntries, emptyEntry } from "./data/demoEntries.js";
import { useLocalStorageState } from "./hooks/useLocalStorageState.js";
import { download, fmtBRL, LS_KEY, toNumber, yyyymm } from "./utils/formatters.js";

export default function App() {
  const [entries, setEntries] = useLocalStorageState(LS_KEY, []);
  const [tab, setTab] = useState("dashboard");
  const [form, setForm] = useState(emptyEntry);
  const fileRef = useRef(null);

  const monthly = useMemo(() => {
    const map = new Map();
    for (const e of entries) {
      const key = yyyymm(e.date);
      if (!key) continue;
      const curr = map.get(key) || {
        ym: key,
        invested: 0,
        inAccount: 0,
        cashFlow: 0,
        yieldValue: 0,
      };
      curr.invested += toNumber(e.invested);
      curr.inAccount += toNumber(e.inAccount);
      curr.cashFlow += toNumber(e.cashFlow);
      curr.yieldValue += toNumber(e.yieldValue);
      map.set(key, curr);
    }
    const arr = Array.from(map.values()).sort((a, b) => (a.ym < b.ym ? -1 : 1));
    return arr;
  }, [entries]);

  const timeseries = useMemo(() => {
    const map = new Map();
    for (const e of entries) {
      const day = new Date(e.date);
      if (isNaN(day)) continue;
      const key = day.toISOString().slice(0, 10);
      const curr = map.get(key) || { date: key, invested: 0, inAccount: 0, cashFlow: 0, yieldValue: 0 };
      curr.invested += toNumber(e.invested);
      curr.inAccount += toNumber(e.inAccount);
      curr.cashFlow += toNumber(e.cashFlow);
      curr.yieldValue += toNumber(e.yieldValue);
      map.set(key, curr);
    }
    return Array.from(map.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [entries]);

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

  function addEntry(ev) {
    ev.preventDefault();
    if (!form.date || !form.bank) return;
    setEntries([
      ...entries,
      {
        ...form,
        invested: toNumber(form.invested),
        inAccount: toNumber(form.inAccount),
        cashFlow: toNumber(form.cashFlow),
        yieldValue: toNumber(form.yieldValue),
        yieldPct: Number(form.yieldPct) || 0,
      },
    ]);
    setForm({ ...emptyEntry, date: form.date, bank: form.bank });
    setTab("historico");
  }

  function exportJson() {
    const payload = { version: 1, exportedAt: new Date().toISOString(), entries };
    download(`investimentos_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(payload, null, 2));
  }

  function importJsonFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data)) {
          setEntries(data);
        } else if (data && Array.isArray(data.entries)) {
          setEntries(data.entries);
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
      setEntries(demoEntries);
    }
  }

  useEffect(() => {
    if (entries.length === 0) {
      // keep empty: used to trigger initial side effects if needed
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen w-full bg-slate-50 p-6 text-slate-800">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Monitor de Investimentos – Leo</h1>
            <p className="text-sm text-slate-600">
              Adicione lançamentos, visualize o histórico por mês e gere gráficos. Seus dados ficam apenas no seu navegador
              (localStorage).
            </p>
          </div>
          <div className="flex gap-2">
            <TabButton active={tab === "dashboard"} onClick={() => setTab("dashboard")}>
              Dashboard
            </TabButton>
            <TabButton active={tab === "historico"} onClick={() => setTab("historico")}>Histórico</TabButton>
            <TabButton active={tab === "entrada"} onClick={() => setTab("entrada")}>Nova Entrada</TabButton>
          </div>
        </header>

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard title="Total Investido" value={fmtBRL(totals.invested)} subtitle="Soma atual de 'Valor em Investimentos'" />
          <KPICard title="Total em Conta" value={fmtBRL(totals.inAccount)} subtitle="Soma atual de 'Valor na Conta'" />
          <KPICard title="Entradas/Líquido" value={fmtBRL(totals.cashFlow)} subtitle="Soma de entradas/saídas" />
          <KPICard title="Rendimento (BRL)" value={fmtBRL(totals.yieldValue)} subtitle="Soma dos rendimentos informados" />
        </section>

        <section className="mb-6 flex flex-wrap items-center gap-2">
          <button onClick={exportJson} className="rounded-xl bg-slate-900 px-4 py-2 text-white shadow">
            Exportar (.json)
          </button>
          <label className="cursor-pointer rounded-xl bg-white px-4 py-2 shadow">
            Importar (.json)
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => e.target.files && e.target.files[0] && importJsonFile(e.target.files[0])}
            />
          </label>
          <button onClick={loadDemo} className="rounded-xl bg-white px-4 py-2 shadow">
            Carregar exemplo
          </button>
          <button
            onClick={() => {
              if (window.confirm("Tem certeza que deseja apagar todos os lançamentos?")) setEntries([]);
            }}
            className="rounded-xl bg-white px-4 py-2 shadow"
          >
            Limpar tudo
          </button>
        </section>

        {tab === "dashboard" && <Dashboard monthly={monthly} timeseries={timeseries} />}

        {tab === "historico" && <Historico entries={entries} setEntries={setEntries} />}

        {tab === "entrada" && <Entrada form={form} setForm={setForm} onSubmit={addEntry} />}

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
      className={`rounded-2xl px-4 py-2 text-sm font-medium shadow ${
        active ? "bg-slate-900 text-white" : "bg-white"
      }`}
    >
      {children}
    </button>
  );
}

