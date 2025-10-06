import React from "react";
import { fmtBRL } from "./formatters.js";
import { createRoot } from "react-dom/client";
import ReportView from "../components/ReportView.jsx";
import ExpensesReportView from "../components/ExpensesReportView.jsx";

const LINE_HEIGHT = 16;
const TOP_MARGIN = 800;
const MAX_ENTRY_LINES = 25;

export function createPdfReport({
  personalInfo = {},
  totals = {},
  sources = [],
  entries = [],
  exportedAt = new Date(),
  notes = "",
}) {
  const lines = [];
  const dateLabel = new Date(exportedAt).toLocaleString("pt-BR");

  lines.push("Relatório de Investimentos");
  lines.push(`Gerado em ${dateLabel}`);
  lines.push("");

  const personalEntries = Object.entries(personalInfo || {}).filter(([, value]) => value);
  if (personalEntries.length) {
    lines.push("Informações pessoais:");
    personalEntries.forEach(([key, value]) => {
      lines.push(`- ${toLabel(key)}: ${value}`);
    });
    lines.push("");
  }

  lines.push("Resumo:");
  lines.push(`- Total investido: ${fmtBRL(totals.total_invested ?? 0)}`);
  lines.push(`- Total em conta: ${fmtBRL(totals.total_in_account ?? 0)}`);
  lines.push(`- Entradas/Saídas: ${fmtBRL(totals.total_input ?? 0)}`);
  lines.push(`- Rendimento acumulado: ${fmtBRL(totals.total_yield_value ?? 0)}`);
  lines.push("");

  const normalizedSources = Array.isArray(sources)
    ? sources.filter((source) => (source.total ?? source.invested ?? 0) !== 0)
    : [];
  if (normalizedSources.length) {
    lines.push("Fontes de investimento:");
    normalizedSources.forEach((source) => {
      const total = source.total ?? source.invested ?? 0;
      const percentage = source.percentage != null ? `${source.percentage}%` : "";
      lines.push(`- ${source.name}: ${fmtBRL(total)} ${percentage}`.trim());
    });
    lines.push("");
  }

  const trimmedNotes = String(notes).trim();
  if (trimmedNotes) {
    lines.push("Observações:");
    const splitted = trimmedNotes
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (splitted.length) {
      splitted.forEach((line) => lines.push(`- ${line}`));
    } else {
      lines.push(`- ${trimmedNotes}`);
    }
    lines.push("");
  }

  if (entries.length) {
    lines.push("Lançamentos:");
    const limited = entries.slice(0, MAX_ENTRY_LINES);
    limited.forEach((entry) => {
      const date = entry.date ? new Date(entry.date).toLocaleDateString("pt-BR") : "";
      const bank = entry.bank || "";
      const source = entry.source || "–";
      lines.push(
        `- ${date} | ${bank} | Fonte: ${source} | Investido: ${fmtBRL(entry.invested ?? 0)} | Em conta: ${fmtBRL(entry.inAccount ?? 0)} | Fluxo: ${fmtBRL(entry.cashFlow ?? 0)}`
      );
    });
    if (entries.length > limited.length) {
      lines.push(`- ... e mais ${entries.length - limited.length} lançamentos.`);
    }
  } else {
    lines.push("Sem lançamentos registrados até o momento.");
  }

  const pdfContent = buildPdf(lines);
  const blob = new Blob([pdfContent], { type: "application/pdf" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `relatorio-investimentos-${new Date().toISOString().slice(0, 10)}.pdf`;
  document.body.appendChild(link);
  link.click();
  const url = link.href;
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}


function buildPdf(lines) {
  const encoder = new TextEncoder();
  const textStream = buildTextStream(lines);

  const header = "%PDF-1.4\n";
  const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  const obj2 = "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n";
  const obj3 =
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n";
  const obj4 = `4 0 obj\n<< /Length ${encoder.encode(textStream).length} >>\nstream\n${textStream}\nendstream\nendobj\n`;
  const obj5 = "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n";

  const objects = [obj1, obj2, obj3, obj4, obj5];
  const offsets = [0];
  let position = encoder.encode(header).length;

  objects.forEach((object) => {
    offsets.push(position);
    position += encoder.encode(object).length;
  });

  const xrefPosition = position;
  let xref = `xref\n0 ${offsets.length}\n`;
  xref += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefPosition}\n%%EOF`;

  return [header, ...objects, xref, trailer].join("");
}

function buildTextStream(lines) {
  const safeLines = Array.isArray(lines) ? lines : [];
  const commands = ["BT", "/F1 12 Tf", `${LINE_HEIGHT} TL`, `72 ${TOP_MARGIN} Td`];
  safeLines.forEach((line, index) => {
    const text = escapePdfText(line || " ");
    if (index === 0) {
      commands.push(`(${text}) Tj`);
    } else {
      commands.push("T*");
      if (line !== "") {
        commands.push(`(${text}) Tj`);
      }
    }
  });
  commands.push("ET");
  return commands.join("\n");
}

function escapePdfText(text) {
  return String(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\r?\n/g, " ");
}

function toLabel(key) {
  const map = {
    fullName: "Nome completo",
    email: "E-mail",
    document: "Documento",
    phone: "Telefone",
  };
  return map[key] || key;
}
