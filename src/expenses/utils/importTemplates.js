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

function parseNubankValue(value) {
  if (value === "" || value === null || value === undefined) return 0;
  
  // Para valores do Nubank, tratar ponto como decimal
  const str = String(value).trim();
  const numeric = Number(str);
  
  return Number.isFinite(numeric) ? numeric : 0;
}

class ImportTemplate {
  constructor(config) {
    this.id = config.id;
    this.displayName = config.displayName;
    this.headerRowIndex = config.headerRowIndex || 0;
    this.skipEmptyRows = config.skipEmptyRows !== false;
    this.requiredFields = config.requiredFields || [];
    this.match = config.match;
    this.mapRow = config.mapRow;
    this.validateRow = config.validateRow || (() => true);
  }

  detect({ headers, fileName, rawRows = [] }) {
    try {
      if (this.match({ headers, fileName, rawRows })) {
        return {
          template: this,
          headerRowIndex: this.headerRowIndex,
          items: this.processRows(rawRows.slice(this.headerRowIndex + 1))
        };
      }
    } catch (error) {
      console.warn("Failed to evaluate template", this.id, error);
    }
    return null;
  }

  processRows(rows) {
    if (!Array.isArray(rows)) return [];
    
    return rows
      .map((row, index) => {
        try {
          const mapped = this.mapRow(row, index);
          return this.validateRow(mapped, row, index) ? mapped : null;
        } catch (error) {
          console.warn(`Failed to map row ${index}`, error);
          return null;
        }
      })
      .filter((item) => {
        if (!item) return false;
        if (this.skipEmptyRows) {
          return item.date || item.description || Math.abs(item.value || 0) > 0;
        }
        return true;
      });
  }
}

const csvTemplates = [
  new ImportTemplate({
    id: "nubank_basic_csv",
    displayName: "Nubank Cartão de Crédito- Extrato CSV (date,title,amount)",
    headerRowIndex: 0,
    requiredFields: ["date", "title", "amount"],
    match: ({ headers, fileName }) => {
      const normalized = normalizeHeaders(headers);
      const joined = normalized.join(",");
      return (
        joined === "date,title,amount" ||
        (/nubank/i.test(fileName || "") && normalized.includes("amount") && normalized.includes("title"))
      );
    },
    mapRow: (row) => {
      // Função para parsear valores do Nubank CSV (usa ponto como decimal)
      const parseNubankCSVValue = (value) => {
        if (value === "" || value === null || value === undefined) return 0;
        const str = String(value).trim();
        const numeric = Number(str);
        return Number.isFinite(numeric) ? -Math.abs(numeric) : 0; // Sempre negativo (despesas)
      };
      
      // row pode ser um array [date, title, amount] ou um objeto {date, title, amount}
      const date = Array.isArray(row) ? row[0] : (row.date || row.Date || "");
      const title = Array.isArray(row) ? row[1] : (row.title || row.Title || "");
      const amount = Array.isArray(row) ? row[2] : (row.amount ?? row.Amount);
      
      return {
        date: date || "",
        description: title || "",
        value: parseNubankCSVValue(amount),
        categories: [],
        sources: ["Cartão de Crédito Nubank"],
      };
    },
    validateRow: (mapped) => {
      return mapped.date && mapped.description && Math.abs(mapped.value || 0) > 0;
    }
  }),
  
  new ImportTemplate({
    id: "nubank_statement_detailed",
    displayName: "Nubank - Extrato Detalhado",
    headerRowIndex: 0,
    requiredFields: ["data", "valor", "descrição"],
    match: ({ headers, fileName }) => {
      const normalized = normalizeHeaders(headers);
      return (
        normalized.includes("data") &&
        normalized.includes("valor") &&
        normalized.includes("descrição") &&
        /nu_\d+/i.test(fileName || "")
      );
    },
    mapRow: (row) => {
      const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (match) {
          const [, day, month, year] = match;
          return `${year}-${month}-${day}`;
        }
        return dateStr;
      };

      // Tentar diferentes formas de acessar as colunas
      const date = row.Data || row.data || row[0] || "";
      const value = row.Valor || row.valor || row[1] || 0;
      const description = row["Descrição"] || row.descrição || row.Descricao || row.descricao || row[3] || "";

      return {
        date: formatDate(date),
        description: description,
        value: parseNubankValue(value),
        categories: [],
        sources: ["Conta Nubank"],
      };
    },
    validateRow: (mapped) => {
      return mapped.date && mapped.description && Math.abs(mapped.value || 0) > 0;
    }
  }),
  
  new ImportTemplate({
    id: "inter_bank_statement",
    displayName: "Inter - Extrato Conta Corrente",
    headerRowIndex: 4, // Linha 5 (índice 4) contém os headers
    requiredFields: ["data lançamento", "descrição", "valor"],
    match: ({ headers, fileName, rawRows }) => {
      const normalized = normalizeHeaders(headers);
      const expected = ["data lançamento", "histórico", "descrição", "valor", "saldo"];
      const hasExpectedHeaders = expected.every((key) => normalized.includes(key));
      const hasFileNamePattern = /extrato-\d{2}-\d{2}-\d{4}/i.test(fileName || "");
      
      // Verifica se a linha 5 tem os headers esperados
      if (rawRows && rawRows.length > 4) {
        const headerRow = rawRows[4];
        const headerRowNormalized = normalizeHeaders(headerRow);
        const hasHeaderRow = expected.every((key) => headerRowNormalized.includes(key));
        return hasExpectedHeaders || hasFileNamePattern || hasHeaderRow;
      }
      
      // Fallback: detecta pelo padrão do nome do arquivo
      return hasFileNamePattern || /inter/i.test(fileName || "");
    },
    mapRow: (row) => {
      // Converte data DD/MM/YYYY para YYYY-MM-DD
      const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (match) {
          const [, day, month, year] = match;
          return `${year}-${month}-${day}`;
        }
        return dateStr;
      };

      return {
        date: formatDate(row["data lançamento"] || row[0] || ""),
        description: row["descrição"] || row[2] || "",
        value: parseValue(row["valor"] ?? row[3], {}),
        categories: [],
        sources: ["Conta Inter"],
      };
    },
    validateRow: (mapped) => {
      return mapped.date && mapped.description && Math.abs(mapped.value || 0) > 0;
    }
  }),

  new ImportTemplate({
    id: "inter_credit_card",
    displayName: "Inter - Cartão de Crédito",
    headerRowIndex: 0,
    requiredFields: ["data", "lançamento", "categoria", "tipo", "valor"],
    match: ({ headers, fileName }) => {
      const normalized = normalizeHeaders(headers);
      const expected = ["data", "lançamento", "categoria", "tipo", "valor"];
      const hasExpectedHeaders = expected.every((key) => normalized.includes(key));
      const hasFileNamePattern = /cartao.*inter/i.test(fileName || "");
      
      return hasExpectedHeaders || hasFileNamePattern || /inter.*cartao/i.test(fileName || "");
    },
    mapRow: (row) => {
      // Converte data DD/MM/YYYY para YYYY-MM-DD
      const formatDate = (dateStr) => {
        if (!dateStr) return "";
        const match = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (match) {
          const [, day, month, year] = match;
          return `${year}-${month}-${day}`;
        }
        return dateStr;
      };

      // Parse do valor - sempre negativo para cartão de crédito
      const parseCreditCardValue = (value) => {
        const numeric = toNumber(value);
        return numeric > 0 ? -numeric : numeric; // Garante que seja negativo
      };

      return {
        date: formatDate(row["data"] || row.Data || row[0] || ""),
        description: row["lançamento"] || row.Lançamento || row[1] || "",
        value: parseCreditCardValue(row["valor"] ?? row.Valor ?? row[4] ?? 0),
        sources: ["Cartão de Crédito Inter"],
      };
    },
    validateRow: (mapped) => {
      return mapped.date && mapped.description && Math.abs(mapped.value || 0) > 0;
    }
  }),
];

export function detectCsvImportTemplate({ fileName = "", headers = [], rows = [], rawRows = [] }) {
  for (const template of csvTemplates) {
    const result = template.detect({ headers, fileName, rawRows });
    if (result) {
      return result;
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
