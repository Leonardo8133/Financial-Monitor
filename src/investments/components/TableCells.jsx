export function Th({ children, className = "" }) {
  return (
    <th className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-600 ${className}`}>
      {children}
    </th>
  );
}

export function Td({ children, align = "left" }) {
  return <td className={`px-3 py-2 text-${align}`}>{children}</td>;
}
