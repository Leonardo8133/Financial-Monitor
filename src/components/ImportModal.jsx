import { useEffect, useRef, useState } from "react";
import { Modal } from "./Modal.jsx";
import { analyzeImportFile } from "../utils/importExport.js";
import { ArrowUpTrayIcon } from "./icons.jsx";

/**
 * Import flow: pick file -> preview what was detected -> choose merge/replace.
 * onApply(analysis, mode) performs the import.
 */
export function ImportModal({ open, onClose, onApply, onDownloadTemplate, templateLabel = "Baixar template" }) {
  const [analysis, setAnalysis] = useState(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState("merge");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setAnalysis(null);
      setFileName("");
      setError("");
      setBusy(false);
      setMode("merge");
    }
  }, [open]);

  async function handleFile(file) {
    if (!file) return;
    setBusy(true);
    setError("");
    setFileName(file.name);
    try {
      const result = await analyzeImportFile(file);
      setAnalysis(result);
    } catch (err) {
      setAnalysis(null);
      setError(err.message || String(err));
    } finally {
      setBusy(false);
    }
  }

  const s = analysis?.summary || {};
  const rows = [
    ["Lançamentos de investimentos", s.entries],
    ["Bancos", s.banks],
    ["Fontes (investimentos)", s.investmentSources],
    ["Transações de gastos", s.expenses],
    ["Categorias", s.categories],
    ["Fontes (gastos)", s.expenseSources],
    ["Mapeamentos de descrição", s.mappings],
    ["Descrições ignoradas", s.ignored],
  ].filter(([, n]) => n > 0);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Importar dados"
      description="Aceita backups completos do Monitor Financeiro e arquivos no formato do template."
      footer={
        <>
          {onDownloadTemplate && (
            <button type="button" className="btn mr-auto" onClick={onDownloadTemplate}>
              {templateLabel}
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>
            Fechar
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={!analysis || busy}
            onClick={() => {
              if (analysis) onApply?.(analysis, mode);
            }}
          >
            {mode === "replace" ? "Substituir e importar" : "Mesclar e importar"}
          </button>
        </>
      }
    >
      <label
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-6 py-7 text-center text-sm transition ${
          dragOver ? "border-accent bg-accent/10" : "border-line bg-surface-2 hover:border-faint"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          handleFile(event.dataTransfer.files?.[0]);
        }}
      >
        <ArrowUpTrayIcon className="h-6 w-6 text-faint" />
        <span className="font-semibold text-ink">{fileName || "Selecione ou arraste um arquivo .json"}</span>
        <span className="text-xs text-muted">{busy ? "Lendo arquivo..." : "Nada é enviado para a internet."}</span>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            handleFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
      </label>

      {error && <p className="mt-3 rounded-lg border border-neg/30 bg-neg/10 px-3 py-2 text-sm text-neg">{error}</p>}

      {analysis && (
        <div className="mt-4 space-y-3 fade-in">
          <div className="panel p-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted">Conteúdo detectado</div>
            <div className="mt-1 text-sm font-medium text-ink">{analysis.label}</div>
            <ul className="mt-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
              {rows.map(([label, n]) => (
                <li key={label} className="flex justify-between gap-2 text-muted">
                  <span>{label}</span>
                  <span className="num font-semibold text-ink">{n}</span>
                </li>
              ))}
              {!rows.length && <li className="text-muted">Nenhum registro encontrado.</li>}
            </ul>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className={`cursor-pointer rounded-xl border p-3 text-sm ${mode === "merge" ? "border-accent bg-accent/10" : "border-line"}`}>
              <input type="radio" className="mr-2" checked={mode === "merge"} onChange={() => setMode("merge")} />
              <span className="font-semibold text-ink">Mesclar</span>
              <p className="mt-1 text-xs text-muted">Adiciona só o que ainda não existe. Duplicados (mesma data/descrição/valor) são ignorados.</p>
            </label>
            <label className={`cursor-pointer rounded-xl border p-3 text-sm ${mode === "replace" ? "border-neg bg-neg/10" : "border-line"}`}>
              <input type="radio" className="mr-2" checked={mode === "replace"} onChange={() => setMode("replace")} />
              <span className="font-semibold text-ink">Substituir</span>
              <p className="mt-1 text-xs text-muted">Troca as seções presentes no arquivo pelos dados importados. Faça um backup antes.</p>
            </label>
          </div>
        </div>
      )}
    </Modal>
  );
}
