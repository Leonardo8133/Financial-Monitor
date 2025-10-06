import { useMemo, useState } from "react";
import { fmtBRL, monthLabel, toNumber, yyyymm } from "../../utils/formatters.js";

export function ExpensesHistorico({ expenses, derived, setExpenses, categories, sources }) {
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const sourceOptionsId = "expenses-source-library";

  const baseLookup = useMemo(() => new Map(expenses.map((e) => [e.id, e])), [expenses]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return derived;
    return derived.filter((e) => [e.description, e.category, e.source, e.date, e.value].map((v) => String(v ?? "").toLowerCase()).some((t) => t.includes(s)));
  }, [q, derived]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const e of filtered) {
      const key = yyyymm(e.date);
      if (!key) continue;
      const arr = map.get(key) || [];
      arr.push(e);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([ym, arr]) => ({ ym, label: monthLabel(ym), items: arr }));
  }, [filtered]);

  function removeExpense(id) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    if (editingId === id) { setEditingId(null); setDraft(null); }
  }

  function startEdit(id) {
    const original = baseLookup.get(id);
    if (!original) return;
    setEditingId(id);
    setDraft({ date: original.date?.slice(0, 10) || "", description: original.description || "", category: original.category || "", source: original.source || "", value: original.value || 0 });
  }

  function cancelEdit() { setEditingId(null); setDraft(null); }

  function saveEdit(id) {
    if (!draft) return;
    if (!draft.date || !draft.description) { window.alert("Preencha Data e Descrição antes de salvar."); return; }
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, date: draft.date, description: draft.description, category: draft.category, source: draft.source, value: toNumber(draft.value) } : e)));
    cancelEdit();
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <input className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400 sm:w-72" placeholder="Filtrar por descrição, categoria, fonte..." value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <button type="button" onClick={() => setCollapsed((prev) => !prev)} className="rounded-lg border border-slate-200 px-2 py-1 font-semibold text-slate-600 transition hover:bg-slate-100">{collapsed ? "Expandir tudo" : "Colapsar tudo"}</button>
          <span>{filtered.length} despesas</span>
        </div>
      </div>

      {groups.length === 0 && (
        <div className="rounded-xl border border-dashed p-6 text-center text-slate-500">Sem despesas. Adicione na aba "Nova Despesa" ou importe um .json.</div>
      )}

      <datalist id={sourceOptionsId}>
        {(Array.isArray(sources) ? sources : []).map((source) => (
          <option key={source.name} value={source.name} />
        ))}
      </datalist>

      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.ym} className="rounded-xl border border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 text-xs text-slate-600">
              <div className="text-sm font-semibold text-slate-800">{group.label}</div>
              <div className="flex flex-wrap gap-4">
                <span>Total: <strong>{fmtBRL(group.items.reduce((acc, e) => acc + Math.abs(toNumber(e.value)), 0))}</strong></span>
              </div>
            </div>
            {collapsed ? (
              <CollapsedTable items={group.items} />
            ) : (
              <DetailedTable items={group.items} editingId={editingId} draft={draft} onStartEdit={startEdit} onUpdateDraft={(name, value) => setDraft((prev) => (prev ? { ...prev, [name]: value } : prev))} onCancelEdit={cancelEdit} onSaveEdit={saveEdit} onRemove={removeExpense} sourceOptionsId={sourceOptionsId} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailedTable({ items, editingId, draft, onStartEdit, onUpdateDraft, onCancelEdit, onSaveEdit, onRemove, sourceOptionsId = "expenses-source-library" }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <Th>Data</Th>
            <Th>Descrição</Th>
            <Th>Categoria</Th>
            <Th>Fonte</Th>
            <Th className="text-right">Valor</Th>
            <Th className="text-right">Ações</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).map((e) => {
            const isEditing = editingId === e.id;
            return (
              <tr key={e.id} className="align-top hover:bg-slate-50">
                <Td>
                  {isEditing ? (
                    <input type="date" value={draft?.date ?? ""} onChange={(ev) => onUpdateDraft("date", ev.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none" />
                  ) : (
                    new Date(e.date).toLocaleDateString("pt-BR")
                  )}
                </Td>
                <Td>
                  {isEditing ? (
                    <input type="text" value={draft?.description ?? ""} onChange={(ev) => onUpdateDraft("description", ev.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none" />
                  ) : (
                    e.description
                  )}
                </Td>
                <Td>
                  {isEditing ? (
                    <input type="text" value={draft?.category ?? ""} onChange={(ev) => onUpdateDraft("category", ev.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none" />
                  ) : (
                    e.category || "—"
                  )}
                </Td>
                <Td>
                  {isEditing ? (
                    <input 
                      type="text" 
                      list={sourceOptionsId}
                      value={draft?.source ?? ""} 
                      onChange={(ev) => onUpdateDraft("source", ev.target.value)} 
                      className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none" 
                    />
                  ) : (
                    e.source || "—"
                  )}
                </Td>
                <Td align="right">{fmtBRL(e.absValue)}</Td>
                <Td align="right">
                  {isEditing ? (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => onSaveEdit(e.id)} className="rounded-lg bg-emerald-500 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-600">Salvar</button>
                      <button onClick={onCancelEdit} className="rounded-lg bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-300">Cancelar</button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-2">
                      <button onClick={() => onStartEdit(e.id)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200">Editar</button>
                      <button onClick={() => onRemove(e.id)} className="rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-100">Excluir</button>
                    </div>
                  )}
                </Td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CollapsedTable({ items }) {
  const byDate = new Map();
  for (const e of items) {
    const key = e.date;
    const current = byDate.get(key) || { date: e.date, total: 0 };
    current.total += Math.abs(toNumber(e.value));
    byDate.set(key, current);
  }
  const rows = Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <Th>Data</Th>
            <Th className="text-right">Total</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.date} className="hover:bg-slate-50">
              <Td>{new Date(row.date).toLocaleDateString("pt-BR")}</Td>
              <Td align="right">{fmtBRL(row.total)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className = "" }) {
  return <th className={`px-4 py-2 text-left font-medium text-slate-600 ${className}`}>{children}</th>;
}

function Td({ children, align = "left" }) {
  const cls = align === "right" ? "text-right" : "text-left";
  return <td className={`px-4 py-2 ${cls}`}>{children}</td>;
}
