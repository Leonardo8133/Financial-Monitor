export function ActionButton({ children, icon: Icon, className = "", type = "button", variant = "default", ...props }) {
  const base = variant === "primary" ? "btn-primary" : variant === "danger" ? "btn-danger" : variant === "ghost" ? "btn-ghost" : "btn";
  return (
    <button type={type} className={`${base} ${className}`} {...props}>
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  );
}
