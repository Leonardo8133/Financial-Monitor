import { createDraftEntry } from "../utils/entries.js";
import { Field } from "./Field.jsx";

export function Entrada({ drafts, setDrafts, onSubmit, banks, sources }) {
  const bankOptionsId = "bank-options";
  const sourceOptionsId = "source-options";
  const sourceLibrary = Array.isArray(sources) ? sources : [];

  function formatCurrency(value) {
    if (!value || value === '0') return 'R$ 0,00';
    const numValue = Number(value);
    return `R$ ${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

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
            title="Adiciona uma nova linha de lançamento"
          >
            Adicionar linha
          </button>
          <button
            type="button"
            onClick={resetRows}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            title="Limpa todas as linhas em preparação"
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

      <datalist id={sourceOptionsId}>
        {sourceLibrary.map((source) => (
          <option key={source.name} value={source.name} />
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
                  title={row.locked ? "Permite editar novamente esta linha" : "Trava os valores para evitar alterações"}
                >
                  {row.locked ? "Desbloquear" : "Bloquear"}
                </button>
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                  title="Remove esta linha de lançamento"
                >
                  Remover
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-12" title="Preencha a data do lançamento; use dias do mês para agrupar corretamente">
              <Field className="md:col-span-2" label="Data" helpText="Data do lançamento; use dias do mês para agrupar corretamente">
                <input
                  type="date"
                  required={!row.locked}
                  value={row.date}
                  disabled={row.locked}
                  onChange={(e) => updateRow(row.id, "date", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100"
                />
              </Field>
              <Field className="md:col-span-2" label="Banco" helpText="Banco ou instituição financeira onde o valor está">
                <input
                  type="text"
                  list={bankOptionsId}
                  required={!row.locked}
                  placeholder="ex.: Nubank Caixinhas"
                  value={row.bank}
                  disabled={row.locked}
                  onChange={(e) => updateRow(row.id, "bank", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100"
                />
              </Field>
              <Field className="md:col-span-2" label="Fonte" helpText="Origem do dinheiro (ex: salário, bônus, venda)">
                <input
                  type="text"
                  list={sourceOptionsId}
                  placeholder="ex.: Salário"
                  value={row.source}
                  disabled={row.locked}
                  onChange={(e) => updateRow(row.id, "source", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100"
                />
              </Field>
              <Field className="md:col-span-2" label="Conta (R$)" helpText="Valor que fica na conta corrente">
                <input
                  type="text"
                  value={formatCurrency(row.inAccount)}
                  disabled={row.locked}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d,]/g, '').replace(',', '.');
                    updateRow(row.id, "inAccount", value || '0');
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100"
                />
              </Field>
              <Field className="md:col-span-2" label="Investido (R$)" helpText="Aporte do mês que vai para investimentos; use 0 se não houve">
                <input
                  type="text"
                  value={formatCurrency(row.invested)}
                  disabled={row.locked}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d,]/g, '').replace(',', '.');
                    updateRow(row.id, "invested", value || '0');
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100"
                />
              </Field>
              <Field className="md:col-span-2" label="Fluxo (R$)" helpText="Positivo para entradas (depósitos), negativo para saídas (retiradas). Afeta o gráfico de fluxo.">
                <input
                  type="text"
                  className={`w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400 ${
                    row.locked ? "bg-slate-100" : ""
                  }`}
                  value={formatCurrency(row.cashFlow)}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d,]/g, '').replace(',', '.');
                    updateRow(row.id, "cashFlow", value || '0');
                  }}
                  disabled={row.locked}
                />
              </Field>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          className="rounded-xl bg-slate-900 px-4 py-2 text-white shadow"
          title="Adiciona as linhas preenchidas ao histórico"
        >
          Adicionar lançamentos
        </button>
        <span className="text-xs text-slate-500">Os dados são salvos automaticamente no seu navegador.</span>
      </div>

      <div className="mt-6 rounded-xl border border-dashed p-4 text-xs text-slate-600">
        <p className="mb-2 font-semibold">Como usar:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Preencha <strong>Data</strong> e <strong>Banco</strong> para cada linha.</li>
          <li>Selecione um banco já utilizado ou digite um novo nome para salvá-lo automaticamente.</li>
          <li>Use o botão <strong>Bloquear</strong> para travar uma entrada pronta enquanto adiciona outras.</li>
          <li>Informe valores negativos em <strong>Fluxo (R$)</strong> para representar saídas.</li>
        </ul>
      </div>
    </form>
  );
}
