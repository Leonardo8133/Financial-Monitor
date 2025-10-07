import { useMemo } from "react";
import Select from "react-select";

function normalizeValues(values) {
  if (!Array.isArray(values)) return [];
  return values.map((v) => String(v)).filter((v) => v.trim() !== "");
}

export function MultiPillSelect({
  values = [],
  options = [],
  onChange,
  placeholder = "Selecionar...",
  disabled = false,
  className = "",
}) {
  const normalizedValues = useMemo(() => normalizeValues(values), [values]);

  const reactOptions = useMemo(() => {
    const base = (Array.isArray(options) ? options : [])
      .map((o) => {
        if (typeof o === "string") return { name: o, icon: "", color: "#1F2937" };
        return { name: o?.name || "", icon: o?.icon || "", color: o?.color || "#1F2937" };
      })
      .filter((o) => o.name);
    // Garante que valores selecionados também existam na lista
    const merged = Array.from(new Set([...base, ...normalizedValues.map(v => ({ name: v, icon: "", color: "#1F2937" }))]));
    return merged.map((item) => ({ 
      value: item.name, 
      label: item.name,
      icon: item.icon,
      color: item.color
    }));
  }, [options, normalizedValues]);

  const reactValue = useMemo(
    () => normalizedValues.map((label) => {
      const option = reactOptions.find(opt => opt.value === label);
      return { 
        value: label, 
        label: label,
        icon: option?.icon || "",
        color: option?.color || "#1F2937"
      };
    }),
    [normalizedValues, reactOptions]
  );

  const styles = {
    control: (base, state) => ({
      ...base,
      minHeight: 34,
      borderColor: state.isFocused ? "#94a3b8" : "#e2e8f0",
      boxShadow: state.isFocused ? "0 0 0 2px rgba(100,116,139,.2)" : "none",
      ":hover": { borderColor: "#94a3b8" },
      borderRadius: 8,
      fontSize: 12,
    }),
    multiValue: (base, state) => {
      const option = reactOptions.find(opt => opt.value === state.data.value);
      const color = option?.color || "#1F2937";
      return {
        ...base,
        backgroundColor: `${color}15`,
        border: `1px solid ${color}40`,
        color: color,
        borderRadius: 6,
      };
    },
    multiValueLabel: (base, state) => {
      const option = reactOptions.find(opt => opt.value === state.data.value);
      const color = option?.color || "#1F2937";
      return {
        ...base,
        color: color,
        fontWeight: 600,
        fontSize: 11,
      };
    },
    multiValueRemove: (base, state) => {
      const option = reactOptions.find(opt => opt.value === state.data.value);
      const color = option?.color || "#1F2937";
      return {
        ...base,
        color: color,
        ":hover": { backgroundColor: "transparent", color: color },
      };
    },
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? "#e2e8f0"
        : state.isFocused
        ? "#e5edff"
        : "white",
      color: "#111827",
      fontSize: 12,
    }),
    placeholder: (base) => ({ ...base, fontSize: 11, color: "#94a3b8" }),
    valueContainer: (base) => ({ ...base, padding: "1px 6px" }),
    indicatorsContainer: (base) => ({ ...base, paddingRight: 6 }),
    dropdownIndicator: (base) => ({ ...base, color: "#64748b" }),
    clearIndicator: (base) => ({ ...base, color: "#64748b" }),
    menu: (base) => ({ ...base, zIndex: 30 }),
    menuPortal: (base) => ({ ...base, zIndex: 9999 }),
    input: (base) => ({ ...base, fontSize: 12 }),
  };

  const formatOptionLabel = (option) => (
    <div className="flex items-center gap-2">
      <span>{option.label}</span>
    </div>
  );

  const formatMultiValueLabel = (option) => (
    <div className="flex items-center gap-1">
      <span>{option.label}</span>
    </div>
  );

  return (
    <div className={className}>
      <Select
        isMulti
        isDisabled={disabled}
        options={reactOptions}
        value={reactValue}
        onChange={(items) => onChange(Array.isArray(items) ? items.map((i) => i.value) : [])}
        placeholder={placeholder}
        classNamePrefix="select"
        styles={styles}
        closeMenuOnSelect={false}
        hideSelectedOptions={false}
        menuPosition="fixed"
        menuPortalTarget={typeof window !== "undefined" ? document.body : undefined}
        isClearable={false}
        formatOptionLabel={formatOptionLabel}
        formatMultiValueLabel={formatMultiValueLabel}
      />
    </div>
  );
}
