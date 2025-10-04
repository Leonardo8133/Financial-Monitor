import { Field } from "./Field.jsx";

export function Entrada({ form, setForm, onSubmit }) {
  function set(name, value) {
    setForm((f) => ({ ...f, [name]: value }));
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl bg-white p-4 shadow">
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Data">
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => set("date", e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
          />
        </Field>
        <Field label="Banco/Origem">
          <input
            type="text"
            required
            placeholder="ex.: Nubank Caixinhas"
            value={form.bank}
            onChange={(e) => set("bank", e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
          />
        </Field>
        <Field label="Valor na Conta (R$)">
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={form.inAccount}
            onChange={(e) => set("inAccount", e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
          />
        </Field>
        <Field label="Valor em Investimentos (R$)">
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={form.invested}
            onChange={(e) => set("invested", e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
          />
        </Field>
        <Field label="Entrada/Saída (R$)">
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={form.cashFlow}
            onChange={(e) => set("cashFlow", e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
          />
          <p className="mt-1 text-xs text-slate-500">Use negativo para saídas.</p>
        </Field>
        <Field label="Rendimento (R$)">
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={form.yieldValue}
            onChange={(e) => set("yieldValue", e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
          />
        </Field>
        <Field label="Rendimento (%)">
          <input
            type="number"
            step="0.0001"
            inputMode="decimal"
            placeholder="ex.: 0.0195 = 1,95%"
            value={form.yieldPct}
            onChange={(e) => set("yieldPct", e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400"
          />
        </Field>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-white shadow">
          Adicionar lançamento
        </button>
        <span className="text-xs text-slate-500">Os dados são salvos automaticamente no seu navegador.</span>
      </div>

      <div className="mt-6 rounded-xl border border-dashed p-4 text-xs text-slate-600">
        <p className="mb-2 font-semibold">Como usar:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Preencha <strong>Data</strong> e <strong>Banco/Origem</strong> (obrigatórios) e os demais campos conforme necessário.
          </li>
          <li>
            Vá em <strong>Exportar (.json)</strong> para fazer backup; depois use <strong>Importar (.json)</strong> para restaurar.
          </li>
          <li>A <strong>aba Dashboard</strong> mostra gráficos e consolidados mensais.</li>
        </ul>
      </div>
    </form>
  );
}
