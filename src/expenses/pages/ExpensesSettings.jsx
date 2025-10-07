import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLocalStorageState } from "../../hooks/useLocalStorageState.js";
import { ensureCategoryInLibrary } from "../config/categories.js";
import { ensureSourceInLibrary } from "../config/sources.js";
import { SettingsIcon } from "../../components/icons.jsx";
import {
  DEFAULT_DESCRIPTION_CATEGORY_MAPPINGS,
  mergeDescriptionMappings,
  normalizeMappingKeyword,
} from "../config/descriptionMappings.js";
import {
  EXPENSES_LS_KEY,
  EXPENSES_STORAGE_SEED,
  ensureExpensesDefaults,
} from "../config/storage.js";
import { MultiPillSelect } from "../components/MultiPillSelect.jsx";

const PERSONAL_FIELDS = [
  { name: "fullName", label: "Nome completo", placeholder: "Nome do responsável" },
  { name: "email", label: "E-mail", placeholder: "email@exemplo.com" },
  { name: "householdSize", label: "Qtd. de pessoas na casa", placeholder: "Ex.: 3" },
];

const TAB_OPTIONS = [
  { value: "dashboard", label: "Dashboard" },
  { value: "historico", label: "Histórico" },
  { value: "entrada", label: "Nova despesa" },
];

const CURRENCIES = [
  { value: "BRL", label: "Real (BRL)" },
  { value: "USD", label: "Dólar (USD)" },
  { value: "EUR", label: "Euro (EUR)" },
];

export default function ExpensesSettings() {
  const [storeState, setStore] = useLocalStorageState(EXPENSES_LS_KEY, EXPENSES_STORAGE_SEED);
  const store = ensureExpensesDefaults(storeState);
  const { personalInfo, settings, categories, sources, createdAt, descriptionCategoryMappings = [], ignoredDescriptions = [] } = store;
  const ignoredList = Array.isArray(ignoredDescriptions) ? ignoredDescriptions : [];

  const [newCategory, setNewCategory] = useState({ name: "", icon: "", color: "" });
  const [newSource, setNewSource] = useState({ name: "", icon: "", color: "" });
  const [showUpdateWarning, setShowUpdateWarning] = useState({ type: null, index: null });
  const [newMappingKeyword, setNewMappingKeyword] = useState("");
  const [newMappingCategories, setNewMappingCategories] = useState([]);
  const [newIgnoredKeyword, setNewIgnoredKeyword] = useState("");

  const creationDate = useMemo(() => (createdAt ? createdAt.slice(0, 10) : ""), [createdAt]);
  const mappingList = useMemo(
    () =>
      descriptionCategoryMappings.map((entry) => ({
        keyword: entry.keyword,
        categories: Array.isArray(entry.categories) ? entry.categories.filter(Boolean) : [],
      })),
    [descriptionCategoryMappings]
  );
  const categoryOptions = useMemo(
    () => (Array.isArray(categories) ? categories.map((category) => category.name).filter(Boolean) : []),
    [categories]
  );

  function updatePersonalInfo(field, value) {
    const parsedValue = field === "householdSize" ? Number(value) || 0 : value;
    setStore((prev) => {
      const safePrev = ensureExpensesDefaults(prev);
      return {
        ...safePrev,
        personalInfo: { ...safePrev.personalInfo, [field]: parsedValue },
      };
    });
  }

  function updateSettings(field, value) {
    const parsedValue = field === "monthlyBudget" ? Number(value) || 0 : value;
    setStore((prev) => {
      const safePrev = ensureExpensesDefaults(prev);
      return {
        ...safePrev,
        settings: { ...safePrev.settings, [field]: parsedValue },
      };
    });
  }

  // Campo de "Data de criação do histórico" removido da UI conforme solicitação
  function updateCreatedAt(value) {
    if (!value) return;
    const iso = new Date(value).toISOString();
    setStore((prev) => {
      const safePrev = ensureExpensesDefaults(prev);
      return { ...safePrev, createdAt: iso };
    });
  }

  function handleAddCategory(event) {
    event.preventDefault();
    if (!newCategory.name.trim()) return;
    setStore((prev) => {
      const safePrev = ensureExpensesDefaults(prev);
      const ensured = ensureCategoryInLibrary(newCategory.name.trim(), safePrev.categories);
      const exists = ensured.some((category) => category.name.toLowerCase() === newCategory.name.trim().toLowerCase());
      const nextCategories = exists
        ? ensured.map((category) =>
            category.name.toLowerCase() === newCategory.name.trim().toLowerCase()
              ? { ...category, icon: newCategory.icon || category.icon, color: newCategory.color || category.color }
              : category
          )
        : [
            ...ensured,
            { name: newCategory.name.trim(), icon: newCategory.icon || "🏷️", color: newCategory.color || "#1F2937" },
          ];
      return { ...safePrev, categories: nextCategories };
    });
    setNewCategory({ name: "", icon: "", color: "" });
  }

  function updateCategory(index, field, value) {
    setStore((prev) => {
      const safePrev = ensureExpensesDefaults(prev);
      const oldCategory = safePrev.categories[index];
      const nextCategories = safePrev.categories.map((category, idx) =>
        idx === index ? { ...category, [field]: value } : category
      );
      
      // Se o nome da categoria foi alterado, atualizar todas as despesas no histórico
      let nextExpenses = safePrev.expenses;
      if (field === "name" && oldCategory && oldCategory.name !== value) {
        nextExpenses = safePrev.expenses.map((expense) => {
          const categoriesArray = Array.isArray(expense.categories)
            ? expense.categories.map((item) => (item === oldCategory.name ? value : item))
            : expense.category === oldCategory.name
            ? [value]
            : expense.categories;
          const updatedCategory = expense.category === oldCategory.name ? value : expense.category;
          return {
            ...expense,
            category: updatedCategory,
            categories: categoriesArray || expense.categories,
          };
        });
        // Mostrar aviso de atualização
        setShowUpdateWarning({ type: 'category', index, oldName: oldCategory.name, newName: value });
        setTimeout(() => setShowUpdateWarning({ type: null, index: null }), 3000);
      }
      
      return { ...safePrev, categories: nextCategories, expenses: nextExpenses };
    });
  }

  function removeCategory(index) {
    setStore((prev) => {
      const safePrev = ensureExpensesDefaults(prev);
      const nextCategories = safePrev.categories.filter((_, idx) => idx !== index);
      return { ...safePrev, categories: nextCategories };
    });
  }

  function handleAddSource(event) {
    event.preventDefault();
    if (!newSource.name.trim()) return;
    setStore((prev) => {
      const safePrev = ensureExpensesDefaults(prev);
      const ensured = ensureSourceInLibrary(newSource.name.trim(), safePrev.sources);
      const exists = ensured.some((source) => source.name.toLowerCase() === newSource.name.trim().toLowerCase());
      const nextSources = exists
        ? ensured.map((source) =>
            source.name.toLowerCase() === newSource.name.trim().toLowerCase()
              ? { ...source, icon: newSource.icon || source.icon, color: newSource.color || source.color }
              : source
          )
        : [
            ...ensured,
            { name: newSource.name.trim(), icon: newSource.icon || "💳", color: newSource.color || "#6366F1" },
          ];
      return { ...safePrev, sources: nextSources };
    });
    setNewSource({ name: "", icon: "", color: "" });
  }

  function updateSource(index, field, value) {
    setStore((prev) => {
      const safePrev = ensureExpensesDefaults(prev);
      const oldSource = safePrev.sources[index];
      const nextSources = safePrev.sources.map((source, idx) =>
        idx === index ? { ...source, [field]: value } : source
      );
      
      // Se o nome da fonte foi alterado, atualizar todas as despesas no histórico
      let nextExpenses = safePrev.expenses;
      if (field === "name" && oldSource && oldSource.name !== value) {
        nextExpenses = safePrev.expenses.map((expense) => {
          const sourcesArray = Array.isArray(expense.sources)
            ? expense.sources.map((item) => (item === oldSource.name ? value : item))
            : expense.source === oldSource.name
            ? [value]
            : expense.sources;
          const updatedSource = expense.source === oldSource.name ? value : expense.source;
          return {
            ...expense,
            source: updatedSource,
            sources: sourcesArray || expense.sources,
          };
        });
        // Mostrar aviso de atualização
        setShowUpdateWarning({ type: 'source', index, oldName: oldSource.name, newName: value });
        setTimeout(() => setShowUpdateWarning({ type: null, index: null }), 3000);
      }
      
      return { ...safePrev, sources: nextSources, expenses: nextExpenses };
    });
  }

  function removeSource(index) {
    setStore((prev) => {
      const safePrev = ensureExpensesDefaults(prev);
      const nextSources = safePrev.sources.filter((_, idx) => idx !== index);
      return { ...safePrev, sources: nextSources };
    });
  }

  function addDescriptionMapping(event) {
    event.preventDefault();
    const keyword = newMappingKeyword.trim();
    if (!keyword || newMappingCategories.length === 0) return;
    setStore((prev) => {
      const safePrev = ensureExpensesDefaults(prev);
      const merged = mergeDescriptionMappings(safePrev.descriptionCategoryMappings, [
        { keyword, categories: newMappingCategories },
      ]);
      return { ...safePrev, descriptionCategoryMappings: merged };
    });
    setNewMappingKeyword("");
    setNewMappingCategories([]);
  }

  function removeDescriptionMapping(keyword) {
    setStore((prev) => {
      const safePrev = ensureExpensesDefaults(prev);
      const filtered = safePrev.descriptionCategoryMappings.filter(
        (entry) => normalizeMappingKeyword(entry.keyword) !== normalizeMappingKeyword(keyword)
      );
      return { ...safePrev, descriptionCategoryMappings: filtered };
    });
  }

  function resetDescriptionMappingsToDefault() {
    setStore((prev) => {
      const safePrev = ensureExpensesDefaults(prev);
      const merged = mergeDescriptionMappings(DEFAULT_DESCRIPTION_CATEGORY_MAPPINGS, []);
      return { ...safePrev, descriptionCategoryMappings: merged };
    });
  }

  function addIgnoredDescription(event) {
    event.preventDefault();
    const keyword = newIgnoredKeyword.trim();
    if (!keyword) return;
    
    setStore((prev) => {
      const safePrev = ensureExpensesDefaults(prev);
      const currentIgnored = Array.isArray(safePrev.ignoredDescriptions) ? safePrev.ignoredDescriptions : [];
      if (currentIgnored.includes(keyword)) return safePrev;
      return { ...safePrev, ignoredDescriptions: [...currentIgnored, keyword] };
    });
    setNewIgnoredKeyword("");
  }

  function removeIgnoredDescription(keyword) {
    setStore((prev) => {
      const safePrev = ensureExpensesDefaults(prev);
      const currentIgnored = Array.isArray(safePrev.ignoredDescriptions) ? safePrev.ignoredDescriptions : [];
      return { ...safePrev, ignoredDescriptions: currentIgnored.filter(k => k !== keyword) };
    });
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 p-6 text-slate-800">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3 text-slate-900">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white">
              <SettingsIcon className="h-6 w-6" />
            </span>
            <div>
              <h1 className="text-2xl font-bold">Configurações de Gastos</h1>
              <p className="text-sm text-slate-600">
                Defina dados pessoais, categorias, fontes e metas para o controle de gastos. Tudo é salvo automaticamente no navegador.
              </p>
            </div>
          </div>
          <div>
            <Link
              to="/gastos"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
            >
              ← Voltar para o painel de gastos
            </Link>
          </div>
        </header>

        {showUpdateWarning.type && (
          <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              <p className="text-sm font-medium text-blue-800">
                {showUpdateWarning.type === 'category' ? 'Categoria' : 'Fonte'} "{showUpdateWarning.oldName}" renomeada para "{showUpdateWarning.newName}". 
                Todas as menções no histórico foram atualizadas automaticamente.
              </p>
            </div>
          </div>
        )}

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Informações pessoais</h2>
          <p className="mt-1 text-sm text-slate-500">Os dados são incluídos no arquivo exportado e futuros relatórios.</p>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
            {PERSONAL_FIELDS.map((field) => (
              <label key={field.name} className="text-sm font-medium text-slate-700">
                {field.label}
                <input
                  type={field.name === "email" ? "email" : field.name === "householdSize" ? "number" : "text"}
                  value={personalInfo[field.name] ?? ""}
                  placeholder={field.placeholder}
                  min={field.name === "householdSize" ? 1 : undefined}
                  onChange={(event) => updatePersonalInfo(field.name, event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                />
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Preferências</h2>
          <p className="mt-1 text-sm text-slate-500">Ajuste metas e a experiência inicial do painel.</p>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Aba inicial
              <select
                value={settings.defaultTab}
                onChange={(event) => updateSettings("defaultTab", event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
              >
                {TAB_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Moeda padrão
              <select
                value={settings.currency}
                onChange={(event) => updateSettings("currency", event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
              >
                {CURRENCIES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              Meta mensal de gastos
              <input
                type="number"
                min={0}
                step="0.01"
                value={settings.monthlyBudget}
                onChange={(event) => updateSettings("monthlyBudget", event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Categorias cadastradas</h2>
              <p className="mt-1 text-sm text-slate-500">Use para agrupar gastos por tipo.</p>
            </div>
          </div>
          <div className="mt-4 max-h-[500px] overflow-y-auto space-y-4 pr-2">
            {categories.map((category, index) => (
              <div key={`category-${index}`} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-100 p-4 md:grid-cols-4">
                <label className="text-sm font-medium text-slate-700">
                  Nome
                  <input
                    type="text"
                    value={category.name}
                    onChange={(event) => updateCategory(index, "name", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Ícone
                  <input
                    type="text"
                    value={category.icon ?? ""}
                    onChange={(event) => updateCategory(index, "icon", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Cor
                  <input
                    type="color"
                    value={category.color ?? "#1F2937"}
                    onChange={(event) => updateCategory(index, "color", event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200"
                  />
                </label>
                <div className="flex items-end justify-end">
                  <button
                    type="button"
                    onClick={() => removeCategory(index)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
          <form
            className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-dashed border-slate-200 p-4 md:grid-cols-4"
            onSubmit={handleAddCategory}
          >
            <label className="text-sm font-medium text-slate-700">
              Nome
              <input
                type="text"
                value={newCategory.name}
                onChange={(event) => setNewCategory((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="Ex.: Moradia"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Ícone
              <input
                type="text"
                value={newCategory.icon}
                onChange={(event) => setNewCategory((prev) => ({ ...prev, icon: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="Emoji opcional"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Cor
              <input
                type="color"
                value={newCategory.color || "#1F2937"}
                onChange={(event) => setNewCategory((prev) => ({ ...prev, color: event.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200"
              />
            </label>
            <div className="flex items-end justify-end">
              <button
                type="submit"
                className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Adicionar categoria
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Fontes cadastradas</h2>
              <p className="mt-1 text-sm text-slate-500">Representam de onde vem cada gasto.</p>
            </div>
          </div>
          <div className="mt-4 max-h-[500px] overflow-y-auto space-y-4 pr-2">
            {sources.map((source, index) => (
              <div key={`source-${index}`} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-100 p-4 md:grid-cols-4">
                <label className="text-sm font-medium text-slate-700">
                  Nome
                  <input
                    type="text"
                    value={source.name}
                    onChange={(event) => updateSource(index, "name", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Ícone
                  <input
                    type="text"
                    value={source.icon ?? ""}
                    onChange={(event) => updateSource(index, "icon", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Cor
                  <input
                    type="color"
                    value={source.color ?? "#6366F1"}
                    onChange={(event) => updateSource(index, "color", event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200"
                  />
                </label>
                <div className="flex items-end justify-end">
                  <button
                    type="button"
                    onClick={() => removeSource(index)}
                    className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))}
          </div>
          <form
            className="mt-4 grid grid-cols-1 gap-3 rounded-xl border border-dashed border-slate-200 p-4 md:grid-cols-4"
            onSubmit={handleAddSource}
          >
            <label className="text-sm font-medium text-slate-700">
              Nome
              <input
                type="text"
                value={newSource.name}
                onChange={(event) => setNewSource((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="Ex.: Cartão de crédito"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Ícone
              <input
                type="text"
                value={newSource.icon}
                onChange={(event) => setNewSource((prev) => ({ ...prev, icon: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="Emoji opcional"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Cor
              <input
                type="color"
                value={newSource.color || "#6366F1"}
                onChange={(event) => setNewSource((prev) => ({ ...prev, color: event.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200"
              />
            </label>
            <div className="flex items-end justify-end">
              <button
                type="submit"
                className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Adicionar fonte
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Mapeamentos automáticos por descrição</h2>
          <p className="mt-1 text-sm text-slate-500">
            Quando a descrição contiver a palavra-chave abaixo, as categorias associadas serão aplicadas automaticamente na tela
            de novas transações.
          </p>
          <div className="mt-4">
            {mappingList.length > 0 && (
              <>
                <div className="mb-3 flex items-center gap-2">
                  <input
                    value={mappingFilter}
                    onChange={(e) => setMappingFilter(e.target.value)}
                    placeholder="Filtrar por palavra-chave ou categoria"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  />
                  {mappingFilter && (
                    <button
                      type="button"
                      onClick={() => setMappingFilter("")}
                      className="text-slate-400 hover:text-slate-600 text-lg px-2"
                      title="Limpar filtro"
                    >
                      ×
                    </button>
                  )}
                  <div className="text-xs text-slate-500 whitespace-nowrap">
                    {filteredMappingList.length} de {mappingList.length}
                  </div>
                </div>
                <div className="mb-4 max-h-[400px] overflow-y-auto space-y-2 pr-2">
                  {filteredMappingList.map((mapping) => (
                  <div
                    key={mapping.keyword}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <div>
                      <div className="text-[0.65rem] uppercase text-slate-400">Palavra-chave</div>
                      <div className="text-sm font-semibold text-slate-700">{mapping.keyword}</div>
                    </div>
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      {mapping.categories.length > 0 ? (
                        mapping.categories.map((category) => (
                          <span
                            key={`${mapping.keyword}-${category}`}
                            className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[0.7rem] text-slate-600"
                          >
                            {category}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">Sem categorias associadas</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDescriptionMapping(mapping.keyword)}
                      className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Remover
                    </button>
                  </div>
                  ))}
                </div>
              </>
            )}

            {mappingList.length === 0 && (
              <div className="mb-4 rounded-lg border border-dashed px-3 py-4 text-sm text-slate-500">
                Nenhum mapeamento configurado. Adicione uma palavra-chave abaixo.
              </div>
            )}

            <form onSubmit={addDescriptionMapping} className="space-y-3 rounded-xl border border-slate-200 p-4">
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">Palavra-chave</label>
                <input
                  value={newMappingKeyword}
                  onChange={(event) => setNewMappingKeyword(event.target.value)}
                  placeholder="ex.: uber, farmácia, mercado"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase text-slate-500">Categorias aplicadas</label>
                <MultiPillSelect
                  values={newMappingCategories}
                  options={categoryOptions}
                  onChange={setNewMappingCategories}
                  placeholder="Selecionar categoria"
                  inputPlaceholder="Nova categoria"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-slate-800"
                >
                  Salvar mapeamento
                </button>
                <button
                  type="button"
                  onClick={resetDescriptionMappingsToDefault}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Restaurar padrões
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Descrições para ignorar na importação</h2>
          <p className="mt-1 text-sm text-slate-500">
            Gastos com estas descrições serão automaticamente ignorados durante a importação de arquivos CSV. 
            Útil para pagamentos recebidos, transferências entre contas ou outros lançamentos que não devem aparecer no histórico.
          </p>
          
          <div className="mt-4">
            {ignoredList.length > 0 && (
              <div className="mb-4 max-h-[300px] overflow-y-auto space-y-2 pr-2">
                {ignoredList.map((keyword, index) => (
                  <div key={index} className="flex items-center justify-between rounded-lg border border-slate-200 p-3">
                    <span className="text-sm text-slate-700 font-medium">{keyword}</span>
                    <button
                      type="button"
                      onClick={() => removeIgnoredDescription(keyword)}
                      className="rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            )}

            {ignoredList.length === 0 && (
              <div className="mb-4 rounded-lg border border-dashed px-3 py-4 text-sm text-slate-500">
                Nenhuma descrição configurada para ser ignorada. Adicione abaixo.
              </div>
            )}

            <form onSubmit={addIgnoredDescription} className="flex gap-2">
              <input
                type="text"
                value={newIgnoredKeyword}
                onChange={(e) => setNewIgnoredKeyword(e.target.value)}
                placeholder='Ex: "Pagamento recebido", "Transferência enviada"'
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Adicionar
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
