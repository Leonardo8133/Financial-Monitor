import { Field } from "../../components/Field.jsx";
import { useState } from "react";
import { Uploader } from "./Uploader.jsx";
import { ensureExpensesDefaults } from "../config/storage.js";

export function ExpensesEntrada({ drafts, setDrafts, onSubmit, categories, sources, setStore }) {
  const categoryOptionsId = "category-options";
  const sourceOptionsId = "source-options";

  function formatCurrency(value) {
    if (!value || value === '0') return 'R$ 0,00';
    const numValue = Number(value);
    return `R$ ${numValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function updateRow(id, name, value) {
    setDrafts((prev) => prev.map((row) => (row.id === id && !row.locked ? { ...row, [name]: value } : row)));
  }

  function toggleLock(id) {
    setDrafts((prev) => prev.map((row) => (row.id === id ? { ...row, locked: !row.locked } : row)));
  }

  function addRow() {
    setDrafts((prev) => [...prev, { id: crypto.randomUUID?.() || String(Math.random()), date: "", description: "", category: "", source: "", value: 0, locked: false }]);
  }

  function removeRow(id) {
    setDrafts((prev) => {
      const next = prev.filter((row) => row.id !== id);
      return next.length ? next : [{ id: crypto.randomUUID?.() || String(Math.random()), date: "", description: "", category: "", source: "", value: 0, locked: false }];
    });
  }

  function resetRows() {
    setDrafts([{ id: crypto.randomUUID?.() || String(Math.random()), date: "", description: "", category: "", source: "", value: 0, locked: false }]);
  }

  function handleSubmit(ev) {
    ev.preventDefault();
    onSubmit(drafts);
  }

  // Library editors
  const [newCategory, setNewCategory] = useState("");
  const [newSource, setNewSource] = useState("");

  function addCategory() {
    const name = newCategory.trim();
    if (!name) return;
    setStore((prev) => {
      const safePrev = ensureExpensesDefaults(prev);
      return {
        ...safePrev,
        categories: [...safePrev.categories, { name, color: "", icon: "🏷️" }],
      };
    });
    setNewCategory("");
  }
  function addSource() {
    const name = newSource.trim();
    if (!name) return;
    setStore((prev) => {
      const safePrev = ensureExpensesDefaults(prev);
      return {
        ...safePrev,
        sources: [...safePrev.sources, { name, color: "", icon: "💼" }],
      };
    });
    setNewSource("");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-4 shadow">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-700">Despesas em preparação</div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={addRow} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">Adicionar linha</button>
          <button type="button" onClick={resetRows} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">Limpar rascunho</button>
        </div>
      </div>

      <datalist id={categoryOptionsId}>
        {categories.map((c) => (<option key={c.name} value={c.name} />))}
      </datalist>
      <datalist id={sourceOptionsId}>
        {sources.map((s) => (<option key={s.name} value={s.name} />))}
      </datalist>

      <div className="space-y-4">
        {drafts.map((row, index) => (
          <div key={row.id} className="space-y-3 rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Despesa #{index + 1}</span>
              <div className="flex flex-wrap items-center gap-2">
                {row.locked && (<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[0.65rem] uppercase">Bloqueado</span>)}
                <button type="button" onClick={() => toggleLock(row.id)} className={`rounded-lg px-2 py-1 text-xs font-semibold transition ${row.locked ? "border border-amber-300 bg-amber-100 text-amber-700 hover:bg-amber-200" : "border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>{row.locked ? "Desbloquear" : "Bloquear"}</button>
                <button type="button" onClick={() => removeRow(row.id)} className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50">Remover</button>
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <Field className="w-full sm:w-40" label="Data" helpText="Data da despesa">
                <input type="date" required={!row.locked} value={row.date} disabled={row.locked} onChange={(e) => updateRow(row.id, "date", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100" />
              </Field>
              <Field className="min-w-[14rem] flex-1" label="Descrição" helpText="Descrição detalhada da despesa">
                <input type="text" required={!row.locked} placeholder="ex.: Supermercado" value={row.description} disabled={row.locked} onChange={(e) => updateRow(row.id, "description", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100" />
              </Field>
              <Field className="w-full sm:w-56" label="Categoria" helpText="Categoria da despesa para organização">
                <input type="text" list={categoryOptionsId} placeholder="ex.: Alimentação" value={row.category} disabled={row.locked} onChange={(e) => updateRow(row.id, "category", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100" />
              </Field>
              <Field className="w-full sm:w-56" label="Fonte" helpText="Fonte do dinheiro usado na despesa">
                <input type="text" list={sourceOptionsId} placeholder="ex.: Pessoal" value={row.source} disabled={row.locked} onChange={(e) => updateRow(row.id, "source", e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100" />
              </Field>
              <Field className="w-full sm:w-40" label="Valor (R$)" helpText="Valor da despesa em reais; use decimais com vírgula ou ponto">
                <input 
                  type="text" 
                  value={formatCurrency(row.value)} 
                  disabled={row.locked} 
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^\d,]/g, '').replace(',', '.');
                    updateRow(row.id, "value", value || '0');
                  }} 
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400 disabled:bg-slate-100" 
                />
              </Field>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-white shadow">Adicionar despesas</button>
      </div>

      <Uploader onRecordsParsed={(records) => setDrafts(records.map((r) => ({ id: crypto.randomUUID?.() || String(Math.random()), ...r, locked: false })))} />

      <div className="mt-6 grid grid-cols-1 gap-4 rounded-xl border border-dashed p-4 text-xs text-slate-600 md:grid-cols-2">
        <div>
          <p className="mb-2 font-semibold">Categorias</p>
          <div className="flex gap-2">
            <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Nova categoria" className="w-full rounded-lg border border-slate-200 px-2 py-1" />
            <button type="button" onClick={addCategory} className="rounded-lg border border-slate-200 px-3 py-1">Adicionar</button>
          </div>
        </div>
        <div>
          <p className="mb-2 font-semibold">Fontes</p>
          <div className="flex gap-2">
            <input value={newSource} onChange={(e) => setNewSource(e.target.value)} placeholder="Nova fonte" className="w-full rounded-lg border border-slate-200 px-2 py-1" />
            <button type="button" onClick={addSource} className="rounded-lg border border-slate-200 px-3 py-1">Adicionar</button>
          </div>
        </div>
      </div>
    </form>
  );
}
