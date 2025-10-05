import { useMemo } from "react";
import { Dashboard } from "./Dashboard.jsx";
import { KPICard } from "./KPICard.jsx";
import { fmtBRL, fmtPct, monthLabel, toNumber, yyyymm } from "../utils/formatters.js";

export function ReportView({
  personalInfo = {},
  totals = {},
  timeline = [],
  sourceSummary = [],
  sources = [],
  entries = [],
  exportedAt = new Date(),
  notes = "",
}) {
  const lastMonth = timeline.at(-1);
  const hoverSourceDetails = useMemo(() => {
    if (!lastMonth || !Array.isArray(lastMonth.sources)) return sourceSummary || [];
    const totalMonthInvested = lastMonth.sources.reduce((acc, item) => acc + (item?.invested ?? 0), 0);
    const list = lastMonth.sources
      .filter((item) => (item?.invested ?? 0) > 0)
      .map((item) => ({
        name: item.name || "Outros",
        invested: item.invested ?? 0,
        percentage: totalMonthInvested ? Math.round(((item.invested ?? 0) / totalMonthInvested) * 100) : null,
      }))
      .sort((a, b) => (b.invested ?? 0) - (a.invested ?? 0));
    return list.length ? list : (sourceSummary || []);
  }, [lastMonth, sourceSummary]);

  const groups = useMemo(() => {
    const map = new Map();
    for (const entry of entries) {
      const key = yyyymm(entry.date);
      if (!key) continue;
      const arr = map.get(key) || [];
      arr.push(entry);
      map.set(key, arr);
    }
    return Array.from(map.entries())
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([ym, arr]) => ({ ym, label: monthLabel(ym), items: arr }));
  }, [entries]);

  const dateLabel = new Date(exportedAt).toLocaleString("pt-BR");

  return (
    <div style={{ width: 794, background: "white", color: "#0f172a" }} className="mx-auto">
      <style>{`
        .pdf-section { page-break-inside: avoid; }
        .pdf-break-before { page-break-before: always; }
        .pdf-avoid-break { page-break-inside: avoid; }
        .pdf-table th, .pdf-table td { border-bottom: 1px solid #e2e8f0; padding: 6px 8px; font-size: 12px; }
        .pdf-table th { background: #f8fafc; text-align: left; }
        .pdf-title { font-weight: 700; font-size: 20px; }
        .pdf-subtitle { color: #475569; font-size: 12px; }
        .pdf-h2 { font-weight: 600; font-size: 14px; margin: 12px 0 8px; }
        .pdf-chip { display: inline-block; border: 1px solid #e2e8f0; border-radius: 999px; padding: 2px 8px; margin: 2px 6px 0 0; font-size: 12px; }
      `}</style>

      <header className="pdf-section" style={{ padding: 16, paddingBottom: 8 }}>
        <div className="pdf-title">Relatório de Investimentos</div>
        <div className="pdf-subtitle">Gerado em {dateLabel}</div>
      </header>

      {personalInfo && Object.values(personalInfo).some((v) => v) && (
        <section className="pdf-section" style={{ padding: 16, paddingTop: 8 }}>
          <div className="pdf-h2">Informações pessoais</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.entries(personalInfo)
              .filter(([, value]) => value)
              .map(([key, value]) => (
                <span key={key} className="pdf-chip">
                  {toLabel(key)}: {value}
                </span>
              ))}
          </div>
        </section>
      )}

      <section className="pdf-section" style={{ padding: 16 }}>
        <div className="pdf-h2">Resumo</div>
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Investido último mês"
            value={fmtBRL(lastMonth?.invested ?? 0)}
            subtitle={lastMonth ? `Referente a ${lastMonth.label}` : "Sem dados do mês"}
            hoverDetails={hoverSourceDetails}
          />
          <KPICard
            title="Rendimento último mês"
            value={lastMonth && lastMonth.yieldValue != null ? fmtBRL(lastMonth.yieldValue) : "–"}
            secondaryValue={lastMonth && lastMonth.yieldPct != null ? fmtPct(lastMonth.yieldPct) : ""}
            subtitle={lastMonth ? `Período ${lastMonth.label}` : "Sem dados do mês"}
            hoverDetails={(lastMonth?.sources || []).map((s) => ({ name: s.name, total: s.yieldValue }))}
          />
          <KPICard
            title="Entrada/Saída último mês"
            value={fmtBRL(lastMonth?.cashFlow ?? 0)}
            subtitle={lastMonth ? `Período ${lastMonth.label}` : "Sem dados do mês"}
            hoverDetails={(lastMonth?.sources || []).map((s) => ({ name: s.name, total: s.cashFlow }))}
          />
          <KPICard
            title="Total em Conta último mês"
            value={fmtBRL(lastMonth?.inAccount ?? 0)}
            subtitle={lastMonth ? `Período ${lastMonth.label}` : "Sem dados do mês"}
          />
        </div>
      </section>

      <section className="pdf-section" style={{ padding: 16 }}>
        <div className="pdf-h2">Gráficos</div>
        <Dashboard monthly={timeline} sourceSummary={sourceSummary} sources={sources} />
      </section>

      {String(notes || "").trim() && (
        <section className="pdf-section" style={{ padding: 16 }}>
          <div className="pdf-h2">Observações</div>
          <ul style={{ marginLeft: 16 }}>
            {String(notes)
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line, idx) => (
                <li key={idx} style={{ fontSize: 12, color: "#334155" }}>- {line}</li>
              ))}
          </ul>
        </section>
      )}

      <section className="pdf-section pdf-break-before" style={{ padding: 16 }}>
        <div className="pdf-h2">Histórico de lançamentos</div>
        {groups.length === 0 ? (
          <div className="pdf-subtitle">Sem lançamentos registrados até o momento.</div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {groups.map((group) => (
              <div key={group.ym} className="pdf-avoid-break">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ fontWeight: 600 }}>{group.label}</div>
                  <MonthTotals items={group.items} />
                </div>
                <table className="pdf-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>Banco</th>
                      <th>Fonte</th>
                      <th style={{ textAlign: "right" }}>Valor na Conta</th>
                      <th style={{ textAlign: "right" }}>Valor em Investimentos</th>
                      <th style={{ textAlign: "right" }}>Entrada/Saída</th>
                      <th style={{ textAlign: "right" }}>Rendimento (R$)</th>
                      <th style={{ textAlign: "right" }}>Rendimento (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.items
                      .slice()
                      .sort((a, b) => (a.date < b.date ? 1 : -1))
                      .map((entry) => (
                        <tr key={entry.id}>
                          <td>{new Date(entry.date).toLocaleDateString("pt-BR")}</td>
                          <td>{entry.bank}</td>
                          <td>{entry.source || "—"}</td>
                          <td style={{ textAlign: "right" }}>{fmtBRL(entry.inAccount)}</td>
                          <td style={{ textAlign: "right" }}>{fmtBRL(entry.invested)}</td>
                          <td style={{ textAlign: "right" }}>{fmtBRL(entry.cashFlow)}</td>
                          <td style={{ textAlign: "right" }}>
                            {entry.yieldValue != null ? fmtBRL(entry.yieldValue) : ""}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {entry.yieldPct != null ? fmtPct(entry.yieldPct) : ""}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MonthTotals({ items }) {
  const totals = items.reduce(
    (acc, entry) => {
      acc.invested += toNumber(entry.invested);
      acc.inAccount += toNumber(entry.inAccount);
      acc.cashFlow += toNumber(entry.cashFlow);
      if (entry.yieldValue !== null && entry.yieldValue !== undefined) {
        acc.yieldValue += toNumber(entry.yieldValue);
      }
      return acc;
    },
    { invested: 0, inAccount: 0, cashFlow: 0, yieldValue: 0 }
  );
  return (
    <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#475569" }}>
      <span>
        Investido: <strong style={{ color: "#0f172a" }}>{fmtBRL(totals.invested)}</strong>
      </span>
      <span>
        Em Conta: <strong style={{ color: "#0f172a" }}>{fmtBRL(totals.inAccount)}</strong>
      </span>
      <span>
        Entradas: <strong style={{ color: toneColor(totals.cashFlow) }}>{fmtBRL(totals.cashFlow)}</strong>
      </span>
      <span>
        Rendimento: <strong style={{ color: toneColor(totals.yieldValue) }}>{fmtBRL(totals.yieldValue)}</strong>
      </span>
    </div>
  );
}

function toneColor(value) {
  const numeric = toNumber(value);
  if (numeric > 0) return "#059669"; // emerald-600
  if (numeric < 0) return "#dc2626"; // red-600
  return "#0f172a"; // slate-900
}

function toLabel(key) {
  const map = {
    fullName: "Nome completo",
    email: "E-mail",
    document: "Documento",
    phone: "Telefone",
  };
  return map[key] || key;
}

export default ReportView;
