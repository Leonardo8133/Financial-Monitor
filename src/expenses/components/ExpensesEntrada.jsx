import { CurrencyInput } from "../../components/CurrencyInput.jsx";
import { useMemo, useState } from "react";
import { Uploader } from "./Uploader.jsx";
import { ensureExpensesDefaults } from "../config/storage.js";
import { MultiPillSelect } from "./MultiPillSelect.jsx";

function generateId() {
  return crypto.randomUUID?.() || `draft-${Math.random().toString(36).slice(2, 10)}`;
}

export function ExpensesEntrada({
  drafts,
  setDrafts,
  onSubmit,
  categories,
  sources,
  setStore,
  suggestCategories = () => [],
  onSaveDescriptionMapping = () => {},
}) {
  const categoryOptions = useMemo(
    () => (Array.isArray(categories) ? categories.map((category) => category.name).filter(Boolean) : []),
    [categories]
  );
  const sourceOptions = useMemo(
    () => (Array.isArray(sources) ? sources.map((source) => source.name).filter(Boolean) : []),
    [sources]
  );
  const defaultSourceName = sourceOptions[0] || "";

  function normalizeDraft(row) {
    if (!row) return row;
    const categoriesList = Array.isArray(row.categories)
      ? row.categories.map((value) => value && value.toString().trim()).filter(Boolean)
      : row.category
      ? [row.category].filter(Boolean)
      : [];
    const rawSources = Array.isArray(row.sources)
      ? row.sources
      : row.source
      ? [row.source]
      : [];
    const sourcesList = rawSources
      .map((value) => value && value.toString().trim())
      .filter(Boolean);
    if (!sourcesList.length && defaultSourceName) {
      sourcesList.push(defaultSourceName);
    }
    return {
      ...row,
      categories: categoriesList,
      category: categoriesList[0] || "",
      sources: sourcesList,
      source: sourcesList[0] || "",
      mappingSaved: Boolean(row.mappingSaved && categoriesList.length && row.description),
    };
  }

  function makeRow(overrides = {}) {
    const base = {
      id: generateId(),
      date: "",
      description: "",
      categories: [],
      sources: defaultSourceName ? [defaultSourceName] : [],
      value: 0,
      mappingSaved: false,
    };
    return normalizeDraft({ ...base, ...overrides });
  }

  function updateRow(id, updater, { resetMapping = false } = {}) {
    setDrafts((previous) =>
      previous.map((row) => {
        if (row.id !== id) return row;
        const current = normalizeDraft(row);
        const nextBase = typeof updater === "function" ? updater(current) : { ...current, ...updater };
        const next = normalizeDraft({ ...nextBase, mappingSaved: resetMapping ? false : nextBase.mappingSaved });
        return next;
      })
    );
  }

  function addRow() {
    setDrafts((previous) => [...previous, makeRow()]);
  }

  function removeRow(id) {
    setDrafts((previous) => {
      const filtered = previous.filter((row) => row.id !== id);
      return filtered.length ? filtered : [makeRow()];
    });
  }

  function resetRows() {
    setDrafts([makeRow()]);
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit(drafts.map(normalizeDraft));
  }

  function handleDescriptionChange(id, value) {
    updateRow(
      id,
      (row) => {
        const trimmed = value;
        if (!trimmed) return { ...row, description: "", mappingSaved: false };
        if (row.categories.length === 0) {
          const suggested = suggestCategories(trimmed) || [];
          if (suggested.length) {
            return {
              ...row,
              description: trimmed,
              categories: suggested,
              category: suggested[0] || "",
              mappingSaved: false,
            };
          }
        }
        return { ...row, description: trimmed, mappingSaved: false };
      },
      { resetMapping: true }
    );
  }

  function handleCategoriesChange(id, nextCategories) {
    updateRow(
      id,
      {
        categories: nextCategories,
        category: nextCategories[0] || "",
        mappingSaved: false,
      },
      { resetMapping: true }
    );
  }

  function handleSourcesChange(id, nextSources) {
    updateRow(id, {
      sources: nextSources,
      source: nextSources[0] || "",
    });
  }

  function handleRememberMapping(row) {
    if (!row.description || !row.categories.length) return;
    onSaveDescriptionMapping(row.description, row.categories);
    updateRow(row.id, { mappingSaved: true });
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

  const gridTemplate =
    "grid gap-4 md:grid-cols-[minmax(8rem,1fr)_minmax(12rem,1.8fr)_minmax(14rem,2fr)_minmax(14rem,2fr)_minmax(8rem,1fr)]";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-4 shadow">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-700">Despesas em preparação</div>
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

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <div className="min-w-[68rem]">
          <div
            className={`${gridTemplate} border-b border-slate-200 bg-slate-50 px-4 py-3 text-[0.65rem] font-semibold uppercase tracking-wider text-slate-500`}
          >
            <span>Data</span>
            <span>Descrição</span>
            <span>Categorias</span>
            <span>Fontes</span>
            <span className="text-right">Valor (R$)</span>
          </div>
          {drafts.map((row, index) => {
            const normalizedRow = normalizeDraft(row);
            return (
              <div key={row.id} className={`relative ${gridTemplate} border-b border-slate-100 px-4 py-4`}>
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="absolute right-4 top-3 text-lg font-semibold text-slate-300 transition hover:text-red-500"
                  aria-label={`Remover despesa ${index + 1}`}
                >
                  ×
                </button>
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-semibold text-slate-400">#{index + 1}</span>
                  <input
                    type="date"
                    required
                    value={normalizedRow.date}
                    onChange={(event) => updateRow(row.id, { date: event.target.value })}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    required
                    placeholder="ex.: Supermercado"
                    value={normalizedRow.description}
                    onChange={(event) => handleDescriptionChange(row.id, event.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  <span className="text-[0.7rem] text-slate-400">
                    Utilize palavras-chave para aplicar mapeamentos automáticos.
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <MultiPillSelect
                    values={normalizedRow.categories}
                    options={categoryOptions}
                    onChange={(values) => handleCategoriesChange(row.id, values)}
                    placeholder="Adicionar categoria"
                    inputPlaceholder="Nova categoria"
                  />
                  <div className="flex flex-wrap items-center gap-2 text-[0.7rem]">
                    <button
                      type="button"
                      onClick={() => handleRememberMapping(normalizedRow)}
                      disabled={!normalizedRow.description || !normalizedRow.categories.length}
                      className="rounded-full border border-slate-200 px-3 py-1 text-[0.65rem] font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Salvar mapeamento
                    </button>
                    {normalizedRow.mappingSaved && (
                      <span className="text-emerald-600">Mapeamento salvo!</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <MultiPillSelect
                    values={normalizedRow.sources}
                    options={sourceOptions}
                    onChange={(values) => handleSourcesChange(row.id, values)}
                    placeholder="Adicionar fonte"
                    inputPlaceholder="Nova fonte"
                  />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <CurrencyInput
                    value={Number(normalizedRow.value) || 0}
                    onChange={(num) => updateRow(row.id, { value: num })}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-white shadow">
          Adicionar despesas
        </button>
      </div>

      <Uploader
        onRecordsParsed={(records) =>
          setDrafts(
            records.map((record) =>
              makeRow({
                ...record,
                categories: record.categories || [],
                sources: record.sources || [],
                value: record.value ?? 0,
              })
            )
          )
        }
        onResetMappings={resetRows}
      />

      <div className="mt-6 grid grid-cols-1 gap-4 rounded-xl border border-dashed p-4 text-xs text-slate-600 md:grid-cols-2">
        <div>
          <p className="mb-2 font-semibold">Categorias</p>
          <div className="flex gap-2">
            <input
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="Nova categoria"
              className="w-full rounded-lg border border-slate-200 px-2 py-1"
            />
            <button type="button" onClick={addCategory} className="rounded-lg border border-slate-200 px-3 py-1">
              Adicionar
            </button>
          </div>
        </div>
        <div>
          <p className="mb-2 font-semibold">Fontes</p>
          <div className="flex gap-2">
            <input
              value={newSource}
              onChange={(event) => setNewSource(event.target.value)}
              placeholder="Nova fonte"
              className="w-full rounded-lg border border-slate-200 px-2 py-1"
            />
            <button type="button" onClick={addSource} className="rounded-lg border border-slate-200 px-3 py-1">
              Adicionar
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
