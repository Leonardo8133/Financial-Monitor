export function Field({ label, children, className = "", helpText, title }) {
  return (
    <label className={`block group relative ${className}`}>
      <div className="flex items-center gap-1 mb-1">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        {helpText && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              type="button"
              className="w-4 h-4 rounded-full bg-slate-400 text-white text-xs flex items-center justify-center hover:bg-slate-500 transition-colors"
              title={helpText}
            >
              ?
            </button>
          </div>
        )}
      </div>
      {children}
    </label>
  );
}
