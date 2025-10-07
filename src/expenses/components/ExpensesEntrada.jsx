import { CurrencyInput } from "../../components/CurrencyInput.jsx";
import { useOpenDatePickerProps } from "../../hooks/useOpenDatePickerProps.js";
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
  descriptionMappings = [],
  ignoredDescriptions = [],
}) {
  const dateOpenProps = useOpenDatePickerProps();
  const [sortBy, setSortBy] = useState("date"); // "date", "description", "value"
  const [sortOrder, setSortOrder] = useState("desc"); // "asc", "desc"

  function handleBulkUpdateCategories() {
    setDrafts((prev) => {
      // Primeiro, criar um mapa de descrições para categorias já definidas pelo usuário
      const descriptionToCategories = new Map();
      
      prev.forEach((row) => {
        if (row.categories.length > 0) {
          const normalizedDesc = row.description.toLowerCase().trim();
          
          // Ignorar transferências Pix
          if (normalizedDesc.includes("transferência enviada pelo pix") || 
              normalizedDesc.includes("transferência recebida pelo pix")) {
            return;
          }
          
          // Verificar se já existe um mapeamento que dá match
          const hasExistingMapping = suggestCategories(row.description).length > 0;
          if (hasExistingMapping) {
            return; // Não adicionar ao mapeamento se já existe
          }
          
          if (descriptionToCategories.has(normalizedDesc)) {
            // Se já existe, mesclar as categorias
            const existing = descriptionToCategories.get(normalizedDesc);
            const merged = [...new Set([...existing, ...row.categories])];
            descriptionToCategories.set(normalizedDesc, merged);
          } else {
            descriptionToCategories.set(normalizedDesc, [...row.categories]);
          }
        }
      });
      
      // Agora aplicar mapeamentos automáticos e categorias aprendidas
      return prev.map((row) => {
        const normalizedDesc = row.description.toLowerCase().trim();
        
        // Categorias dos mapeamentos automáticos
        const suggestedCategories = suggestCategories(row.description);
        
        // Categorias aprendidas de outros itens com mesma descrição
        const learnedCategories = descriptionToCategories.get(normalizedDesc) || [];
        
        // Combinar todas as categorias
        const allCategories = [...new Set([
          ...row.categories,
          ...suggestedCategories,
          ...learnedCategories
        ])];
        
        return {
          ...row,
          categories: allCategories
        };
      });
    });
  }
  const categoryOptions = useMemo(
    () => (Array.isArray(categories) ? categories.filter(Boolean) : []),
    [categories]
  );
  const sourceOptions = useMemo(
    () => (Array.isArray(sources) ? sources.filter(Boolean) : []),
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
      isExpense: true, // true = despesa, false = receita
    };
    return normalizeDraft({ ...base, ...overrides });
  }

  function updateRow(id, updater) {
    setDrafts((previous) =>
      previous.map((row) => {
        if (row.id !== id) return row;
        const current = normalizeDraft(row);
        const nextBase = typeof updater === "function" ? updater(current) : { ...current, ...updater };
        const next = normalizeDraft(nextBase);
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

    // Salvar mapeamentos automaticamente para despesas com descrição e categorias
    // Mas ignorar transferências PIX e similares
    drafts.forEach(draft => {
      const normalized = normalizeDraft(draft);
      if (normalized.description && normalized.categories.length > 0) {
        const desc = normalized.description.toLowerCase();
        const shouldIgnore = 
          desc.startsWith("transferência enviada pelo pix") ||
          desc.startsWith("transferência recebida pelo pix") ||
          desc.startsWith("transferência recebida -") ||
          desc.startsWith("transferência enviada -");
        
        if (!shouldIgnore) {
          onSaveDescriptionMapping(normalized.description, normalized.categories);
        }
      }
    });

    onSubmit(drafts.map(normalizeDraft));
  }

  function handleDescriptionChange(id, value) {
    updateRow(id, (row) => {
      const trimmed = value;
      if (!trimmed) return { ...row, description: "" };
      if (row.categories.length === 0) {
        const suggested = suggestCategories(trimmed) || [];
        if (suggested.length) {
          return {
            ...row,
            description: trimmed,
            categories: suggested,
            category: suggested[0] || "",
          };
        }
      }
      return { ...row, description: trimmed };
    });
  }

  function handleCategoriesChange(id, nextCategories) {
    updateRow(id, {
      categories: nextCategories,
      category: nextCategories[0] || "",
    });
  }

  function handleSourcesChange(id, nextSources) {
    updateRow(id, {
      sources: nextSources,
      source: nextSources[0] || "",
    });
  }

  function handleHeaderClick(field) {
    if (sortBy === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  }

  // Library editors
  const [newCategory, setNewCategory] = useState("");
  const [newSource, setNewSource] = useState("");
  const [mappingModalOpen, setMappingModalOpen] = useState(false);

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

  function removeCategory(index) {
    setStore((prev) => {
      const safePrev = ensureExpensesDefaults(prev);
      return {
        ...safePrev,
        categories: safePrev.categories.filter((_, i) => i !== index),
      };
    });
  }

  function removeSource(index) {
    setStore((prev) => {
      const safePrev = ensureExpensesDefaults(prev);
      return {
        ...safePrev,
        sources: safePrev.sources.filter((_, i) => i !== index),
      };
    });
  }

  const gridTemplate =
    "grid gap-2 md:grid-cols-[minmax(2.5rem,0.2fr)_minmax(5rem,0.6fr)_minmax(12rem,1.8fr)_minmax(10rem,1.4fr)_minmax(8rem,1fr)_minmax(6rem,0.8fr)]";

  function MappingModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    const [editingKeyword, setEditingKeyword] = useState(null);
    const [editKeyword, setEditKeyword] = useState("");
    const [editCategories, setEditCategories] = useState([]);
    const [editExactMatch, setEditExactMatch] = useState(false);
    const [filter, setFilter] = useState("");
    const [newMappingKeyword, setNewMappingKeyword] = useState("");
    const [newMappingCategories, setNewMappingCategories] = useState([]);
    const [newMappingExactMatch, setNewMappingExactMatch] = useState(false);
    const [showCreateForm, setShowCreateForm] = useState(false);

    const normalizedFilter = filter.trim().toLowerCase();
    const filteredMappings = Array.isArray(descriptionMappings)
      ? descriptionMappings.filter((m) => {
          if (!normalizedFilter) return true;
          const inKeyword = (m.keyword || "").toLowerCase().includes(normalizedFilter);
          const inCategories = Array.isArray(m.categories)
            ? m.categories.some((c) => (c || "").toLowerCase().includes(normalizedFilter))
            : false;
          const inExact = normalizedFilter === "exato" || normalizedFilter === "exact"
            ? !!m.exactMatch
            : normalizedFilter === "parcial" || normalizedFilter === "partial"
            ? !m.exactMatch
            : false;
          return inKeyword || inCategories || inExact;
        })
      : [];

    function startEdit(keyword) {
      const mapping = descriptionMappings.find(m => m.keyword === keyword);
      if (!mapping) return;
      setEditingKeyword(keyword);
      setEditKeyword(mapping.keyword);
      setEditCategories(mapping.categories || []);
      setEditExactMatch(mapping.exactMatch || false);
    }

    function saveEdit() {
      if (!editingKeyword || !editKeyword.trim()) return;
      
      setStore((prev) => {
        const safePrev = ensureExpensesDefaults(prev);
        const newMappings = safePrev.descriptionCategoryMappings.map(mapping => 
          mapping.keyword === editingKeyword 
            ? {
                keyword: editKeyword.trim(),
                categories: editCategories.filter(Boolean),
                exactMatch: editExactMatch
              }
            : mapping
        );
        return { ...safePrev, descriptionCategoryMappings: newMappings };
      });
      
      setEditingKeyword(null);
      setEditKeyword("");
      setEditCategories([]);
      setEditExactMatch(false);
    }

    function cancelEdit() {
      setEditingKeyword(null);
      setEditKeyword("");
      setEditCategories([]);
      setEditExactMatch(false);
    }

    function deleteMapping(keyword) {
      setStore((prev) => {
        const safePrev = ensureExpensesDefaults(prev);
        const newMappings = safePrev.descriptionCategoryMappings.filter(m => m.keyword !== keyword);
        return { ...safePrev, descriptionCategoryMappings: newMappings };
      });
    }

    function createNewMapping() {
      const keyword = newMappingKeyword.trim();
      if (!keyword || newMappingCategories.length === 0) return;
      
      setStore((prev) => {
        const safePrev = ensureExpensesDefaults(prev);
        const newMapping = {
          keyword,
          categories: newMappingCategories.filter(Boolean),
          exactMatch: newMappingExactMatch
        };
        const newMappings = [...safePrev.descriptionCategoryMappings, newMapping];
        return { ...safePrev, descriptionCategoryMappings: newMappings };
      });
      
      setNewMappingKeyword("");
      setNewMappingCategories([]);
      setNewMappingExactMatch(false);
      setShowCreateForm(false);
    }

    function cancelCreate() {
      setNewMappingKeyword("");
      setNewMappingCategories([]);
      setNewMappingExactMatch(false);
      setShowCreateForm(false);
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-800">
              Mapeamentos de Descrição para Categorias
            </h3>
            <div className="flex items-center gap-2">
              {!showCreateForm && (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                >
                  Novo mapeamento
                </button>
              )}
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 text-xl"
              >
                ×
              </button>
            </div>
          </div>

          {showCreateForm && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-medium text-blue-800">Criar novo mapeamento</h4>
                <button
                  onClick={cancelCreate}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Cancelar
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Palavra-chave
                  </label>
                  <input
                    type="text"
                    value={newMappingKeyword}
                    onChange={(e) => setNewMappingKeyword(e.target.value)}
                    className="w-full rounded border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none"
                    placeholder="ex: Supermercado"
                  />
                </div>
                
                <div className="flex items-center gap-2 pt-6">
                  <input
                    type="checkbox"
                    id="new-exact"
                    checked={newMappingExactMatch}
                    onChange={(e) => setNewMappingExactMatch(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <label htmlFor="new-exact" className="text-xs text-slate-700">
                    Correspondência exata
                  </label>
                </div>
              </div>
              
              <div className="mt-3">
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Categorias
                </label>
                <MultiPillSelect
                  values={newMappingCategories}
                  options={categoryOptions.map(cat => cat.name)}
                  onChange={setNewMappingCategories}
                  placeholder="Selecionar categorias"
                />
              </div>
              
              <div className="mt-3 flex gap-2">
                <button
                  onClick={createNewMapping}
                  disabled={!newMappingKeyword.trim() || newMappingCategories.length === 0}
                  className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  Criar mapeamento
                </button>
                <button
                  onClick={cancelCreate}
                  className="bg-slate-200 text-slate-700 px-3 py-1 rounded text-xs hover:bg-slate-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {filteredMappings.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              {descriptionMappings.length === 0
                ? "Nenhum mapeamento configurado ainda."
                : "Nenhum resultado encontrado com o filtro."}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Filtrar por palavra-chave, categoria, Exato/Parcial"
                  className="flex-1 rounded border border-slate-200 px-3 py-1 text-sm focus:border-slate-400 focus:outline-none"
                />
                <div className="text-xs text-slate-500 whitespace-nowrap">
                  {filteredMappings.length} de {descriptionMappings.length}
                </div>
              </div>

              {filteredMappings.map((mapping, index) => (
                <div key={mapping.keyword} className="border border-slate-200 rounded-lg p-3">
                  {editingKeyword === mapping.keyword ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Palavra-chave
                          </label>
                          <input
                            type="text"
                            value={editKeyword}
                            onChange={(e) => setEditKeyword(e.target.value)}
                            className="w-full rounded border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none"
                            placeholder="ex: Supermercado"
                          />
                        </div>
                        
                        <div className="flex items-center gap-2 pt-6">
                        <input
                          type="checkbox"
                          id={`exact-${mapping.keyword}`}
                          checked={editExactMatch}
                          onChange={(e) => setEditExactMatch(e.target.checked)}
                          className="rounded border-slate-300"
                        />
                        <label htmlFor={`exact-${mapping.keyword}`} className="text-xs text-slate-700">
                            Correspondência exata
                          </label>
                        </div>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Categorias
                        </label>
                        <MultiPillSelect
                          values={editCategories}
                          options={categoryOptions.map(cat => cat.name)}
                          onChange={setEditCategories}
                          placeholder="Selecionar categorias"
                        />
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          onClick={saveEdit}
                          className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="bg-slate-200 text-slate-700 px-3 py-1 rounded text-xs hover:bg-slate-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-slate-800 text-sm">{mapping.keyword}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            mapping.exactMatch 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {mapping.exactMatch ? 'Exato' : 'Parcial'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {mapping.categories?.map((cat, catIndex) => (
                            <span
                              key={catIndex}
                              className="bg-slate-100 text-slate-700 text-xs px-1.5 py-0.5 rounded"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(mapping.keyword)}
                          className="text-blue-600 hover:text-blue-800 text-xs px-2 py-1 rounded hover:bg-blue-50"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => deleteMapping(mapping.keyword)}
                          className="text-red-600 hover:text-red-800 text-xs px-2 py-1 rounded hover:bg-red-50"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const sortedDrafts = useMemo(() => {
    return drafts.slice().sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === "date") {
        comparison = (a.date || "") < (b.date || "") ? -1 : (a.date || "") > (b.date || "") ? 1 : 0;
      } else if (sortBy === "description") {
        const aDesc = (a.description || "").toLowerCase();
        const bDesc = (b.description || "").toLowerCase();
        comparison = aDesc < bDesc ? -1 : aDesc > bDesc ? 1 : 0;
      } else if (sortBy === "value") {
        const aVal = Math.abs(Number(a.value) || 0);
        const bVal = Math.abs(Number(b.value) || 0);
        comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      }
      
      return sortOrder === "asc" ? comparison : -comparison;
    });
  }, [drafts, sortBy, sortOrder]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-4 shadow">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-semibold text-slate-700">Transações em preparação</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={addRow}
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
          >
            Adicionar linha
          </button>
          <button
            type="button"
            onClick={handleBulkUpdateCategories}
            className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
          >
            Aplicar mapeamentos
          </button>
          <button
            type="button"
            onClick={() => setMappingModalOpen(true)}
            className="rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-100"
          >
            Ver/Editar Mapeamentos
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
        <div className="min-w-[56rem]">
          <div
            className={`${gridTemplate} border-b border-slate-200 bg-slate-50 px-3 py-2 text-[0.6rem] font-semibold uppercase tracking-wider text-slate-500`}
          >
            <span>Desp?</span>
            <span 
              onClick={() => handleHeaderClick("date")}
              className="cursor-pointer hover:bg-slate-100 transition-colors select-none"
              title="Ordenar por Data"
            >
              Data{sortBy === "date" ? (sortOrder === "asc" ? " ↑" : " ↓") : ""}
            </span>
            <span 
              onClick={() => handleHeaderClick("description")}
              className="cursor-pointer hover:bg-slate-100 transition-colors select-none"
              title="Ordenar por Descrição"
            >
              Descrição{sortBy === "description" ? (sortOrder === "asc" ? " ↑" : " ↓") : ""}
            </span>
            <span>Categorias</span>
            <span>Fontes</span>
            <span 
              onClick={() => handleHeaderClick("value")}
              className="text-right cursor-pointer hover:bg-slate-100 transition-colors select-none"
              title="Ordenar por Valor"
            >
              Valor{sortBy === "value" ? (sortOrder === "asc" ? " ↑" : " ↓") : ""}
            </span>
          </div>
          {sortedDrafts.map((row, index) => {
            const normalizedRow = normalizeDraft(row);
            return (
              <div key={row.id} className={`group relative ${gridTemplate} border-b border-slate-50 px-3 py-1 rounded-lg ${
                normalizedRow.isExpense 
                  ? "border-2 border-red-200 bg-red-50/30" 
                  : "border-2 border-emerald-200 bg-emerald-50/30"
              }`}>
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 flex h-4 w-4 items-center justify-center rounded-full bg-red-300 text-white shadow-md opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-red-400 hover:shadow-lg z-10 text-xs font-bold"
                  aria-label={`Remover transação ${index + 1}`}
                >
                  ×
                </button>
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={normalizedRow.isExpense}
                    onChange={(event) => {
                      const isExpense = event.target.checked;
                      // Atualiza o valor baseado no tipo
                      const currentValue = Math.abs(Number(normalizedRow.value) || 0);
                      const adjustedValue = isExpense ? -currentValue : currentValue;
                      updateRow(row.id, { isExpense, value: adjustedValue });
                    }}
                    className="h-3 w-3 rounded-full border-slate-300 text-red-600 focus:ring-red-500"
                  />
                </div>
                <div className="flex items-center">
                <input
                    type="date"
                    required
                    value={normalizedRow.date}
                    onChange={(event) => updateRow(row.id, { date: event.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-2 py-1.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-slate-400"
                  {...dateOpenProps}
                  />
                </div>
                <div className="flex items-center w-full">
                  <input
                    type="text"
                    required
                    placeholder="ex.: Supermercado"
                    value={normalizedRow.description}
                    onChange={(event) => handleDescriptionChange(row.id, event.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div className="flex items-center">
                  <MultiPillSelect
                    values={normalizedRow.categories}
                    options={categoryOptions}
                    onChange={(values) => handleCategoriesChange(row.id, values)}
                    placeholder="Adicionar categoria"
                  />
                </div>
                <div className="flex items-center">
                  <MultiPillSelect
                    values={normalizedRow.sources}
                    options={sourceOptions}
                    onChange={(values) => handleSourcesChange(row.id, values)}
                    placeholder="Adicionar fonte"
                  />
                </div>
                <div className="flex items-center justify-end">
                  <CurrencyInput
                    value={Number(normalizedRow.value) || 0}
                    onChange={(num) => {
                      // Se for despesa, força valor negativo; se for receita, força valor positivo
                      const adjustedValue = normalizedRow.isExpense 
                        ? (num < 0 ? num : -Math.abs(num))
                        : (num > 0 ? num : Math.abs(num));
                      updateRow(row.id, { value: adjustedValue });
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="rounded-xl bg-slate-900 px-4 py-2 text-white shadow">
          Adicionar transações
        </button>
      </div>

      <Uploader
        onRecordsParsed={(records, ignoredCount) => {
          if (ignoredCount > 0) {
            alert(`${ignoredCount} gasto(s) foram ignorados durante a importação conforme configurado.`);
          }
          setDrafts(
            records.map((record) => {
              // Aplicar mapeamento automático de categorias durante a importação
              const suggestedCategories = suggestCategories(record.description || "");
              return makeRow({
                ...record,
                categories: record.categories && record.categories.length > 0 
                  ? record.categories 
                  : suggestedCategories,
                sources: record.sources || [],
                value: record.value ?? 0,
                isExpense: (record.value ?? 0) < 0, // Auto-seleciona despesa se valor negativo
              });
            })
          );
        }}
        onResetMappings={() => {}} // Apenas fecha o arquivo, não limpa os itens
        ignoredDescriptions={ignoredDescriptions}
      />

      <div className="mt-6 space-y-6 rounded-xl border border-dashed p-4 text-xs text-slate-600">
        <div>
          <p className="mb-3 font-semibold">Categorias</p>
          {categories.length > 0 && (
            <div className="mb-3">
              <p className="mb-2 text-[0.7rem] text-slate-500">Categorias existentes:</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((category, index) => (
                  <span key={index} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[0.7rem] text-slate-600">
                    {category.name}
                    <button
                      type="button"
                      onClick={() => removeCategory(index)}
                      className="text-slate-400 hover:text-red-500"
                      title="Remover categoria"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              placeholder="Nova categoria"
              className="flex-1 rounded-lg border border-slate-200 px-2 py-1"
            />
            <button type="button" onClick={addCategory} className="rounded-lg border border-slate-200 px-3 py-1">
              Adicionar
            </button>
          </div>
        </div>

        <div>
          <p className="mb-3 font-semibold">Fontes</p>
          {sources.length > 0 && (
            <div className="mb-3">
              <p className="mb-2 text-[0.7rem] text-slate-500">Fontes existentes:</p>
              <div className="flex flex-wrap gap-2">
                {sources.map((source, index) => (
                  <span key={index} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[0.7rem] text-slate-600">
                    {source.name}
                    <button
                      type="button"
                      onClick={() => removeSource(index)}
                      className="text-slate-400 hover:text-red-500"
                      title="Remover fonte"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={newSource}
              onChange={(event) => setNewSource(event.target.value)}
              placeholder="Nova fonte"
              className="flex-1 rounded-lg border border-slate-200 px-2 py-1"
            />
            <button type="button" onClick={addSource} className="rounded-lg border border-slate-200 px-3 py-1">
              Adicionar
            </button>
          </div>
        </div>
      </div>

      <MappingModal 
        isOpen={mappingModalOpen} 
        onClose={() => setMappingModalOpen(false)} 
      />
    </form>
  );
}
