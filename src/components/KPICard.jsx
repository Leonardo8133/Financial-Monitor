const tones = {
  neutral: "text-slate-900",
  positive: "text-emerald-600",
  negative: "text-red-600",
};

export function KPICard({ title, value, secondaryValue, subtitle, tone = "neutral" }) {
  const toneClass = tones[tone] ?? tones.neutral;
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm">
      <div className="text-[0.65rem] uppercase tracking-wide text-slate-500">{title}</div>
      <div className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</div>
      {secondaryValue && <div className={`text-xs font-semibold ${toneClass}`}>{secondaryValue}</div>}
      {subtitle && <div className="mt-1 text-[0.7rem] text-slate-500">{subtitle}</div>}
    </div>
  );
}
