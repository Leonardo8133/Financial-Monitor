import { useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";
import { parseExpensePdfWithTemplates } from "../utils/pdfTemplates.js";
import { detectCsvImportTemplate, normalizeImportedItems } from "../utils/importTemplates.js";
import { toNumber } from "../../utils/formatters.js";
import { Select } from "../../components/Select.jsx";

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

export function Uploader({ onRecordsParsed, onResetMappings, ignoredDescriptions = [] }) {
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
  const [filesInfo, setFilesInfo] = useState([]);
  const [allParsedItems, setAllParsedItems] = useState([]);

  const previewRows = useMemo(() => rawRows.slice(0, 8), [rawRows]);

  function filterIgnoredItems(items) {
    if (!ignoredDescriptions || ignoredDescriptions.length === 0) {
      return { filtered: items, ignoredCount: 0 };
    }
    
    const filtered = items.filter(item => {
      const desc = (item.description || "").toLowerCase();
      return !ignoredDescriptions.some(ignored => desc.includes(ignored.toLowerCase()));
    });
    
    return {
      filtered,
      ignoredCount: items.length - filtered.length
    };
  }

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
    setFilesInfo([]);
    setAllParsedItems([]);
  }

  async function onFile(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    
    resetState();
    setError("");
    
    // Se é apenas 1 arquivo, usar o fluxo original de mapeamento manual
    if (files.length === 1) {
      const file = files[0];
      setFileInfo({
        name: file.name,
        size: file.size,
      });
      const name = file.name.toLowerCase();
      if (name.endsWith(".csv")) parseCsv(file);
      else if (name.endsWith(".xlsx") || name.endsWith(".xlsm")) parseXlsx(file);
      else if (name.endsWith(".pdf")) parsePdf(file);
      else setError("Formato não suportado. Use CSV, XLSX/XLSM ou PDF.");
      return;
    }
    
    // Para múltiplos arquivos, usar o fluxo de processamento automático
    const filesList = files.map(f => ({ name: f.name, size: f.size }));
    setFilesInfo(filesList);
    
    const allItems = [];
    
    for (const file of files) {
      const name = file.name.toLowerCase();
      try {
        let items = [];
        
        if (name.endsWith(".csv")) {
          items = await parseCsvForMultiple(file);
        } else if (name.endsWith(".xlsx") || name.endsWith(".xlsm")) {
          items = await parseXlsxForMultiple(file);
        } else if (name.endsWith(".pdf")) {
          items = await parsePdfForMultiple(file);
        } else {
          setError(prev => prev ? `${prev}\n${file.name}: Formato não suportado.` : `${file.name}: Formato não suportado.`);
          continue;
        }
        
        allItems.push(...items);
      } catch (err) {
        setError(prev => prev ? `${prev}\n${file.name}: ${err.message}` : `${file.name}: ${err.message}`);
      }
    }
    
    if (allItems.length > 0) {
      setAllParsedItems(allItems);
      setStatusMessage(`${allItems.length} transações encontradas em ${files.length} arquivo(s). Confirme para importar.`);
    } else {
      // Se não encontrou transações automáticas, mostrar mensagem informativa
      setStatusMessage(`${files.length} arquivo(s) selecionado(s), mas nenhum template automático foi reconhecido. Use a importação individual para mapear manualmente.`);
    }
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
    const csvTemplate = detectCsvImportTemplate({ 
      fileName, 
      headers: resolvedHeaders, 
      rows: records, 
      rawRows: data 
    });
    if (csvTemplate) {
      setTemplateMatch({
        type: "csv",
        name: csvTemplate.template.displayName,
        items: normalizeImportedItems(csvTemplate.items),
        headerRowIndex: csvTemplate.headerRowIndex,
      });
      // Usa a linha do template automaticamente
      setHeaderRowIndex(csvTemplate.headerRowIndex);
    } else {
      setTemplateMatch(null);
    }
  }

  function parseCsvForMultiple(file) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (result) => {
          const data = Array.isArray(result.data) ? result.data : [];
          
          // Tentar detectar template com dados completos
          const index = inferHeaderRowIndex(data);
          const headerRow = data[index] || [];
          const resolvedHeaders = headerRow.map((cell, idx) => normalizeText(cell) || `Coluna ${idx + 1}`);
          const body = data.slice(index + 1).filter((row) => Array.isArray(row) && row.some((cell) => normalizeText(cell)));
          
          const csvTemplate = detectCsvImportTemplate({ 
            fileName: file.name, 
            headers: resolvedHeaders, 
            rows: body.map(row => {
              const entry = {};
              resolvedHeaders.forEach((header, idx) => {
                entry[header] = row[idx] ?? "";
              });
              return entry;
            }), 
            rawRows: data 
          });
          
          if (csvTemplate) {
            resolve(normalizeImportedItems(csvTemplate.items));
          } else {
            resolve([]);
          }
        },
        error: (err) => reject(new Error(err.message || String(err))),
      });
    });
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

  function parseXlsxForMultiple(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const buffer = new Uint8Array(event.target.result);
          const workbook = XLSX.read(buffer, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const arrayData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
          
          // Tentar detectar template com dados completos
          const index = inferHeaderRowIndex(arrayData);
          const headerRow = arrayData[index] || [];
          const resolvedHeaders = headerRow.map((cell, idx) => normalizeText(cell) || `Coluna ${idx + 1}`);
          const body = arrayData.slice(index + 1).filter((row) => Array.isArray(row) && row.some((cell) => normalizeText(cell)));
          
          const csvTemplate = detectCsvImportTemplate({ 
            fileName: file.name, 
            headers: resolvedHeaders, 
            rows: body.map(row => {
              const entry = {};
              resolvedHeaders.forEach((header, idx) => {
                entry[header] = row[idx] ?? "";
              });
              return entry;
            }), 
            rawRows: arrayData 
          });
          
          if (csvTemplate) {
            resolve(normalizeImportedItems(csvTemplate.items));
          } else {
            resolve([]);
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error('Erro ao ler arquivo XLSX'));
      reader.readAsArrayBuffer(file);
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

  async function parsePdfForMultiple(file) {
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
      return normalizeImportedItems(parsed.items);
    }
    return [];
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

  function confirmMultipleFilesImport() {
    if (allParsedItems.length === 0) return;
    
    const validItems = allParsedItems.filter(item => {
      return item.date && item.description && Math.abs(item.value || 0) > 0;
    });
    
    if (validItems.length === 0) {
      setError("Nenhum item válido encontrado para importação.");
      return;
    }
    
    const { filtered, ignoredCount } = filterIgnoredItems(validItems);
    
    if (filtered.length === 0) {
      setError("Todos os itens foram ignorados conforme configuração.");
      return;
    }
    
    onRecordsParsed(filtered, ignoredCount);
    
    // Limpa tudo após importação
    resetState();
    setFileInfo(null);
    setError("");
    
    if (inputRef.current) {
      inputRef.current.value = "";
    }
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
    setFilesInfo([]);
    setAllParsedItems([]);
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
    
    const { filtered, ignoredCount } = filterIgnoredItems(transformed);
    
    if (filtered.length === 0 && transformed.length > 0) {
      setError("Todos os itens foram ignorados conforme configuração.");
      return;
    }
    
    onRecordsParsed(filtered, ignoredCount);
  }

  function confirmTemplateImport() {
    if (!templateMatch) return;
    
    // Filtra itens vazios antes de importar
    const validItems = templateMatch.items.filter(item => {
      return item.date && item.description && Math.abs(item.value || 0) > 0;
    });
    
    if (validItems.length === 0) {
      setError("Nenhum item válido encontrado para importação. Verifique se os dados contêm data, descrição e valor.");
      return;
    }
    
    const { filtered, ignoredCount } = filterIgnoredItems(validItems);
    
    if (filtered.length === 0) {
      setError("Todos os itens foram ignorados conforme configuração.");
      return;
    }
    
    onRecordsParsed(filtered, ignoredCount);
    
    // Limpa tudo após importação bem-sucedida
    setTemplateMatch(null);
    setStatusMessage("");
    setFileInfo(null);
    setHeaders([]);
    setRows([]);
    setRawRows([]);
    setHeaderRowIndex(0);
    setError("");
    
    // Limpa o input de arquivo
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  function cancelTemplateImport() {
    setTemplateMatch(null);
    setStatusMessage("");
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 overflow-hidden">
      {/* Header com botão de importar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-3 border-b border-slate-200">
        <button
          type="button"
          onClick={openPicker}
          className="flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
        >
          📁 Importar Fatura (CSV)
        </button>
        
        <div className="flex items-center gap-2">
          {filesInfo.length > 0 && (
            <div className="text-xs text-slate-600">
              <span className="font-medium text-slate-700">{filesInfo.length} arquivo(s) selecionado(s)</span>
            </div>
          )}
          {fileInfo && (
            <div className="text-xs text-slate-600">
              <span className="font-medium text-slate-700">{fileInfo.name}</span> · {(fileInfo.size / 1024).toFixed(1)} KB
            </div>
          )}
          {(fileInfo || filesInfo.length > 0) && (
            <button
              type="button"
              onClick={resetMapping}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
            >
              Resetar
            </button>
          )}
        </div>
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xlsm,.pdf" className="hidden" onChange={onFile} multiple />
      </div>
      
      {/* Templates suportados */}
      {!fileInfo && filesInfo.length === 0 && (
        <div className="px-4 pb-3">
          <div className="text-xs text-slate-500">
            <span className="font-medium">Templates suportados:</span> Nubank CSV, Nubank Detalhado, Inter Extrato
          </div>
        </div>
      )}
      
      <div className="px-4 pb-4 space-y-3">

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 whitespace-pre-wrap">{error}</div>}
      {statusMessage && !templateMatch && allParsedItems.length === 0 && filesInfo.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">{statusMessage}</div>
      )}
      {statusMessage && !templateMatch && allParsedItems.length === 0 && filesInfo.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">{statusMessage}</div>
      )}

      {allParsedItems.length > 0 && (
        <div className="space-y-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          <div className="font-semibold">Importação múltipla</div>
          <div className="text-xs text-emerald-600">
            {statusMessage}
          </div>
          {filesInfo.length > 0 && (
            <div className="text-xs text-emerald-600">
              <div className="font-medium mb-1">Arquivos:</div>
              <ul className="list-disc list-inside">
                {filesInfo.map((file, idx) => (
                  <li key={idx}>{file.name} ({(file.size / 1024).toFixed(1)} KB)</li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={confirmMultipleFilesImport}
              className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              Confirmar importação
            </button>
            <button
              type="button"
              onClick={() => {
                setAllParsedItems([]);
                setFilesInfo([]);
                setStatusMessage("");
              }}
              className="rounded-lg border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              Cancelar
            </button>
          </div>
        </div>
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
              <Select
                value={headerRowIndex}
                onChange={(event) => {
                  const index = Number(event.target.value);
                  setHeaderRowIndex(index);
                  applyHeaderSelection(rawRows, index, fileInfo?.name || "");
                }}
                options={rawRows.slice(0, 10).map((_, idx) => ({
                  value: idx,
                  label: `Linha ${idx + 1}`
                }))}
                className="ml-2"
                size="sm"
              />
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
                <Select
                  value={entry.header || ""}
                  onChange={(event) => updateMapping(entry.field, event.target.value)}
                  options={[
                    { value: "", label: "— Não mapear —" },
                    ...headers.map((header) => ({ value: header, label: header }))
                  ]}
                  placeholder="— Não mapear —"
                  className="mt-1"
                  size="sm"
                />
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
    </div>
  );
}
