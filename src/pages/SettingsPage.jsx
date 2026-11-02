import { useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AppShell, PageHeader } from "../components/AppShell.jsx";
import { useUnifiedStore } from "../store/unifiedStore.js";
import { usePrefs } from "../theme/PrefsProvider.jsx";
import { ACCENTS, DENSITIES, MONEY_MODES, THEMES } from "../theme/prefs.js";
import { Select } from "../components/Select.jsx";
import { CurrencyInput } from "../components/CurrencyInput.jsx";
import { ConfirmDialog } from "../components/Modal.jsx";
import { ImportModal } from "../components/ImportModal.jsx";
import { useToast } from "../components/Toast.jsx";
import { MappingList } from "../expenses/components/MappingModal.jsx";
import { ensureBankInLibrary } from "../investments/config/banks.js";
import { ensureSourceInLibrary as ensureInvestmentSource } from "../investments/config/sources.js";
import { ensureCategoryInLibrary } from "../expenses/config/categories.js";
import { ensureSourceInLibrary as ensureExpenseSource } from "../expenses/config/sources.js";
import { mergeDescriptionMappings, normalizeMappingKeyword } from "../expenses/config/descriptionMappings.js";
import { applyImport, exportEntriesCsv, exportExpensesCsv, exportStoreJson } from "../utils/importExport.js";
import { fmtBRL, fmtDate } from "../utils/formatters.js";
import { TrashIcon, PlusIcon, SparklesIcon } from "../components/icons.jsx";
import { assignPaletteColors } from "../utils/palette.js";

const SECTIONS = [
  { key: "geral", label: "Geral" },
  { key: "aparencia", label: "Aparência" },
  { key: "investimentos", label: "Investimentos" },
  { key: "gastos", label: "Gastos" },
  { key: "dados", label: "Dados e backup" },
];

const INVEST_TABS = [
  { value: "dashboard", label: "Dashboard" },
  { value: "historico", label: "Histórico" },
  { value: "entrada", label: "Nova entrada" },
  { value: "projecoes", label: "Projeções" },
];
const EXPENSE_TABS = [
  { value: "dashboard", label: "Dashboard" },
  { value: "historico", label: "Histórico" },
  { value: "entrada", label: "Nova transação" },
  { value: "visoes", label: "Visões" },
  { value: "financiamentos", label: "Financiamentos" },
];
const CURRENCIES = [
  { value: "BRL", label: "Real (R$)" },
  { value: "USD", label: "Dólar (US$)" },
  { value: "EUR", label: "Euro (€)" },
];

function Section({ title, description, children, actions }) {
  return (
    <section className="card p-4 md:p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          {description && <p className="text-xs text-muted">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

/** Compact editable list of {name, icon, color} items. */
function NamedLibraryEditor({ items, onChange, onRename, placeholder, defaultIcon, defaultColor, usage = new Map() }) {
  const [draft, setDraft] = useState({ name: "", icon: "", color: "" });
  const [confirmIndex, setConfirmIndex] = useState(null);
  const [confirmRecolor, setConfirmRecolor] = useState(false);

  function update(index, field, value) {
    const old = items[index];
    const next = items.map((item, idx) => (idx === index ? { ...item, [field]: value } : item));
    onChange(next);
    if (field === "name" && old && old.name !== value && value.trim()) onRename?.(old.name, value);
  }

  function add(event) {
    event.preventDefault();
    const name = draft.name.trim();
    if (!name) return;
    if (items.some((i) => i.name.toLowerCase() === name.toLowerCase())) {
      setDraft({ name: "", icon: "", color: "" });
      return;
    }
    onChange([...items, { name, icon: draft.icon || defaultIcon, color: draft.color || defaultColor }]);
    setDraft({ name: "", icon: "", color: "" });
  }

  return (
    <div>
      <div className="mb-2 flex justify-end">
        <button type="button" className="btn btn-xs" onClick={() => setConfirmRecolor(true)} title="Aplica uma paleta de cores distintas e legíveis, na ordem da lista">
          <SparklesIcon className="h-3.5 w-3.5" /> Recolorir com a paleta
        </button>
      </div>
      <div className="max-h-80 overflow-auto rounded-lg border border-line">
        <table className="table-base">
          <thead>
            <tr>
              <th className="w-10">Cor</th>
              <th className="w-14">Ícone</th>
              <th>Nome</th>
              <th className="w-16 text-right">Uso</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={`${index}-${item.name}`}>
                <td>
                  <input type="color" value={toHex(item.color, defaultColor)} onChange={(e) => update(index, "color", e.target.value)} title="Cor" />
                </td>
                <td>
                  <input type="text" value={item.icon ?? ""} onChange={(e) => update(index, "icon", e.target.value)} className="input input-sm w-12 text-center" placeholder={defaultIcon} />
                </td>
                <td>
                  <input type="text" value={item.name} onChange={(e) => update(index, "name", e.target.value)} className="input input-sm" />
                </td>
                <td className="num text-right text-xs text-muted">{usage.get(item.name) || 0}</td>
                <td className="text-right">
                  <button type="button" onClick={() => setConfirmIndex(index)} className="btn-ghost btn-xs text-faint hover:text-neg" title="Remover">
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {!items.length && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-xs text-muted">Nenhum item.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <form onSubmit={add} className="mt-2 flex flex-wrap items-center gap-2">
        <input type="color" value={draft.color || defaultColor} onChange={(e) => setDraft((p) => ({ ...p, color: e.target.value }))} />
        <input type="text" value={draft.icon} onChange={(e) => setDraft((p) => ({ ...p, icon: e.target.value }))} className="input input-sm w-12 text-center" placeholder={defaultIcon} title="Emoji" />
        <input type="text" value={draft.name} onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))} className="input input-sm min-w-[160px] flex-1" placeholder={placeholder} />
        <button type="submit" className="btn-primary btn-sm">
          <PlusIcon className="h-4 w-4" /> Adicionar
        </button>
      </form>
      <ConfirmDialog
        open={confirmRecolor}
        onClose={() => setConfirmRecolor(false)}
        onConfirm={() => onChange(assignPaletteColors(items))}
        title="Recolorir todos os itens?"
        message="As cores atuais serão substituídas por uma paleta de 12 cores distintas (azul, verde, âmbar, vermelho, violeta...). Você pode ajustar cada cor depois."
        confirmLabel="Recolorir"
      />
      <ConfirmDialog
        open={confirmIndex !== null}
        onClose={() => setConfirmIndex(null)}
        onConfirm={() => onChange(items.filter((_, idx) => idx !== confirmIndex))}
        title={`Remover "${items[confirmIndex]?.name}"?`}
        message="Os lançamentos que usam este nome continuam existindo; apenas a cor e o ícone deixam de ser aplicados."
        confirmLabel="Remover"
        danger
      />
    </div>
  );
}

function toHex(color, fallback) {
  if (typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color)) return color;
  if (typeof color === "string" && /^#[0-9a-f]{3}$/i.test(color)) return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
  if (typeof color === "string" && color.startsWith("hsl")) {
    const m = /hsl\(\s*(\d+)[\s,]+(\d+)%[\s,]+(\d+)%/.exec(color);
    if (m) return hslToHex(Number(m[1]), Number(m[2]), Number(m[3]));
  }
  return fallback;
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to = (x) => Math.round(255 * x).toString(16).padStart(2, "0");
  return `#${to(f(0))}${to(f(8))}${to(f(4))}`;
}

function Field({ label, children, hint, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-0.5 block text-[0.68rem] text-faint">{hint}</span>}
    </label>
  );
}

export default function SettingsPage() {
  const [params, setParams] = useSearchParams();
  const section = SECTIONS.some((s) => s.key === params.get("secao")) ? params.get("secao") : "geral";
  const setSection = (key) => setParams({ secao: key });
  const { store, setStore, updateInvestments, updateExpenses, resetToDefaults } = useUnifiedStore();
  const { prefs, setPref } = usePrefs();
  const { toast, showToast } = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [newIgnored, setNewIgnored] = useState("");
  const [mappingKeyword, setMappingKeyword] = useState("");
  const fileRef = useRef(null);

  const inv = store.investimentos;
  const gas = store.gastos;

  const bankUsage = useMemo(() => countUsage(inv.entries.map((e) => e.bank)), [inv.entries]);
  const invSourceUsage = useMemo(() => countUsage(inv.entries.map((e) => e.source)), [inv.entries]);
  const categoryUsage = useMemo(() => countUsage(gas.expenses.flatMap((e) => e.categories || [])), [gas.expenses]);
  const expSourceUsage = useMemo(() => countUsage(gas.expenses.flatMap((e) => e.sources || [])), [gas.expenses]);

  const setPersonal = (section, field, value) =>
    section === "inv"
      ? updateInvestments((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, [field]: value } }))
      : updateExpenses((prev) => ({ ...prev, personalInfo: { ...prev.personalInfo, [field]: value } }));

  const mappingActions = useMemo(
    () => ({
      add: (keyword, cats, exactMatch) =>
        updateExpenses((prev) => ({
          ...prev,
          descriptionCategoryMappings: mergeDescriptionMappings(prev.descriptionCategoryMappings, [
            { keyword: normalizeMappingKeyword(keyword), categories: cats, exactMatch: Boolean(exactMatch) },
          ]),
        })),
      update: (originalKeyword, next) =>
        updateExpenses((prev) => ({
          ...prev,
          descriptionCategoryMappings: prev.descriptionCategoryMappings.map((m) =>
            m.keyword === originalKeyword ? { keyword: normalizeMappingKeyword(next.keyword), categories: next.categories.filter(Boolean), exactMatch: Boolean(next.exactMatch) } : m
          ),
        })),
      remove: (keyword) => updateExpenses((prev) => ({ ...prev, descriptionCategoryMappings: prev.descriptionCategoryMappings.filter((m) => m.keyword !== keyword) })),
    }),
    [updateExpenses]
  );

  function renameInEntries(field, oldName, newName) {
    updateInvestments((prev) => ({ ...prev, entries: prev.entries.map((e) => (e[field] === oldName ? { ...e, [field]: newName } : e)) }));
  }
  function renameInExpenses(field, oldName, newName) {
    updateExpenses((prev) => ({
      ...prev,
      expenses: prev.expenses.map((e) => ({ ...e, [field]: (e[field] || []).map((v) => (v === oldName ? newName : v)) })),
      ...(field === "categories"
        ? { descriptionCategoryMappings: prev.descriptionCategoryMappings.map((m) => ({ ...m, categories: m.categories.map((c) => (c === oldName ? newName : c)) })) }
        : {}),
    }));
  }

  function handleImport(analysis, mode) {
    const { store: next, report } = applyImport(store, analysis, mode);
    setStore(next);
    setImportOpen(false);
    showToast(mode === "replace" ? "Dados substituídos." : `Mesclado: +${report.entriesAdded} lançamentos, +${report.expensesAdded} transações.`, { tone: "success" });
  }

  const storageBytes = useMemo(() => {
    try {
      return new Blob([JSON.stringify(store)]).size;
    } catch {
      return 0;
    }
  }, [store]);

  return (
    <AppShell width="max-w-5xl">
      {toast}
      <PageHeader title="Configurações" description="Tudo é salvo automaticamente neste navegador." />
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-surface-3 p-1">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSection(s.key)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition ${section === s.key ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
            aria-pressed={section === s.key}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {section === "geral" && (
          <>
            <Section title="Perfil" description="Aparece nos relatórios e no arquivo exportado.">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Nome">
                  <input className="input" value={inv.personalInfo.fullName} onChange={(e) => { setPersonal("inv", "fullName", e.target.value); setPersonal("gas", "fullName", e.target.value); }} placeholder="Seu nome" />
                </Field>
                <Field label="E-mail">
                  <input className="input" type="email" value={inv.personalInfo.email} onChange={(e) => { setPersonal("inv", "email", e.target.value); setPersonal("gas", "email", e.target.value); }} placeholder="email@exemplo.com" />
                </Field>
                <Field label="Documento (CPF/CNPJ)">
                  <input className="input" value={inv.personalInfo.document} onChange={(e) => setPersonal("inv", "document", e.target.value)} />
                </Field>
                <Field label="Telefone">
                  <input className="input" value={inv.personalInfo.phone} onChange={(e) => setPersonal("inv", "phone", e.target.value)} />
                </Field>
              </div>
            </Section>
            <Section title="Preferências" description="Abas iniciais, moeda e meta de gastos.">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Select label="Aba inicial · Investimentos" value={inv.settings.defaultTab} options={INVEST_TABS} onChange={(e) => updateInvestments((p) => ({ ...p, settings: { ...p.settings, defaultTab: e.target.value } }))} />
                <Select label="Aba inicial · Gastos" value={gas.settings.defaultTab} options={EXPENSE_TABS} onChange={(e) => updateExpenses((p) => ({ ...p, settings: { ...p.settings, defaultTab: e.target.value } }))} />
                <Select label="Moeda" value={gas.settings.currency} options={CURRENCIES} onChange={(e) => updateExpenses((p) => ({ ...p, settings: { ...p.settings, currency: e.target.value } }))} />
                <Field label="Meta mensal de gastos" hint="Mostrada no dashboard e na página inicial">
                  <CurrencyInput tone={false} value={gas.settings.monthlyBudget} onChange={(v) => updateExpenses((p) => ({ ...p, settings: { ...p.settings, monthlyBudget: v } }))} />
                </Field>
                <Field label="Cotações de referência" hint="Usadas ao importar extratos em outra moeda sem conversão no arquivo" className="sm:col-span-2">
                  <div className="flex flex-wrap gap-2">
                    {["EUR", "USD", "GBP"].map((cur) => (
                      <label key={cur} className="flex items-center gap-1.5 text-xs text-muted">
                        <span className="font-semibold text-ink">1 {cur} =</span>
                        <input
                          type="number"
                          step="0.0001"
                          min="0"
                          className="input input-sm num w-24"
                          value={gas.settings.fxRates?.[cur] ?? ""}
                          placeholder="—"
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            updateExpenses((p) => {
                              const next = { ...(p.settings.fxRates || {}) };
                              if (v > 0) next[cur] = v;
                              else delete next[cur];
                              return { ...p, settings: { ...p.settings, fxRates: next } };
                            });
                          }}
                        />
                        <span>{gas.settings.currency}</span>
                      </label>
                    ))}
                  </div>
                </Field>
                <Field label="Pessoas na casa" className="sm:col-span-1">
                  <input type="number" min="1" className="input num" value={gas.personalInfo.householdSize} onChange={(e) => setPersonal("gas", "householdSize", Number(e.target.value) || 1)} />
                </Field>
                <Field label="Observações para relatórios" className="sm:col-span-2 lg:col-span-3">
                  <textarea rows={2} className="input" value={inv.settings.reportNotes} onChange={(e) => { const v = e.target.value; updateInvestments((p) => ({ ...p, settings: { ...p.settings, reportNotes: v } })); updateExpenses((p) => ({ ...p, settings: { ...p.settings, reportNotes: v } })); }} placeholder="Texto opcional incluído no PDF" />
                </Field>
              </div>
            </Section>
          </>
        )}

        {section === "aparencia" && (
          <>
            <Section title="Tema" description="O botão no topo da página alterna entre claro, escuro e automático.">
              <div className="grid gap-3 sm:grid-cols-3">
                {THEMES.map((t) => (
                  <button key={t.value} type="button" onClick={() => setPref("theme", t.value)} className={`rounded-xl border p-3 text-left text-sm ${prefs.theme === t.value ? "border-accent bg-accent/10" : "border-line hover:bg-surface-2"}`} aria-pressed={prefs.theme === t.value}>
                    <div className="font-semibold text-ink">{t.label}</div>
                    <div className="mt-2 flex gap-1">
                      {(t.value === "dark" ? ["#0e1a2b", "#17202f", "#60a5fa"] : t.value === "light" ? ["#f4f6fa", "#ffffff", "#2563eb"] : ["#f4f6fa", "#17202f", "#2563eb"]).map((c) => (
                        <span key={c} className="h-4 w-6 rounded border border-line" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <span className="label">Cor de destaque</span>
                <div className="flex flex-wrap gap-2">
                  {ACCENTS.map((a) => (
                    <button key={a.value} type="button" onClick={() => setPref("accent", a.value)} className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${prefs.accent === a.value ? "border-accent bg-accent/10 text-ink" : "border-line text-muted"}`} aria-pressed={prefs.accent === a.value}>
                      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: a.color }} />
                      {a.label}
                    </button>
                  ))}
                </div>
              </div>
            </Section>
            <Section title="Entrada de valores" description="Como os campos de dinheiro reagem ao que você digita.">
              <div className="grid gap-3 sm:grid-cols-2">
                {MONEY_MODES.map((m) => (
                  <button key={m.value} type="button" onClick={() => setPref("moneyMode", m.value)} className={`rounded-xl border p-3 text-left text-sm ${prefs.moneyMode === m.value ? "border-accent bg-accent/10" : "border-line hover:bg-surface-2"}`} aria-pressed={prefs.moneyMode === m.value}>
                    <div className="font-semibold text-ink">{m.label}</div>
                    <div className="text-xs text-muted">{m.description}</div>
                  </button>
                ))}
              </div>
              <div className="mt-3 max-w-xs">
                <span className="label">Experimente</span>
                <TryMoneyInput />
              </div>
            </Section>
            <Section title="Gráficos de investimentos" description="Padrões do dashboard (também ajustáveis na própria tela).">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Agrupar por" hint="Define as séries dos gráficos e a distribuição">
                  <div className="pill-toggle w-full">
                    <button type="button" className="flex-1" aria-pressed={prefs.investmentsGroupBy === "bank"} onClick={() => setPref("investmentsGroupBy", "bank")}>Banco</button>
                    <button type="button" className="flex-1" aria-pressed={prefs.investmentsGroupBy === "source"} onClick={() => setPref("investmentsGroupBy", "source")}>Fonte</button>
                  </div>
                </Field>
                <Field label="Total mensal" hint="'Último saldo' mantém o valor de bancos não atualizados no mês">
                  <div className="pill-toggle w-full">
                    <button type="button" className="flex-1" aria-pressed={prefs.investmentsAggregation === "carry"} onClick={() => setPref("investmentsAggregation", "carry")}>Último saldo</button>
                    <button type="button" className="flex-1" aria-pressed={prefs.investmentsAggregation === "month"} onClick={() => setPref("investmentsAggregation", "month")}>Só o mês</button>
                  </div>
                </Field>
              </div>
            </Section>
          </>
        )}

        {section === "investimentos" && (
          <>
            <Section title="Bancos e corretoras" description="Só os bancos desta lista aparecem no campo Banco dos lançamentos. Renomear atualiza todos os lançamentos.">
              <NamedLibraryEditor
                items={inv.banks}
                usage={bankUsage}
                onChange={(banks) => updateInvestments((p) => ({ ...p, banks }))}
                onRename={(oldName, newName) => renameInEntries("bank", oldName, newName)}
                placeholder="Novo banco ou corretora"
                defaultIcon="🏦"
                defaultColor="#2563EB"
              />
            </Section>
            <Section title="Fontes dos aportes" description="De onde vem o dinheiro investido (salário, empresa, pessoa...).">
              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <Field label="Modo" hint={inv.settings.sourceMode === "multiple" ? "Cada lançamento escolhe a sua fonte." : "Todo lançamento usa a fonte abaixo; o campo Fonte fica oculto."}>
                  <div className="pill-toggle w-full">
                    <button type="button" className="flex-1" aria-pressed={inv.settings.sourceMode !== "multiple"} onClick={() => updateInvestments((p) => ({ ...p, settings: { ...p.settings, sourceMode: "single" } }))}>
                      Fonte única
                    </button>
                    <button type="button" className="flex-1" aria-pressed={inv.settings.sourceMode === "multiple"} onClick={() => updateInvestments((p) => ({ ...p, settings: { ...p.settings, sourceMode: "multiple" } }))}>
                      Múltiplas fontes
                    </button>
                  </div>
                </Field>
                {inv.settings.sourceMode !== "multiple" && (
                  <Select
                    label="Fonte usada nos lançamentos"
                    value={inv.settings.defaultSource || inv.sources[0]?.name || ""}
                    options={inv.sources.map((src) => ({ value: src.name, label: `${src.icon ? src.icon + " " : ""}${src.name}` }))}
                    placeholder={inv.sources.length ? "" : "Cadastre uma fonte abaixo"}
                    onChange={(e) => updateInvestments((p) => ({ ...p, settings: { ...p.settings, defaultSource: e.target.value } }))}
                  />
                )}
              </div>
              <NamedLibraryEditor
                items={inv.sources}
                usage={invSourceUsage}
                onChange={(sources) => updateInvestments((p) => ({ ...p, sources }))}
                onRename={(oldName, newName) => {
                  renameInEntries("source", oldName, newName);
                  if (inv.settings.defaultSource === oldName) updateInvestments((p) => ({ ...p, settings: { ...p.settings, defaultSource: newName } }));
                }}
                placeholder="Nova fonte"
                defaultIcon="💼"
                defaultColor="#0EA5E9"
              />
            </Section>
          </>
        )}

        {section === "gastos" && (
          <>
            <div className="grid gap-4 lg:grid-cols-2">
              <Section title="Categorias" description="Renomear atualiza transações e mapeamentos.">
                <NamedLibraryEditor
                  items={gas.categories}
                  usage={categoryUsage}
                  onChange={(categories) => updateExpenses((p) => ({ ...p, categories }))}
                  onRename={(oldName, newName) => renameInExpenses("categories", oldName, newName)}
                  placeholder="Nova categoria"
                  defaultIcon="🏷️"
                  defaultColor="#6B7280"
                />
              </Section>
              <Section title="Fontes" description="Conta, cartão ou pessoa de onde sai o gasto.">
                <NamedLibraryEditor
                  items={gas.sources}
                  usage={expSourceUsage}
                  onChange={(sources) => updateExpenses((p) => ({ ...p, sources }))}
                  onRename={(oldName, newName) => renameInExpenses("sources", oldName, newName)}
                  placeholder="Nova fonte"
                  defaultIcon="💳"
                  defaultColor="#6366F1"
                />
              </Section>
            </div>
            <Section
              title={`Mapeamentos automáticos (${gas.descriptionCategoryMappings.length})`}
              description="Quando a descrição contém a palavra-chave, as categorias são aplicadas. Criados automaticamente ao categorizar."
              actions={
                gas.descriptionCategoryMappings.length > 0 && (
                  <button type="button" className="btn-danger btn-xs" onClick={() => { if (window.confirm("Remover todos os mapeamentos?")) updateExpenses((p) => ({ ...p, descriptionCategoryMappings: [] })); }}>
                    Limpar todos
                  </button>
                )
              }
            >
              <MappingList
                mappings={gas.descriptionCategoryMappings}
                categories={gas.categories}
                actions={mappingActions}
                compact
                onCreateCategory={(name) => updateExpenses((p) => ({ ...p, categories: ensureCategoryInLibrary(name, p.categories) }))}
              />
            </Section>
            <Section title={`Descrições ignoradas na importação (${gas.ignoredDescriptions.length})`} description="Linhas de extrato que contêm estes textos são descartadas ao importar (ex.: pagamento de fatura, transferências entre contas).">
              <div className="flex flex-wrap gap-1.5">
                {gas.ignoredDescriptions.map((k) => (
                  <span key={k} className="chip">
                    {k}
                    <button type="button" className="ml-1 text-faint hover:text-neg" onClick={() => updateExpenses((p) => ({ ...p, ignoredDescriptions: p.ignoredDescriptions.filter((x) => x !== k) }))} aria-label={`Remover ${k}`}>×</button>
                  </span>
                ))}
                {!gas.ignoredDescriptions.length && <span className="text-xs text-muted">Nenhuma.</span>}
              </div>
              <form
                className="mt-2 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const k = newIgnored.trim();
                  if (!k) return;
                  updateExpenses((p) => ({ ...p, ignoredDescriptions: p.ignoredDescriptions.includes(k) ? p.ignoredDescriptions : [...p.ignoredDescriptions, k] }));
                  setNewIgnored("");
                }}
              >
                <input className="input input-sm flex-1" value={newIgnored} onChange={(e) => setNewIgnored(e.target.value)} placeholder='Ex.: "Pagamento recebido"' />
                <button type="submit" className="btn-primary btn-sm">Adicionar</button>
              </form>
            </Section>
          </>
        )}

        {section === "dados" && (
          <>
            <Section title="Backup" description={`${inv.entries.length} lançamentos · ${gas.expenses.length} transações · ${(storageBytes / 1024).toFixed(0)} KB no navegador.`}>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-primary" onClick={() => { exportStoreJson(store); showToast("Backup exportado.", { tone: "success" }); }}>Exportar backup (JSON)</button>
                <button type="button" className="btn" onClick={() => setImportOpen(true)}>Importar backup</button>
                <button type="button" className="btn" onClick={() => exportEntriesCsv(inv.entries)}>Investimentos em CSV</button>
                <button type="button" className="btn" onClick={() => exportExpensesCsv(gas.expenses)}>Gastos em CSV</button>
              </div>
              <p className="mt-3 text-xs text-muted">
                Os dados vivem apenas neste navegador (localStorage). Limpar o histórico do navegador apaga tudo: exporte um backup com frequência.
                Criado em {fmtDate(inv.createdAt)} · meta mensal {fmtBRL(gas.settings.monthlyBudget)}.
              </p>
            </Section>
            <Section title="Zona de perigo" description="Ações irreversíveis.">
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn-danger" onClick={() => setConfirmReset(true)}>Apagar tudo e restaurar padrões</button>
              </div>
            </Section>
          </>
        )}
      </div>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onApply={handleImport} />
      <ConfirmDialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        onConfirm={async () => {
          try {
            await resetToDefaults();
            showToast("Dados apagados e padrões restaurados.", { tone: "success" });
          } catch {
            showToast("Não foi possível restaurar os padrões.", { tone: "error" });
          }
        }}
        title="Apagar todos os dados?"
        message="Investimentos, gastos, categorias e mapeamentos serão removidos e as configurações padrão carregadas. Exporte um backup antes."
        confirmLabel="Apagar tudo"
        danger
      />
    </AppShell>
  );
}

function TryMoneyInput() {
  const [value, setValue] = useState(1234.56);
  return (
    <div className="flex items-center gap-2">
      <CurrencyInput value={value} onChange={setValue} allowNegative className="flex-1" />
      <span className="num text-xs text-muted">= {fmtBRL(value)}</span>
    </div>
  );
}

function countUsage(list) {
  const map = new Map();
  for (const item of list) if (item) map.set(item, (map.get(item) || 0) + 1);
  return map;
}
