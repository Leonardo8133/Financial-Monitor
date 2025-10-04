import { createDraftEntry } from "../utils/entries.js";
import { Field } from "./Field.jsx";

export function Entrada({ drafts, setDrafts, onSubmit, banks }) {
  const bankOptionsId = "bank-options";

  function updateRow(id, name, value) {
    setDrafts((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (row.locked) return row;
        return { ...row, [name]: value };
      })
    );
  }

  function toggleLock(id) {
    setDrafts((prev) => prev.map((row) => (row.id === id ? { ...row, locked: !row.locked } : row)));
  }

  function addRow() {
    setDrafts((prev) => [...prev, createDraftEntry()]);
  }

  function removeRow(id) {
    setDrafts((prev) => {
      const next = prev.filter((row) => row.id !== id);
      return next.length ? next : [createDraftEntry()];
    });
  }

  function resetRows() {
    setDrafts([createDraftEntry()]);
  }

  function handleSubmit(ev) {
    ev.preventDefault();
    onSubmit(drafts);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-4 shadow">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-700">Lançamentos em preparação</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addRow}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            Adicionar linha
          </button>
          <button
            type="button"
            onClick={resetRows}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            Limpar rascunho
          </button>
        </div>
      </div>

      <datalist id={bankOptionsId}>
        {banks.map((bank) => (
          <option key={bank.name} value={bank.name} />
        ))}
      </datalist>

      <div className="space-y-4">
        {drafts.map((row, index) => (
          <div key={row.id} className="space-y-3 rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Entrada #{index + 1}</span>
              <div className="flex flex-wrap items-center gap-2">
                {row.locked && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] uppercase">Bloqueado</span>
                )}
                <button
                  type="button"
                  onClick={() => toggleLock(row.id)}
                  className={`rounded-lg px-2 py-1 text-xs font-semibold transition ${
                    row.locked
                      ? "border border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200"
                      : "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  {row.locked ? "Desbloquear" : "Bloquear"}
                </button>
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                >
                  Remover
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <Field className="w-full sm:w-40" label="Data">
                <input
                  type="date"
                  required={!row.locked}
                  value={row.date}
                  disabled={row.locked}
                  onChange={(e) => updateRow(row.id, "date", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100"
                />
              </Field>
              <Field className="min-w-[14rem] flex-1" label="Banco/Origem">
                <input
                  type="text"
                  list={bankOptionsId}
                  required={!row.locked}
                  placeholder="ex.: Nubank Caixinhas"
                  value={row.bank}
                  disabled={row.locked}
                  onChange={(e) => updateRow(row.id, "bank", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100"
                />
              </Field>
              <Field className="w-full sm:w-40" label="Valor na Conta (R$)">
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={row.inAccount}
                  disabled={row.locked}
                  onChange={(e) => updateRow(row.id, "inAccount", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100"
                />
              </Field>
              <Field className="w-full sm:w-48" label="Valor em Investimentos (R$)">
                <input
                  type="number"
                  step="0.01"
                  inputMode="decimal"
                  value={row.invested}
                  disabled={row.locked}
                  onChange={(e) => updateRow(row.id, "invested", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100"
                />
              </Field>
                            <Field className="w-full sm:w-[7.5rem]" label="Entrada/Saída">
                <p className="mt-1 text-xs text-slate-500">Use negativo para saídas.</p>
                <input
                  type="text"
                  className={`mt-1 block w-full rounded-lg border-slate-200 text-sm shadow-sm focus:border-slate-500 focus:ring-0 ${
                    row.locked ? "bg-slate-50" : ""
                  }`}
                  value={row.cashFlow}
                  onChange={(ev) => updateRow(row.id, "cashFlow", ev.target.value)}
                  disabled={row.locked}
                />
              </Field>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-white shadow">
          Adicionar lançamentos
        </button>
        <span className="text-xs text-slate-500">Os dados são salvos automaticamente no seu navegador.</span>
      </div>

      <div className="mt-6 rounded-xl border border-dashed p-4 text-xs text-slate-600">
        <p className="mb-2 font-semibold">Como usar:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Preencha <strong>Data</strong> e <strong>Banco/Origem</strong> para cada linha.</li>
          <li>Selecione um banco já utilizado ou digite um novo nome para salvá-lo automaticamente.</li>
          <li>Use o botão <strong>Bloquear</strong> para travar uma entrada pronta enquanto adiciona outras.</li>
        </ul>
      </div>
    </form>
  );
}
