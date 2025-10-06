import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { fmtBRL, monthLabel } from "./formatters.js";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#1f2937",
  },
  header: {
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: "bold",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 10,
    color: "#6b7280",
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  muted: {
    fontSize: 10,
    color: "#6b7280",
  },
  listItem: {
    fontSize: 10,
    marginBottom: 4,
  },
  table: {
    display: "table",
    width: "auto",
    borderStyle: "solid",
    borderColor: "#d1d5db",
    borderWidth: 1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    flexDirection: "row",
  },
  tableCell: {
    borderStyle: "solid",
    borderColor: "#d1d5db",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 10,
    flexGrow: 1,
  },
  tableHeaderCell: {
    fontWeight: "bold",
    backgroundColor: "#f3f4f6",
  },
});

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("pt-BR");
}

function renderKeyValueList(data) {
  const entries = Object.entries(data || {});
  if (!entries.length) {
    return <Text style={styles.muted}>Nenhuma informação fornecida.</Text>;
  }

  return (
    <View>
      {entries.map(([key, value]) => (
        <Text key={key} style={styles.listItem}>{`${key}: ${value}`}</Text>
      ))}
    </View>
  );
}

function renderNotes(notes) {
  if (!notes) return null;
  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionTitle}>Observações</Text>
      {notes.split(/\r?\n/).map((line, index) => (
        <Text key={`note-${index}`} style={styles.listItem}>
          {line}
        </Text>
      ))}
    </View>
  );
}

function renderTable(headers, rows) {
  if (!rows.length) return null;
  return (
    <View style={[styles.table, styles.section]} wrap>
      <View style={styles.tableRow}>
        {headers.map((header, index) => (
          <Text key={`header-${index}`} style={[styles.tableCell, styles.tableHeaderCell]}>
            {header}
          </Text>
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.tableRow}>
          {row.map((cell, cellIndex) => (
            <Text key={`cell-${rowIndex}-${cellIndex}`} style={styles.tableCell}>
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

function formatCurrency(value) {
  return fmtBRL(value ?? 0);
}

function investmentMonthlyRows(monthlySummaries = []) {
  return monthlySummaries.map((item) => [
    item.label ?? monthLabel(item.ym),
    formatCurrency(item.invested),
    formatCurrency(item.inAccount),
    formatCurrency(item.cashFlow),
    item.yieldValue !== undefined && item.yieldValue !== null ? formatCurrency(item.yieldValue) : "–",
  ]);
}

function investmentEntriesRows(entries = []) {
  const limited = entries.slice(0, 25);
  if (!limited.length) return [];
  return limited.map((entry) => {
    const date = entry.date ? new Date(entry.date) : null;
    const dateLabel = date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("pt-BR") : "–";
    return [
      dateLabel,
      entry.bank || "–",
      entry.source || "–",
      formatCurrency(entry.invested),
      formatCurrency(entry.inAccount),
      formatCurrency(entry.cashFlow),
    ];
  });
}

function investmentSourceRows(breakdown = []) {
  if (!Array.isArray(breakdown) || !breakdown.length) return [];
  return breakdown.map((item) => [item.name || "–", formatCurrency(item.invested), formatCurrency(item.inAccount)]);
}

function expensesMonthlyRows(monthlySummaries = []) {
  return monthlySummaries.map((item) => [item.label ?? monthLabel(item.ym), formatCurrency(item.total)]);
}

function expensesEntriesRows(expenses = []) {
  const limited = expenses.slice(0, 30);
  if (!limited.length) return [];
  return limited.map((expense) => {
    const date = expense.date ? new Date(expense.date) : null;
    const dateLabel = date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString("pt-BR") : "–";
    return [
      dateLabel,
      expense.description || "–",
      expense.category || "–",
      expense.source || "–",
      formatCurrency(expense.value ?? expense.absValue),
    ];
  });
}

function expensesBreakdownRows(breakdown = []) {
  if (!Array.isArray(breakdown) || !breakdown.length) return [];
  return breakdown.map((item) => [item.name || "–", formatCurrency(item.total)]);
}

function renderSection(title, content) {
  if (!content) return null;
  return (
    <View style={styles.section} wrap>
      <Text style={styles.sectionTitle}>{title}</Text>
      {content}
    </View>
  );
}

export function createInvestmentReportDocument({
  exportedAt,
  personalInfo = {},
  totals = {},
  monthlySummaries = [],
  notes = "",
  entries = [],
  sourceBreakdown = [],
} = {}) {
  const headerSubtitleParts = [
    `Gerado em ${formatDateTime(exportedAt)}`,
    "Período considerado: últimos 12 meses",
  ];

  const totalsRows = [
    [`Total investido`, formatCurrency(totals.total_invested)],
    [`Total em conta`, formatCurrency(totals.total_in_account)],
    [`Entradas/Saídas`, formatCurrency(totals.total_input)],
    [
      `Rendimento acumulado`,
      totals.total_yield_value !== undefined && totals.total_yield_value !== null
        ? formatCurrency(totals.total_yield_value)
        : "–",
    ],
  ];

  const monthlyRows = investmentMonthlyRows(monthlySummaries);
  const entriesRows = investmentEntriesRows(entries);
  const sourcesRows = investmentSourceRows(sourceBreakdown);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} wrap={false}>
          <Text style={styles.title}>Relatório de Investimentos</Text>
          <Text style={styles.subtitle}>{headerSubtitleParts.join(" • ")}</Text>
        </View>

        {renderSection("Informações pessoais", renderKeyValueList(personalInfo))}

        {renderSection(
          "Totais consolidados",
          <View>
            {totalsRows.map(([label, value]) => (
              <Text key={label} style={styles.listItem}>{`${label}: ${value}`}</Text>
            ))}
          </View>
        )}

        {sourcesRows.length
          ? renderSection(
              "Distribuição por fonte",
              renderTable(["Fonte", "Investido", "Em conta"], sourcesRows)
            )
          : null}

        {monthlyRows.length
          ? renderSection(
              "Resumo mensal",
              renderTable(
                ["Mês", "Investido", "Em conta", "Fluxo", "Rentabilidade"],
                monthlyRows
              )
            )
          : null}

        {entriesRows.length
          ? renderSection(
              "Lançamentos recentes",
              renderTable(
                ["Data", "Banco", "Fonte", "Investido", "Em conta", "Fluxo"],
                entriesRows
              )
            )
          : renderSection(
              "Lançamentos recentes",
              <Text style={styles.muted}>Sem registros no período selecionado.</Text>
            )}

        {renderNotes(notes)}
      </Page>
    </Document>
  );
}

export function createExpensesReportDocument({
  exportedAt,
  personalInfo = {},
  totals = {},
  monthlySummaries = [],
  notes = "",
  expenses = [],
  categoryBreakdown = [],
  sourceBreakdown = [],
} = {}) {
  const headerSubtitleParts = [
    `Gerado em ${formatDateTime(exportedAt)}`,
    "Período considerado: últimos 12 meses",
  ];

  const totalsRows = [[`Total gasto`, formatCurrency(totals.total_spent)]];
  const monthlyRows = expensesMonthlyRows(monthlySummaries);
  const expenseRows = expensesEntriesRows(expenses);
  const categoryRows = expensesBreakdownRows(categoryBreakdown);
  const sourceRows = expensesBreakdownRows(sourceBreakdown);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} wrap={false}>
          <Text style={styles.title}>Relatório de Gastos</Text>
          <Text style={styles.subtitle}>{headerSubtitleParts.join(" • ")}</Text>
        </View>

        {renderSection("Informações pessoais", renderKeyValueList(personalInfo))}

        {renderSection(
          "Totais consolidados",
          <View>
            {totalsRows.map(([label, value]) => (
              <Text key={label} style={styles.listItem}>{`${label}: ${value}`}</Text>
            ))}
          </View>
        )}

        {categoryRows.length
          ? renderSection(
              "Por categoria",
              renderTable(["Categoria", "Total"], categoryRows)
            )
          : null}

        {sourceRows.length
          ? renderSection("Por fonte", renderTable(["Fonte", "Total"], sourceRows))
          : null}

        {monthlyRows.length
          ? renderSection("Resumo mensal", renderTable(["Mês", "Total gasto"], monthlyRows))
          : null}

        {expenseRows.length
          ? renderSection(
              "Despesas recentes",
              renderTable(
                ["Data", "Descrição", "Categoria", "Fonte", "Valor"],
                expenseRows
              )
            )
          : renderSection(
              "Despesas recentes",
              <Text style={styles.muted}>Sem registros no período selecionado.</Text>
            )}

        {renderNotes(notes)}
      </Page>
    </Document>
  );
}

