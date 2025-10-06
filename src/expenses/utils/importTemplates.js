import { toNumber } from "../../utils/formatters.js";

function normalizeHeaders(headers = []) {
  return headers.map((header) => String(header || "").trim().toLowerCase());
}

function parseValue(value, { invert = false } = {}) {
  const numeric = toNumber(value);
  if (invert) {
    return numeric > 0 ? -numeric : numeric;
  }
  return numeric;
}

const csvTemplates = [
  {
    id: "nubank_basic_csv",
    displayName: "Nubank - Extrato CSV (date,title,amount)",
    match: ({ headers, fileName }) => {
      const normalized = normalizeHeaders(headers);
      const joined = normalized.join(",");
      return (
        joined === "date,title,amount" ||
        (/nubank/i.test(fileName || "") && normalized.includes("amount") && normalized.includes("title"))
      );
    },
    mapRow: (row) => ({
      date: row.date || row.Date || "",
      description: row.title || row.Title || "",
      value: parseValue(row.amount ?? row.Amount, { invert: true }),
      categories: [],
      sources: ["Cartão Nubank"],
    }),
  },
  {
    id: "nubank_statement_detailed",
    displayName: "Nubank - Extrato Detalhado",
    match: ({ headers, fileName }) => {
      const normalized = normalizeHeaders(headers);
      return (
        normalized.includes("data") &&
        normalized.includes("valor") &&
        normalized.includes("descrição") &&
        /nu_\d+/i.test(fileName || "")
      );
    },
    mapRow: (row) => ({
      date: row.Data || row.data || "",
      description: row["Descrição"] || row.descrição || row.Descricao || row.descricao || "",
      value: parseValue(row.Valor ?? row.valor ?? 0, {}),
      categories: [],
      sources: ["Conta Nubank"],
    }),
  },
  {
    id: "inter_bank_statement",
    displayName: "Inter - Extrato Conta Corrente",
    match: ({ headers, fileName }) => {
      const normalized = normalizeHeaders(headers);
      const expected = ["data lançamento", "histórico", "descrição", "valor", "saldo"];
      return expected.every((key) => normalized.includes(key)) || /extrato-\d{2}-\d{2}-\d{4}/i.test(fileName || "");
    },
    mapRow: (row) => ({
      date: row["Data Lançamento"] || row["Data"] || "",
      description: row.Descrição || row["Descrição"] || row.Histórico || row["Histórico"] || "",
      value: parseValue(row.Valor ?? row["Valor"], {}),
      categories: [],
      sources: ["Conta Corrente"],
    }),
  },
];

export function detectCsvImportTemplate({ fileName = "", headers = [], rows = [] }) {
  for (const template of csvTemplates) {
    try {
      if (template.match({ headers, fileName })) {
        const items = rows.map((row) => template.mapRow(row));
        return { template, items };
      }
    } catch (error) {
      console.warn("Failed to evaluate template", template.id, error);
    }
  }
  return null;
}

export function normalizeImportedItems(items = []) {
  return items.map((item) => {
    const categories = Array.isArray(item.categories)
      ? item.categories.filter(Boolean)
      : item.category
      ? [item.category]
      : [];
    const sources = Array.isArray(item.sources)
      ? item.sources.filter(Boolean)
      : item.source
      ? [item.source]
      : [];
    return {
      date: item.date || "",
      description: item.description || "",
      value: parseValue(item.value ?? 0, {}),
      categories,
      sources,
    };
  });
}
