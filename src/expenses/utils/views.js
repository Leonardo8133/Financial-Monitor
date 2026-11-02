import { shiftMonth, todayISO } from "../../utils/formatters.js";

/** Period kinds resolved at render time, so a view stays current. */
export const PERIOD_KINDS = [
  { value: "all", label: "Todo o período" },
  { value: "thisMonth", label: "Mês atual" },
  { value: "lastMonth", label: "Mês anterior" },
  { value: "last3", label: "Últimos 3 meses" },
  { value: "last6", label: "Últimos 6 meses" },
  { value: "last12", label: "Últimos 12 meses" },
  { value: "thisYear", label: "Este ano" },
  { value: "custom", label: "Datas fixas" },
];

export const EMPTY_FILTERS = {
  q: "",
  type: "all",
  categories: [],
  source: "",
  excludeInvest: false,
  period: { kind: "all", from: "", to: "" },
  hiddenIds: [],
  hiddenDescriptions: [],
};

export function resolvePeriod(period) {
  const now = todayISO().slice(0, 7);
  const kind = period?.kind || "all";
  switch (kind) {
    case "thisMonth":
      return { fromYm: now, toYm: now };
    case "lastMonth": {
      const prev = shiftMonth(now, -1);
      return { fromYm: prev, toYm: prev };
    }
    case "last3":
      return { fromYm: shiftMonth(now, -2), toYm: now };
    case "last6":
      return { fromYm: shiftMonth(now, -5), toYm: now };
    case "last12":
      return { fromYm: shiftMonth(now, -11), toYm: now };
    case "thisYear":
      return { fromYm: `${now.slice(0, 4)}-01`, toYm: now };
    case "custom":
      return { fromYm: period?.from || "", toYm: period?.to || "" };
    default:
      return { fromYm: "", toYm: "" };
  }
}

export function normalizeViewFilters(filters = {}) {
  const f = filters && typeof filters === "object" ? filters : {};
  const period = f.period && typeof f.period === "object" ? f.period : {};
  return {
    q: typeof f.q === "string" ? f.q : "",
    type: ["all", "expense", "income"].includes(f.type) ? f.type : "all",
    categories: Array.isArray(f.categories) ? f.categories.filter((c) => typeof c === "string" && c) : [],
    source: typeof f.source === "string" ? f.source : "",
    excludeInvest: Boolean(f.excludeInvest),
    period: {
      kind: PERIOD_KINDS.some((k) => k.value === period.kind) ? period.kind : "all",
      from: typeof period.from === "string" ? period.from : "",
      to: typeof period.to === "string" ? period.to : "",
    },
    hiddenIds: Array.isArray(f.hiddenIds) ? Array.from(new Set(f.hiddenIds.filter((v) => typeof v === "string" && v))) : [],
    hiddenDescriptions: Array.isArray(f.hiddenDescriptions)
      ? Array.from(new Set(f.hiddenDescriptions.filter((v) => typeof v === "string" && v.trim()).map((v) => v.trim())))
      : [],
  };
}

export function describeFilters(filters, { sourceLabel } = {}) {
  const parts = [];
  const f = normalizeViewFilters(filters);
  if (f.type === "expense") parts.push("despesas");
  if (f.type === "income") parts.push("receitas");
  if (f.categories.length) parts.push(f.categories.join(", "));
  if (f.source) parts.push(sourceLabel ? sourceLabel(f.source) : f.source);
  if (f.excludeInvest) parts.push("sem investimentos");
  if (f.q) parts.push(`"${f.q}"`);
  const period = PERIOD_KINDS.find((k) => k.value === f.period.kind);
  if (f.period.kind === "custom") parts.push(`${f.period.from || "…"} → ${f.period.to || "…"}`);
  else if (period && period.value !== "all") parts.push(period.label.toLowerCase());
  const hidden = f.hiddenIds.length + f.hiddenDescriptions.length;
  if (hidden) parts.push(`${hidden} oculta(s)`);
  return parts.length ? parts.join(" · ") : "sem filtros";
}

/** Presets that always exist. Category-based ones only appear when the category exists. */
export function builtinViews(categories = []) {
  const names = categories.map((c) => (typeof c === "string" ? c : c?.name)).filter(Boolean);
  const has = (re) => names.filter((n) => re.test(n));
  const views = [
    { id: "builtin:month", name: "Despesas do mês", icon: "📅", filters: { type: "expense", excludeInvest: true, period: { kind: "thisMonth" } } },
    { id: "builtin:lastMonth", name: "Mês anterior", icon: "⏮️", filters: { type: "expense", excludeInvest: true, period: { kind: "lastMonth" } } },
    { id: "builtin:last3", name: "Últimos 3 meses", icon: "🗓️", filters: { excludeInvest: true, period: { kind: "last3" } } },
    { id: "builtin:income", name: "Receitas", icon: "💰", filters: { type: "income", period: { kind: "last12" } } },
  ];
  const food = has(/aliment|mercado|restaurante/i);
  if (food.length) views.push({ id: "builtin:food", name: "Alimentação e mercado", icon: "🍔", filters: { type: "expense", categories: food, period: { kind: "last6" } } });
  const invest = has(/investimento/i);
  if (invest.length) views.push({ id: "builtin:invest", name: "Investimentos", icon: "📈", filters: { categories: invest, period: { kind: "last12" } } });
  const uncategorized = { id: "builtin:uncat", name: "Sem categoria", icon: "❓", filters: { q: "", type: "expense", period: { kind: "last12" } }, special: "uncategorized" };
  views.push(uncategorized);
  return views.map((v) => ({ ...v, builtin: true, filters: normalizeViewFilters(v.filters) }));
}

export function normalizeViews(value) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v) => v && typeof v === "object" && typeof v.name === "string" && v.name.trim())
    .map((v) => ({
      id: typeof v.id === "string" && v.id ? v.id : `view-${Math.random().toString(36).slice(2, 10)}`,
      name: v.name.trim(),
      icon: typeof v.icon === "string" ? v.icon : "",
      filters: normalizeViewFilters(v.filters),
    }));
}
