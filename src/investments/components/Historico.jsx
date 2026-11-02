import { useMemo, useState } from "react";
import { resolveBankVisual } from "../config/banks.js";
import { resolveSourceVisual } from "../config/sources.js";
import { fmtBRL, fmtDate, fmtPct, monthLabel, toNumber, yyyymm } from "../../utils/formatters.js";
import { Td, Th } from "./TableCells.jsx";
import { CurrencyInput } from "../../components/CurrencyInput.jsx";
import { BankSelect } from "./BankSelect.jsx";
import { ConfirmDialog } from "../../components/Modal.jsx";
import { EmptyState } from "../../components/AppShell.jsx";
import { exportEntriesCsv } from "../../utils/importExport.js";
import { SearchIcon, XIcon, CopyIcon, TrashIcon } from "../../components/icons.jsx";

export function Historico({ entries, computedEntries, setEntries, banks, sources, onClearAll, onDuplicate, onGoToEntry, singleSource = false, onCreateBank }) {
  const [q, setQ] = useState("");
  const [bankFilter, setBankFilter] = useState(new Set());
  const [sourceFilter, setSourceFilter] = useState("");
  const [fromYm, setFromYm] = useState("");
  const [toYm, setToYm] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [sortBy, setSortBy] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const sourceOptionsId = "source-library";
  const bankOptionsId = "bank-library-hist";

  const baseLookup = useMemo(() => new Map(entries.map((entry) => [entry.id, entry])), [entries]);
  const bankNames = useMemo(() => Array.from(new Set(entries.map((e) => e.bank).filter(Boolean))).sort(), [entries]);
  const sourceNames = useMemo(() => Array.from(new Set(entries.map((e) => e.source).filter(Boolean))).sort(), [entries]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return computedEntries.filter((entry) => {
      if (bankFilter.size && !bankFilter.has(entry.bank)) return false;
      if (sourceFilter && entry.source !== sourceFilter) return false;
      const ym = yyyymm(entry.date);
      if (fromYm && ym < fromYm) return false;
      if (toYm && ym > toYm) return false;
      if (!s) return true;
      return [entry.bank, entry.source, entry.date, fmtDate(entry.date), entry.invested, entry.inAccount, entry.cashFlow, entry.note]
        .map((value) => String(value ?? "").toLowerCase())
        .some((text) => text.includes(s));
    });
  }, [q, computedEntries, bankFilter, sourceFilter, fromYm, toYm]);

  const sorter = (a, b) => {
    let cmp = 0;
    if (sortBy === "date") cmp = (a.date || "") < (b.date || "") ? -1 : (a.date || "") > (b.date || "") ? 1 : 0;
    else if (sortBy === "bank") cmp = (a.bank || "").localeCompare(b.bank || "");
    else if (sortBy === "total") cmp = (a.computedTotal || 0) - (b.computedTotal || 0);
    else if (sortBy === "yield") cmp = (a.yieldValue || 0) - (b.yieldValue || 0);
    else if (sortBy === "cashFlow") cmp = (a.cashFlow || 0) - (b.cashFlow || 0);
    if (cmp === 0) cmp = (a.bank || "").localeCompare(b.bank || "");
    return sortDir === "asc" ? cmp : -cmp;
  };

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
      .map(([ym, arr]) => ({ ym, label: monthLabel(ym), items: arr.slice().sort(sorter) }));
  }, [filtered, sortBy, sortDir]);

  const totalizer = (arr) =>
    arr.reduce(
      (acc, entry) => {
        acc.invested += toNumber(entry.invested);
        acc.inAccount += toNumber(entry.inAccount);
        acc.cashFlow += toNumber(entry.cashFlow);
        if (entry.yieldValue !== null && entry.yieldValue !== undefined) {
          acc.yieldValue += entry.yieldValue;
          acc.previousTotal += entry.previousTotal || 0;
          acc.hasYield = true;
        }
        if (entry.yieldGapMonths) acc.gaps += 1;
        return acc;
      },
      { invested: 0, inAccount: 0, cashFlow: 0, yieldValue: 0, previousTotal: 0, hasYield: false, gaps: 0 }
    );

  function toggleSort(field) {
    if (sortBy === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortDir(field === "bank" ? "asc" : "desc");
    }
  }

  function removeEntry(id) {
    setEntries((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) cancelEdit();
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
      note: original.note ?? "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  function saveEdit(id) {
    if (!draft) return;
    if (!draft.date || !draft.bank.trim()) return;
    setEntries((prev) =>
      prev.map((item) =>
        item.id !== id
          ? item
          : {
              ...item,
              bank: draft.bank.trim(),
              source: draft.source?.trim() || "",
              date: draft.date,
              inAccount: toNumber(draft.inAccount),
              invested: toNumber(draft.invested),
              cashFlow: toNumber(draft.cashFlow),
              note: draft.note || "",
            }
      )
    );
    cancelEdit();
  }

  function updateDraft(name, value) {
    setDraft((prev) => (prev ? { ...prev, [name]: value } : prev));
  }

  function toggleBank(name) {
    setBankFilter((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const hasFilters = q || bankFilter.size || sourceFilter || fromYm || toYm;

  return (
    <div className="card-pad">
      <div className="mb-3 flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input className="input pl-8" placeholder="Buscar por banco, fonte, data, valor..." value={q} onChange={(e) => setQ(e.target.value)} />
            {q && (
              <button type="button" onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-ink" aria-label="Limpar busca">
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          {!singleSource && (
            <select className="input w-auto" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} title="Filtrar por fonte">
              <option value="">Todas as fontes</option>
              {sourceNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          )}
          <div className="flex items-center gap-1 text-xs text-muted">
            <input type="month" className="input input-sm w-auto" value={fromYm} onChange={(e) => setFromYm(e.target.value)} title="De" />
            <span>→</span>
            <input type="month" className="input input-sm w-auto" value={toYm} onChange={(e) => setToYm(e.target.value)} title="Até" />
          </div>
          {hasFilters && (
            <button type="button" className="btn-ghost btn-sm" onClick={() => { setQ(""); setBankFilter(new Set()); setSourceFilter(""); setFromYm(""); setToYm(""); }}>
              Limpar filtros
            </button>
          )}
        </div>
        {bankNames.length > 1 && (
          <div className="flex flex-wrap gap-1">
            {bankNames.map((name) => {
              const visual = resolveBankVisual(name, banks);
              const on = bankFilter.has(name);
              return (
                <button key={name} type="button" onClick={() => toggleBank(name)} className={on ? "chip-on" : "chip"} aria-pressed={on}>
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: visual.color }} />
                  {name}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>
            {filtered.length} de {entries.length} lançamentos · {bankNames.length} bancos
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={() => setCollapsed((prev) => !prev)} className="btn btn-xs">
              {collapsed ? "Ver detalhes" : "Resumir por data"}
            </button>
            <button type="button" onClick={() => exportEntriesCsv(filtered)} className="btn btn-xs" title="Exporta as linhas filtradas em CSV">
              Exportar CSV
            </button>
            {typeof onClearAll === "function" && entries.length > 0 && (
              <button type="button" onClick={onClearAll} className="btn-danger btn-xs" title="Remove todos os lançamentos de investimentos">
                Apagar tudo
              </button>
            )}
          </div>
        </div>
      </div>

      {groups.length === 0 && (
        <EmptyState
          title={entries.length ? "Nenhum lançamento com esses filtros." : "Sem lançamentos ainda."}
          action={
            !entries.length && onGoToEntry ? (
              <button type="button" className="btn-primary" onClick={onGoToEntry}>
                Registrar primeiro saldo
              </button>
            ) : null
          }
        >
          {entries.length ? "Ajuste a busca ou limpe os filtros." : "Registre o saldo de cada banco na aba Nova Entrada ou importe um backup."}
        </EmptyState>
      )}

      <datalist id={sourceOptionsId}>
        {(Array.isArray(sources) ? sources : []).map((source) => (
          <option key={source.name} value={source.name} />
        ))}
      </datalist>
      <datalist id={bankOptionsId}>
        {(Array.isArray(banks) ? banks : []).map((bank) => (
          <option key={bank.name} value={bank.name} />
        ))}
      </datalist>

      <div className="space-y-4">
        {groups.map((group) => {
          const totals = totalizer(group.items);
          const pct = totals.previousTotal ? totals.yieldValue / totals.previousTotal : null;
          return (
            <div key={group.ym} className="overflow-hidden rounded-xl border border-line">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-2 px-3 py-2 text-xs text-muted">
                <div className="text-sm font-semibold capitalize text-ink">{group.label}</div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span>Total: <strong className="num text-ink">{fmtBRL(totals.invested + totals.inAccount)}</strong></span>
                  <span>Em conta: <strong className="num text-ink">{fmtBRL(totals.inAccount)}</strong></span>
                  <span>Aportes: <strong className={`num ${toneClass(totals.cashFlow)}`}>{fmtBRL(totals.cashFlow)}</strong></span>
                  <span title={totals.gaps ? `${totals.gaps} banco(s) sem rendimento: saldo anterior há mais de 2 meses` : undefined}>
                    Rendimento:{" "}
                    {totals.hasYield ? (
                      <>
                        <strong className={`num ${toneClass(totals.yieldValue)}`}>{fmtBRL(totals.yieldValue)}</strong>
                        {pct !== null && <span className="ml-1 text-faint">({fmtPct(pct)})</span>}
                      </>
                    ) : (
                      <strong className="text-faint">–</strong>
                    )}
                    {totals.gaps > 0 && <span className="ml-1 text-amber-700">({totals.gaps} sem cálculo)</span>}
                  </span>
                  <span>{group.items.length} itens</span>
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
                  onRemove={(entry) => setConfirmDelete(entry)}
                  onDuplicate={onDuplicate}
                  banks={banks}
                  sources={sources}
                  sourceOptionsId={sourceOptionsId}
                  bankOptionsId={bankOptionsId}
                  singleSource={singleSource}
                  onCreateBank={onCreateBank}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={toggleSort}
                />
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && removeEntry(confirmDelete.id)}
        title="Excluir lançamento?"
        message={confirmDelete ? `${confirmDelete.bank} em ${fmtDate(confirmDelete.date)} será removido.` : ""}
        confirmLabel="Excluir"
        danger
      />
    </div>
  );
}

function DetailedTable({ items, editingId, draft, onStartEdit, onUpdateDraft, onCancelEdit, onSaveEdit, onRemove, onDuplicate, banks, sources, sourceOptionsId, bankOptionsId, sortBy, sortDir, onSort, singleSource = false, onCreateBank }) {
  const library = Array.isArray(sources) ? sources : [];
  const sortable = (field, label, align) => (
    <Th sortable active={sortBy === field} direction={sortDir} onClick={() => onSort(field)} align={align}>
      {label}
    </Th>
  );
  return (
    <div className="overflow-x-auto">
      <table className="table-base">
        <thead>
          <tr>
            {sortable("date", "Data")}
            {sortable("bank", "Banco")}
            {!singleSource && <Th>Fonte</Th>}
            <Th align="right">Investido</Th>
            <Th align="right">Em conta</Th>
            {sortable("total", "Total", "right")}
            {sortable("cashFlow", "Aporte/Retirada", "right")}
            {sortable("yield", "Rendimento", "right")}
            <Th align="right">%</Th>
            <Th align="right">Ações</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((entry) => {
            const isEditing = editingId === entry.id;
            return (
              <tr key={entry.id} className={isEditing ? "bg-accent/5" : ""}>
                <Td>
                  {isEditing ? (
                    <input type="date" value={draft?.date ?? ""} onChange={(e) => onUpdateDraft("date", e.target.value)} className="input input-sm w-36" />
                  ) : (
                    <span className="num whitespace-nowrap">{fmtDate(entry.date)}</span>
                  )}
                </Td>
                <Td>
                  {isEditing ? (
                    <BankSelect value={draft?.bank ?? ""} banks={banks} onChange={(value) => onUpdateDraft("bank", value)} onCreateBank={onCreateBank} className="w-52" />
                  ) : (
                    <BankBadge name={entry.bank} banks={banks} />
                  )}
                </Td>
                {!singleSource && (
                  <Td>
                    {isEditing ? (
                      <input type="text" list={sourceOptionsId} value={draft?.source ?? ""} onChange={(e) => onUpdateDraft("source", e.target.value)} className="input input-sm w-32" />
                    ) : (
                      <SourceBadge name={entry.source} sources={library} />
                    )}
                  </Td>
                )}
                <Td align="right">
                  {isEditing ? (
                    <CurrencyInput size="sm" tone={false} align="right" value={Number(draft?.invested) || 0} onChange={(num) => onUpdateDraft("invested", num)} className="w-32" />
                  ) : (
                    fmtBRL(entry.invested)
                  )}
                </Td>
                <Td align="right">
                  {isEditing ? (
                    <CurrencyInput size="sm" tone={false} align="right" value={Number(draft?.inAccount) || 0} onChange={(num) => onUpdateDraft("inAccount", num)} className="w-28" />
                  ) : (
                    <span className="text-muted">{fmtBRL(entry.inAccount)}</span>
                  )}
                </Td>
                <Td align="right" className="font-semibold">
                  {fmtBRL(isEditing ? toNumber(draft?.invested) + toNumber(draft?.inAccount) : entry.computedTotal)}
                </Td>
                <Td align="right">
                  {isEditing ? (
                    <CurrencyInput size="sm" allowNegative align="right" value={Number(draft?.cashFlow) || 0} onChange={(num) => onUpdateDraft("cashFlow", num)} className="w-28" />
                  ) : (
                    <span className={toneClass(entry.cashFlow)}>{entry.cashFlow ? fmtBRL(entry.cashFlow) : <span className="text-faint">–</span>}</span>
                  )}
                </Td>
                <Td align="right">
                  {entry.yieldValue !== null && entry.yieldValue !== undefined ? (
                    <span className={toneClass(entry.yieldValue)} title={entry.previousDate ? `vs. ${fmtDate(entry.previousDate)}` : undefined}>{fmtBRL(entry.yieldValue)}</span>
                  ) : (
                    <span
                      className="text-faint"
                      title={
                        entry.yieldGapMonths
                          ? `Rendimento não calculado: saldo anterior (${fmtDate(entry.previousDate)}) está ${entry.yieldGapMonths} meses antes`
                          : "Primeiro lançamento deste banco"
                      }
                    >
                      {entry.yieldGapMonths ? `– (${entry.yieldGapMonths}m)` : "–"}
                    </span>
                  )}
                </Td>
                <Td align="right">
                  {entry.yieldPct !== null && entry.yieldPct !== undefined ? (
                    <span className={toneClass(entry.yieldPct)}>{fmtPct(entry.yieldPct)}</span>
                  ) : (
                    <span className="text-faint">–</span>
                  )}
                </Td>
                <Td align="right">
                  {isEditing ? (
                    <div className="flex justify-end gap-1">
                      <button onClick={() => onSaveEdit(entry.id)} className="btn-primary btn-xs" type="button">Salvar</button>
                      <button onClick={onCancelEdit} className="btn btn-xs" type="button">Cancelar</button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-1">
                      <button onClick={() => onStartEdit(entry.id)} className="btn btn-xs" type="button">Editar</button>
                      {onDuplicate && (
                        <button onClick={() => onDuplicate(entry)} className="btn-ghost btn-xs" type="button" title="Copiar para um novo lançamento com a data de hoje">
                          <CopyIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => onRemove(entry)} className="btn-ghost btn-xs text-faint hover:text-neg" type="button" title="Excluir">
                        <TrashIcon className="h-3.5 w-3.5" />
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
    const current = byDate.get(key) || { date: entry.date, invested: 0, inAccount: 0, cashFlow: 0, yieldValue: 0, hasYield: false, count: 0 };
    current.invested += toNumber(entry.invested);
    current.inAccount += toNumber(entry.inAccount);
    current.cashFlow += toNumber(entry.cashFlow);
    current.count += 1;
    if (entry.yieldValue !== null && entry.yieldValue !== undefined) {
      current.yieldValue += entry.yieldValue;
      current.hasYield = true;
    }
    byDate.set(key, current);
  }
  const rows = Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <div className="overflow-x-auto">
      <table className="table-base">
        <thead>
          <tr>
            <Th>Data</Th>
            <Th align="right">Bancos</Th>
            <Th align="right">Investido</Th>
            <Th align="right">Em conta</Th>
            <Th align="right">Total</Th>
            <Th align="right">Aportes</Th>
            <Th align="right">Rendimento</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.date}>
              <Td>{fmtDate(row.date)}</Td>
              <Td align="right">{row.count}</Td>
              <Td align="right">{fmtBRL(row.invested)}</Td>
              <Td align="right">{fmtBRL(row.inAccount)}</Td>
              <Td align="right" className="font-semibold">{fmtBRL(row.invested + row.inAccount)}</Td>
              <Td align="right"><span className={toneClass(row.cashFlow)}>{fmtBRL(row.cashFlow)}</span></Td>
              <Td align="right">{row.hasYield ? <span className={toneClass(row.yieldValue)}>{fmtBRL(row.yieldValue)}</span> : ""}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function toneClass(value) {
  if (value === null || value === undefined) return "text-ink";
  if (toNumber(value) > 0) return "text-pos font-semibold";
  if (toNumber(value) < 0) return "text-neg font-semibold";
  return "text-ink";
}

export function BankBadge({ name, banks }) {
  const visual = resolveBankVisual(name || "", banks);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm font-medium text-ink">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: visual.color }} aria-hidden="true" />
      <span aria-hidden="true">{visual.icon}</span>
      <span>{name}</span>
    </span>
  );
}

export function SourceBadge({ name, sources }) {
  if (!name) return <span className="text-sm text-faint">—</span>;
  const visual = resolveSourceVisual(name, Array.isArray(sources) ? sources : []);
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-sm text-ink">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: visual.color }} aria-hidden="true" />
      <span>{name}</span>
    </span>
  );
}
