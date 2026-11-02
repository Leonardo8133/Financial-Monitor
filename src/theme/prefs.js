// UI preferences live outside the data store so they survive data resets/imports.
export const PREFS_KEY = "fm-ui-prefs";

export const THEMES = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: "system", label: "Automático (sistema)" },
];

export const ACCENTS = [
  { value: "blue", label: "Azul", color: "#2563eb" },
  { value: "emerald", label: "Esmeralda", color: "#059669" },
  { value: "violet", label: "Violeta", color: "#7c3aed" },
  { value: "amber", label: "Âmbar", color: "#d97706" },
  { value: "rose", label: "Rosa", color: "#e11d48" },
];

export const MONEY_MODES = [
  { value: "free", label: "Livre (digite 1.234,56)", description: "Aceita ponto ou vírgula; formata ao sair do campo." },
  { value: "cents", label: "Centavos (estilo caixa eletrônico)", description: "Digite só números: 123456 vira 1.234,56." },
];

export const DENSITIES = [
  { value: "comfortable", label: "Confortável" },
  { value: "compact", label: "Compacto" },
];

export const DEFAULT_PREFS = {
  theme: "system",
  accent: "blue",
  moneyMode: "free",
  density: "comfortable",
  investmentsAggregation: "carry", // "carry" | "month"
  investmentsGroupBy: "bank", // "bank" | "source"
};

export function readPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return { ...DEFAULT_PREFS, ...(parsed && typeof parsed === "object" ? parsed : {}) };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function writePrefs(prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore
  }
}

export function resolveTheme(theme) {
  if (theme === "system") {
    if (typeof window !== "undefined" && window.matchMedia) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    return "light";
  }
  return theme === "dark" ? "dark" : "light";
}

export function applyPrefsToDocument(prefs) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", resolveTheme(prefs.theme));
  root.setAttribute("data-accent", prefs.accent || "blue");
  root.setAttribute("data-density", prefs.density || "comfortable");
}
