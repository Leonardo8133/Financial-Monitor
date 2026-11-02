import Papa from "papaparse";
import { download, timestampForFile, normalizeDateInput } from "./formatters.js";
import {
  isUnifiedStorageCandidate,
  normalizeExpense,
  normalizeInvestmentEntry,
  normalizeUnifiedStorage,
} from "./unifiedStorage.js";
import { mergeDescriptionMappings } from "../expenses/config/descriptionMappings.js";

export const EXPORT_VERSION = 3;

export function buildExportPayload(store) {
  return {
    version: EXPORT_VERSION,
    type: "unified",
    app: "financial-monitor",
    exported_at: new Date().toISOString(),
    data: normalizeUnifiedStorage(store),
  };
}

export function exportStoreJson(store) {
  const payload = buildExportPayload(store);
  download(`financial-monitor_${timestampForFile()}.json`, JSON.stringify(payload, null, 2));
  return payload;
}

export function exportExpensesCsv(expenses = []) {
  const rows = expenses.map((e) => ({
    data: e.date,
    descricao: e.description,
    categorias: (e.categories || []).join("; "),
    fontes: (e.sources || []).join("; "),
    valor: Number(e.value || 0).toFixed(2).replace(".", ","),
    tipo: Number(e.value || 0) < 0 ? "despesa" : "receita",
  }));
  const csv = Papa.unparse(rows, { delimiter: ";" });
  download(`gastos_${timestampForFile()}.csv`, "﻿" + csv, "text/csv;charset=utf-8");
}

export function exportEntriesCsv(entries = []) {
  const rows = entries.map((e) => ({
    data: e.date,
    banco: e.bank,
    fonte: e.source,
    investido: Number(e.invested || 0).toFixed(2).replace(".", ","),
    em_conta: Number(e.inAccount || 0).toFixed(2).replace(".", ","),
    fluxo: Number(e.cashFlow || 0).toFixed(2).replace(".", ","),
  }));
  const csv = Papa.unparse(rows, { delimiter: ";" });
  download(`investimentos_${timestampForFile()}.csv`, "﻿" + csv, "text/csv;charset=utf-8");
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(String(event.target?.result ?? ""));
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsText(file);
  });
}

function isRecord(v) {
  return Boolean(v) && typeof v === "object" && !Array.isArray(v);
}

function looksLikeEntry(item) {
  return isRecord(item) && ("bank" in item || "invested" in item || "inAccount" in item);
}

function looksLikeExpense(item) {
  return isRecord(item) && ("description" in item || "value" in item);
}

/**
 * Detects what a JSON file contains. Supported:
 *  - v3 wrapper { type: "unified", data: {...} }
 *  - raw unified store { investimentos, gastos }
 *  - legacy investments { inputs: [{ entries }] } | { entries } | [entry]
 *  - legacy expenses { inputs: [{ expenses }] } | { expenses } | [expense]
 */
export function analyzeImport(data) {
  if (isRecord(data) && data.type === "unified" && isRecord(data.data)) {
    return analyzeImport(data.data);
  }

  if (isUnifiedStorageCandidate(data)) {
    const normalized = normalizeUnifiedStorage(data);
    return {
      kind: "unified",
      label: "Backup completo (investimentos + gastos)",
      partial: { investimentos: normalized.investimentos, gastos: normalized.gastos },
      summary: summarize(normalized.investimentos, normalized.gastos),
    };
  }

  let entries = null;
  let expenses = null;
  let meta = {};

  if (Array.isArray(data)) {
    if (data.some(looksLikeEntry)) entries = data;
    else if (data.some(looksLikeExpense)) expenses = data;
  } else if (isRecord(data)) {
    meta = data;
    if (Array.isArray(data.inputs)) {
      const inEntries = data.inputs.flatMap((s) => (Array.isArray(s?.entries) ? s.entries : []));
      const inExpenses = data.inputs.flatMap((s) => (Array.isArray(s?.expenses) ? s.expenses : []));
      if (inEntries.length) entries = inEntries;
      if (inExpenses.length) expenses = inExpenses;
    }
    if (!entries && Array.isArray(data.entries)) entries = data.entries;
    if (!expenses && Array.isArray(data.expenses)) expenses = data.expenses;
  }

  if (entries) {
    const investimentos = normalizeUnifiedStorage({
      investimentos: {
        entries,
        banks: meta.banks,
        sources: meta.sources,
        personalInfo: meta.personal_info || meta.personalInfo,
        settings: meta.settings,
        createdAt: meta.created_at || meta.createdAt,
      },
    }).investimentos;
    return {
      kind: "investments",
      label: "Lançamentos de investimentos",
      partial: { investimentos },
      summary: summarize(investimentos, null),
    };
  }

  if (expenses) {
    const gastos = normalizeUnifiedStorage({
      gastos: {
        expenses: expenses.map((e) => ({ ...e, date: normalizeDateInput(e?.date) || e?.date })),
        categories: meta.categories,
        sources: meta.sources,
        personalInfo: meta.personal_info || meta.personalInfo,
        settings: meta.settings,
        descriptionCategoryMappings: meta.descriptionCategoryMappings,
        ignoredDescriptions: meta.ignoredDescriptions,
        createdAt: meta.created_at || meta.createdAt,
      },
    }).gastos;
    return {
      kind: "expenses",
      label: "Transações de gastos",
      partial: { gastos },
      summary: summarize(null, gastos),
    };
  }

  return { kind: "invalid", label: "Formato não reconhecido", partial: {}, summary: {} };
}

function summarize(inv, gas) {
  return {
    entries: inv ? inv.entries.length : 0,
    banks: inv ? inv.banks.length : 0,
    investmentSources: inv ? inv.sources.length : 0,
    expenses: gas ? gas.expenses.length : 0,
    categories: gas ? gas.categories.length : 0,
    expenseSources: gas ? gas.sources.length : 0,
    mappings: gas ? gas.descriptionCategoryMappings.length : 0,
    ignored: gas ? gas.ignoredDescriptions.length : 0,
  };
}

function mergeNamed(base = [], incoming = []) {
  const map = new Map(base.map((item) => [item.name.toLowerCase(), item]));
  for (const item of incoming) {
    const key = item.name.toLowerCase();
    if (!map.has(key)) map.set(key, item);
    else map.set(key, { ...map.get(key), ...stripEmpty(item) });
  }
  return Array.from(map.values());
}

function stripEmpty(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== "" && v !== null && v !== undefined));
}

function entryKey(e) {
  return `${(e.bank || "").toLowerCase()}|${e.date}`;
}

function expenseKey(e) {
  return `${e.date}|${(e.description || "").toLowerCase().trim()}|${Number(e.value || 0).toFixed(2)}`;
}

function mergeById(base, incoming, keyFn) {
  const ids = new Set(base.map((i) => i.id));
  const keys = new Set(base.map(keyFn));
  const added = [];
  for (const item of incoming) {
    if (ids.has(item.id) || keys.has(keyFn(item))) continue;
    ids.add(item.id);
    keys.add(keyFn(item));
    added.push(item);
  }
  return { list: [...base, ...added], added: added.length };
}

/**
 * Applies an analyzed import to the current store.
 * mode = "replace": replaces the affected sections; "merge": adds only new records.
 */
export function applyImport(store, analysis, mode = "merge") {
  const current = normalizeUnifiedStorage(store);
  const result = { ...current };
  const report = { entriesAdded: 0, expensesAdded: 0 };

  if (analysis.partial.investimentos) {
    const inc = analysis.partial.investimentos;
    if (mode === "replace") {
      result.investimentos = { ...current.investimentos, ...inc };
    } else {
      const merged = mergeById(current.investimentos.entries, inc.entries.map(normalizeInvestmentEntry), entryKey);
      report.entriesAdded = merged.added;
      result.investimentos = {
        ...current.investimentos,
        entries: merged.list,
        banks: mergeNamed(current.investimentos.banks, inc.banks),
        sources: mergeNamed(current.investimentos.sources, inc.sources),
        personalInfo: { ...current.investimentos.personalInfo, ...stripEmpty(inc.personalInfo) },
      };
    }
  }

  if (analysis.partial.gastos) {
    const inc = analysis.partial.gastos;
    if (mode === "replace") {
      result.gastos = { ...current.gastos, ...inc };
    } else {
      const merged = mergeById(current.gastos.expenses, inc.expenses.map(normalizeExpense), expenseKey);
      report.expensesAdded = merged.added;
      result.gastos = {
        ...current.gastos,
        expenses: merged.list,
        categories: mergeNamed(current.gastos.categories, inc.categories),
        sources: mergeNamed(current.gastos.sources, inc.sources),
        descriptionCategoryMappings: mergeDescriptionMappings(
          current.gastos.descriptionCategoryMappings,
          inc.descriptionCategoryMappings
        ),
        ignoredDescriptions: Array.from(new Set([...current.gastos.ignoredDescriptions, ...inc.ignoredDescriptions])),
        views: mergeNamed(current.gastos.views || [], inc.views || []),
        personalInfo: { ...current.gastos.personalInfo, ...stripEmpty(inc.personalInfo) },
      };
    }
  }

  return { store: normalizeUnifiedStorage(result), report };
}

export async function analyzeImportFile(file) {
  const text = await readFileAsText(file);
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("O arquivo não é um JSON válido.");
  }
  const analysis = analyzeImport(data);
  if (analysis.kind === "invalid") {
    throw new Error("Formato não reconhecido. Use um arquivo exportado pelo Monitor Financeiro ou o template.");
  }
  return analysis;
}

export function buildInvestmentsTemplate() {
  return {
    version: 2,
    created_at: new Date().toISOString(),
    banks: [{ name: "Banco Exemplo", color: "#2563EB", icon: "🏦" }],
    sources: [{ name: "Salário", color: "#0EA5E9", icon: "💼" }],
    inputs: [
      {
        entries: [
          { bank: "Banco Exemplo", source: "Salário", date: "2025-01-15", inAccount: 0, invested: 1000, cashFlow: 1000 },
        ],
      },
    ],
  };
}

export function buildExpensesTemplate() {
  return {
    version: 2,
    created_at: new Date().toISOString(),
    categories: [{ name: "Alimentação", color: "#10B981", icon: "🍔" }],
    sources: [{ name: "Pessoal", color: "#0EA5E9", icon: "👤" }],
    inputs: [
      {
        expenses: [
          { date: "2025-01-31", description: "Supermercado", category: "Alimentação", source: "Pessoal", value: -123.45 },
          { date: "2025-01-05", description: "Salário", category: "Receita", source: "Pessoal", value: 5000 },
        ],
      },
    ],
  };
}
