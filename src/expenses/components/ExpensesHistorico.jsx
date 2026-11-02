import { useMemo, useState } from "react";
import { fmtBRL, fmtDate, monthLabel, toNumber, yyyymm } from "../../utils/formatters.js";
import { MultiPillSelect } from "./MultiPillSelect.jsx";
import { ConfirmDialog, Modal } from "../../components/Modal.jsx";
import { EmptyState } from "../../components/AppShell.jsx";
import { Td, Th } from "../../investments/components/TableCells.jsx";
import { CurrencyInput } from "../../components/CurrencyInput.jsx";
import { exportExpensesCsv } from "../../utils/importExport.js";
import { resolveCategoryVisual } from "../config/categories.js";
import { resolveSourceVisual } from "../config/sources.js";
import { SearchIcon, XIcon, TrashIcon, EyeOffIcon } from "../../components/icons.jsx";
import { normalizeDescriptionKey } from "../utils/expenses.js";
import { pillBackground, pillBorder, pillTextColor } from "../../utils/palette.js";
import { fmtMoney } from "../../utils/money.js";
import { EMPTY_FILTERS, PERIOD_KINDS, normalizeViewFilters, resolvePeriod } from "../utils/views.js";

const PAGE = 8;

export function ExpensesHistorico({
  expenses,
  derived,
  setExpenses,
  categories,
  sources,
  onClearAll,
  onCreateCategory,
  onCreateSource,
  onGoToEntry,
  onSaveDescriptionMapping,
  preset = null,
  viewName = "",
  onSaveView,
  onlyUncategorized = false,
  onHideInView,
  onUnhideInView,
  monthPageSize = null, // when set, always paginate each month (used by Visões)
}) {
  const initial = useMemo(() => normalizeViewFilters(preset || EMPTY_FILTERS), [preset]);
  const initialPeriod = useMemo(() => resolvePeriod(initial.period), [initial]);
  const [q, setQ] = useState(initial.q);
  const [filterType, setFilterType] = useState(initial.type);
  const [categoryFilter, setCategoryFilter] = useState(initial.categories);
  const [sourceFilter, setSourceFilter] = useState(initial.source);
  const [fromYm, setFromYm] = useState(initialPeriod.fromYm);
  const [toYm, setToYm] = useState(initialPeriod.toYm);
  const [excludeInvest, setExcludeInvest] = useState(initial.excludeInvest);
  const [periodKind, setPeriodKind] = useState(initial.period.kind === "all" && !initialPeriod.fromYm ? "all" : initial.period.kind);
  const [saveView, setSaveView] = useState(null); // { name, periodKind }
  const [savedFlash, setSavedFlash] = useState(null);
  const [showHidden, setShowHidden] = useState(false);
  const hiddenIdSet = useMemo(() => new Set(initial.hiddenIds), [initial]);
  const hiddenDescSet = useMemo(() => new Set(initial.hiddenDescriptions.map(normalizeDescriptionKey)), [initial]);
  const hiddenReason = (e) => (hiddenIdSet.has(e.id) ? "id" : hiddenDescSet.has(normalizeDescriptionKey(e.description)) ? "description" : null);
  const hiddenCount = useMemo(() => (hiddenIdSet.size || hiddenDescSet.size ? derived.filter((e) => hiddenReason(e)).length : 0), [derived, hiddenIdSet, hiddenDescSet]);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [summaryMode, setSummaryMode] = useState("detail"); // "detail" | "day" | "month"
  const collapsed = summaryMode === "day";
  const [monthChartModal, setMonthChartModal] = useState(null);
  const [expandedMonths, setExpandedMonths] = useState(new Set());
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [selected, setSelected] = useState(new Set());
  const [batch, setBatch] = useState(null); // { categories, sources }
  const [confirmDelete, setConfirmDelete] = useState(null);

  const categoryOptions = useMemo(() => (Array.isArray(categories) ? categories.filter(Boolean) : []), [categories]);
  const sourceOptions = useMemo(() => (Array.isArray(sources) ? sources.filter(Boolean) : []), [sources]);
  const colorOfCategory = (name) => resolveCategoryVisual(name, categoryOptions).color;
  const colorOfSource = (name) => resolveSourceVisual(name, sourceOptions).color;
  const baseLookup = useMemo(() => new Map(expenses.map((e) => [e.id, e])), [expenses]);
  const usedCategories = useMemo(() => {
    const counts = new Map();
    expenses.forEach((e) => (e.categories || []).forEach((c) => counts.set(c, (counts.get(c) || 0) + 1)));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [expenses]);

  const filtered = useMemo(() => {
    let items = derived;
    if (hiddenIdSet.size || hiddenDescSet.size) {
      items = showHidden
        ? items.map((e) => {
            const reason = hiddenReason(e);
            return reason ? { ...e, _hidden: reason } : e;
          })
        : items.filter((e) => !hiddenReason(e));
    }
    if (onlyUncategorized) items = items.filter((e) => !(e.categories || []).length);
    if (filterType !== "all") items = items.filter((e) => (filterType === "expense" ? toNumber(e.value) < 0 : toNumber(e.value) >= 0));
    if (categoryFilter.length) items = items.filter((e) => (e.categories || []).some((c) => categoryFilter.includes(c)));
    if (sourceFilter) items = items.filter((e) => (e.sources || []).includes(sourceFilter));
    if (excludeInvest) items = items.filter((e) => !(e.categories || []).some((c) => /investimento/i.test(c)));
    if (fromYm) items = items.filter((e) => yyyymm(e.date) >= fromYm);
    if (toYm) items = items.filter((e) => yyyymm(e.date) <= toYm);

    const trimmed = q.trim();
    if (!trimmed) return items;
    const isReverse = trimmed.startsWith("!");
    const isExact = trimmed.startsWith("=");
    const s = trimmed.replace(/^[!=]/, "").toLowerCase().trim();
    if (!s) return items;
    return items.filter((e) => {
      const absValue = Math.abs(toNumber(e.value));
      const formatted = fmtBRL(absValue);
      const pool = [
        e.description || "",
        ...(e.categories || []),
        ...(e.sources || []),
        e.date || "",
        fmtDate(e.date),
        String(absValue),
        formatted,
        formatted.replace(/[R$\s ]/g, ""),
        e.note || "",
      ];
      const matches = pool.filter(Boolean).map((v) => String(v).toLowerCase()).some((t) => (isExact ? t === s : t.includes(s)));
      return isReverse ? !matches : matches;
    });
  }, [q, derived, filterType, categoryFilter, sourceFilter, excludeInvest, fromYm, toYm, onlyUncategorized, hiddenIdSet, hiddenDescSet, showHidden]);

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
      .map(([ym, arr]) => {
        const items = arr.slice().sort((a, b) => {
          let cmp = 0;
          if (sortBy === "date") cmp = a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
          else if (sortBy === "description") cmp = (a.description || "").localeCompare(b.description || "");
          else if (sortBy === "value") cmp = Math.abs(toNumber(a.value)) - Math.abs(toNumber(b.value));
          return sortOrder === "asc" ? cmp : -cmp;
        });
        const visible = items.filter((e) => !e._hidden);
        const spent = visible.filter((e) => toNumber(e.value) < 0).reduce((a, e) => a + Math.abs(toNumber(e.value)), 0);
        const earned = visible.filter((e) => toNumber(e.value) > 0).reduce((a, e) => a + toNumber(e.value), 0);
        return { ym, label: monthLabel(ym), items, spent, earned, isExpanded: expandedMonths.has(ym) };
      });
  }, [filtered, expandedMonths, sortBy, sortOrder]);

  const grandTotals = useMemo(() => {
    const visible = filtered.filter((e) => !e._hidden);
    const spent = visible.filter((e) => toNumber(e.value) < 0).reduce((a, e) => a + Math.abs(toNumber(e.value)), 0);
    const earned = visible.filter((e) => toNumber(e.value) > 0).reduce((a, e) => a + toNumber(e.value), 0);
    return { spent, earned };
  }, [filtered]);

  function removeExpense(id) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    if (editingId === id) cancelEdit();
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  function startEdit(id) {
    const original = baseLookup.get(id);
    if (!original) return;
    setEditingId(id);
    setDraft({
      date: original.date?.slice(0, 10) || "",
      description: original.description || "",
      categories: original.categories || [],
      sources: original.sources || [],
      value: toNumber(original.value),
      note: original.note || "",
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  function saveEdit(id) {
    if (!draft || !draft.date || !draft.description) return;
    setExpenses((prev) =>
      prev.map((e) =>
        e.id !== id
          ? e
          : { ...e, date: draft.date, description: draft.description.trim(), categories: draft.categories, sources: draft.sources, value: toNumber(draft.value), note: draft.note }
      )
    );
    if (draft.categories?.length && onSaveDescriptionMapping) onSaveDescriptionMapping(draft.description, draft.categories, true);
    cancelEdit();
  }

  function toggleSort(field) {
    if (sortBy === field) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortOrder(field === "description" ? "asc" : "desc");
    }
  }

  function toggleMonthExpansion(ym) {
    setExpandedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(ym)) next.delete(ym);
      else next.add(ym);
      return next;
    });
  }

  function toggleSelected(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectMonth(group, on) {
    setSelected((prev) => {
      const next = new Set(prev);
      group.items.forEach((e) => (on ? next.add(e.id) : next.delete(e.id)));
      return next;
    });
  }

  function applyBatch() {
    if (!batch || !selected.size) return;
    setExpenses((prev) =>
      prev.map((e) => {
        if (!selected.has(e.id)) return e;
        return {
          ...e,
          categories: batch.replace ? batch.categories : batch.categories.length ? Array.from(new Set([...(e.categories || []), ...batch.categories])) : e.categories,
          sources: batch.replace ? (batch.sources.length ? batch.sources : e.sources) : batch.sources.length ? Array.from(new Set([...(e.sources || []), ...batch.sources])) : e.sources,
        };
      })
    );
    setBatch(null);
    setSelected(new Set());
  }

  function deleteSelected() {
    setExpenses((prev) => prev.filter((e) => !selected.has(e.id)));
    setSelected(new Set());
    setConfirmDelete(null);
  }

  const hasFilters = q || filterType !== "all" || categoryFilter.length || sourceFilter || fromYm || toYm || excludeInvest;

  function clearFilters() {
    setQ("");
    setFilterType("all");
    setCategoryFilter([]);
    setSourceFilter("");
    setFromYm("");
    setToYm("");
    setExcludeInvest(false);
    setPeriodKind("all");
  }

  function currentFilters(kind = periodKind) {
    const useCustom = kind === "custom" || (kind === "all" && (fromYm || toYm));
    return normalizeViewFilters({
      q,
      type: filterType,
      categories: categoryFilter,
      source: sourceFilter,
      excludeInvest,
      period: useCustom ? { kind: "custom", from: fromYm, to: toYm } : { kind },
      hiddenIds: initial.hiddenIds,
      hiddenDescriptions: initial.hiddenDescriptions,
    });
  }

  /** Hides instantly. Default: every transaction with the same description; onlyThis: just this row. */
  function hideRows(rows, { onlyThis = false } = {}) {
    if (!onHideInView || !rows.length) return;
    const payload = onlyThis
      ? { ids: rows.map((r) => r.id) }
      : { descriptions: Array.from(new Set(rows.map((r) => r.description).filter(Boolean))) };
    onHideInView({ ...payload, filters: currentFilters() });
    setSelected(new Set());
  }

  /** Period as shown on screen: a relative kind only if the dates were not edited by hand. */
  function screenPeriodKind() {
    if (periodKind === "custom") return "custom";
    if (periodKind === "all") return fromYm || toYm ? "custom" : "all";
    const resolved = resolvePeriod({ kind: periodKind });
    return resolved.fromYm === fromYm && resolved.toYm === toYm ? periodKind : "custom";
  }

  function flashSaved(name) {
    setSavedFlash(name);
    setTimeout(() => setSavedFlash(null), 2500);
  }

  /** Existing user view: saves immediately with exactly what is on screen. New view: asks for a name. */
  function openSaveView() {
    if (viewName && onSaveView) {
      onSaveView({ name: viewName, filters: currentFilters(screenPeriodKind()) });
      flashSaved(viewName);
      return;
    }
    setSaveView({ name: "", periodKind: screenPeriodKind() });
  }

  function openSaveAsNew() {
    setSaveView({ name: viewName ? `${viewName} (cópia)` : "", periodKind: screenPeriodKind() });
  }

  function confirmSaveView() {
    if (!saveView?.name.trim() || !onSaveView) return;
    const name = saveView.name.trim();
    onSaveView({ name, filters: currentFilters(saveView.periodKind) });
    setSaveView(null);
    flashSaved(name);
  }

  return (
    <div className="card-pad">
      <div className="mb-3 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <SearchIcon className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              className="input pl-8"
              placeholder='Buscar descrição, categoria, valor... ("!" exclui, "=" exato)'
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {q && (
              <button type="button" onClick={() => setQ("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-ink" aria-label="Limpar busca">
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="pill-toggle" role="group" aria-label="Tipo">
            <button type="button" aria-pressed={filterType === "all"} onClick={() => setFilterType("all")}>Todas</button>
            <button type="button" aria-pressed={filterType === "expense"} onClick={() => setFilterType("expense")} className={filterType === "expense" ? "!text-neg" : ""}>Despesas</button>
            <button type="button" aria-pressed={filterType === "income"} onClick={() => setFilterType("income")} className={filterType === "income" ? "!text-pos" : ""}>Receitas</button>
          </div>
          <select className="input w-auto" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} title="Fonte">
            <option value="">Todas as fontes</option>
            {sourceOptions.map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-1 text-xs text-muted">
            <input type="month" className="input input-sm w-auto" value={fromYm} onChange={(e) => { setFromYm(e.target.value); setPeriodKind("custom"); }} title="De" />
            <span>→</span>
            <input type="month" className="input input-sm w-auto" value={toYm} onChange={(e) => { setToYm(e.target.value); setPeriodKind("custom"); }} title="Até" />
          </div>
          <button type="button" className={excludeInvest ? "chip-on" : "chip"} onClick={() => setExcludeInvest((v) => !v)} aria-pressed={excludeInvest} title="Oculta transações da categoria Investimento">
            Sem investimentos
          </button>
          {hasFilters && (
            <button type="button" className="btn-ghost btn-sm" onClick={clearFilters}>Limpar filtros</button>
          )}
        </div>
        {usedCategories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {usedCategories.slice(0, 18).map((name) => {
              const on = categoryFilter.includes(name);
              const color = colorOfCategory(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setCategoryFilter((prev) => (on ? prev.filter((c) => c !== name) : [...prev, name]))}
                  className={on ? "chip-on" : "chip"}
                  aria-pressed={on}
                  style={on ? { borderColor: color, color } : undefined}
                >
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                  {name}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
          <span>
            {filtered.length} de {expenses.length} transações · Despesas <strong className="num text-neg">{fmtBRL(grandTotals.spent)}</strong> · Receitas{" "}
            <strong className="num text-pos">{fmtBRL(grandTotals.earned)}</strong>
          </span>
          <div className="flex flex-wrap gap-1.5">
            <div className="pill-toggle" role="group" aria-label="Modo de exibição">
              <button type="button" aria-pressed={summaryMode === "detail"} onClick={() => setSummaryMode("detail")} title="Lista todas as transações">
                Detalhes
              </button>
              <button type="button" aria-pressed={summaryMode === "day"} onClick={() => setSummaryMode("day")} title="Totais por dia dentro de cada mês">
                Por dia
              </button>
              <button type="button" aria-pressed={summaryMode === "month"} onClick={() => setSummaryMode("month")} title="Uma linha por mês com despesas, receitas e saldo">
                Por mês
              </button>
            </div>
            {onHideInView && hiddenCount > 0 && (
              <button
                type="button"
                onClick={() => setShowHidden((v) => !v)}
                className={showHidden ? "chip-on" : "btn btn-xs"}
                aria-pressed={showHidden}
                title={showHidden ? "Volta a esconder as transações ocultas nesta visão" : "Exibe as transações ocultas nesta visão (esmaecidas)"}
              >
                <EyeOffIcon className="h-3.5 w-3.5" /> {showHidden ? "Esconder ocultas" : `Mostrar ocultas (${hiddenCount})`}
              </button>
            )}
            {onSaveView && (
              <>
                <button
                  type="button"
                  onClick={openSaveView}
                  className={savedFlash ? "btn-pos btn-xs" : "btn btn-xs"}
                  title={viewName ? `Grava em "${viewName}" as datas e os filtros que estão na tela` : "Guarda as datas e os filtros atuais como uma visão na aba Visões"}
                >
                  {savedFlash ? "✓ Salvo" : viewName ? "Salvar visão" : "Salvar como visão"}
                </button>
                {viewName && (
                  <button type="button" onClick={openSaveAsNew} className="btn-ghost btn-xs" title="Cria uma nova visão com os filtros atuais">
                    Salvar como nova
                  </button>
                )}
              </>
            )}
            <button type="button" onClick={() => exportExpensesCsv(filtered)} className="btn btn-xs" title="Exporta as transações filtradas em CSV">Exportar CSV</button>
            {expenses.length > 0 && typeof onClearAll === "function" && (
              <button type="button" onClick={onClearAll} className="btn-danger btn-xs">Apagar tudo</button>
            )}
          </div>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="sticky top-14 z-30 mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-accent/40 bg-surface px-3 py-2 text-sm shadow-pop fade-in">
          <span className="font-semibold text-ink">{selected.size} selecionada(s)</span>
          <button type="button" className="btn btn-xs" onClick={() => setBatch({ categories: [], sources: [], replace: false })}>Categorizar / fonte</button>
          {onHideInView && (
            <button type="button" className="btn btn-xs" onClick={() => hideRows(expenses.filter((e) => selected.has(e.id)), { onlyThis: true })} title="Oculta as selecionadas só nesta visão">
              <EyeOffIcon className="h-3.5 w-3.5" /> Ocultar nesta visão
            </button>
          )}
          <button type="button" className="btn-danger btn-xs" onClick={() => setConfirmDelete({ bulk: true })}>Excluir</button>
          <button type="button" className="btn-ghost btn-xs ml-auto" onClick={() => setSelected(new Set())}>Desmarcar</button>
        </div>
      )}

      {groups.length === 0 && (
        <EmptyState
          title={expenses.length ? "Nenhuma transação com esses filtros." : "Sem transações ainda."}
          action={!expenses.length && onGoToEntry ? <button type="button" className="btn-primary" onClick={onGoToEntry}>Adicionar ou importar</button> : null}
        >
          {expenses.length ? "Ajuste a busca ou limpe os filtros." : "Importe a fatura do cartão ou extrato na aba Nova Transação."}
        </EmptyState>
      )}

      {summaryMode === "month" && groups.length > 0 && (
        <MonthSummaryTable groups={groups} colorOf={colorOfCategory} onOpenMonth={(g) => setMonthChartModal(g)} />
      )}

      <div className={`space-y-4 ${summaryMode === "month" ? "hidden" : ""}`}>
        {groups.map((group) => {
          const pageSize = monthPageSize || PAGE;
          const paginate = Boolean(monthPageSize) || !hasFilters;
          const displayItems = group.isExpanded || !paginate ? group.items : group.items.slice(0, pageSize);
          const hasMore = paginate && group.items.length > pageSize;
          const allSelected = group.items.every((e) => selected.has(e.id));
          return (
            <div key={group.ym} className="overflow-hidden rounded-xl border border-line">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 px-3 py-2 text-xs text-muted">
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={allSelected} onChange={(e) => selectMonth(group, e.target.checked)} title="Selecionar o mês" />
                  <span className="text-sm font-semibold capitalize text-ink">{group.label}</span>
                  <button type="button" onClick={() => setMonthChartModal(group)} className="btn btn-xs" title="Despesas por categoria no mês">
                    Por categoria
                  </button>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span>Despesas: <strong className="num text-neg">{fmtBRL(group.spent)}</strong></span>
                  <span>Receitas: <strong className="num text-pos">{fmtBRL(group.earned)}</strong></span>
                  <span>Saldo: <strong className={`num ${group.earned - group.spent >= 0 ? "text-pos" : "text-neg"}`}>{fmtBRL(group.earned - group.spent)}</strong></span>
                  <span>{group.items.length} itens</span>
                </div>
              </div>
              {collapsed ? (
                <CollapsedTable items={group.items} />
              ) : (
                <>
                  <DetailedTable
                    items={displayItems}
                    editingId={editingId}
                    draft={draft}
                    onStartEdit={startEdit}
                    onUpdateDraft={(name, value) => setDraft((prev) => (prev ? { ...prev, [name]: value } : prev))}
                    onCancelEdit={cancelEdit}
                    onSaveEdit={saveEdit}
                    onRemove={(e) => setConfirmDelete({ item: e })}
                    onHide={onHideInView ? (e, onlyThis) => hideRows([e], { onlyThis }) : null}
                    onUnhide={onUnhideInView ? (e) => onUnhideInView(e._hidden === "id" ? { id: e.id } : { description: e.description }) : null}
                    categoryOptions={categoryOptions}
                    sourceOptions={sourceOptions}
                    colorOfCategory={colorOfCategory}
                    colorOfSource={colorOfSource}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={toggleSort}
                    selected={selected}
                    onToggleSelected={toggleSelected}
                    onCreateCategory={onCreateCategory}
                    onCreateSource={onCreateSource}
                  />
                  {hasMore && (
                    <button type="button" onClick={() => toggleMonthExpansion(group.ym)} className="w-full border-t border-line bg-surface-2 px-4 py-2 text-xs font-medium text-muted hover:text-ink">
                      {group.isExpanded ? `Mostrar só as primeiras ${pageSize}` : `Expandir: mostrar todas as ${group.items.length} (+${group.items.length - pageSize})`}
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {monthChartModal && <MonthChartModal group={monthChartModal} onClose={() => setMonthChartModal(null)} colorOf={colorOfCategory} />}

      <Modal
        open={Boolean(batch)}
        onClose={() => setBatch(null)}
        title={`Editar ${selected.size} transação(ões)`}
        size="sm"
        footer={
          <>
            <button type="button" className="btn" onClick={() => setBatch(null)}>Cancelar</button>
            <button type="button" className="btn-primary" onClick={applyBatch} disabled={!batch || (!batch.categories.length && !batch.sources.length)}>Aplicar</button>
          </>
        }
      >
        {batch && (
          <div className="space-y-3">
            <div>
              <span className="label">Categorias</span>
              <MultiPillSelect values={batch.categories} options={categoryOptions} onChange={(v) => setBatch((p) => ({ ...p, categories: v }))} onCreateOption={onCreateCategory} />
            </div>
            <div>
              <span className="label">Fontes</span>
              <MultiPillSelect values={batch.sources} options={sourceOptions} onChange={(v) => setBatch((p) => ({ ...p, sources: v }))} onCreateOption={onCreateSource} />
            </div>
            <label className="flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={batch.replace} onChange={(e) => setBatch((p) => ({ ...p, replace: e.target.checked }))} />
              Substituir as categorias atuais (em vez de adicionar)
            </label>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(saveView)}
        onClose={() => setSaveView(null)}
        title="Salvar visão"
        description="Uma visão guarda os filtros atuais para abrir com um clique na aba Visões."
        size="sm"
        footer={
          <>
            <button type="button" className="btn" onClick={() => setSaveView(null)}>Cancelar</button>
            <button type="button" className="btn-primary" onClick={confirmSaveView} disabled={!saveView?.name?.trim()}>Salvar</button>
          </>
        }
      >
        {saveView && (
          <div className="space-y-3">
            <label className="block">
              <span className="label">Nome</span>
              <input className="input" value={saveView.name} onChange={(e) => setSaveView((p) => ({ ...p, name: e.target.value }))} placeholder="ex.: Mercado do mês" autoFocus />
            </label>
            <label className="block">
              <span className="label">Período</span>
              <select className="input" value={saveView.periodKind} onChange={(e) => setSaveView((p) => ({ ...p, periodKind: e.target.value }))}>
                {PERIOD_KINDS.map((k) => (
                  <option key={k.value} value={k.value}>
                    {k.value === "custom" ? `Datas fixas (${fromYm ? monthLabel(fromYm) : "início"} → ${toYm ? monthLabel(toYm) : "hoje"})` : k.label}
                  </option>
                ))}
              </select>
              <span className="mt-0.5 block text-[0.68rem] text-faint">
                “Datas fixas” grava exatamente os meses da tela. Períodos relativos (mês atual, últimos 3 meses...) acompanham o calendário.
              </span>
            </label>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => (confirmDelete?.bulk ? deleteSelected() : confirmDelete?.item && removeExpense(confirmDelete.item.id))}
        title={confirmDelete?.bulk ? `Excluir ${selected.size} transação(ões)?` : "Excluir transação?"}
        message={confirmDelete?.item ? `${confirmDelete.item.description} em ${fmtDate(confirmDelete.item.date)} (${fmtBRL(confirmDelete.item.value)})` : "Esta ação não pode ser desfeita."}
        confirmLabel="Excluir"
        danger
      />
    </div>
  );
}

function Pill({ name, color, variant = "solid" }) {
  if (variant === "outline") {
    return (
      <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-line bg-surface-2 px-2 py-0.5 text-xs font-medium text-ink" title={name}>
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden="true" />
        <span className="truncate">{name}</span>
      </span>
    );
  }
  return (
    <span
      className="inline-flex max-w-full items-center rounded-full border px-2 py-0.5 text-xs font-semibold"
      style={{ backgroundColor: pillBackground(color, 18), color: pillTextColor(color), borderColor: pillBorder(color, 50) }}
      title={name}
    >
      <span className="truncate">{name}</span>
    </span>
  );
}

function DetailedTable({ items, editingId, draft, onStartEdit, onUpdateDraft, onCancelEdit, onSaveEdit, onRemove, onHide, onUnhide, categoryOptions, sourceOptions, colorOfCategory, colorOfSource, sortBy, sortOrder, onSort, selected, onToggleSelected, onCreateCategory, onCreateSource }) {
  const sortable = (field, label, align) => (
    <Th sortable active={sortBy === field} direction={sortOrder} onClick={() => onSort(field)} align={align}>{label}</Th>
  );
  return (
    <div className="overflow-x-auto">
      <table className="table-base" style={{ tableLayout: "fixed", width: "100%", minWidth: 900 }}>
        <colgroup>
          <col style={{ width: 36 }} />
          <col style={{ width: 96 }} />
          <col />
          <col style={{ width: 170 }} />
          <col style={{ width: 160 }} />
          <col style={{ width: 118 }} />
          <col style={{ width: onHide ? 150 : 110 }} />
        </colgroup>
        <thead>
          <tr>
            <Th />
            {sortable("date", "Data")}
            {sortable("description", "Descrição")}
            <Th>Categoria</Th>
            <Th>Fonte</Th>
            {sortable("value", "Valor", "right")}
            <Th align="right">Ações</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((e) => {
            const isEditing = editingId === e.id;
            const negative = toNumber(e.value) < 0;
            return (
              <tr key={e.id} className={`${isEditing ? "bg-accent/5" : ""} ${selected.has(e.id) ? "bg-accent/10" : ""} ${e._hidden ? "opacity-50" : ""}`}>
                <Td>
                  <input type="checkbox" checked={selected.has(e.id)} onChange={() => onToggleSelected(e.id)} aria-label="Selecionar" />
                </Td>
                <Td>
                  {isEditing ? (
                    <input type="date" value={draft?.date ?? ""} onChange={(ev) => onUpdateDraft("date", ev.target.value)} className="input input-sm" />
                  ) : (
                    <span className="num whitespace-nowrap text-muted">{fmtDate(e.date)}</span>
                  )}
                </Td>
                <Td>
                  {isEditing ? (
                    <input type="text" value={draft?.description ?? ""} onChange={(ev) => onUpdateDraft("description", ev.target.value)} className="input input-sm" />
                  ) : (
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${negative ? "bg-neg" : "bg-pos"}`} title={negative ? "Despesa" : "Receita"} />
                      <span className="min-w-0 truncate text-ink" title={e.description}>{e.description}</span>
                    </div>
                  )}
                </Td>
                <Td>
                  {isEditing ? (
                    <MultiPillSelect values={draft?.categories ?? []} options={categoryOptions} onChange={(v) => onUpdateDraft("categories", v)} onCreateOption={onCreateCategory} placeholder="Categoria" />
                  ) : e.categories?.length ? (
                    <div className="flex flex-wrap gap-1">{e.categories.map((c) => <Pill key={c} name={c} color={colorOfCategory(c)} />)}</div>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </Td>
                <Td>
                  {isEditing ? (
                    <MultiPillSelect variant="outline" values={draft?.sources ?? []} options={sourceOptions} onChange={(v) => onUpdateDraft("sources", v)} onCreateOption={onCreateSource} placeholder="Fonte" />
                  ) : e.sources?.length ? (
                    <div className="flex flex-wrap gap-1">{e.sources.map((s) => <Pill key={s} name={s} color={colorOfSource(s)} variant="outline" />)}</div>
                  ) : (
                    <span className="text-faint">—</span>
                  )}
                </Td>
                <Td align="right">
                  {isEditing ? (
                    <CurrencyInput size="sm" align="right" allowNegative value={toNumber(draft?.value)} onChange={(num) => onUpdateDraft("value", num)} />
                  ) : (
                    <>
                      <span className={`whitespace-nowrap font-semibold ${negative ? "text-neg" : "text-pos"}`}>{negative ? "−" : "+"}{fmtBRL(e.absValue)}</span>
                      {e.originalCurrency && e.originalAmount != null && (
                        <span className="block whitespace-nowrap text-[0.65rem] text-faint" title={`Cotação usada: ${e.exchangeRate}`}>
                          {fmtMoney(Math.abs(e.originalAmount), { currency: e.originalCurrency })}
                        </span>
                      )}
                    </>
                  )}
                </Td>
                <Td align="right">
                  {isEditing ? (
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => onSaveEdit(e.id)} className="btn-primary btn-xs">Salvar</button>
                      <button type="button" onClick={onCancelEdit} className="btn btn-xs">Cancelar</button>
                    </div>
                  ) : (
                    <div className="flex justify-end gap-1">
                      <button type="button" onClick={() => onStartEdit(e.id)} className="btn btn-xs">Editar</button>
                      {onHide && e._hidden && onUnhide ? (
                        <button type="button" onClick={() => onUnhide(e)} className="btn btn-xs" title={e._hidden === "description" ? "Volta a mostrar todas com esta descrição" : "Volta a mostrar esta transação"}>
                          Mostrar
                        </button>
                      ) : onHide ? (
                        <button
                          type="button"
                          onClick={(event) => onHide(e, event.shiftKey)}
                          className="btn-ghost btn-xs text-faint hover:text-ink"
                          title="Oculta nesta visão todas as transações com esta descrição (Shift+clique: só esta). Continuam no histórico."
                        >
                          <EyeOffIcon className="h-3.5 w-3.5" />
                        </button>
                      ) : null}
                      <button type="button" onClick={() => onRemove(e)} className="btn-ghost btn-xs text-faint hover:text-neg" title="Excluir do histórico (todas as visões)">
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
  for (const e of items) {
    const current = byDate.get(e.date) || { date: e.date, spent: 0, earned: 0, count: 0 };
    const v = toNumber(e.value);
    if (v < 0) current.spent += Math.abs(v);
    else current.earned += v;
    current.count += 1;
    byDate.set(e.date, current);
  }
  const rows = Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  return (
    <div className="overflow-x-auto">
      <table className="table-base">
        <thead>
          <tr>
            <Th>Data</Th>
            <Th align="right">Itens</Th>
            <Th align="right">Despesas</Th>
            <Th align="right">Receitas</Th>
            <Th align="right">Saldo</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.date}>
              <Td>{fmtDate(row.date)}</Td>
              <Td align="right">{row.count}</Td>
              <Td align="right"><span className="text-neg">{fmtBRL(row.spent)}</span></Td>
              <Td align="right"><span className="text-pos">{fmtBRL(row.earned)}</span></Td>
              <Td align="right" className="font-semibold">{fmtBRL(row.earned - row.spent)}</Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MonthChartModal({ group, onClose, colorOf }) {
  const { label, items } = group;
  const totals = {};
  items
    .filter((item) => toNumber(item.value) < 0)
    .forEach((item) => {
      const cats = Array.isArray(item.categories) && item.categories.length ? item.categories : ["Sem categoria"];
      const absValue = Math.abs(toNumber(item.value));
      const share = absValue / cats.length;
      cats.forEach((cat) => {
        if (/investimento/i.test(cat)) return;
        totals[cat] = (totals[cat] || 0) + share;
      });
    });
  const data = Object.entries(totals).map(([name, value]) => ({ name, value })).filter((i) => i.value > 0).sort((a, b) => b.value - a.value);
  const total = data.reduce((s, i) => s + i.value, 0);
  return (
    <Modal open onClose={onClose} title={`Despesas por categoria · ${label}`} size="lg">
      {data.length ? (
        <div className="space-y-2">
          {data.map((item) => {
            const percent = total > 0 ? (item.value / total) * 100 : 0;
            const color = colorOf(item.name);
            return (
              <div key={item.name} className="flex items-center gap-3 text-sm">
                <span className="flex w-36 shrink-0 items-center gap-2 truncate font-medium text-ink">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                  {item.name}
                </span>
                <div className="h-5 flex-1 overflow-hidden rounded-full bg-surface-3">
                  <div className="flex h-full items-center justify-end px-2 text-[0.65rem] font-semibold text-white" style={{ backgroundColor: color, width: `${Math.max(percent, 2)}%` }}>
                    {percent >= 8 ? `${percent.toFixed(0)}%` : ""}
                  </div>
                </div>
                <span className="num w-28 shrink-0 text-right font-semibold text-ink">{fmtBRL(item.value)}</span>
              </div>
            );
          })}
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-sm">
            <span className="font-semibold text-muted">Total de despesas (sem investimentos)</span>
            <span className="num text-lg font-bold text-neg">{fmtBRL(total)}</span>
          </div>
        </div>
      ) : (
        <p className="py-6 text-center text-sm text-muted">Nenhuma despesa neste mês.</p>
      )}
    </Modal>
  );
}

/** One row per month. Totals use every transaction of the month (hidden-in-view rows excluded). */
function MonthSummaryTable({ groups, colorOf, onOpenMonth }) {
  const rows = groups.map((g) => {
    const visible = g.items.filter((e) => !e._hidden);
    const byCategory = {};
    visible
      .filter((e) => toNumber(e.value) < 0)
      .forEach((e) => {
        const cats = e.categories?.length ? e.categories : ["Sem categoria"];
        const share = Math.abs(toNumber(e.value)) / cats.length;
        cats.forEach((c) => (byCategory[c] = (byCategory[c] || 0) + share));
      });
    const top = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];
    return { group: g, count: visible.length, spent: g.spent, earned: g.earned, balance: g.earned - g.spent, top };
  });
  const totals = rows.reduce(
    (acc, r) => ({ count: acc.count + r.count, spent: acc.spent + r.spent, earned: acc.earned + r.earned }),
    { count: 0, spent: 0, earned: 0 }
  );
  const months = rows.length || 1;
  const maxSpent = Math.max(...rows.map((r) => r.spent), 1);

  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      <table className="table-base">
        <thead>
          <tr>
            <Th>Mês</Th>
            <Th align="right">Itens</Th>
            <Th align="right">Despesas</Th>
            <Th />
            <Th align="right">Receitas</Th>
            <Th align="right">Saldo</Th>
            <Th>Maior categoria</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.group.ym} className="cursor-pointer" onClick={() => onOpenMonth(r.group)} title="Ver despesas por categoria do mês">
              <Td className="whitespace-nowrap font-medium capitalize text-ink">{r.group.label}</Td>
              <Td align="right">{r.count}</Td>
              <Td align="right"><span className="text-neg">{fmtBRL(r.spent)}</span></Td>
              <Td className="w-32">
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <div className="h-full rounded-full bg-neg/70" style={{ width: `${(r.spent / maxSpent) * 100}%` }} />
                </div>
              </Td>
              <Td align="right"><span className="text-pos">{fmtBRL(r.earned)}</span></Td>
              <Td align="right"><span className={`font-semibold ${r.balance >= 0 ? "text-pos" : "text-neg"}`}>{fmtBRL(r.balance)}</span></Td>
              <Td>
                {r.top ? (
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: colorOf(r.top[0]) }} />
                    {r.top[0]} · <span className="num">{fmtBRL(r.top[1])}</span>
                  </span>
                ) : (
                  <span className="text-faint">—</span>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-line bg-surface-2 text-sm">
          <tr>
            <Td className="font-semibold text-ink">Total ({rows.length} {rows.length === 1 ? "mês" : "meses"})</Td>
            <Td align="right" className="font-semibold">{totals.count}</Td>
            <Td align="right" className="font-semibold text-neg">{fmtBRL(totals.spent)}</Td>
            <Td className="text-[0.7rem] text-muted">média {fmtBRL(totals.spent / months)}/mês</Td>
            <Td align="right" className="font-semibold text-pos">{fmtBRL(totals.earned)}</Td>
            <Td align="right" className={`font-semibold ${totals.earned - totals.spent >= 0 ? "text-pos" : "text-neg"}`}>{fmtBRL(totals.earned - totals.spent)}</Td>
            <Td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
