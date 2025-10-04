export function KPICard({ title, value, subtitle }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow">
      <div className="text-xs uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {subtitle && <div className="mt-1 text-xs text-slate-500">{subtitle}</div>}
    </div>
  );
}
