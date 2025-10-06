import { useMemo, useState } from "react";

function normalizeValues(values) {
  if (!Array.isArray(values)) return [];
  return values.map((v) => String(v)).filter((v) => v.trim() !== "");
}

export function MultiPillSelect({
  values = [],
  options = [],
  onChange,
  placeholder = "Selecionar...",
  inputPlaceholder = "Adicionar novo",
  allowCustom = true,
  disabled = false,
  className = "",
}) {
  const normalizedValues = useMemo(() => normalizeValues(values), [values]);
  const [draftValue, setDraftValue] = useState("");

  const availableOptions = useMemo(() => {
    const set = new Set(normalizedValues.map((v) => v.toLowerCase()));
    return options
      .map((option) => (typeof option === "string" ? option : option?.name))
      .filter(Boolean)
      .filter((option) => !set.has(option.toLowerCase()));
  }, [normalizedValues, options]);

  function emitChange(nextValues) {
    if (typeof onChange === "function") {
      onChange(nextValues);
    }
  }

  function handleSelectChange(event) {
    const value = event.target.value;
    if (!value) return;
    emitChange([...normalizedValues, value]);
    event.target.value = "";
  }

  function handleAddDraft() {
    const trimmed = draftValue.trim();
    if (!trimmed) return;
    if (normalizedValues.some((v) => v.toLowerCase() === trimmed.toLowerCase())) {
      setDraftValue("");
      return;
    }
    emitChange([...normalizedValues, trimmed]);
    setDraftValue("");
  }

  function handleRemove(value) {
    emitChange(normalizedValues.filter((v) => v !== value));
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {normalizedValues.length === 0 && <span className="text-xs text-slate-400">Nenhum selecionado</span>}
        {normalizedValues.map((value) => (
          <span
            key={value}
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700"
          >
            {value}
            {!disabled && (
              <button
                type="button"
                onClick={() => handleRemove(value)}
                className="text-slate-400 transition hover:text-slate-600"
                aria-label={`Remover ${value}`}
              >
                ×
              </button>
            )}
          </span>
        ))}
      </div>
      {!disabled && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {availableOptions.length > 0 && (
            <select
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
              defaultValue=""
              onChange={handleSelectChange}
            >
              <option value="">{placeholder}</option>
              {availableOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}
          {allowCustom && (
            <div className="flex items-center gap-2">
              <input
                value={draftValue}
                onChange={(event) => setDraftValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddDraft();
                  }
                }}
                placeholder={inputPlaceholder}
                className="w-36 rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddDraft}
                className="rounded-lg bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow hover:bg-slate-800"
              >
                Adicionar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
