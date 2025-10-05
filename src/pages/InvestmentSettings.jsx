import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useLocalStorageState } from "../hooks/useLocalStorageState.js";
import { LS_KEY } from "../utils/formatters.js";
import { ensureInvestmentDefaults, INVESTMENT_STORAGE_SEED } from "../config/investmentStorage.js";
import { ensureBankInLibrary } from "../config/banks.js";
import { ensureSourceInLibrary } from "../config/sources.js";
import { SettingsIcon } from "../components/icons.jsx";

const PERSONAL_FIELDS = [
  { name: "fullName", label: "Nome completo", placeholder: "Nome que aparecerá nos relatórios" },
  { name: "email", label: "E-mail", placeholder: "email@exemplo.com" },
  { name: "document", label: "Documento", placeholder: "CPF ou CNPJ" },
  { name: "phone", label: "Telefone", placeholder: "+55 (11) 99999-9999" },
];

const DEFAULT_TAB_OPTIONS = [
  { value: "dashboard", label: "Dashboard" },
  { value: "historico", label: "Histórico" },
  { value: "entrada", label: "Novo lançamento" },
  { value: "projecoes", label: "Projeções" },
];

const FOCUS_OPTIONS = [
  { value: "investimentos", label: "Investimentos" },
  { value: "gastos", label: "Gastos" },
];

export default function InvestmentSettings() {
  const [storeState, setStore] = useLocalStorageState(LS_KEY, INVESTMENT_STORAGE_SEED);
  const store = ensureInvestmentDefaults(storeState);
  const { personalInfo, settings, banks, sources, createdAt } = store;

  const [newBank, setNewBank] = useState({ name: "", icon: "", color: "" });
  const [newSource, setNewSource] = useState({ name: "", icon: "", color: "" });

  const creationDate = useMemo(() => (createdAt ? createdAt.slice(0, 10) : ""), [createdAt]);

  function updatePersonalInfo(field, value) {
    setStore((prev) => {
      const safePrev = ensureInvestmentDefaults(prev);
      return {
        ...safePrev,
        personalInfo: { ...safePrev.personalInfo, [field]: value },
      };
    });
  }

  function updateSettings(field, value) {
    setStore((prev) => {
      const safePrev = ensureInvestmentDefaults(prev);
      return {
        ...safePrev,
        settings: { ...safePrev.settings, [field]: value },
      };
    });
  }

  function updateCreatedAt(value) {
    if (!value) return;
    const iso = new Date(value).toISOString();
    setStore((prev) => {
      const safePrev = ensureInvestmentDefaults(prev);
      return { ...safePrev, createdAt: iso };
    });
  }

  function handleAddBank(event) {
    event.preventDefault();
    if (!newBank.name.trim()) return;
    setStore((prev) => {
      const safePrev = ensureInvestmentDefaults(prev);
      const ensured = ensureBankInLibrary(newBank.name.trim(), safePrev.banks);
      const exists = ensured.some((bank) => bank.name.toLowerCase() === newBank.name.trim().toLowerCase());
      const nextBanks = exists
        ? ensured.map((bank) =>
            bank.name.toLowerCase() === newBank.name.trim().toLowerCase()
              ? { ...bank, icon: newBank.icon || bank.icon, color: newBank.color || bank.color }
              : bank
          )
        : [...ensured, { name: newBank.name.trim(), icon: newBank.icon || "🏦", color: newBank.color || "#2563EB" }];
      return { ...safePrev, banks: nextBanks };
    });
    setNewBank({ name: "", icon: "", color: "" });
  }

  function updateBank(index, field, value) {
    setStore((prev) => {
      const safePrev = ensureInvestmentDefaults(prev);
      const nextBanks = safePrev.banks.map((bank, idx) => (idx === index ? { ...bank, [field]: value } : bank));
      return { ...safePrev, banks: nextBanks };
    });
  }

  function removeBank(index) {
    setStore((prev) => {
      const safePrev = ensureInvestmentDefaults(prev);
      const nextBanks = safePrev.banks.filter((_, idx) => idx !== index);
      return { ...safePrev, banks: nextBanks };
    });
  }

  function handleAddSource(event) {
    event.preventDefault();
    if (!newSource.name.trim()) return;
    setStore((prev) => {
      const safePrev = ensureInvestmentDefaults(prev);
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
            { name: newSource.name.trim(), icon: newSource.icon || "💼", color: newSource.color || "#0EA5E9" },
          ];
      return { ...safePrev, sources: nextSources };
    });
    setNewSource({ name: "", icon: "", color: "" });
  }

  function updateSource(index, field, value) {
    setStore((prev) => {
      const safePrev = ensureInvestmentDefaults(prev);
      const nextSources = safePrev.sources.map((source, idx) =>
        idx === index ? { ...source, [field]: value } : source
      );
      return { ...safePrev, sources: nextSources };
    });
  }

  function removeSource(index) {
    setStore((prev) => {
      const safePrev = ensureInvestmentDefaults(prev);
      const nextSources = safePrev.sources.filter((_, idx) => idx !== index);
      return { ...safePrev, sources: nextSources };
    });
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 p-6 text-slate-800">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3 text-slate-900">
            <SettingsIcon className="h-7 w-7" />
            <div>
              <h1 className="text-2xl font-bold">Configurações de Investimentos</h1>
              <p className="text-sm text-slate-600">
                Ajuste informações pessoais, bibliotecas de bancos/fontes e preferências padrão. Todas as alterações são salvas automaticamente no navegador.
              </p>
            </div>
          </div>
          <div>
            <Link
              to="/investimentos"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
            >
              ← Voltar para o painel de investimentos
            </Link>
          </div>
        </header>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Informações pessoais</h2>
          <p className="mt-1 text-sm text-slate-500">Esses dados aparecem no PDF e no JSON exportado.</p>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {PERSONAL_FIELDS.map((field) => (
              <label key={field.name} className="text-sm font-medium text-slate-700">
                {field.label}
                <input
                  type="text"
                  value={personalInfo[field.name] ?? ""}
                  placeholder={field.placeholder}
                  onChange={(event) => updatePersonalInfo(field.name, event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                />
              </label>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Preferências</h2>
          <p className="mt-1 text-sm text-slate-500">Defina o comportamento padrão do painel e observações para os relatórios.</p>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Data de criação do histórico
              <input
                type="date"
                value={creationDate}
                onChange={(event) => updateCreatedAt(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Aba inicial
              <select
                value={settings.defaultTab}
                onChange={(event) => updateSettings("defaultTab", event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
              >
                {DEFAULT_TAB_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <fieldset className="text-sm font-medium text-slate-700">
              <legend className="text-sm font-medium text-slate-700">Área em foco ao abrir</legend>
              <div className="mt-2 flex flex-wrap gap-3">
                {FOCUS_OPTIONS.map((option) => (
                  <label key={option.value} className="inline-flex items-center gap-2 text-sm font-normal text-slate-600">
                    <input
                      type="radio"
                      name="defaultFocus"
                      value={option.value}
                      checked={settings.defaultFocusArea === option.value}
                      onChange={(event) => updateSettings("defaultFocusArea", event.target.value)}
                      className="h-4 w-4 text-slate-900 focus:ring-slate-400"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="text-sm font-medium text-slate-700 md:col-span-2">
              Observações para relatórios
              <textarea
                rows={3}
                value={settings.reportNotes ?? ""}
                onChange={(event) => updateSettings("reportNotes", event.target.value)}
                placeholder="Mensagem opcional exibida nos relatórios exportados."
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Bancos cadastrados</h2>
              <p className="mt-1 text-sm text-slate-500">Personalize nomes, ícones e cores utilizados nas listagens.</p>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            {banks.map((bank, index) => (
              <div key={bank.name + index} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-100 p-4 md:grid-cols-4">
                <label className="text-sm font-medium text-slate-700">
                  Nome
                  <input
                    type="text"
                    value={bank.name}
                    onChange={(event) => updateBank(index, "name", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Ícone
                  <input
                    type="text"
                    value={bank.icon ?? ""}
                    onChange={(event) => updateBank(index, "icon", event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </label>
                <label className="text-sm font-medium text-slate-700">
                  Cor
                  <input
                    type="color"
                    value={bank.color ?? "#2563EB"}
                    onChange={(event) => updateBank(index, "color", event.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-slate-200"
                  />
                </label>
                <div className="flex items-end justify-end">
                  <button
                    type="button"
                    onClick={() => removeBank(index)}
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
            onSubmit={handleAddBank}
          >
            <label className="text-sm font-medium text-slate-700">
              Nome
              <input
                type="text"
                value={newBank.name}
                onChange={(event) => setNewBank((prev) => ({ ...prev, name: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="Banco ou corretora"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Ícone
              <input
                type="text"
                value={newBank.icon}
                onChange={(event) => setNewBank((prev) => ({ ...prev, icon: event.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="Emoji opcional"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Cor
              <input
                type="color"
                value={newBank.color || "#2563EB"}
                onChange={(event) => setNewBank((prev) => ({ ...prev, color: event.target.value }))}
                className="mt-1 h-10 w-full rounded-lg border border-slate-200"
              />
            </label>
            <div className="flex items-end justify-end">
              <button
                type="submit"
                className="w-full rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Adicionar banco
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Fontes cadastradas</h2>
              <p className="mt-1 text-sm text-slate-500">Utilizadas para classificar a origem dos aportes.</p>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            {sources.map((source, index) => (
              <div key={source.name + index} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-100 p-4 md:grid-cols-4">
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
                    value={source.color ?? "#0EA5E9"}
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
                placeholder="Ex.: Salário"
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
                value={newSource.color || "#0EA5E9"}
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
      </div>
    </div>
  );
}
