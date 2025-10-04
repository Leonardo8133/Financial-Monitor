import { useMemo, useState } from "react";
import { resolveBankVisual } from "../config/banks.js";
import { resolveSourceVisual } from "../config/sources.js";
import { fmtBRL, fmtPct, monthLabel, toNumber, yyyymm } from "../utils/formatters.js";
import { Td, Th } from "./TableCells.jsx";

export function Historico({ entries, computedEntries, setEntries, banks, sources, onClearAll }) {
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const sourceOptionsId = "source-library";

  const baseLookup = useMemo(() => new Map(entries.map((entry) => [entry.id, entry])), [entries]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return computedEntries;
    return computedEntries.filter((entry) =>
      [
        entry.bank,
        entry.date,
        entry.invested,
        entry.inAccount,
        entry.cashFlow,
        entry.yieldValue,
        entry.yieldPct,
      ]
        .map((value) => String(value ?? "").toLowerCase())
        .some((text) => text.includes(s))
    );
  }, [q, computedEntries]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const entry of filtered) {
      const key = yyyymm(entry.date);
      if (!key) continue;
      const arr = map.get(key) || [];
      arr.push(entry);
      map.set(key, arr);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([ym, arr]) => ({ ym, label: monthLabel(ym), items: arr }));
  }, [filtered]);

  const totalizer = (arr) =>
    arr.reduce(
      (acc, entry) => {
        acc.invested += toNumber(entry.invested);
        acc.inAccount += toNumber(entry.inAccount);
        acc.cashFlow += toNumber(entry.cashFlow);
        if (entry.yieldValue !== null && entry.yieldValue !== undefined) {
          acc.yieldValue += entry.yieldValue;
        }
        return acc;
      },
      { invested: 0, inAccount: 0, cashFlow: 0, yieldValue: 0 }
    );

  function removeEntry(id) {
    setEntries((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setDraft(null);
    }
  }

  function startEdit(id) {
    const original = baseLookup.get(id);
    if (!original) return;
    setEditingId(id);
    setDraft({
      bank: original.bank ?? "",
      source: original.source ?? "",
      date: original.date ? original.date.slice(0, 10) : "",
      inAccount: original.inAccount ?? 0,
      invested: original.invested ?? 0,
      cashFlow: original.cashFlow ?? 0,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  function saveEdit(id) {
    if (!draft) return;
    if (!draft.date || !draft.bank) {
      window.alert("Preencha Data e Banco antes de salvar.");
      return;
    }
    setEntries((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          bank: draft.bank,
          source: draft.source?.trim() || "",
          date: draft.date,
          inAccount: toNumber(draft.inAccount),
          invested: toNumber(draft.invested),
          cashFlow: toNumber(draft.cashFlow),
        };
      })
    );
    cancelEdit();
  }

  function updateDraft(name, value) {
    setDraft((prev) => (prev ? { ...prev, [name]: value } : prev));
  }

  const handleClearAll = () => {
    if (typeof onClearAll === "function") {
      onClearAll();
    }
  };

  return (
    <div className="rounded-2xl bg-white p-4 shadow">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <input
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400 sm:w-72"
          placeholder="Filtrar por banco, data, valor..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          {typeof onClearAll === "function" && (
            <button
              type="button"
              onClick={handleClearAll}
              className="rounded-lg border border-red-200 px-2 py-1 font-semibold text-red-600 transition hover:bg-red-50"
              title="Remove todos os lançamentos armazenados"
            >
              Limpar tudo
            </button>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="rounded-lg border border-slate-200 px-2 py-1 font-semibold text-slate-600 transition hover:bg-slate-100"
            title={collapsed ? "Expandir os detalhes das linhas" : "Ocultar detalhes das linhas"}
          >
            {collapsed ? "Expandir tudo" : "Colapsar tudo"}
          </button>
          <span>{filtered.length} lançamentos</span>
        </div>
      </div>

      {groups.length === 0 && (
        <div className="rounded-xl border border-dashed p-6 text-center text-slate-500">
          Sem lançamentos. Adicione na aba "Nova Entrada" ou importe um .json.
        </div>
      )}

      <datalist id={sourceOptionsId}>
        {(Array.isArray(sources) ? sources : []).map((source) => (
          <option key={source.name} value={source.name} />
        ))}
      </datalist>

      <div className="space-y-6">
        {groups.map((group) => {
          const totals = totalizer(group.items);
          return (
            <div key={group.ym} className="rounded-xl border border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 text-xs text-slate-600">
                <div className="text-sm font-semibold text-slate-800">{group.label}</div>
                <div className="flex flex-wrap gap-4">
                  <span>
                    Investido: <strong>{fmtBRL(totals.invested)}</strong>
                  </span>
                  <span>
                    Em Conta: <strong>{fmtBRL(totals.inAccount)}</strong>
                  </span>
                  <span>
                    Entradas: <strong className={toneClass(totals.cashFlow)}>{fmtBRL(totals.cashFlow)}</strong>
                  </span>
                  <span>
                    Rendimento: <strong className={toneClass(totals.yieldValue)}>{fmtBRL(totals.yieldValue)}</strong>
                  </span>
                </div>
              </div>

              {collapsed ? (
                <CollapsedTable items={group.items} />
              ) : (
                <DetailedTable
                  items={group.items}
                  editingId={editingId}
                  draft={draft}
                  onStartEdit={startEdit}
                  onUpdateDraft={updateDraft}
                  onCancelEdit={cancelEdit}
                  onSaveEdit={saveEdit}
                  onRemove={removeEntry}
                  banks={banks}
                  sources={sources}
                  sourceOptionsId={sourceOptionsId}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailedTable({ items, editingId, draft, onStartEdit, onUpdateDraft, onCancelEdit, onSaveEdit, onRemove, banks, sources, sourceOptionsId = "source-library" }) {
  const library = Array.isArray(sources) ? sources : [];
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <Th>Data</Th>
            <Th>Banco</Th>
            <Th>Fonte</Th>
            <Th className="text-right">Valor na Conta</Th>
            <Th className="text-right">Valor em Investimentos</Th>
            <Th className="text-right">Entrada/Saída</Th>
            <Th className="text-right">Rendimento (R$)</Th>
            <Th className="text-right">Rendimento (%)</Th>
            <Th className="text-right">Ações</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items
            .slice()
            .sort((a, b) => (a.date < b.date ? 1 : -1))
            .map((entry) => {
              const isEditing = editingId === entry.id;
              return (
                <tr key={entry.id} className="align-top hover:bg-slate-50">
                  <Td>
                    {isEditing ? (
                      <input
                        type="date"
                        value={draft?.date ?? ""}
                        onChange={(e) => onUpdateDraft("date", e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none"
                      />
                    ) : (
                      new Date(entry.date).toLocaleDateString("pt-BR")
                    )}
                  </Td>
              <Td>
                {isEditing ? (
                  <input
                    type="text"
                    value={draft?.bank ?? ""}
                    onChange={(e) => onUpdateDraft("bank", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none"
                  />
                ) : (
                  <BankBadge name={entry.bank} banks={banks} />
                )}
              </Td>
              <Td>
                {isEditing ? (
                  <input
                    type="text"
                    list={sourceOptionsId}
                    value={draft?.source ?? ""}
                    onChange={(e) => onUpdateDraft("source", e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none"
                  />
                ) : (
                  <SourceBadge name={entry.source} sources={library} />
                )}
              </Td>
                  <Td align="right">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={draft?.inAccount ?? 0}
                        onChange={(e) => onUpdateDraft("inAccount", e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-right text-sm focus:border-slate-400 focus:outline-none"
                      />
                    ) : (
                      <span className={toneClass(entry.inAccount)}>{fmtBRL(entry.inAccount)}</span>
                    )}
                  </Td>
                  <Td align="right">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={draft?.invested ?? 0}
                        onChange={(e) => onUpdateDraft("invested", e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-right text-sm focus:border-slate-400 focus:outline-none"
                      />
                    ) : (
                      fmtBRL(entry.invested)
                    )}
                  </Td>
                  <Td align="right">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        value={draft?.cashFlow ?? 0}
                        onChange={(e) => onUpdateDraft("cashFlow", e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-2 py-1 text-right text-sm focus:border-slate-400 focus:outline-none"
                      />
                    ) : (
                      <span className={toneClass(entry.cashFlow)}>{fmtBRL(entry.cashFlow)}</span>
                    )}
                  </Td>
                  <Td align="right">
                    {entry.yieldValue !== null && entry.yieldValue !== undefined ? (
                      <span className={toneClass(entry.yieldValue)}>{fmtBRL(entry.yieldValue)}</span>
                    ) : (
                      ""
                    )}
                  </Td>
                  <Td align="right">
                    {entry.yieldPct !== null && entry.yieldPct !== undefined ? (
                      <span className={toneClass(entry.yieldPct)}>{fmtPct(entry.yieldPct)}</span>
                    ) : (
                      ""
                    )}
                  </Td>
                  <Td align="right">
                    {isEditing ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onSaveEdit(entry.id)}
                          className="rounded-lg bg-emerald-500 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-600"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={onCancelEdit}
                          className="rounded-lg bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => onStartEdit(entry.id)}
                          className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => onRemove(entry.id)}
                          className="rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-100"
                        >
                          Excluir
                        </button>
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
  for (const entry of items) {
    const key = entry.date;
    const current =
      byDate.get(key) || {
        date: entry.date,
        invested: 0,
        inAccount: 0,
        cashFlow: 0,
        yieldValue: 0,
        hasYield: false,
      };
    current.invested += toNumber(entry.invested);
    current.inAccount += toNumber(entry.inAccount);
    current.cashFlow += toNumber(entry.cashFlow);
    if (entry.yieldValue !== null && entry.yieldValue !== undefined) {
      current.yieldValue += entry.yieldValue;
      current.hasYield = true;
    }
    byDate.set(key, current);
  }

  const rows = Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <Th>Data</Th>
            <Th className="text-right">Investido</Th>
            <Th className="text-right">Em Conta</Th>
            <Th className="text-right">Entradas/Saídas</Th>
            <Th className="text-right">Rendimento</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.date} className="hover:bg-slate-50">
              <Td>{new Date(row.date).toLocaleDateString("pt-BR")}</Td>
              <Td align="right">{fmtBRL(row.invested)}</Td>
              <Td align="right">{fmtBRL(row.inAccount)}</Td>
              <Td align="right">
                <span className={toneClass(row.cashFlow)}>{fmtBRL(row.cashFlow)}</span>
              </Td>
              <Td align="right">
                {row.hasYield ? <span className={toneClass(row.yieldValue)}>{fmtBRL(row.yieldValue)}</span> : ""}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function toneClass(value) {
  if (value === null || value === undefined) return "text-slate-700";
  if (toNumber(value) > 0) return "text-emerald-600 font-semibold";
  if (toNumber(value) < 0) return "text-red-600 font-semibold";
  return "text-slate-700";
}

function BankBadge({ name, banks }) {
  const visual = resolveBankVisual(name, banks);
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: visual.color }}
        aria-hidden="true"
      ></span>
      <span className="text-base" aria-hidden="true">
        {visual.icon}
      </span>
      <span>{name}</span>
    </span>
  );
}

function SourceBadge({ name, sources }) {
  if (!name) return <span className="text-sm text-slate-500">—</span>;
  const library = Array.isArray(sources) ? sources : [];
  const visual = resolveSourceVisual(name, library);
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: visual.color }}
        aria-hidden="true"
      ></span>
      <span className="text-base" aria-hidden="true">
        {visual.icon}
      </span>
      <span>{name}</span>
    </span>
  );
}
