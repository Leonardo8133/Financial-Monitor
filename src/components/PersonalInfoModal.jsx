import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const FIELDS = [
  { name: "fullName", label: "Nome completo" },
  { name: "email", label: "E-mail" },
  { name: "document", label: "Documento" },
  { name: "phone", label: "Telefone" },
];

export function PersonalInfoModal({ open, onClose, initialValue, onSave }) {
  const [form, setForm] = useState(initialValue || {});

  useEffect(() => {
    setForm(initialValue || {});
  }, [initialValue, open]);

  useEffect(() => {
    if (!open) return undefined;
    function handleKey(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  function handleChange(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onSave(form);
    onClose();
  }

  const modal = (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="personal-info-title"
      >
        <h3 id="personal-info-title" className="text-lg font-semibold text-slate-900">
          Informações pessoais
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Esses dados aparecerão no relatório em PDF e no arquivo exportado.
        </p>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          {FIELDS.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-slate-700" htmlFor={field.name}>
                {field.label}
              </label>
              <input
                id={field.name}
                name={field.name}
                value={form[field.name] ?? ""}
                onChange={(event) => handleChange(field.name, event.target.value)}
                type="text"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>
          ))}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Salvar informações
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
