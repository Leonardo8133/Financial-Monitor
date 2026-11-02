import { useId } from "react";

/**
 * Themed native <select>. Keyboard and screen-reader friendly, works on mobile.
 * Keeps the old API: onChange receives an event-like object with target.value.
 */
export function Select({
  value,
  onChange,
  options = [],
  placeholder = "",
  disabled = false,
  className = "",
  size = "md",
  label,
  id,
  ...props
}) {
  const autoId = useId();
  const selectId = id || autoId;
  const sizeClass = size === "sm" ? "py-1 pl-2 pr-7 text-xs" : size === "lg" ? "py-3 pl-4 pr-9 text-base" : "py-2 pl-3 pr-8 text-sm";
  const current = value === null || value === undefined ? "" : String(value);
  const hasCurrent = options.some((o) => String(o.value) === current);

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label htmlFor={selectId} className="label">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={selectId}
          value={hasCurrent ? current : ""}
          disabled={disabled}
          onChange={(event) => {
            const raw = event.target.value;
            const match = options.find((o) => String(o.value) === raw);
            onChange?.({ target: { value: match ? match.value : raw }, nativeEvent: event });
          }}
          className={`input appearance-none ${sizeClass} cursor-pointer`}
          {...props}
        >
          {(placeholder || !hasCurrent) && (
            <option value="" disabled={!placeholder}>
              {placeholder || "Selecione..."}
            </option>
          )}
          {options.map((option) => (
            <option key={String(option.value)} value={String(option.value)} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        <svg
          className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-faint"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

export default Select;
