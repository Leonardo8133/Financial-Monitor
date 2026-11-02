import { useState } from "react";
import { resolveBankVisual } from "../config/banks.js";
import { Modal } from "../../components/Modal.jsx";
import { PlusIcon } from "../../components/icons.jsx";
import { colorForName } from "../../utils/palette.js";

/**
 * Bank picker limited to the registered banks (Configurações → Investimentos).
 * The "+" button registers a new bank and selects it. A legacy value that is not
 * in the library is still listed so existing entries keep working.
 */
export function BankSelect({ value, onChange, banks = [], onCreateBank, className = "", required = false, autoFocus = false }) {
  const [creating, setCreating] = useState(null); // { name, icon, color }
  const names = banks.map((b) => b.name);
  const isLegacy = value && !names.some((n) => n.toLowerCase() === value.toLowerCase());
  const visual = resolveBankVisual(value || "", banks);

  function openCreate() {
    setCreating({ name: "", icon: "🏦", color: "" });
  }

  function confirmCreate() {
    const name = creating?.name.trim();
    if (!name) return;
    const existing = banks.find((b) => b.name.toLowerCase() === name.toLowerCase());
    if (!existing) onCreateBank?.({ name, icon: creating.icon || "🏦", color: creating.color || colorForName(name) });
    onChange(existing ? existing.name : name);
    setCreating(null);
  }

  const duplicate = creating?.name.trim() && banks.some((b) => b.name.toLowerCase() === creating.name.trim().toLowerCase());

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="relative min-w-0 flex-1">
        <select
          value={value || ""}
          required={required}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
          className={`input input-sm appearance-none pl-7 pr-7 ${value ? "" : "text-faint"}`}
        >
          <option value="" disabled>
            {banks.length ? "Selecione o banco" : "Nenhum banco: use o +"}
          </option>
          {banks.map((b) => (
            <option key={b.name} value={b.name}>
              {b.icon ? `${b.icon} ` : ""}
              {b.name}
            </option>
          ))}
          {isLegacy && <option value={value}>{value} (não cadastrado)</option>}
        </select>
        <span
          className="pointer-events-none absolute left-2.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
          style={{ backgroundColor: value ? visual.color : "rgb(var(--c-line))" }}
          aria-hidden="true"
        />
        <svg className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      {onCreateBank && (
        <button type="button" onClick={openCreate} className="btn btn-xs h-[30px] shrink-0 !px-1.5" title="Cadastrar novo banco" aria-label="Cadastrar novo banco">
          <PlusIcon className="h-4 w-4" />
        </button>
      )}

      <Modal
        open={Boolean(creating)}
        onClose={() => setCreating(null)}
        title="Novo banco"
        description="Fica disponível em todos os lançamentos e em Configurações → Investimentos."
        size="sm"
        footer={
          <>
            <button type="button" className="btn" onClick={() => setCreating(null)}>Cancelar</button>
            <button type="button" className="btn-primary" onClick={confirmCreate} disabled={!creating?.name.trim()}>
              {duplicate ? "Usar existente" : "Cadastrar e selecionar"}
            </button>
          </>
        }
      >
        {creating && (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              confirmCreate();
            }}
          >
            <input
              type="color"
              value={creating.color || colorForName(creating.name || "banco")}
              onChange={(e) => setCreating((p) => ({ ...p, color: e.target.value }))}
              title="Cor"
            />
            <input className="input input-sm w-12 text-center" value={creating.icon} onChange={(e) => setCreating((p) => ({ ...p, icon: e.target.value }))} title="Emoji" />
            <input
              className="input flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmCreate();
                }
              }}
              value={creating.name}
              onChange={(e) => setCreating((p) => ({ ...p, name: e.target.value }))}
              placeholder="Nome do banco ou corretora"
              autoFocus
            />
          </form>
        )}
        {duplicate && <p className="mt-2 text-xs text-muted">Já existe um banco com esse nome; ele será selecionado.</p>}
      </Modal>
    </div>
  );
}
