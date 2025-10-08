import { useMemo, useState } from "react";
import { useOpenDatePickerProps } from "../../hooks/useOpenDatePickerProps.js";
import { fmtBRL, monthLabel, toNumber, yyyymm } from "../../utils/formatters.js";
import { MultiPillSelect } from "./MultiPillSelect.jsx";
import { resetDataAndLoadDefaults } from "../../utils/unifiedStorage.js";

export function ExpensesHistorico({ expenses, derived, setExpenses, categories, sources }) {
  const dateOpenProps = useOpenDatePickerProps();
  const [q, setQ] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [filterType, setFilterType] = useState("all"); // "all", "expense", "income"
  const [monthChartModal, setMonthChartModal] = useState(null); // { ym, label, items }
  const [batchEditModal, setBatchEditModal] = useState(null); // { selectedIds, ym }
  const [expandedMonths, setExpandedMonths] = useState(new Set());
  const [sortBy, setSortBy] = useState("date"); // "date", "description", "value"
  const [sortOrder, setSortOrder] = useState("desc"); // "asc", "desc"
  const categoryOptions = useMemo(
    () => (Array.isArray(categories) ? categories.filter(Boolean) : []),
    [categories]
  );
  const sourceOptions = useMemo(
    () => (Array.isArray(sources) ? sources.filter(Boolean) : []),
    [sources]
  );
  
  // Criar mapas para busca rápida de cores
  const categoryColorMap = useMemo(() => {
    const map = new Map();
    categoryOptions.forEach(cat => {
      if (cat.name) map.set(cat.name, cat.color || "#1F2937");
    });
    return map;
  }, [categoryOptions]);
  
  const sourceColorMap = useMemo(() => {
    const map = new Map();
    sourceOptions.forEach(src => {
      if (src.name) map.set(src.name, src.color || "#1F2937");
    });
    return map;
  }, [sourceOptions]);

  const baseLookup = useMemo(() => new Map(expenses.map((e) => [e.id, e])), [expenses]);

  const filtered = useMemo(() => {
    let items = derived;
    
    // Filtro por tipo (despesa/receita)
    if (filterType !== "all") {
      items = items.filter((e) => {
        const isExpense = (e.value || 0) < 0;
        return filterType === "expense" ? isExpense : !isExpense;
      });
    }
    
    // Filtro por texto
    const trimmedQuery = q.trim();
    if (!trimmedQuery) return items;
    
    // Verificar se é um filtro reverso (começa com "!")
    const isReverseFilter = trimmedQuery.startsWith("!");
    // Verificar se é uma busca exata (começa com "=")
    const isExactMatch = trimmedQuery.startsWith("=");
    
    let searchText = trimmedQuery;
    if (isReverseFilter) searchText = searchText.slice(1);
    if (isExactMatch) searchText = searchText.slice(1);
    
    const s = searchText.toLowerCase().trim();
    
    if (!s) return items;
    
    return items.filter((e) => {
      // Valores para busca
      const absValue = Math.abs(toNumber(e.value));
      const formattedValue = fmtBRL(absValue);
      
      const searchPool = [
        e.description || "",
        ...(Array.isArray(e.categories) ? e.categories : e.category ? [e.category] : []),
        ...(Array.isArray(e.sources) ? e.sources : e.source ? [e.source] : []),
        e.date || "",
        String(e.value ?? ""),
        formattedValue, // "R$ 100,00"
        String(absValue), // "100"
        formattedValue.replace(/[R$\s]/g, ""), // "100,00"
      ];
      
      const matches = searchPool
        .filter(Boolean)
        .map((value) => String(value).toLowerCase())
        .some((text) => isExactMatch ? text === s : text.includes(s));
      
      // Se for filtro reverso, inverter o resultado
      return isReverseFilter ? !matches : matches;
    });
  }, [q, derived, filterType]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const e of filtered) {
      const key = yyyymm(e.date);
      if (!key) continue;
      const arr = map.get(key) || [];
      arr.push(e);
      map.set(key, arr);
    }
    
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1)).map(([ym, arr]) => {
      // Aplicar ordenação nos items de cada grupo
      const sortedItems = arr.slice().sort((a, b) => {
        let comparison = 0;
        
        if (sortBy === "date") {
          comparison = a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
        } else if (sortBy === "description") {
          const aDesc = (a.description || "").toLowerCase();
          const bDesc = (b.description || "").toLowerCase();
          comparison = aDesc < bDesc ? -1 : aDesc > bDesc ? 1 : 0;
        } else if (sortBy === "value") {
          const aVal = Math.abs(toNumber(a.value));
          const bVal = Math.abs(toNumber(b.value));
          comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        }
        
        return sortOrder === "asc" ? comparison : -comparison;
      });
      
      return { 
        ym, 
        label: monthLabel(ym), 
        items: sortedItems,
        isExpanded: expandedMonths.has(ym)
      };
    });
  }, [filtered, expandedMonths, sortBy, sortOrder]);

  function removeExpense(id) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    if (editingId === id) { setEditingId(null); setDraft(null); }
  }

  function startEdit(id) {
    const original = baseLookup.get(id);
    if (!original) return;
    setEditingId(id);
    setDraft({
      date: original.date?.slice(0, 10) || "",
      description: original.description || "",
      categories: Array.isArray(original.categories)
        ? original.categories
        : original.category
        ? [original.category]
        : [],
      sources: Array.isArray(original.sources)
        ? original.sources
        : original.source
        ? [original.source]
        : [],
      value: original.value || 0,
    });
  }

  function cancelEdit() { setEditingId(null); setDraft(null); }

  async function clearAllHistory() {
    if (window.confirm("Tem certeza que deseja resetar todos os dados e carregar configurações padrão?")) {
      try {
        await resetDataAndLoadDefaults();
        // Recarregar a página para aplicar as mudanças
        window.location.reload();
      } catch (error) {
        console.error('❌ Erro ao resetar dados:', error);
        alert('Erro ao resetar dados. Tente novamente.');
      }
    }
  }

  function toggleMonthExpansion(ym) {
    setExpandedMonths(prev => {
      const newSet = new Set(prev);
      if (newSet.has(ym)) {
        newSet.delete(ym);
      } else {
        newSet.add(ym);
      }
      return newSet;
    });
  }

  function openBatchEdit() {
    setBatchEditModal({ items: expenses });
  }

  function closeBatchEdit() {
    setBatchEditModal(null);
  }

  function applyBatchEdit({ selectedIds, newCategories, newSources, periodStart, periodEnd, deleteSelected }) {
    if (!selectedIds.length) return;
    
    if (deleteSelected) {
      // Deletar transações selecionadas
      setExpenses(prev => prev.filter(expense => {
        if (!selectedIds.includes(expense.id)) return true;
        
        // Verificar se está no período selecionado
        if (periodStart && periodEnd) {
          const expenseDate = new Date(expense.date);
          const startDate = new Date(periodStart);
          const endDate = new Date(periodEnd);
          return !(expenseDate >= startDate && expenseDate <= endDate);
        }
        
        return false;
      }));
    } else {
      // Aplicar categorias e fontes
      setExpenses(prev => prev.map(expense => {
        if (!selectedIds.includes(expense.id)) return expense;
        
        // Verificar se está no período selecionado
        if (periodStart && periodEnd) {
          const expenseDate = new Date(expense.date);
          const startDate = new Date(periodStart);
          const endDate = new Date(periodEnd);
          if (expenseDate < startDate || expenseDate > endDate) {
            return expense;
          }
        }
        
        return {
          ...expense,
          categories: newCategories.length > 0 ? [...new Set([...expense.categories, ...newCategories])] : expense.categories,
          sources: newSources.length > 0 ? [...new Set([...expense.sources, ...newSources])] : expense.sources,
        };
      }));
    }
    
    closeBatchEdit();
  }

  function saveEdit(id) {
    if (!draft) return;
    if (!draft.date || !draft.description) { window.alert("Preencha Data e Descrição antes de salvar."); return; }
    setExpenses((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const categoriesList = Array.isArray(draft.categories)
          ? draft.categories.map((value) => value && value.toString().trim()).filter(Boolean)
          : draft.category
          ? [draft.category]
          : [];
        const sourcesList = Array.isArray(draft.sources)
          ? draft.sources.map((value) => value && value.toString().trim()).filter(Boolean)
          : draft.source
          ? [draft.source]
          : [];
        return {
          ...e,
          date: draft.date,
          description: draft.description,
          categories: categoriesList,
          category: categoriesList[0] || "",
          sources: sourcesList,
          source: sourcesList[0] || "",
          value: toNumber(draft.value),
        };
      })
    );
    cancelEdit();
  }

  function handleHeaderClick(field) {
    if (sortBy === field) {
      setSortOrder(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow">
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex-1 min-w-[250px]">
              <input 
                className="w-full rounded-xl border border-slate-200 px-3 py-2 pr-8 text-sm outline-none focus:ring-2 focus:ring-slate-400" 
                placeholder="Filtrar por descrição, categoria, fonte, data, valor..." 
                value={q} 
                onChange={(e) => setQ(e.target.value)} 
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-lg"
                  title="Limpar filtro"
                >
                  ×
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <button type="button" onClick={() => setCollapsed((prev) => !prev)} className="rounded-lg border border-slate-200 px-2 py-1 font-semibold text-slate-600 transition hover:bg-slate-100">{collapsed ? "Expandir tudo" : "Colapsar tudo"}</button>
              <button type="button" onClick={openBatchEdit} className="rounded-lg border border-blue-200 px-2 py-1 font-semibold text-blue-600 transition hover:bg-blue-50">Editar em lote</button>
              <button type="button" onClick={clearAllHistory} className="rounded-lg border border-red-200 px-2 py-1 font-semibold text-red-600 transition hover:bg-red-50">Limpar histórico</button>
              <span>{filtered.length} transações</span>
            </div>
          </div>
          {q && (
            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
              💡 <strong>Dicas:</strong> Use "!" para excluir (ex: <code className="bg-white px-1 rounded">!investimento</code>) 
              ou "=" para busca exata (ex: <code className="bg-white px-1 rounded">=uber</code>)
            </div>
          )}
        </div>
        
        {/* Filtros de tipo */}
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              filterType === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Todas
          </button>
          <button
            type="button"
            onClick={() => setFilterType("expense")}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              filterType === "expense"
                ? "bg-red-500 text-white"
                : "bg-red-100 text-red-600 hover:bg-red-200"
            }`}
          >
            Despesas
          </button>
          <button
            type="button"
            onClick={() => setFilterType("income")}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              filterType === "income"
                ? "bg-emerald-500 text-white"
                : "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
            }`}
          >
            Receitas
          </button>
          
          {/* Divisor */}
          <div className="border-l border-slate-300 h-6 self-center"></div>
          
          {/* Filtro rápido para excluir investimentos */}
          <button
            type="button"
            onClick={() => setQ(q === "!investimento" ? "" : "!investimento")}
            className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
              q === "!investimento"
                ? "bg-purple-500 text-white"
                : "bg-purple-100 text-purple-600 hover:bg-purple-200"
            }`}
          >
            {q === "!investimento" ? "✓ " : ""}Sem Investimentos
          </button>
        </div>
      </div>

      {groups.length === 0 && (
        <div className="rounded-xl border border-dashed p-6 text-center text-slate-500">Sem transações. Adicione na aba "Nova Transação" ou importe um .json.</div>
      )}

      <div className="space-y-6">
        {groups.map((group) => {
          const isExpanded = group.isExpanded;
          const displayItems = isExpanded ? group.items : group.items.slice(0, 5);
          const hasMoreItems = group.items.length > 5;
          
          return (
            <div key={group.ym} className="rounded-xl border border-slate-100">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-slate-800">{group.label}</div>
                  <button
                    type="button"
                    onClick={() => setMonthChartModal(group)}
                    className="rounded px-2 py-1 text-xs font-medium text-purple-600 bg-purple-50 hover:bg-purple-100 transition-colors"
                    title="Ver gráfico do mês"
                  >
                    📊 Gráfico
                  </button>
                </div>
                <div className="flex flex-wrap gap-4">
                  <span>Total: <strong>{fmtBRL(group.items.reduce((acc, e) => acc + toNumber(e.value), 0))}</strong></span>
                  <span>{group.items.length} transações</span>
                </div>
              </div>
              {collapsed ? (
                <CollapsedTable 
                  items={group.items}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onHeaderClick={handleHeaderClick}
                />
              ) : (
                <>
                  <DetailedTable
                    items={displayItems}
                    editingId={editingId}
                    draft={draft}
                    onStartEdit={startEdit}
                    onUpdateDraft={(name, value) =>
                      setDraft((prev) => (prev ? { ...prev, [name]: value } : prev))
                    }
                    onCancelEdit={cancelEdit}
                    onSaveEdit={saveEdit}
                    onRemove={removeExpense}
                    categoryOptions={categoryOptions}
                    sourceOptions={sourceOptions}
                    categoryColorMap={categoryColorMap}
                    sourceColorMap={sourceColorMap}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onHeaderClick={handleHeaderClick}
                  />
                  {hasMoreItems && (
                    <div className="border-t border-slate-100 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => toggleMonthExpansion(group.ym)}
                        className="w-full rounded-lg bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                      >
                        {isExpanded 
                          ? `Mostrar apenas os primeiros 5 de ${group.items.length} itens`
                          : `Mostrar todos os ${group.items.length} itens (${group.items.length - 5} ocultos)`
                        }
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Modal de Gráfico do Mês */}
      {monthChartModal && <MonthChartModal group={monthChartModal} onClose={() => setMonthChartModal(null)} categories={categories} />}
      
      {/* Modal de Edição em Lote */}
      {batchEditModal && (
        <BatchEditModal 
          modal={batchEditModal}
          onClose={closeBatchEdit}
          onApply={applyBatchEdit}
          categoryOptions={categoryOptions}
          sourceOptions={sourceOptions}
        />
      )}
    </div>
  );
}

function DetailedTable({
  items,
  editingId,
  draft,
  onStartEdit,
  onUpdateDraft,
  onCancelEdit,
  onSaveEdit,
  onRemove,
  categoryOptions = [],
  sourceOptions = [],
  categoryColorMap = new Map(),
  sourceColorMap = new Map(),
  sortBy = "date",
  sortOrder = "desc",
  onHeaderClick = () => {},
}) {
  const dateOpenProps = useOpenDatePickerProps();
  
  // Items já vêm ordenados do parent component (groups), então apenas usamos diretamente
  const sortedItems = items;
  
  const SortableHeader = ({ field, children, className = "" }) => {
    const isActive = sortBy === field;
    const arrow = isActive ? (sortOrder === "asc" ? " ↑" : " ↓") : "";
    
    return (
      <Th 
        className={`cursor-pointer hover:bg-slate-100 transition-colors select-none ${className}`}
        onClick={() => onHeaderClick(field)}
        title={`Ordenar por ${children}`}
      >
        {children}{arrow}
      </Th>
    );
  };
  
  return (
    <div className="overflow-x-auto">
      <table className="divide-y divide-slate-100 text-sm" style={{ minWidth: "900px", tableLayout: "fixed", width: "100%" }}>
        <colgroup>
          <col style={{ width: "80px" }} />
          <col style={{ width: "110px" }} />
          <col />
          <col style={{ width: "150px" }} />
          <col style={{ width: "130px" }} />
          <col style={{ width: "120px" }} />
          <col style={{ width: "130px" }} />
        </colgroup>
        <thead className="bg-slate-50">
          <tr>
            <Th>Tipo</Th>
            <SortableHeader field="date">Data</SortableHeader>
            <SortableHeader field="description">Descrição</SortableHeader>
            <Th>Categoria</Th>
            <Th>Fonte</Th>
            <SortableHeader field="value" className="text-right">Valor</SortableHeader>
            <Th className="text-right">Ações</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sortedItems.map((e) => {
            const isEditing = editingId === e.id;
            return (
              <tr key={e.id} className={`align-middle hover:bg-slate-50 ${
                (e.value || 0) < 0 
                  ? "bg-red-50/50 border-l-4 border-red-200" 
                  : "bg-emerald-50/50 border-l-4 border-emerald-200"
              }`}>
                <Td>
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${
                      (e.value || 0) < 0 ? "bg-red-500" : "bg-emerald-500"
                    }`} />
                    <span className={`text-xs font-medium ${
                      (e.value || 0) < 0 ? "text-red-600" : "text-emerald-600"
                    }`}>
                      {(e.value || 0) < 0 ? "Despesa" : "Receita"}
                    </span>
                  </div>
                </Td>
                <Td>
                  {isEditing ? (
                  <input 
                      type="date" 
                      value={draft?.date ?? ""} 
                      onChange={(ev) => onUpdateDraft("date", ev.target.value)} 
                      className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none cursor-pointer"
                      style={{ 
                        WebkitAppearance: 'none',
                        MozAppearance: 'textfield',
                        appearance: 'none'
                      }}
                      {...dateOpenProps}
                    />
                  ) : (
                    new Date(e.date).toLocaleDateString("pt-BR")
                  )}
                </Td>
                <Td>
                  {isEditing ? (
                    <input type="text" value={draft?.description ?? ""} onChange={(ev) => onUpdateDraft("description", ev.target.value)} className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none" />
                  ) : (
                    <div className="break-words overflow-hidden">
                      {e.description}
                    </div>
                  )}
                </Td>
                <Td>
                  {isEditing ? (
                    <MultiPillSelect
                      values={draft?.categories ?? []}
                      options={categoryOptions}
                      onChange={(values) => onUpdateDraft("categories", values)}
                      placeholder="Adicionar categoria"
                    />
                  ) : e.categories && e.categories.length ? (
                    <div className="flex flex-wrap gap-1">
                      {e.categories.map((category) => {
                        const color = categoryColorMap.get(category) || "#1F2937";
                        return (
                          <span
                            key={category}
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: `${color}15`,
                              color: color,
                              border: `1px solid ${color}40`
                            }}
                          >
                            {category}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    e.category || "—"
                  )}
                </Td>
                <Td>
                  {isEditing ? (
                    <MultiPillSelect
                      values={draft?.sources ?? []}
                      options={sourceOptions}
                      onChange={(values) => onUpdateDraft("sources", values)}
                      placeholder="Adicionar fonte"
                    />
                  ) : e.sources && e.sources.length ? (
                    <div className="flex flex-wrap gap-1">
                      {e.sources.map((source) => {
                        const color = sourceColorMap.get(source) || "#1F2937";
                        return (
                          <span
                            key={source}
                            className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                            style={{
                              backgroundColor: `${color}15`,
                              color: color,
                              border: `1px solid ${color}40`
                            }}
                          >
                            {source}
                          </span>
                        );
                      })}
                    </div>
                  ) : (
                    e.source || "—"
                  )}
                </Td>
                <Td align="right">
                  <span className={`font-semibold ${
                    (e.value || 0) >= 0 ? "text-emerald-600" : "text-red-600"
                  }`}>
                    {fmtBRL(e.absValue)}
                  </span>
                </Td>
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

function CollapsedTable({ items, sortBy = "date", sortOrder = "desc", onHeaderClick = () => {} }) {
  const byDate = new Map();
  for (const e of items) {
    const key = e.date;
    const current = byDate.get(key) || { date: e.date, total: 0 };
    current.total += Math.abs(toNumber(e.value));
    byDate.set(key, current);
  }
  
  const rows = Array.from(byDate.values()).sort((a, b) => {
    let comparison = 0;
    
    if (sortBy === "date") {
      comparison = a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    } else if (sortBy === "value") {
      comparison = a.total < b.total ? -1 : a.total > b.total ? 1 : 0;
    } else {
      // Default: ordenar por data
      comparison = a.date < b.date ? -1 : a.date > b.date ? 1 : 0;
    }
    
    return sortOrder === "asc" ? comparison : -comparison;
  });
  
  const SortableHeader = ({ field, children, className = "" }) => {
    const isActive = sortBy === field;
    const arrow = isActive ? (sortOrder === "asc" ? " ↑" : " ↓") : "";
    
    return (
      <Th 
        className={`cursor-pointer hover:bg-slate-100 transition-colors select-none ${className}`}
        onClick={() => onHeaderClick(field)}
        title={`Ordenar por ${children}`}
      >
        {children}{arrow}
      </Th>
    );
  };
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50">
          <tr>
            <SortableHeader field="date">Data</SortableHeader>
            <SortableHeader field="value" className="text-right">Total</SortableHeader>
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

function MonthChartModal({ group, onClose, categories }) {
  const { label, items } = group;
  
  // Calcular dados por categoria
  const categoryTotals = {};
  const expenses = items.filter(item => (item.value || 0) < 0);
  
  expenses.forEach(item => {
    const itemCategories = Array.isArray(item.categories) ? item.categories : [];
    const absValue = Math.abs(item.value || 0);
    
    if (itemCategories.length === 0) {
      categoryTotals["Sem categoria"] = (categoryTotals["Sem categoria"] || 0) + absValue;
    } else {
      const valuePerCategory = absValue / itemCategories.length;
      itemCategories.forEach(cat => {
        // Pular investimentos
        if (cat.toLowerCase() !== "investimento" && cat.toLowerCase() !== "investimentos") {
          categoryTotals[cat] = (categoryTotals[cat] || 0) + valuePerCategory;
        }
      });
    }
  });
  
  const categoryData = Object.entries(categoryTotals)
    .map(([name, value]) => ({ name, value }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);
  
  const total = categoryData.reduce((sum, item) => sum + item.value, 0);
  const COLORS = ["#10B981", "#2563EB", "#EF4444", "#8B5CF6", "#F59E0B", "#6B7280", "#1F2937"];
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <h3 className="mb-6 text-lg font-bold text-slate-800">Despesas por categoria - {label}</h3>
        
        {categoryData.length > 0 ? (
          <div className="space-y-4">
            {categoryData.map((item, index) => {
              const percent = total > 0 ? (item.value / total) * 100 : 0;
              const color = COLORS[index % COLORS.length];
              
              return (
                <div key={item.name} className="flex items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div 
                      className="h-4 w-4 rounded-full flex-shrink-0" 
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm font-medium text-slate-700">{item.name}</span>
                  </div>
                  
                  {/* Barra de progresso */}
                  <div className="flex-1 h-6 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full flex items-center justify-end px-2 text-xs font-semibold text-white"
                      style={{ 
                        backgroundColor: color,
                        width: `${percent}%`,
                        minWidth: percent > 10 ? 'auto' : '40px'
                      }}
                    >
                      {percent.toFixed(1)}%
                    </div>
                  </div>
                  
                  <span className="text-sm font-bold text-slate-800 min-w-[100px] text-right">{fmtBRL(item.value)}</span>
                </div>
              );
            })}
            
            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-between items-center">
              <span className="text-sm font-semibold text-slate-600">Total de Despesas:</span>
              <span className="text-lg font-bold text-red-600">{fmtBRL(total)}</span>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-500">Nenhuma despesa neste mês</div>
        )}
      </div>
    </div>
  );
}

function Th({ children, className = "", onClick, title }) {
  return (
    <th 
      className={`px-4 py-2 text-left font-medium text-slate-600 ${className}`}
      onClick={onClick}
      title={title}
    >
      {children}
    </th>
  );
}

function Td({ children, align = "left" }) {
  const cls = align === "right" ? "text-right" : "text-left";
  return <td className={`px-4 py-2 ${cls}`}>{children}</td>;
}

function BatchEditModal({ modal, onClose, onApply, categoryOptions = [], sourceOptions = [] }) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [newCategories, setNewCategories] = useState([]);
  const [newSources, setNewSources] = useState([]);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [usePeriodFilter, setUsePeriodFilter] = useState(true);
  const dateOpenProps = useOpenDatePickerProps();

  function handleApply() {
    if (!periodStart || !periodEnd) {
      alert("Por favor, selecione um período de data válido.");
      return;
    }
    
    if (selectedIds.size === 0) {
      alert("Selecione pelo menos uma transação.");
      return;
    }
    
    if (newCategories.length === 0 && newSources.length === 0) {
      alert("Selecione pelo menos uma categoria ou fonte para adicionar.");
      return;
    }

    onApply({
      selectedIds: Array.from(selectedIds),
      newCategories,
      newSources,
      periodStart,
      periodEnd,
      deleteSelected: false,
    });
  }

  function handleDelete() {
    if (!periodStart || !periodEnd) {
      alert("Por favor, selecione um período de data válido.");
      return;
    }
    
    if (selectedIds.size === 0) {
      alert("Selecione pelo menos uma transação para deletar.");
      return;
    }
    
    const confirmMessage = `Tem certeza que deseja deletar ${selectedIds.size} transação(ões) selecionada(s)? Esta ação não pode ser desfeita.`;
    if (!confirm(confirmMessage)) {
      return;
    }

    onApply({
      selectedIds: Array.from(selectedIds),
      newCategories: [],
      newSources: [],
      periodStart,
      periodEnd,
      deleteSelected: true,
    });
  }

  function toggleSelection(id) {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  function selectAll() {
    const filteredItems = modal.items.filter(item => {
      if (!usePeriodFilter || !periodStart || !periodEnd) return false;
      const itemDate = new Date(item.date);
      const start = new Date(periodStart);
      const end = new Date(periodEnd);
      return itemDate >= start && itemDate <= end;
    });
    setSelectedIds(new Set(filteredItems.map(item => item.id)));
  }

  function selectNone() {
    setSelectedIds(new Set());
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">
            Edição em Lote - {modal.ym}
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Selecionar período (obrigatório) */}
          <div className="border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Selecionar período <span className="text-red-500">*</span>
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Data inicial
                </label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  style={{ 
                    WebkitAppearance: 'none',
                    MozAppearance: 'textfield',
                    appearance: 'none'
                  }}
                  required
                  {...dateOpenProps}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Data final
                </label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  style={{ 
                    WebkitAppearance: 'none',
                    MozAppearance: 'textfield',
                    appearance: 'none'
                  }}
                  required
                  {...dateOpenProps}
                />
              </div>
            </div>
          </div>

          {/* Selecionar transações */}
          <div className="border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Selecionar transações do período
            </h3>
            
            <div className="flex gap-2 mb-3">
              <button
                onClick={selectAll}
                disabled={!periodStart || !periodEnd}
                className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Selecionar todas do período
              </button>
              <button
                onClick={selectNone}
                className="px-3 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
              >
                Desmarcar todas
              </button>
            </div>
            
            <div className="max-h-40 overflow-y-auto space-y-1">
              {modal.items.filter(item => {
                if (!periodStart || !periodEnd) return false;
                const itemDate = new Date(item.date);
                const start = new Date(periodStart);
                const end = new Date(periodEnd);
                return itemDate >= start && itemDate <= end;
              }).map((item, index) => (
                <label key={item.id} className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleSelection(item.id)}
                    className="rounded border-slate-300"
                  />
                  <div className="flex-1 text-sm text-slate-600">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-slate-500 w-20">
                        {new Date(item.date).toLocaleDateString("pt-BR")}
                      </span>
                      <span className="flex-1 truncate">
                        {item.description || "—"}
                      </span>
                      <span className={`font-semibold text-xs ${
                        (item.value || 0) >= 0 ? "text-emerald-600" : "text-red-600"
                      }`}>
                        {fmtBRL(Math.abs(item.value || 0))}
                      </span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            
            <div className="mt-2 text-xs text-slate-500">
              {selectedIds.size} de {modal.items.filter(item => {
                if (!periodStart || !periodEnd) return false;
                const itemDate = new Date(item.date);
                const start = new Date(periodStart);
                const end = new Date(periodEnd);
                return itemDate >= start && itemDate <= end;
              }).length} transações selecionadas
            </div>
            
            {(!periodStart || !periodEnd) && (
              <div className="mt-2 text-xs text-amber-600">
                ⚠️ Selecione um período para ver as transações
              </div>
            )}
          </div>

          {/* Categorias e fontes para adicionar */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-medium text-slate-700 mb-3">Categorias para adicionar</h4>
              <MultiPillSelect
                values={newCategories}
                options={categoryOptions.map(cat => cat.name)}
                onChange={setNewCategories}
                placeholder="Selecionar categorias"
              />
            </div>
            
            <div className="border border-slate-200 rounded-lg p-4">
              <h4 className="font-medium text-slate-700 mb-3">Fontes para adicionar</h4>
              <MultiPillSelect
                values={newSources}
                options={sourceOptions.map(src => src.name)}
                onChange={setNewSources}
                placeholder="Selecionar fontes"
              />
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex gap-3">
            <button
              onClick={handleApply}
              disabled={selectedIds.size === 0 || (newCategories.length === 0 && newSources.length === 0)}
              className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              Aplicar alterações
            </button>
            <button
              onClick={handleDelete}
              disabled={selectedIds.size === 0}
              className="bg-red-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              Deletar selecionadas
            </button>
            <button
              onClick={onClose}
              className="bg-slate-200 text-slate-700 px-4 py-2 rounded text-sm font-medium hover:bg-slate-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
