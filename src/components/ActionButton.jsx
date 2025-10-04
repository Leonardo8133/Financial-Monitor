export function ActionButton({ children, icon: Icon, className = '', type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={`inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:border-slate-300 hover:text-slate-900 ${className}`}
      {...props}
    >
      {Icon && <Icon className="h-5 w-5" />}
      {children}
    </button>
  )
}