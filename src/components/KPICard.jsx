import { useState } from "react";
import { fmtBRL, fmtPct } from "../utils/formatters.js";

const tones = {
  neutral: "text-ink",
  positive: "text-pos",
  negative: "text-neg",
  accent: "text-accent",
};

export function resolveTone(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "neutral";
  if (Number(value) < 0) return "negative";
  if (Number(value) > 0) return "positive";
  return "neutral";
}

/**
 * KPI tile. `delta` shows month-over-month change; `details` opens a small list on click.
 */
export function KPICard({
  title,
  value,
  secondaryValue,
  subtitle,
  tone = "neutral",
  delta,
  deltaLabel = "vs. mês anterior",
  hoverDetails = [],
  tooltip,
  icon,
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const toneClass = tones[tone] ?? tones.neutral;
  const details = Array.isArray(hoverDetails) ? hoverDetails.filter((d) => d && d.name) : [];
  const hasDetails = details.length > 0;
  const deltaTone = delta === null || delta === undefined ? null : delta >= 0 ? "text-pos" : "text-neg";

  return (
    <div
      className={`card relative ${compact ? "p-3" : "p-4"} ${hasDetails ? "cursor-pointer" : ""}`}
      title={tooltip || (hasDetails ? "Clique para ver a composição" : undefined)}
      onClick={hasDetails ? () => setOpen((v) => !v) : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted">{title}</div>
        {icon && <span className="text-faint">{icon}</span>}
      </div>
      <div className={`num mt-1 ${compact ? "text-lg" : "text-xl"} font-semibold ${toneClass}`}>{value}</div>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
        {secondaryValue && <span className={`num font-semibold ${toneClass}`}>{secondaryValue}</span>}
        {deltaTone && (
          <span className={`num font-medium ${deltaTone}`}>
            {delta >= 0 ? "▲" : "▼"} {fmtPct(Math.abs(delta), 1)} <span className="text-faint">{deltaLabel}</span>
          </span>
        )}
      </div>
      {subtitle && <div className="mt-1 text-[0.72rem] text-muted">{subtitle}</div>}
      {hasDetails && open && (
        <ul className="mt-3 space-y-1 border-t border-line pt-2 text-xs fade-in">
          {details.map((detail) => (
            <li key={detail.name} className="flex items-center justify-between gap-2 text-muted">
              <span className="flex items-center gap-1.5 truncate">
                {detail.color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: detail.color }} />}
                {detail.icon && <span aria-hidden="true">{detail.icon}</span>}
                <span className="truncate">{detail.name}</span>
              </span>
              <span className="num shrink-0 font-semibold text-ink">
                {fmtBRL(detail.value ?? detail.invested ?? detail.total ?? 0)}
                {detail.percentage != null ? <span className="ml-1 text-faint">({detail.percentage}%)</span> : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
