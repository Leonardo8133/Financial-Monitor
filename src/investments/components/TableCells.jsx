export function Th({ children, className = "", align = "left", onClick, title, sortable, active, direction }) {
  const alignCls = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th
      className={`px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-wide text-muted ${alignCls} ${
        sortable ? "cursor-pointer select-none hover:text-ink" : ""
      } ${className}`}
      onClick={onClick}
      title={title}
      aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : undefined}
    >
      {children}
      {sortable && active ? <span className="ml-1 text-accent">{direction === "asc" ? "↑" : "↓"}</span> : null}
    </th>
  );
}

export function Td({ children, align = "left", className = "" }) {
  const alignCls = align === "right" ? "text-right num" : align === "center" ? "text-center" : "text-left";
  return <td className={`px-3 py-2 align-middle ${alignCls} ${className}`}>{children}</td>;
}
