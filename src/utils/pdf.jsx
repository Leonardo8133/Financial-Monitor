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
    width: 120,
  },
  tableCellRight: {
    borderStyle: "solid",
    borderColor: "#d1d5db",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 10,
    textAlign: "right",
    width: 90,
  },
  tableCellCategory: {
    borderStyle: "solid",
    borderColor: "#d1d5db",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 4,
    fontSize: 10,
    width: 150,
  },
  tableHeaderCell: {
    fontWeight: "bold",
    backgroundColor: "#f3f4f6",
  },
  tableHeaderCellRight: {
    fontWeight: "bold",
    backgroundColor: "#f3f4f6",
    textAlign: "right",
    width: 90,
  },
  tableHeaderCellCategory: {
    fontWeight: "bold",
    backgroundColor: "#f3f4f6",
    width: 150,
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

function renderTable(headers, rows, columnAlignments = []) {
  if (!rows.length) return null;
  return (
    <View style={[styles.table, styles.section]} wrap>
      <View style={styles.tableRow}>
        {headers.map((header, index) => {
          const alignment = columnAlignments[index];
          let cellStyle, headerStyle;
          
          if (alignment === 'right') {
            cellStyle = styles.tableCellRight;
            headerStyle = styles.tableHeaderCellRight;
          } else if (alignment === 'category') {
            cellStyle = styles.tableCellCategory;
            headerStyle = styles.tableHeaderCellCategory;
          } else {
            cellStyle = styles.tableCell;
            headerStyle = styles.tableHeaderCell;
          }
          
          return (
            <Text 
              key={`header-${index}`} 
              style={[cellStyle, headerStyle]}
            >
              {header}
            </Text>
          );
        })}
      </View>
      {rows.map((row, rowIndex) => (
        <View key={`row-${rowIndex}`} style={styles.tableRow}>
          {row.map((cell, cellIndex) => {
            const alignment = columnAlignments[cellIndex];
            let cellStyle;
            
            if (alignment === 'right') {
              cellStyle = styles.tableCellRight;
            } else if (alignment === 'category') {
              cellStyle = styles.tableCellCategory;
            } else {
              cellStyle = styles.tableCell;
            }
            
            return (
              <Text 
                key={`cell-${rowIndex}-${cellIndex}`} 
                style={cellStyle}
              >
                {cell}
              </Text>
            );
          })}
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

function groupByCategory(items = []) {
  const map = new Map();
  (items || []).forEach((expense) => {
    const key = expense.category || "Sem categoria";
    const value = Number(expense.value ?? expense.absValue ?? 0);
    const total = map.get(key) || 0;
    map.set(key, total + Math.abs(value));
  });
  return Array.from(map.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total);
}

function monthCategoryRows(monthSummary) {
  if (!monthSummary) return [];
  const breakdown = groupByCategory(monthSummary.items || []);
  const monthsCount = Math.max(1, Math.floor(monthSummary.monthsWindow || 1));
  const monthlyAvg = item => item.total / monthsCount;
  return breakdown.map((item) => [item.name || "–", formatCurrency(monthlyAvg(item)), formatCurrency(item.total)]);
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
  monthsWindow = 12,
} = {}) {
  const headerSubtitleParts = [
    `Gerado em ${formatDateTime(exportedAt)}`,
    `Período considerado: últimos ${Math.max(1, Math.min(12, Math.floor(monthsWindow || 12)))} meses`,
  ];

  // Get the last month's invested amount from monthly summaries
  const lastMonthInvested = monthlySummaries.length > 0 ? monthlySummaries[0].invested || 0 : 0;
  
  const totalsRows = [
    [`Total investido (último mês)`, formatCurrency(lastMonthInvested)],
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
              renderTable(["Fonte", "Investido", "Em conta"], sourcesRows, ['category', 'right', 'right'])
            )
          : null}

        {monthlyRows.length
          ? renderSection(
              "Resumo mensal",
              renderTable(
                ["Mês", "Investido", "Em conta", "Fluxo", "Rentabilidade"],
                monthlyRows,
                ['left', 'right', 'right', 'right', 'right']
              )
            )
          : null}

        {entriesRows.length
          ? renderSection(
              "Lançamentos recentes",
              renderTable(
                ["Data", "Banco", "Fonte", "Investido", "Em conta", "Fluxo"],
                entriesRows,
                ['left', 'category', 'category', 'right', 'right', 'right']
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
  monthsWindow = 12,
} = {}) {
  const headerSubtitleParts = [
    `Gerado em ${formatDateTime(exportedAt)}`,
    `Período considerado: últimos ${Math.max(1, Math.min(12, Math.floor(monthsWindow || 12)))} meses`,
  ];

  const totalsRows = [[`Total gasto`, formatCurrency(totals.total_spent)]];
  const monthlyRows = expensesMonthlyRows(monthlySummaries);
  const expenseRows = expensesEntriesRows(expenses);
  const categoryRows = expensesBreakdownRows(categoryBreakdown);
  const sourceRows = expensesBreakdownRows(sourceBreakdown);

  const lastTwoMonths = Array.isArray(monthlySummaries) ? monthlySummaries.slice(0, 2) : [];
  // Enriquecer cada mês com o período selecionado para cálculo da média
  const enrichedMonths = lastTwoMonths.map(m => ({ ...m, monthsWindow }));

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

        {enrichedMonths.length
          ? renderSection(
              "Total gastos nos últimos 2 meses por categoria",
              <View>
                {enrichedMonths.map((m, idx) => (
                  <View key={`cat-month-${m.ym || idx}`}>
                    <Text style={[styles.listItem, { fontWeight: "bold", marginTop: 6 }]}>
                      {idx === 0 ? `Último mês (${m.label})` : m.label}
                    </Text>
                    {renderTable(["Categoria", "Média mensal", "Total"], monthCategoryRows(m), ['category', 'right', 'right'])}
                  </View>
                ))}
              </View>
            )
          : null}

        {categoryRows.length
          ? renderSection(
              "Por categoria",
              renderTable(["Categoria", "Total"], categoryRows, ['category', 'right'])
            )
          : null}

        {sourceRows.length
          ? renderSection("Por fonte", renderTable(["Fonte", "Total"], sourceRows, ['category', 'right']))
          : null}

        {monthlyRows.length
          ? renderSection("Resumo mensal", renderTable(["Mês", "Total gasto"], monthlyRows, ['left', 'right']))
          : null}

        {expenseRows.length
          ? renderSection(
              "Despesas recentes",
              renderTable(
                ["Data", "Descrição", "Categoria", "Fonte", "Valor"],
                expenseRows,
                ['left', 'category', 'category', 'category', 'right']
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

