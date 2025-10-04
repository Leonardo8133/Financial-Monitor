import { useMemo, useState } from "react";
import { getBankVisual } from "../config/banks.js";
import { fmtBRL, fmtPct, monthLabel, toNumber, yyyymm } from "../utils/formatters.js";
import { Td, Th } from "./TableCells.jsx";

export function Historico({ entries, setEntries }) {
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return entries;
    return entries.filter((e) =>
      [e.bank, e.date, e.invested, e.inAccount, e.cashFlow, e.yieldValue, e.yieldPct]
        .map((x) => String(x ?? "").toLowerCase())
        .some((t) => t.includes(s))
    );
  }, [q, entries]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const e of filtered) {
      const key = yyyymm(e.date);
      if (!key) continue;
      const arr = map.get(key) || [];
      arr.push(e);
      map.set(key, arr);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([ym, arr]) => ({ ym, label: monthLabel(ym), items: arr }));
  }, [filtered]);

  const totalizer = (arr) =>
    arr.reduce(
      (acc, e) => {
        acc.invested += toNumber(e.invested);
        acc.inAccount += toNumber(e.inAccount);
        acc.cashFlow += toNumber(e.cashFlow);
        acc.yieldValue += toNumber(e.yieldValue);
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

  function startEdit(entry) {
    setEditingId(entry.id);
    setDraft({
      bank: entry.bank ?? "",
      date: entry.date ? entry.date.slice(0, 10) : "",
      inAccount: entry.inAccount ?? 0,
      invested: entry.invested ?? 0,
      cashFlow: entry.cashFlow ?? 0,
      yieldValue: entry.yieldValue ?? 0,
      yieldPct: entry.yieldPct ?? 0,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  function saveEdit(id) {
    if (!draft) return;
    if (!draft.date || !draft.bank) {
      alert("Preencha Data e Banco antes de salvar.");
      return;
    }
    setEntries((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          bank: draft.bank,
          date: draft.date,
          inAccount: toNumber(draft.inAccount),
          invested: toNumber(draft.invested),
          cashFlow: toNumber(draft.cashFlow),
          yieldValue: toNumber(draft.yieldValue),
          yieldPct: Number(draft.yieldPct) || 0,
        };
      })
    );
    cancelEdit();
  }

  function updateDraft(name, value) {
    setDraft((prev) => (prev ? { ...prev, [name]: value } : prev));
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow">
      <div className="mb-4 flex items-center justify-between gap-2">
        <input
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400 sm:w-72"
          placeholder="Filtrar por banco, data, valor..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <div className="text-xs text-slate-500">{filtered.length} lançamentos</div>
      </div>

      {groups.length === 0 && (
        <div className="rounded-xl border border-dashed p-6 text-center text-slate-500">
          Sem lançamentos. Adicione na aba "Nova Entrada" ou importe um .json.
        </div>
      )}

      <div className="space-y-6">
        {groups.map((g) => {
          const t = totalizer(g.items);
          return (
            <div key={g.ym} className="rounded-xl border border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 text-xs text-slate-600">
                <div className="text-sm font-semibold text-slate-800">{g.label}</div>
                <div className="flex flex-wrap gap-4">
                  <span>
                    Investido: <strong>{fmtBRL(t.invested)}</strong>
                  </span>
                  <span>
                    Em Conta: <strong>{fmtBRL(t.inAccount)}</strong>
                  </span>
                  <span>
                    Entradas: <strong>{fmtBRL(t.cashFlow)}</strong>
                  </span>
                  <span>
                    Rendimento: <strong>{fmtBRL(t.yieldValue)}</strong>
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <Th>Data</Th>
                      <Th>Banco</Th>
                      <Th className="text-right">Valor na Conta</Th>
                      <Th className="text-right">Valor em Investimentos</Th>
                      <Th className="text-right">Entrada/Saída</Th>
                      <Th className="text-right">Rendimento (R$)</Th>
                      <Th className="text-right">Rendimento (%)</Th>
                      <Th className="text-right">Ações</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {g.items
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
                                  onChange={(e) => updateDraft("date", e.target.value)}
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
                                  onChange={(e) => updateDraft("bank", e.target.value)}
                                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none"
                                />
                              ) : (
                                <BankBadge name={entry.bank} />
                              )}
                            </Td>
                            <Td align="right">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={draft?.inAccount ?? 0}
                                  onChange={(e) => updateDraft("inAccount", e.target.value)}
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
                                  onChange={(e) => updateDraft("invested", e.target.value)}
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
                                  onChange={(e) => updateDraft("cashFlow", e.target.value)}
                                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-right text-sm focus:border-slate-400 focus:outline-none"
                                />
                              ) : (
                                <span className={toneClass(entry.cashFlow)}>{fmtBRL(entry.cashFlow)}</span>
                              )}
                            </Td>
                            <Td align="right">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  value={draft?.yieldValue ?? 0}
                                  onChange={(e) => updateDraft("yieldValue", e.target.value)}
                                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-right text-sm focus:border-slate-400 focus:outline-none"
                                />
                              ) : (
                                <span className={toneClass(entry.yieldValue)}>{fmtBRL(entry.yieldValue)}</span>
                              )}
                            </Td>
                            <Td align="right">
                              {isEditing ? (
                                <input
                                  type="number"
                                  step="0.0001"
                                  value={draft?.yieldPct ?? 0}
                                  onChange={(e) => updateDraft("yieldPct", e.target.value)}
                                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-right text-sm focus:border-slate-400 focus:outline-none"
                                />
                              ) : (
                                <span className={toneClass(entry.yieldPct)}>{fmtPct(entry.yieldPct)}</span>
                              )}
                            </Td>
                            <Td align="right">
                              {isEditing ? (
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => saveEdit(entry.id)}
                                    className="rounded-lg bg-emerald-500 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-600"
                                  >
                                    Salvar
                                  </button>
                                  <button
                                    onClick={cancelEdit}
                                    className="rounded-lg bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-300"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              ) : (
                                <div className="flex justify-end gap-2">
                                  <button
                                    onClick={() => startEdit(entry)}
                                    className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => removeEntry(entry.id)}
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

function toneClass(value) {
  if (toNumber(value) > 0) return "text-emerald-600 font-semibold";
  if (toNumber(value) < 0) return "text-red-600 font-semibold";
  return "text-slate-700";
}

function BankBadge({ name }) {
  const visual = getBankVisual(name);
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
