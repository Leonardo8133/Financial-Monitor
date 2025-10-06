import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
import { parseExpensePdfWithTemplates } from "../utils/pdfTemplates.js";
import { detectCsvImportTemplate, normalizeImportedItems } from "../utils/importTemplates.js";
import { toNumber } from "../../utils/formatters.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const DEFAULT_MAPPING = [
  { field: "date", label: "Data", sample: "2025-01-31" },
  { field: "description", label: "Descrição", sample: "Supermercado" },
  { field: "category", label: "Categoria", sample: "Alimentação" },
  { field: "source", label: "Fonte", sample: "Pessoal" },
  { field: "value", label: "Valor", sample: "-123,45" },
];

function normalizeText(value) {
  return String(value ?? "").trim();
}

function parseList(value) {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  return normalized
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function inferHeaderRowIndex(rows = []) {
  const candidates = rows.slice(0, 10);
  for (let index = 0; index < candidates.length; index += 1) {
    const row = candidates[index];
    if (!Array.isArray(row)) continue;
    const filled = row.filter((cell) => normalizeText(cell)).length;
    if (filled >= 2) return index;
  }
  return 0;
}

export function Uploader({ onRecordsParsed, onResetMappings }) {
  const inputRef = useRef(null);
  const [mapping, setMapping] = useState(() => DEFAULT_MAPPING.map((entry) => ({ ...entry, header: "" })));
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [fileInfo, setFileInfo] = useState(null);
  const [error, setError] = useState("");
  const [manualSourceDraft, setManualSourceDraft] = useState("");
  const [manualSources, setManualSources] = useState([]);
  const [templateMatch, setTemplateMatch] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  const previewRows = useMemo(() => rawRows.slice(0, 8), [rawRows]);

  function openPicker() {
    inputRef.current?.click();
  }

  function resetState() {
    setMapping(DEFAULT_MAPPING.map((entry) => ({ ...entry, header: "" })));
    setHeaders([]);
    setRows([]);
    setRawRows([]);
    setHeaderRowIndex(0);
    setManualSources([]);
    setManualSourceDraft("");
    setTemplateMatch(null);
    setStatusMessage("");
  }

  function onFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    resetState();
    setError("");
    setFileInfo({
      name: file.name,
      size: file.size,
    });
    const name = file.name.toLowerCase();
    if (name.endsWith(".csv")) parseCsv(file);
    else if (name.endsWith(".xlsx") || name.endsWith(".xlsm")) parseXlsx(file);
    else if (name.endsWith(".pdf")) parsePdf(file);
    else setError("Formato não suportado. Use CSV, XLSX/XLSM ou PDF.");
  }

  function applyHeaderSelection(data, index, fileName = "") {
    if (!Array.isArray(data) || data.length === 0) {
      setHeaders([]);
      setRows([]);
      return;
    }
    const headerRow = data[index] || [];
    const resolvedHeaders = headerRow.map((cell, idx) => normalizeText(cell) || `Coluna ${idx + 1}`);
    const body = data.slice(index + 1).filter((row) => Array.isArray(row) && row.some((cell) => normalizeText(cell)));
    const records = body.map((row) => {
      const entry = {};
      resolvedHeaders.forEach((header, idx) => {
        entry[header] = row[idx] ?? "";
      });
      return entry;
    });
    setHeaders(resolvedHeaders);
    setRows(records);
    setMapping((prev) =>
      prev.map((entry) => (resolvedHeaders.includes(entry.header) ? entry : { ...entry, header: "" }))
    );
    const csvTemplate = detectCsvImportTemplate({ fileName, headers: resolvedHeaders, rows: records });
    if (csvTemplate) {
      setTemplateMatch({
        type: "csv",
        name: csvTemplate.template.displayName,
        items: normalizeImportedItems(csvTemplate.items),
      });
    } else {
      setTemplateMatch(null);
    }
  }

  function parseCsv(file) {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: true,
      complete: (result) => {
        const data = Array.isArray(result.data) ? result.data : [];
        setRawRows(data);
        const index = inferHeaderRowIndex(data);
        setHeaderRowIndex(index);
        applyHeaderSelection(data, index, file.name);
      },
      error: (err) => setError(err.message || String(err)),
    });
  }

  function parseXlsx(file) {
    const reader = new FileReader();
    reader.onload = (event) => {
      const buffer = new Uint8Array(event.target.result);
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const arrayData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
      setRawRows(arrayData);
      const index = inferHeaderRowIndex(arrayData);
      setHeaderRowIndex(index);
      applyHeaderSelection(arrayData, index, file.name);
    };
    reader.readAsArrayBuffer(file);
  }

  async function parsePdf(file) {
    try {
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const pdf = await loadingTask.promise;
      let text = "";
      for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
        const page = await pdf.getPage(pageIndex);
        const content = await page.getTextContent();
        text += content.items.map((item) => (typeof item.str === "string" ? item.str : "")).join(" ") + "\n";
      }
      const parsed = parseExpensePdfWithTemplates(text);
      if (parsed && parsed.items && parsed.items.length) {
        setTemplateMatch({
          type: "pdf",
          name: parsed.templateName || parsed.templateId,
          items: normalizeImportedItems(parsed.items),
        });
        setStatusMessage("Modelo de PDF reconhecido. Confirme para importar automaticamente.");
      } else {
        setStatusMessage("Nenhum template automático encontrado para este PDF. Faça o mapeamento manual.");
        const lines = text
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean);
        const data = lines.map((line) => ({ Linha: line }));
        setHeaders(["Linha"]);
        setRows(data);
        setRawRows([]);
      }
    } catch (err) {
      setError(err.message || String(err));
    }
  }

  function updateMapping(field, header) {
    setMapping((prev) => prev.map((entry) => (entry.field === field ? { ...entry, header } : entry)));
  }

  function resetMapping() {
    setMapping(DEFAULT_MAPPING.map((entry) => ({ ...entry, header: "" })));
    setHeaders([]);
    setRows([]);
    setRawRows([]);
    setHeaderRowIndex(0);
    setManualSources([]);
    setManualSourceDraft("");
    setTemplateMatch(null);
    setStatusMessage("");
    setFileInfo(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    if (typeof onResetMappings === "function") {
      onResetMappings();
    }
  }

  function addManualSource() {
    const value = normalizeText(manualSourceDraft);
    if (!value) return;
    setManualSources((prev) => (prev.includes(value) ? prev : [...prev, value]));
    setManualSourceDraft("");
  }

  function removeManualSource(value) {
    setManualSources((prev) => prev.filter((item) => item !== value));
  }

  function applyMapping() {
    if (!rows.length) return;
    const columnMap = Object.fromEntries(mapping.map((entry) => [entry.field, entry.header]));
    const transformed = rows.map((row) => {
      const rawValue = row[columnMap.value] ?? row["Linha"] ?? 0;
      const categories = columnMap.category ? parseList(row[columnMap.category]) : [];
      const sources = columnMap.source ? parseList(row[columnMap.source]) : [];
      const normalizedSources = sources.length ? sources : manualSources;
      return {
        date: row[columnMap.date] || "",
        description: row[columnMap.description] || row["Linha"] || "",
        categories,
        sources: normalizedSources,
        value: toNumber(rawValue),
      };
    });
    onRecordsParsed(transformed);
  }

  function confirmTemplateImport() {
    if (!templateMatch) return;
    onRecordsParsed(templateMatch.items);
    setTemplateMatch(null);
    setStatusMessage("");
  }

  function cancelTemplateImport() {
    setTemplateMatch(null);
    setStatusMessage("");
  }

  return (
    <div className="space-y-4 rounded-xl border border-dashed p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">Importar CSV/XLSX/PDF</div>
          {fileInfo && (
            <div className="text-[0.7rem] text-slate-500">
              Arquivo selecionado: <span className="font-medium text-slate-700">{fileInfo.name}</span> · tamanho {" "}
              {(fileInfo.size / 1024).toFixed(1)} KB
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openPicker}
            className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Selecionar arquivo
          </button>
          <button
            type="button"
            onClick={resetMapping}
            className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            Resetar mapeamento
          </button>
          <input ref={inputRef} type="file" accept=".csv,.xlsx,.xlsm,.pdf" className="hidden" onChange={onFile} />
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}
      {statusMessage && !templateMatch && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">{statusMessage}</div>
      )}

      {templateMatch && (
        <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <div className="font-semibold">Modelo detectado: {templateMatch.name}</div>
          <div className="text-xs text-emerald-600">
            Encontramos um template conhecido. Deseja importar automaticamente as {templateMatch.items.length} linhas?
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={confirmTemplateImport}
              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Confirmar importação
            </button>
            <button
              type="button"
              onClick={cancelTemplateImport}
              className="rounded-lg border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {rawRows.length > 0 && (
        <div className="space-y-3 rounded-lg border border-slate-200 p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
            <span className="font-semibold">Pré-visualização do arquivo</span>
            <label className="flex items-center gap-2">
              <span>Selecionar linha de cabeçalho:</span>
              <select
                value={headerRowIndex}
                onChange={(event) => {
                  const index = Number(event.target.value);
                  setHeaderRowIndex(index);
                  applyHeaderSelection(rawRows, index, fileInfo?.name || "");
                }}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-slate-400 focus:outline-none"
              >
                {rawRows.slice(0, 10).map((_, idx) => (
                  <option key={idx} value={idx}>
                    Linha {idx + 1}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="max-h-60 overflow-auto rounded-lg border border-slate-100">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <tbody className="divide-y divide-slate-100">
                {previewRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex === headerRowIndex ? "bg-slate-100" : ""}>
                    <td className="whitespace-nowrap px-2 py-1 font-mono text-[0.65rem] text-slate-400">{rowIndex + 1}</td>
                    {Array.isArray(row) && row.length > 0 ? (
                      row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="whitespace-nowrap px-2 py-1 text-[0.7rem] text-slate-600">
                          {String(cell)}
                        </td>
                      ))
                    ) : (
                      <td className="px-2 py-1 text-[0.7rem] text-slate-500">(linha vazia)</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {headers.length > 0 && !templateMatch && (
        <div className="space-y-4">
          <div className="text-xs text-slate-500">Mapeie as colunas do arquivo para os campos do sistema:</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mapping.map((entry) => (
              <div key={entry.field} className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs font-semibold text-slate-600">{entry.label}</div>
                <select
                  value={entry.header || ""}
                  onChange={(event) => updateMapping(entry.field, event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-slate-400 focus:outline-none"
                >
                  <option value="">— Não mapear —</option>
                  {headers.map((header) => (
                    <option key={header} value={header}>
                      {header}
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-[0.7rem] text-slate-500">Ex.: {entry.sample}</div>
              </div>
            ))}
          </div>

          <div className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
            <div className="text-xs font-semibold text-slate-600">Fontes manuais</div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={manualSourceDraft}
                onChange={(event) => setManualSourceDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addManualSource();
                  }
                }}
                placeholder="Fonte padrão para linhas sem coluna"
                className="w-48 rounded-lg border border-slate-200 px-2 py-1 text-xs focus:border-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={addManualSource}
                className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Adicionar fonte
              </button>
              {manualSources.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {manualSources.map((source) => (
                    <span
                      key={source}
                      className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-[0.65rem] text-slate-600"
                    >
                      {source}
                      <button
                        type="button"
                        onClick={() => removeManualSource(source)}
                        className="text-slate-400 transition hover:text-red-500"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={applyMapping}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow hover:bg-slate-800"
            >
              Aplicar mapeamento
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
