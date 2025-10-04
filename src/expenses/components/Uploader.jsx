import { useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const DEFAULT_MAPPING = [
  { field: "date", label: "Data", sample: "2025-01-31" },
  { field: "description", label: "Descrição", sample: "Supermercado" },
  { field: "category", label: "Categoria", sample: "Alimentação" },
  { field: "source", label: "Fonte", sample: "Pessoal" },
  { field: "value", label: "Valor", sample: "-123,45" },
];

export function Uploader({ onRecordsParsed }) {
  const inputRef = useRef(null);
  const [mapping, setMapping] = useState(DEFAULT_MAPPING);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  function openPicker() { inputRef.current?.click(); }

  function onFile(ev) {
    setError("");
    const file = ev.target.files?.[0];
    if (!file) return;
    const name = file.name.toLowerCase();
    if (name.endsWith(".csv")) parseCsv(file);
    else if (name.endsWith(".xlsx") || name.endsWith(".xlsm")) parseXlsx(file);
    else if (name.endsWith(".pdf")) parsePdf(file);
    else setError("Formato não suportado. Use CSV, XLSX/XLSM ou PDF.");
  }

  function parseCsv(file) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const data = res.data || [];
        setHeaders(Object.keys(data[0] || {}));
        setRows(data);
      },
      error: (err) => setError(err.message || String(err)),
    });
  }

  function parseXlsx(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      setHeaders(Object.keys(json[0] || {}));
      setRows(json);
    };
    reader.readAsArrayBuffer(file);
  }

  async function parsePdf(file) {
    const buffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((it) => (typeof it.str === "string" ? it.str : "")).join(" ") + "\n";
    }
    // Naive line split; user will map columns manually below
    const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const data = lines.map((line) => ({ Linha: line }));
    setHeaders(["Linha"]);
    setRows(data);
  }

  function updateMapping(field, header) {
    setMapping((prev) => prev.map((m) => (m.field === field ? { ...m, header } : m)));
  }

  function applyMapping() {
    const colMap = Object.fromEntries(mapping.map((m) => [m.field, m.header]));
    const out = rows.map((r) => ({
      date: r[colMap.date] || "",
      description: r[colMap.description] || r["Linha"] || "",
      category: r[colMap.category] || "",
      source: r[colMap.source] || "",
      value: r[colMap.value] || 0,
    }));
    onRecordsParsed(out);
  }

  return (
    <div className="space-y-3 rounded-xl border border-dashed p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold">Importar CSV/XLSX/PDF</div>
        <button type="button" onClick={openPicker} className="rounded-lg border border-slate-200 px-3 py-1 text-xs">Selecionar arquivo</button>
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xlsm,.pdf" className="hidden" onChange={onFile} />
      </div>

      {error && <div className="text-xs text-red-600">{error}</div>}

      {headers.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs text-slate-500">Mapeie as colunas do arquivo para os campos do sistema:</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mapping.map((m) => (
              <div key={m.field} className="rounded-lg border p-3">
                <div className="text-xs font-semibold">{m.label}</div>
                <select value={m.header || ""} onChange={(e) => updateMapping(m.field, e.target.value)} className="mt-1 w-full rounded-lg border px-2 py-1 text-sm">
                  <option value="">— Não mapear —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <div className="mt-1 text-[0.7rem] text-slate-500">Ex.: {m.sample}</div>
              </div>
            ))}
          </div>
          <div>
            <button type="button" onClick={applyMapping} className="rounded-lg bg-slate-900 px-3 py-1 text-xs text-white">Aplicar mapeamento</button>
          </div>
        </div>
      )}
    </div>
  );
}
