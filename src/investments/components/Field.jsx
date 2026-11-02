export function Field({ label, children, className = "", helpText, hint, required }) {
  return (
    <label className={`block min-w-0 ${className}`} title={helpText}>
      <span className="label flex items-center gap-1">
        {label}
        {required && <span className="text-neg">*</span>}
        {helpText && (
          <span className="ml-auto cursor-help text-[0.6rem] text-faint" aria-label={helpText}>
            ?
          </span>
        )}
      </span>
      {children}
      {hint && <span className="mt-0.5 block text-[0.68rem] text-faint">{hint}</span>}
    </label>
  );
}
