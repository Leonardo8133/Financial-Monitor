import { useEffect } from "react";
import { createPortal } from "react-dom";

export function ImportModal({ open, onClose, onImport, onDownloadTemplate }) {
  useEffect(() => {
    if (!open) return undefined;
    function handleKey(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, open]);

  if (!open) return null;

  function handleFileChange(event) {
    const [file] = event.target.files || [];
    if (file) {
      onImport(file);
      event.target.value = "";
    }
  }

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-scale-pop"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-modal-title"
      >
        <h3 id="import-modal-title" className="text-lg font-semibold text-slate-900">
          Importar dados
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Faça o download do template oficial para preencher seus dados ou selecione um arquivo JSON exportado
          anteriormente.
        </p>

        <div className="mt-4 flex flex-col gap-3">
          <button
            type="button"
            onClick={onDownloadTemplate}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            title="Baixe um arquivo de exemplo com o formato aceito pela importação"
          >
            Baixar template
          </button>

          <label
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-8 text-center text-sm text-slate-600 transition hover:border-slate-400 hover:bg-slate-100"
            title="Selecione um arquivo .json exportado anteriormente"
          >
            <span className="font-semibold text-slate-700">Selecionar arquivo JSON</span>
            <span className="text-xs text-slate-500">Extensão aceita: .json</span>
            <input type="file" accept="application/json" className="hidden" onChange={handleFileChange} />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            title="Fechar a janela de importação"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
