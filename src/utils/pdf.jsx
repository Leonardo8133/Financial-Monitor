import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { monthLabel } from "./formatters.js";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 9.5, fontFamily: "Helvetica", color: "#1f2937" },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold" },
  subtitle: { marginTop: 3, fontSize: 9, color: "#6b7280" },
  kpiRow: { flexDirection: "row", gap: 8, marginTop: 14, marginBottom: 8 },
  kpi: { flex: 1, borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 6, padding: 8 },
  kpiLabel: { fontSize: 7, color: "#6b7280", textTransform: "uppercase" },
  kpiValue: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 2 },
  section: { marginTop: 12 },
  sectionTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 5 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  headerRow: { flexDirection: "row", backgroundColor: "#f3f4f6", borderBottomWidth: 1, borderBottomColor: "#d1d5db" },
  cell: { paddingHorizontal: 4, paddingVertical: 3, fontSize: 8.5 },
  headerCell: { fontFamily: "Helvetica-Bold", fontSize: 8 },
  muted: { fontSize: 9, color: "#6b7280" },
  notes: { marginTop: 12, fontSize: 9, color: "#374151" },
  footer: { position: "absolute", bottom: 18, left: 32, right: 32, fontSize: 7.5, color: "#9ca3af", textAlign: "center" },
});

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR");
}

function stripEmoji(text) {
  return String(text ?? "").replace(/[\p{Extended_Pictographic}️]/gu, "").trim();
}

function Table({ columns, rows, align = [] }) {
  if (!rows?.length) return <Text style={styles.muted}>Sem dados.</Text>;
  const widths = columns.map((_, i) => (align[i] === "right" ? 1 : i === 0 ? 1.4 : 1.6));
  const total = widths.reduce((a, b) => a + b, 0);
  const style = (i, header) => [
    styles.cell,
    header ? styles.headerCell : null,
    { width: `${(widths[i] / total) * 100}%`, textAlign: align[i] === "right" ? "right" : "left" },
  ];
  return (
    <View>
      <View style={styles.headerRow} fixed>
        {columns.map((c, i) => (
          <Text key={i} style={style(i, true)}>{c}</Text>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row} wrap={false}>
          {row.map((cell, ci) => (
            <Text key={ci} style={style(ci)}>{stripEmoji(cell)}</Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function ReportDocument({ report }) {
  const subtitle = [
    `Gerado em ${formatDateTime(report.generatedAt)}`,
    report.period ? `Período ${monthLabel(report.period.start)} – ${monthLabel(report.period.end)}` : null,
    report.personalInfo?.fullName ? stripEmoji(report.personalInfo.fullName) : null,
  ]
    .filter(Boolean)
    .join("  •  ");
  return (
    <Document title={report.title}>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{report.title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.kpiRow}>
          {report.kpis.map((k) => (
            <View key={k.label} style={styles.kpi}>
              <Text style={styles.kpiLabel}>{k.label}</Text>
              <Text style={styles.kpiValue}>{k.value}</Text>
              {k.sub ? <Text style={styles.muted}>{k.sub}</Text> : null}
            </View>
          ))}
        </View>
        {report.sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Table columns={section.columns} rows={section.rows} align={section.align} />
          </View>
        ))}
        {report.notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Observações</Text>
            <Text style={styles.notes}>{stripEmoji(report.notes)}</Text>
          </View>
        ) : null}
        <Text style={styles.footer} render={({ pageNumber, totalPages }) => `Monitor Financeiro · página ${pageNumber} de ${totalPages}`} fixed />
      </Page>
    </Document>
  );
}

export function createInvestmentReportDocument(report) {
  return <ReportDocument report={{ ...report, title: report.title || "Relatório de Investimentos" }} />;
}

export function createExpensesReportDocument(report) {
  return <ReportDocument report={{ ...report, title: report.title || "Relatório de Gastos" }} />;
}
