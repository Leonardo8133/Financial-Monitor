import { useMemo, useState } from "react";
import { CurrencyInput } from "../../components/CurrencyInput.jsx";
import { Uploader } from "./Uploader.jsx";
import { MultiPillSelect } from "./MultiPillSelect.jsx";
import { MappingModal } from "./MappingModal.jsx";
import { Modal } from "../../components/Modal.jsx";
import { normalizeDescriptionKey } from "../utils/expenses.js";
import { findDoubleCharges } from "../utils/duplicates.js";
import { fmtBRL, fmtDate, toNumber, todayISO } from "../../utils/formatters.js";
import { PlusIcon, SparklesIcon, TrashIcon } from "../../components/icons.jsx";

const PIX_PATTERNS = [
  "transferência enviada pelo pix",
  "transferência recebida pelo pix",
  "transferência recebida -",
  "transferência enviada -",
];

function shouldIgnoreForMapping(description = "") {
  const desc = description.toLowerCase();
  return PIX_PATTERNS.some((p) => desc.startsWith(p));
}

export function ExpensesEntrada({
  drafts,
  setDrafts,
  createDraft,
  onSubmit,
  categories,
  sources,
  suggestCategories = () => [],
  descriptionMemory = new Map(),
  onSaveDescriptionMapping = () => {},
  descriptionMappings = [],
  mappingActions,
  ignoredDescriptions = [],
  onCreateCategory,
  onCreateSource,
  monthCount = 0,
  referenceRates = {},
}) {
  const [sortBy, setSortBy] = useState(null);
  const [sortOrder, setSortOrder] = useState("desc");
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [quickMap, setQuickMap] = useState(null); // { list, index }
  const [learnMappings, setLearnMappings] = useState(true);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const doubles = useMemo(() => findDoubleCharges(drafts), [drafts]);

  function removeDoubleExtras() {
    if (!doubles.extraCount) return;
    setDrafts((prev) => prev.filter((row) => !doubles.extraIds.has(row.id)));
    setShowDuplicates(false);
  }

  const categoryOptions = useMemo(() => (Array.isArray(categories) ? categories.filter(Boolean) : []), [categories]);
  const sourceOptions = useMemo(() => (Array.isArray(sources) ? sources.filter(Boolean) : []), [sources]);
  const recentDescriptions = useMemo(
    () =>
      Array.from(descriptionMemory.values())
        .sort((a, b) => (b.count - a.count) || ((a.lastDate || "") < (b.lastDate || "") ? 1 : -1))
        .slice(0, 300)
        .map((m) => m.description),
    [descriptionMemory]
  );

  function updateRow(id, patch) {
    setDrafts((prev) => prev.map((row) => (row.id !== id ? row : { ...row, ...(typeof patch === "function" ? patch(row) : patch) })));
  }

  function addRow() {
    setDrafts((prev) => [...prev, createDraft({ date: prev.at(-1)?.date || todayISO(), sources: prev.at(-1)?.sources || [] })]);
  }

  function removeRow(id) {
    setDrafts((prev) => {
      const filtered = prev.filter((row) => row.id !== id);
      return filtered.length ? filtered : [createDraft()];
    });
  }

  function resetRows() {
    setDrafts([createDraft()]);
  }

  function applyMemory(row, description) {
    const mem = descriptionMemory.get(normalizeDescriptionKey(description));
    const suggested = suggestCategories(description) || [];
    const next = { ...row, description };
    if (!row.categories?.length) {
      if (suggested.length) next.categories = suggested;
      else if (mem?.categories?.length) next.categories = mem.categories;
    }
    if (mem) {
      if (!toNumber(row.value) && mem.value) {
        next.value = mem.value;
        next.isExpense = mem.value < 0;
      }
      if (mem.sources?.length && (!row.sources?.length || row._sourceAuto)) {
        next.sources = mem.sources;
        next._sourceAuto = true;
      }
    }
    return next;
  }

  function handleDescriptionChange(id, value) {
    updateRow(id, (row) => ({ ...row, description: value }));
  }

  function handleDescriptionBlur(id) {
    updateRow(id, (row) => (row.description ? applyMemory(row, row.description) : row));
  }

  function handleBulkApplyMappings() {
    setDrafts((prev) => {
      const learned = new Map();
      prev.forEach((row) => {
        if (!row.categories?.length || shouldIgnoreForMapping(row.description)) return;
        const key = normalizeDescriptionKey(row.description);
        if (!key) return;
        learned.set(key, Array.from(new Set([...(learned.get(key) || []), ...row.categories])));
      });
      return prev.map((row) => {
        const key = normalizeDescriptionKey(row.description);
        const suggested = suggestCategories(row.description);
        const mem = descriptionMemory.get(key)?.categories || [];
        const fromRows = learned.get(key) || [];
        const all = Array.from(new Set([...(row.categories || []), ...suggested, ...mem, ...fromRows]));
        return all.length === (row.categories || []).length ? row : { ...row, categories: all };
      });
    });
  }

  const uncategorized = useMemo(() => {
    const seen = new Set();
    const list = [];
    for (const row of drafts) {
      if (row.categories?.length) continue;
      const key = normalizeDescriptionKey(row.description);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      list.push(row.description.trim());
    }
    return list;
  }, [drafts]);

  function openQuickMap() {
    if (!uncategorized.length) return;
    setQuickMap({ list: uncategorized, index: 0 });
  }

  function quickMapAssign(categoryName) {
    if (!quickMap) return;
    const description = quickMap.list[quickMap.index];
    const target = normalizeDescriptionKey(description);
    setDrafts((prev) => prev.map((row) => (normalizeDescriptionKey(row.description) === target ? { ...row, categories: [categoryName] } : row)));
    if (learnMappings && !shouldIgnoreForMapping(description)) onSaveDescriptionMapping(description, [categoryName], true);
    quickMapNext();
  }

  function quickMapNext() {
    setQuickMap((prev) => {
      if (!prev) return prev;
      const next = prev.index + 1;
      return next >= prev.list.length ? null : { ...prev, index: next };
    });
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (learnMappings) {
      drafts.forEach((draft) => {
        if (draft.description && draft.categories?.length && !shouldIgnoreForMapping(draft.description)) {
          onSaveDescriptionMapping(draft.description, draft.categories, true);
        }
      });
    }
    onSubmit(drafts);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSubmit(event);
      return;
    }
    if (event.key === "Enter" && event.target.tagName === "INPUT" && event.target.type === "text" && !event.target.closest(".select__control")) {
      event.preventDefault();
      const focusables = Array.from(event.currentTarget.querySelectorAll("input:not([disabled]):not([type=hidden]):not([type=checkbox])"));
      const index = focusables.indexOf(event.target);
      const next = focusables[index + 1];
      if (next) next.focus();
      else addRow();
    }
  }

  function toggleSort(field) {
    if (sortBy === field) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSortBy(field);
      setSortOrder("desc");
    }
  }

  const sortedDrafts = useMemo(() => {
    if (!sortBy) return drafts;
    return drafts.slice().sort((a, b) => {
      let cmp = 0;
      if (sortBy === "date") cmp = (a.date || "") < (b.date || "") ? -1 : (a.date || "") > (b.date || "") ? 1 : 0;
      else if (sortBy === "description") cmp = (a.description || "").localeCompare(b.description || "");
      else if (sortBy === "value") cmp = Math.abs(toNumber(a.value)) - Math.abs(toNumber(b.value));
      return sortOrder === "asc" ? cmp : -cmp;
    });
  }, [drafts, sortBy, sortOrder]);

  const totals = useMemo(() => {
    let spent = 0;
    let earned = 0;
    let n = 0;
    for (const d of drafts) {
      const v = toNumber(d.value);
      if (!d.description) continue;
      n += 1;
      if (v < 0) spent += Math.abs(v);
      else earned += v;
    }
    return { spent, earned, n };
  }, [drafts]);

  const gridTemplate = "grid gap-1.5 md:grid-cols-[2.25rem_7.5rem_minmax(11rem,1.5fr)_minmax(9rem,1.2fr)_minmax(8.5rem,1fr)_7.5rem_1.75rem] md:items-center";

  const sortLabel = (field, label) => (
    <button type="button" onClick={() => toggleSort(field)} className="text-left hover:text-ink" title={`Ordenar por ${label}`}>
      {label}
      {sortBy === field ? <span className="ml-1 text-accent">{sortOrder === "asc" ? "↑" : "↓"}</span> : null}
    </button>
  );

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-4">
      <div className="card-pad space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="text-sm font-semibold text-ink">Transações em preparação</div>
            <div className="text-xs text-muted">
              Ao digitar uma descrição já conhecida, categoria, fonte e valor são sugeridos do histórico.
              {monthCount > 0 ? ` ${monthCount} transações já registradas neste mês.` : ""}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={addRow} className="btn btn-sm">
              <PlusIcon className="h-4 w-4" />
              Linha
            </button>
            <button type="button" onClick={handleBulkApplyMappings} className="btn btn-sm" title="Preenche categorias usando mapeamentos e o histórico">
              <SparklesIcon className="h-4 w-4" />
              Sugerir categorias
            </button>
            {uncategorized.length > 0 && (
              <button type="button" onClick={openQuickMap} className="btn btn-sm border-amber-200 bg-amber-50 text-amber-700" title="Categorize rapidamente uma descrição por vez">
                Categorizar ({uncategorized.length})
              </button>
            )}
            <button type="button" onClick={() => setMappingModalOpen(true)} className="btn btn-sm">
              Mapeamentos
            </button>
            <button type="button" onClick={resetRows} className="btn-ghost btn-sm">
              Limpar
            </button>
          </div>
        </div>

        {doubles.extraCount > 0 && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-sm fade-in">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-amber-800">
                {doubles.extraCount} possível(is) cobrança(s) em dobro
              </span>
              <span className="text-xs text-amber-800">mesma descrição, mesmo valor e mesmo dia{doubles.groups.some((g) => !g.sameDay) ? " (ou até 5 s de diferença)" : ""}. As linhas estão marcadas na tabela.</span>
              <span className="ml-auto flex gap-1.5">
                <button type="button" className="btn btn-xs" onClick={() => setShowDuplicates((v) => !v)}>
                  {showDuplicates ? "Esconder lista" : "Ver lista"}
                </button>
                <button type="button" className="btn-primary btn-xs" onClick={removeDoubleExtras} title="Mantém uma linha de cada grupo e remove as repetidas">
                  Remover {doubles.extraCount} extra(s)
                </button>
              </span>
            </div>
            {showDuplicates && (
              <ul className="mt-2 space-y-0.5 text-xs text-amber-900">
                {doubles.groups.map((g) => (
                  <li key={g.keep.id} className="flex items-center justify-between gap-2">
                    <span className="truncate">
                      {fmtDate(g.keep.date)} · {g.keep.description}
                    </span>
                    <span className="num shrink-0">
                      {fmtBRL(g.keep.value)} × {g.extras.length + 1}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <datalist id="expense-descriptions">
          {recentDescriptions.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>

        <div className="overflow-x-auto rounded-xl border border-line">
          <div className="min-w-[56rem]">
            <div className={`${gridTemplate} border-b border-line bg-surface-2 px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-wider text-muted`}>
              <span title="Despesa ou receita">+/−</span>
              <span>{sortLabel("date", "Data")}</span>
              <span>{sortLabel("description", "Descrição")}</span>
              <span>Categorias</span>
              <span>Fontes</span>
              <span className="text-right">{sortLabel("value", "Valor")}</span>
              <span />
            </div>
            {sortedDrafts.map((row, index) => {
              const isExpense = row.isExpense !== false && toNumber(row.value) <= 0;
              const mem = row.description ? descriptionMemory.get(normalizeDescriptionKey(row.description)) : null;
              const isDouble = doubles.extraIds.has(row.id);
              return (
                <div key={row.id} className={`${gridTemplate} border-b border-line px-2 py-1 ${isDouble ? "bg-amber-50" : isExpense ? "" : "bg-pos/5"}`}>
                  <button
                    type="button"
                    onClick={() =>
                      updateRow(row.id, isExpense ? { isExpense: false, value: Math.abs(toNumber(row.value)) } : { isExpense: true, value: -Math.abs(toNumber(row.value)) })
                    }
                    className={`flex h-[30px] w-full items-center justify-center rounded-md border text-base font-bold leading-none transition ${
                      isExpense ? "border-neg/40 bg-neg/10 text-neg hover:bg-neg/20" : "border-pos/40 bg-pos/10 text-pos hover:bg-pos/20"
                    }`}
                    title={isExpense ? "Despesa (clique para marcar como receita)" : "Receita (clique para marcar como despesa)"}
                    aria-label={isExpense ? "Despesa" : "Receita"}
                  >
                    {isExpense ? "−" : "+"}
                  </button>
                  <input type="date" required value={row.date || ""} onChange={(e) => updateRow(row.id, { date: e.target.value })} className="input input-sm h-[30px] px-1.5" />
                  <div className="relative min-w-0">
                    <input
                      type="text"
                      required
                      list="expense-descriptions"
                      placeholder="ex.: Supermercado"
                      value={row.description || ""}
                      onChange={(e) => handleDescriptionChange(row.id, e.target.value)}
                      onBlur={() => handleDescriptionBlur(row.id)}
                      className={`input input-sm h-[30px] ${mem || isDouble ? "pr-12" : ""}`}
                      title={mem ? `Última vez: ${fmtDate(mem.lastDate)} · ${fmtBRL(mem.value)} · ${mem.count}x` : undefined}
                      autoFocus={index === drafts.length - 1 && !row.description}
                    />
                    {isDouble ? (
                      <span
                        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 rounded bg-amber-200 px-1 text-[0.6rem] font-semibold text-amber-900"
                        title="Possível cobrança em dobro: há outra linha com a mesma descrição, valor e dia"
                      >
                        dupla?
                      </span>
                    ) : mem ? (
                      <span
                        className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 rounded bg-surface-3 px-1 text-[0.6rem] font-semibold text-muted"
                        title={`Última vez: ${fmtDate(mem.lastDate)} · ${fmtBRL(mem.value)}`}
                      >
                        {mem.count}×
                      </span>
                    ) : null}
                  </div>
                  <MultiPillSelect
                    compact
                    values={row.categories || []}
                    options={categoryOptions}
                    onChange={(values) => updateRow(row.id, { categories: values })}
                    onCreateOption={onCreateCategory}
                    placeholder="Categoria"
                  />
                  <MultiPillSelect
                    compact
                    variant="outline"
                    values={row.sources || []}
                    options={sourceOptions}
                    onChange={(values) => updateRow(row.id, { sources: values, _sourceAuto: false })}
                    onCreateOption={onCreateSource}
                    placeholder="Fonte"
                  />
                  <CurrencyInput
                    size="sm"
                    align="right"
                    allowNegative
                    inputClassName="h-[30px]"
                    value={toNumber(row.value)}
                    onChange={(num) => {
                      const abs = Math.abs(num);
                      const signed = num < 0 ? num : isExpense ? -abs : abs;
                      updateRow(row.id, { value: signed, isExpense: signed < 0 || (signed === 0 && isExpense) });
                    }}
                  />
                  <button type="button" onClick={() => removeRow(row.id)} className="btn-ghost btn-xs !px-1 text-faint hover:text-neg" aria-label={`Remover transação ${index + 1}`} title="Remover">
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
            <span>{totals.n} transação(ões)</span>
            <span>Despesas: <strong className="num text-neg">{fmtBRL(totals.spent)}</strong></span>
            <span>Receitas: <strong className="num text-pos">{fmtBRL(totals.earned)}</strong></span>
            <label className="flex items-center gap-1.5" title="Cria mapeamentos automáticos ao salvar transações categorizadas">
              <input type="checkbox" checked={learnMappings} onChange={(e) => setLearnMappings(e.target.checked)} />
              Aprender categorias
            </label>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-[0.7rem] text-faint md:inline">
              <span className="kbd">Ctrl</span>+<span className="kbd">Enter</span> salvar
            </span>
            <button type="submit" className="btn-primary">Salvar transações</button>
          </div>
        </div>
      </div>

      <Uploader
        onRecordsParsed={(records, ignoredCount) => {
          setDrafts(
            records.map((record) => {
              const suggested = suggestCategories(record.description || "");
              const mem = descriptionMemory.get(normalizeDescriptionKey(record.description || ""));
              const cats = record.categories?.length ? record.categories : suggested.length ? suggested : mem?.categories || [];
              const value = record.value ?? 0;
              return createDraft({
                ...record,
                categories: cats,
                sources: record.sources?.length ? record.sources : [],
                value,
                isExpense: value < 0,
              });
            })
          );
          if (ignoredCount > 0) window.alert(`${ignoredCount} transação(ões) ignorada(s): descrições da lista de ignoradas ou conversões entre moedas.`);
        }}
        onResetMappings={() => {}}
        ignoredDescriptions={ignoredDescriptions}
        referenceRates={referenceRates}
      />

      <MappingModal
        open={mappingModalOpen}
        onClose={() => setMappingModalOpen(false)}
        mappings={descriptionMappings}
        categories={categoryOptions}
        actions={mappingActions}
        onCreateCategory={onCreateCategory}
      />

      <Modal open={Boolean(quickMap)} onClose={() => setQuickMap(null)} title="Categorizar descrições" size="sm">
        {quickMap && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted">
              <button type="button" className="btn btn-xs" disabled={quickMap.index === 0} onClick={() => setQuickMap((p) => ({ ...p, index: Math.max(0, p.index - 1) }))}>
                ‹ Anterior
              </button>
              <span>{quickMap.index + 1} de {quickMap.list.length}</span>
              <button type="button" className="btn btn-xs" onClick={quickMapNext}>
                Pular ›
              </button>
            </div>
            <div className="rounded-xl bg-surface-2 px-4 py-3 text-center text-sm font-medium text-ink">{quickMap.list[quickMap.index]}</div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {categoryOptions.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => quickMapAssign(cat.name)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:opacity-85"
                  style={{ backgroundColor: cat.color || "#6B7280" }}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
            <p className="text-center text-[0.7rem] text-faint">A escolha vira um mapeamento exato para as próximas importações.</p>
          </div>
        )}
      </Modal>
    </form>
  );
}
