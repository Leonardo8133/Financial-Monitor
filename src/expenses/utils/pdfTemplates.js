// Simple PDF text-based template detectors and parsers for expenses
// Works on raw text extracted via pdfjs (concatenated by spaces/newlines)

function normalize(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

// Template: Nubank fatura (cartão) - lines with "Resumo da fatura", items like "DD/MM Descrição R$ -123,45"
const nubankCard = {
  id: "nubank_card",
  displayName: "Nubank - Cartão (Fatura)",
  detect: (text) => /nubank/i.test(text) && /resumo da fatura/i.test(text),
  parse: (text) => {
    const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const items = [];
    const lineRe = /(\d{2})\/(\d{2})\s+(.+?)\s+R\$\s*([-+]?\d+[\.,]\d{2})/i;
    const year = new Date().getFullYear();
    for (const line of lines) {
      const m = lineRe.exec(line);
      if (!m) continue;
      const [_, d, mth, desc, val] = m;
      const value = -Number(val.replace(/\./g, "").replace(/,/g, "."));
      items.push({ date: `${year}-${mth}-${d}`, description: desc, category: "", source: "Cartão Nubank", value });
    }
    return items;
  },
};

// Template: Itaú extrato (conta) - contains "Banco Itaú" and lines "DD/MM DESCRICAO -123,45"
const itauChecking = {
  id: "itau_checking",
  displayName: "Itaú - Conta Corrente (Extrato)",
  detect: (text) => /banco ita[uú]/i.test(text) && /extrato/i.test(text),
  parse: (text) => {
    const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const items = [];
    const lineRe = /(\d{2})\/(\d{2})\s+(.+?)\s+([-+]?\d+[\.,]\d{2})/i;
    const year = new Date().getFullYear();
    for (const line of lines) {
      const m = lineRe.exec(line);
      if (!m) continue;
      const [_, d, mth, desc, val] = m;
      const value = Number(val.replace(/\./g, "").replace(/,/g, "."));
      items.push({ date: `${year}-${mth}-${d}`, description: desc, category: "", source: "Conta Itaú", value });
    }
    return items;
  },
};

// Template: Fatura Vivo/Claro/Operadora (serviços) - contains "FATURA" and totals, with lines "DD/MM SERVICO R$ 123,45"
const telecomInvoice = {
  id: "telecom_invoice",
  displayName: "Operadora - Fatura de Serviços",
  detect: (text) => /fatura/i.test(text) && /(vivo|claro|oi|tim)/i.test(text),
  parse: (text) => {
    const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const items = [];
    const lineRe = /(\d{2})\/(\d{2})\s+(.+?)\s+R\$\s*([-+]?\d+[\.,]\d{2})/i;
    const year = new Date().getFullYear();
    for (const line of lines) {
      const m = lineRe.exec(line);
      if (!m) continue;
      const [_, d, mth, desc, val] = m;
      const value = -Number(val.replace(/\./g, "").replace(/,/g, "."));
      items.push({ date: `${year}-${mth}-${d}`, description: desc, category: "Serviços", source: "Operadora", value });
    }
    return items;
  },
};

export const EXPENSE_PDF_TEMPLATES = [nubankCard, itauChecking, telecomInvoice];

export function detectExpenseTemplate(text) {
  const normalized = normalize(text);
  return EXPENSE_PDF_TEMPLATES.find((t) => {
    try { return t.detect(normalized); } catch { return false; }
  }) || null;
}

export function parseExpensePdfWithTemplates(text) {
  const tpl = detectExpenseTemplate(text);
  if (!tpl) return null;
  try { return { templateId: tpl.id, items: tpl.parse(text) }; } catch { return null; }
}


