import { fmtBRL } from "../utils/formatters.js";

const tones = {
  neutral: "text-slate-900",
  positive: "text-emerald-600",
  negative: "text-red-600",
};

export function KPICard({ title, value, secondaryValue, subtitle, tone = "neutral", hoverDetails = [], tooltip }) {
  const toneClass = tones[tone] ?? tones.neutral;
  const details = Array.isArray(hoverDetails) ? hoverDetails : [];
  const hasHoverDetails = details.length > 0;
  const tooltipMessage = tooltip || (hasHoverDetails ? "Passe o mouse para ver detalhes da composição" : undefined);
  const shouldScroll = details.length > 6;
  const scrollDuration = Math.max(details.length * 1.2, 8);

  return (
    <div className="group rounded-xl bg-white p-3 shadow-sm" title={tooltipMessage}>
      <div className="text-[0.65rem] uppercase tracking-wide text-slate-500">{title}</div>
      <div className={`mt-1 text-lg font-semibold ${toneClass} ${hasHoverDetails ? "group-hover:hidden" : ""}`}>{value}</div>
      {secondaryValue && (
        <div className={`text-xs font-semibold ${toneClass} ${hasHoverDetails ? "group-hover:hidden" : ""}`}>{secondaryValue}</div>
      )}
      {hasHoverDetails && (
        <div className="hidden group-hover:block">
          {shouldScroll ? (
            <div className="relative mt-2 h-28 overflow-hidden text-xs">
              <style>{`
@keyframes vertical-marquee { from { transform: translateY(0); } to { transform: translateY(-50%); } }
`}</style>
              <div
                className="absolute left-0 top-0 w-full"
                style={{ animation: `vertical-marquee ${scrollDuration}s linear infinite` }}
              >
                <ul className="space-y-1">
                  {details.concat(details).map((detail, idx) => (
                    <li key={`${detail.name}-${idx}`} className="flex items-center justify-between text-slate-600">
                      <span className="font-medium text-slate-700">{detail.name}</span>
                      <span className="font-semibold text-slate-900">
                        {fmtBRL(detail.invested ?? detail.total ?? 0)}
                        {detail.percentage != null ? ` (${detail.percentage}%)` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <ul className="mt-2 space-y-1 text-xs">
              {details.map((detail) => (
                <li key={detail.name} className="flex items-center justify-between text-slate-600">
                  <span className="font-medium text-slate-700">{detail.name}</span>
                  <span className="font-semibold text-slate-900">
                    {fmtBRL(detail.invested ?? detail.total ?? 0)}
                    {detail.percentage != null ? ` (${detail.percentage}%)` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {subtitle && <div className="mt-1 text-[0.7rem] text-slate-500">{subtitle}</div>}
    </div>
  );
}
