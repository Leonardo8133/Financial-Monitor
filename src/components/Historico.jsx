import { useMemo, useState } from "react";
import { fmtBRL, fmtPct, monthLabel, toNumber, yyyymm } from "../utils/formatters.js";
import { Td, Th } from "./TableCells.jsx";

export function Historico({ entries, setEntries }) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return entries;
    return entries.filter((e) =>
      [e.bank, e.date, e.invested, e.inAccount, e.cashFlow, e.yieldValue, e.yieldPct]
        .map((x) => String(x).toLowerCase())
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

  function removeAt(idx) {
    if (idx < 0) return;
    setEntries((prev) => {
      const copy = prev.slice();
      copy.splice(idx, 1);
      return copy;
    });
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
        {groups.map((g, gi) => {
          const t = totalizer(g.items);
          return (
            <div key={g.ym} className="rounded-xl border border-slate-100">
              <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="text-sm font-semibold">{g.label}</div>
                <div className="flex flex-wrap gap-4 text-xs text-slate-600">
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
                      <Th></Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {g.items
                      .slice()
                      .sort((a, b) => (a.date < b.date ? 1 : -1))
                      .map((e, idx) => {
                        const i = entries.indexOf(e);
                        return (
                          <tr key={`${gi}-${idx}`} className="hover:bg-slate-50">
                            <Td>{new Date(e.date).toLocaleDateString("pt-BR")}</Td>
                            <Td>{e.bank}</Td>
                            <Td align="right">{fmtBRL(e.inAccount)}</Td>
                            <Td align="right">{fmtBRL(e.invested)}</Td>
                            <Td align="right">{fmtBRL(e.cashFlow)}</Td>
                            <Td align="right">{fmtBRL(e.yieldValue)}</Td>
                            <Td align="right">{fmtPct(e.yieldPct)}</Td>
                            <Td align="right">
                              <button
                                onClick={() => removeAt(i)}
                                className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-700 hover:bg-red-100"
                              >
                                Excluir
                              </button>
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
