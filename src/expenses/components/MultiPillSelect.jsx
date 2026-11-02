import { useMemo } from "react";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import { colorForName, isValidColor, pillBackground, pillBorder, pillTextColor } from "../../utils/palette.js";

function normalizeValues(values) {
  if (!Array.isArray(values)) return [];
  return values.map((v) => (typeof v === "string" ? v : v?.name ?? String(v))).filter((v) => v && v.trim() !== "");
}

/**
 * Multi-select with colored pills. Options can be strings or {name, color, icon}.
 * Pass onCreateOption to allow creating a new option by typing.
 */
export function MultiPillSelect({
  values = [],
  options = [],
  onChange,
  onCreateOption,
  placeholder = "Selecionar...",
  disabled = false,
  className = "",
  size = "sm",
  isMulti = true,
  compact = false,
  variant = "solid", // "solid" (filled pills) | "outline" (neutral pill with a color dot)
}) {
  const normalizedValues = useMemo(() => normalizeValues(values), [values]);

  const reactOptions = useMemo(() => {
    const base = (Array.isArray(options) ? options : [])
      .map((o) => {
        if (typeof o === "string") return { name: o, icon: "", color: "" };
        return { name: o?.name || "", icon: o?.icon || "", color: o?.color || "" };
      })
      .filter((o) => o.name);
    const known = new Set(base.map((o) => o.name));
    const extras = normalizedValues.filter((v) => !known.has(v)).map((v) => ({ name: v, icon: "", color: "" }));
    return [...base, ...extras].map((item) => ({
      value: item.name,
      label: item.name,
      icon: item.icon,
      color: isValidColor(item.color) ? item.color : colorForName(item.name),
    }));
  }, [options, normalizedValues]);

  const reactValue = useMemo(
    () => normalizedValues.map((label) => reactOptions.find((opt) => opt.value === label) || { value: label, label }),
    [normalizedValues, reactOptions]
  );

  const fontSize = size === "md" ? 13 : 12;
  const styles = {
    control: (base, state) => ({
      ...base,
      minHeight: compact ? 30 : size === "md" ? 38 : 32,
      borderRadius: 8,
      fontSize,
      backgroundColor: "rgb(var(--c-surface))",
      borderColor: state.isFocused ? "rgb(var(--c-accent))" : "rgb(var(--c-line))",
      boxShadow: state.isFocused ? "0 0 0 2px rgb(var(--c-accent) / .3)" : "none",
      ":hover": { borderColor: "rgb(var(--c-faint))" },
      opacity: state.isDisabled ? 0.6 : 1,
    }),
    valueContainer: (base) => ({
      ...base,
      padding: compact ? "0 4px" : "1px 6px",
      gap: 2,
      ...(compact ? { flexWrap: "nowrap", overflow: "hidden" } : {}),
    }),
    multiValue: (base, state) => ({
      ...base,
      backgroundColor: variant === "outline" ? "rgb(var(--c-surface-2))" : pillBackground(state.data.color, 18),
      border: `1px solid ${variant === "outline" ? "rgb(var(--c-line))" : pillBorder(state.data.color, 50)}`,
      borderRadius: 999,
      margin: compact ? "1px 2px 1px 0" : base.margin,
      flexShrink: compact ? 0 : base.flexShrink,
      maxWidth: compact ? 150 : "none",
    }),
    multiValueLabel: (base, state) => ({
      ...base,
      color: variant === "outline" ? "rgb(var(--c-ink))" : pillTextColor(state.data.color),
      title: state.data.label,
      fontWeight: 600,
      fontSize: fontSize - 1,
      padding: compact ? "0 5px" : "1px 6px",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    }),
    multiValueRemove: (base, state) => ({
      ...base,
      color: variant === "outline" ? "rgb(var(--c-faint))" : pillTextColor(state.data.color),
      borderRadius: 999,
      ":hover": { backgroundColor: "transparent", color: "rgb(var(--c-neg))" },
    }),
    singleValue: (base) => ({ ...base, color: "rgb(var(--c-ink))" }),
    input: (base) => ({ ...base, color: "rgb(var(--c-ink))", fontSize }),
    placeholder: (base) => ({ ...base, fontSize: fontSize - 1, color: "rgb(var(--c-faint))" }),
    indicatorsContainer: (base) => ({ ...base, paddingRight: compact ? 0 : 4 }),
    dropdownIndicator: (base) => ({ ...base, padding: compact ? 2 : 4, color: "rgb(var(--c-faint))" }),
    clearIndicator: (base) => ({ ...base, padding: 4, color: "rgb(var(--c-faint))" }),
    indicatorSeparator: () => ({ display: "none" }),
    menu: (base) => ({
      ...base,
      zIndex: 60,
      backgroundColor: "rgb(var(--c-surface))",
      border: "1px solid rgb(var(--c-line))",
      borderRadius: 10,
      boxShadow: "0 10px 30px rgb(2 6 23 / .25)",
      overflow: "hidden",
    }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    option: (base, state) => ({
      ...base,
      fontSize,
      color: "rgb(var(--c-ink))",
      backgroundColor: state.isSelected
        ? "rgb(var(--c-accent) / .18)"
        : state.isFocused
        ? "rgb(var(--c-surface-3))"
        : "transparent",
      cursor: "pointer",
    }),
    noOptionsMessage: (base) => ({ ...base, color: "rgb(var(--c-muted))", fontSize }),
  };

  const formatOptionLabel = (option, meta) => (
    <span className="inline-flex items-center gap-1.5">
      {(meta?.context === "menu" || variant === "outline") && (
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: option.color }} aria-hidden="true" />
      )}
      {option.icon && variant !== "outline" ? <span aria-hidden="true">{option.icon}</span> : null}
      <span>{option.label}</span>
    </span>
  );

  const Component = onCreateOption ? CreatableSelect : Select;

  return (
    <div className={className}>
      <Component
        isMulti={isMulti}
        isDisabled={disabled}
        options={reactOptions}
        value={isMulti ? reactValue : reactValue[0] || null}
        onChange={(items) => {
          if (isMulti) onChange(Array.isArray(items) ? items.map((i) => i.value) : []);
          else onChange(items ? [items.value] : []);
        }}
        onCreateOption={
          onCreateOption
            ? (input) => {
                const name = String(input || "").trim();
                if (!name) return;
                onCreateOption(name);
                onChange(isMulti ? [...normalizedValues, name] : [name]);
              }
            : undefined
        }
        formatCreateLabel={(input) => `Criar "${input}"`}
        placeholder={placeholder}
        classNamePrefix="select"
        styles={styles}
        closeMenuOnSelect={!isMulti}
        hideSelectedOptions={false}
        menuPosition="fixed"
        menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
        isClearable={!isMulti}
        formatOptionLabel={formatOptionLabel}
        noOptionsMessage={() => "Sem opções"}
      />
    </div>
  );
}
