import { useCallback, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AppShell, PageHeader } from "../components/AppShell.jsx";
import { Dashboard } from "./components/Dashboard.jsx";
import { Entrada } from "./components/Entrada.jsx";
import { Historico } from "./components/Historico.jsx";
import { Projecoes } from "./components/Projecoes.jsx";
import { KPICard, resolveTone } from "../components/KPICard.jsx";
import { Tabs } from "../components/Tab.jsx";
import { ActionButton } from "../components/ActionButton.jsx";
import { ImportModal } from "../components/ImportModal.jsx";
import { ConfirmDialog } from "../components/Modal.jsx";
import { useToast } from "../components/Toast.jsx";
import { useUnifiedStore } from "../store/unifiedStore.js";
import { usePrefs } from "../theme/PrefsProvider.jsx";
import { useOfflineMode } from "../hooks/useOfflineMode.js";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
  PlusIcon,
  TableCellsIcon,
  TrendingUpIcon,
} from "../components/icons.jsx";
import { fmtBRL, fmtDate, fmtPct, toNumber, todayISO } from "../utils/formatters.js";
import { MAX_YIELD_GAP_MONTHS, computeDerivedEntries, createDraftEntry, makeId } from "../utils/entries.js";
import {
  buildInvestmentTimeline,
  computeCurrentPosition,
  findDuplicateSnapshots,
  lastSnapshotsList,
  summarizeTimeline,
} from "../utils/investmentAnalytics.js";
import { applyImport, buildInvestmentsTemplate, exportStoreJson } from "../utils/importExport.js";
import { download } from "../utils/formatters.js";
import { ensureBankInLibrary, resolveBankVisual } from "./config/banks.js";
import { ensureSourceInLibrary, resolveSourceVisual } from "./config/sources.js";

const TABS = ["dashboard", "historico", "entrada", "projecoes"];

export default function InvestmentsApp() {
  const navigate = useNavigate();
  const { tab: tabParam } = useParams();
  const { store, ready, setStore, updateInvestments } = useUnifiedStore();
  const { prefs, setPref } = usePrefs();
  const { toast, showToast } = useToast();
  useOfflineMode();

  const investmentData = store.investimentos;
  const { entries, banks, sources, settings } = investmentData;

  const tab = TABS.includes(tabParam)
    ? tabParam
    : TABS.includes(settings.defaultTab)
    ? settings.defaultTab
    : "dashboard";
  const setTab = useCallback(
    (next) => navigate(next === "dashboard" ? "/investimentos" : `/investimentos/${next}`),
    [navigate]
  );

  const [drafts, setDrafts] = useState(() => [createDraftEntry()]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const singleSource = settings.sourceMode !== "multiple";
  const fixedSource = settings.defaultSource || sources[0]?.name || "";
  const groupBy = singleSource ? "bank" : prefs.investmentsGroupBy || "bank";
  const aggregation = prefs.investmentsAggregation || "carry";

  const derivedEntries = useMemo(() => computeDerivedEntries(entries), [entries]);
  const timeline = useMemo(
    () => buildInvestmentTimeline(entries, { aggregation, groupBy }),
    [entries, aggregation, groupBy]
  );
  const position = useMemo(() => computeCurrentPosition(entries), [entries]);
  const summary = useMemo(() => summarizeTimeline(timeline), [timeline]);
  const lastSnapshots = useMemo(() => lastSnapshotsList(entries), [entries]);

  const colorFor = useCallback(
    (name) => (groupBy === "source" ? resolveSourceVisual(name, sources) : resolveBankVisual(name, banks)),
    [groupBy, banks, sources]
  );

  const addBank = useCallback(
    (bank) =>
      updateInvestments((prev) =>
        prev.banks.some((b) => b.name.toLowerCase() === bank.name.toLowerCase()) ? prev : { ...prev, banks: [...prev.banks, bank] }
      ),
    [updateInvestments]
  );

  const setEntries = useCallback(
    (updater) => {
      updateInvestments((prev) => {
        const current = Array.isArray(prev.entries) ? prev.entries : [];
        const candidate = typeof updater === "function" ? updater(current) : updater;
        const nextEntries = Array.isArray(candidate) ? candidate : [];
        return {
          ...prev,
          entries: nextEntries,
          banks: mergeBanksFromEntries(nextEntries, prev.banks),
          sources: mergeSourcesFromEntries(nextEntries, prev.sources),
        };
      });
    },
    [updateInvestments]
  );

  function prepareRows(rows) {
    return rows
      .filter((row) => row.bank && row.bank.trim() && row.date)
      .map((row) => ({
        id: makeId(),
        bank: row.bank.trim(),
        source: singleSource ? fixedSource : row.source?.trim() || "",
        date: row.date,
        invested: toNumber(row.invested),
        inAccount: toNumber(row.inAccount),
        cashFlow: toNumber(row.cashFlow),
        note: row.note || "",
      }));
  }

  function handleSubmitDrafts(rows, { replaceDuplicates = false } = {}) {
    const prepared = prepareRows(rows);
    if (!prepared.length) {
      showToast("Preencha pelo menos Banco e Data em uma linha.", { tone: "error" });
      return;
    }
    const duplicates = findDuplicateSnapshots(entries, prepared);
    const removeIds = new Set(replaceDuplicates ? duplicates.map((d) => d.existing.id) : []);
    const toAdd = replaceDuplicates ? prepared : prepared.filter((p) => !duplicates.some((d) => d.draft === p));
    setEntries((prev) => [...prev.filter((e) => !removeIds.has(e.id)), ...toAdd]);
    const lastDate = prepared.at(-1)?.date || todayISO();
    setDrafts([createDraftEntry({ date: lastDate, source: prepared.at(-1)?.source || "" })]);
    showToast(
      `${toAdd.length} lançamento(s) salvo(s)${removeIds.size ? `, ${removeIds.size} substituído(s)` : ""}.`,
      { tone: "success" }
    );
    setTab("historico");
  }

  function duplicateToToday(entry) {
    const draft = createDraftEntry({
      bank: entry.bank,
      source: entry.source,
      invested: entry.invested,
      inAccount: entry.inAccount,
      cashFlow: 0,
      date: todayISO(),
    });
    setDrafts((prev) => {
      const empty = prev.length === 1 && !prev[0].bank && !toNumber(prev[0].invested);
      return empty ? [draft] : [...prev, draft];
    });
    setTab("entrada");
    showToast(`${entry.bank} copiado para o formulário com a data de hoje.`);
  }

  function exportJson() {
    exportStoreJson(store);
    showToast("Backup JSON exportado.", { tone: "success" });
  }

  function downloadTemplate() {
    download("template_investimentos.json", JSON.stringify(buildInvestmentsTemplate(), null, 2));
  }

  function handleImport(analysis, mode) {
    const { store: nextStore, report } = applyImport(store, analysis, mode);
    setStore(nextStore);
    setImportModalOpen(false);
    showToast(
      mode === "replace"
        ? "Dados importados (substituição)."
        : `Importação concluída: ${report.entriesAdded} lançamento(s) e ${report.expensesAdded} transação(ões) novas.`,
      { tone: "success" }
    );
  }

  function clearEntries() {
    updateInvestments((prev) => ({ ...prev, entries: [] }));
    showToast("Lançamentos de investimentos removidos.");
  }

  const projectionDefaults = useMemo(
    () => ({
      initialBalance: position.total || 0,
      monthlyContribution: Math.max(summary.cashFlowLast12 / Math.max(1, Math.min(12, timeline.length)) || 0, 0),
      monthlyReturn: summary.avgMonthlyPct ?? summary.last?.yieldPct ?? 0.008,
      inflationRate: 0.04,
      contributionGrowth: 0.02,
      goalAmount: position.total > 0 ? Math.ceil((position.total * 2) / 10000) * 10000 : 100000,
    }),
    [position.total, summary, timeline.length]
  );

  const last = summary.last;
  const lastGroups = last?.groups || [];

  return (
    <AppShell>
      {toast}
      <PageHeader
        title="Investimentos"
        description="Registre o saldo de cada banco por data. O rendimento é calculado automaticamente a partir dos aportes e retiradas."
      >
        <ActionButton icon={ArrowDownTrayIcon} onClick={exportJson} title="Baixa um backup JSON com todos os dados (investimentos e gastos)">
          Exportar
        </ActionButton>
        <ActionButton icon={ArrowUpTrayIcon} onClick={() => setImportModalOpen(true)} title="Importa um backup JSON ou template">
          Importar
        </ActionButton>
        <Link to="/investimentos/relatorio" className="btn" title="Resumo imprimível e PDF">
          <DocumentArrowDownIcon className="h-4 w-4" />
          Relatório
        </Link>
      </PageHeader>

      <Tabs
        className="mb-4"
        tabs={[
          { key: "dashboard", label: "Dashboard", icon: <ChartBarIcon className="h-4 w-4" />, tooltip: "Indicadores e gráficos" },
          { key: "historico", label: "Histórico", icon: <TableCellsIcon className="h-4 w-4" />, tooltip: "Todos os lançamentos", badge: entries.length },
          { key: "entrada", label: "Nova Entrada", icon: <PlusIcon className="h-4 w-4" />, tooltip: "Registrar saldos" },
          { key: "projecoes", label: "Projeções", icon: <TrendingUpIcon className="h-4 w-4" />, tooltip: "Simule cenários futuros" },
        ]}
        activeTab={tab}
        onChange={setTab}
      />

      <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard
          title="Patrimônio atual"
          value={fmtBRL(position.total)}
          subtitle={
            position.asOf
              ? `Último saldo de cada banco · ${fmtDate(position.asOf)} · investido ${fmtBRL(position.invested)}`
              : "Sem lançamentos"
          }
          delta={summary.totalDelta}
          hoverDetails={position.banks.map((b) => ({
            name: b.name,
            value: b.total,
            percentage: b.percentage,
            color: resolveBankVisual(b.name, banks).color,
            icon: resolveBankVisual(b.name, banks).icon,
          }))}
          tooltip="Soma do último saldo registrado de cada banco. Clique para ver por banco."
        />
        <KPICard
          title="Rendimento no mês"
          value={last && last.yieldValue !== null ? fmtBRL(last.yieldValue) : "–"}
          secondaryValue={last && last.yieldPct !== null ? fmtPct(last.yieldPct) : ""}
          tone={resolveTone(last?.yieldValue)}
          subtitle={
            !last
              ? "Registre dois meses para calcular"
              : last.yieldValue === null && last.yieldGapBanks
              ? `${last.label}: saldo anterior há mais de ${MAX_YIELD_GAP_MONTHS} meses, rendimento não calculado`
              : last.yieldGapBanks
              ? `Referente a ${last.label} · ${last.yieldGapBanks} banco(s) sem rendimento (intervalo > ${MAX_YIELD_GAP_MONTHS} meses)`
              : `Referente a ${last.label}`
          }
          hoverDetails={lastGroups
            .filter((g) => g.yieldValue)
            .map((g) => ({ name: g.name, value: g.yieldValue, color: colorFor(g.name).color }))}
          tooltip="Variação do total menos aportes e retiradas, comparado ao saldo anterior de cada banco."
        />
        <KPICard
          title="Aportes / retiradas no mês"
          value={fmtBRL(last?.cashFlow ?? 0)}
          tone={resolveTone(last?.cashFlow)}
          subtitle={last ? `Período ${last.label}` : "Sem dados do mês"}
          hoverDetails={lastGroups.filter((g) => g.cashFlow).map((g) => ({ name: g.name, value: g.cashFlow, color: colorFor(g.name).color }))}
          tooltip="Soma do campo Aporte/Retirada informado nos lançamentos do mês."
        />
        <KPICard
          title="Rendimento 12 meses"
          value={fmtBRL(summary.yieldLast12)}
          tone={resolveTone(summary.yieldLast12)}
          secondaryValue={summary.avgMonthlyPct !== null ? `média ${fmtPct(summary.avgMonthlyPct)}/mês` : ""}
          subtitle={`Aportes líquidos no período: ${fmtBRL(summary.cashFlowLast12)}`}
          tooltip="Soma dos rendimentos mensais dos últimos 12 meses registrados."
        />
      </section>

      {tab === "dashboard" && (
        <Dashboard
          timeline={timeline}
          position={position}
          groupBy={groupBy}
          onGroupByChange={(value) => setPref("investmentsGroupBy", value)}
          aggregation={aggregation}
          onAggregationChange={(value) => setPref("investmentsAggregation", value)}
          colorFor={colorFor}
          banks={banks}
          sources={sources}
          singleSource={singleSource}
        />
      )}

      {tab === "historico" && (
        <Historico
          entries={entries}
          computedEntries={derivedEntries}
          setEntries={setEntries}
          banks={banks}
          sources={sources}
          onClearAll={() => setConfirmClear(true)}
          onDuplicate={duplicateToToday}
          onGoToEntry={() => setTab("entrada")}
          singleSource={singleSource}
          onCreateBank={addBank}
        />
      )}

      {tab === "entrada" && (
        <Entrada
          drafts={drafts}
          setDrafts={setDrafts}
          onSubmit={handleSubmitDrafts}
          banks={banks}
          sources={sources}
          entries={entries}
          lastSnapshots={lastSnapshots}
          singleSource={singleSource}
          fixedSource={fixedSource}
          onCreateBank={addBank}
        />
      )}

      {tab === "projecoes" && <Projecoes key={ready ? "ready" : "loading"} timeline={timeline} defaults={projectionDefaults} />}

      {!ready && <p className="mt-6 text-center text-xs text-muted">Carregando dados...</p>}

      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onApply={handleImport}
        onDownloadTemplate={downloadTemplate}
        templateLabel="Template de investimentos"
      />
      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={clearEntries}
        title="Apagar todos os lançamentos de investimentos?"
        message="Bancos, fontes e os dados de gastos são mantidos. Esta ação não pode ser desfeita; exporte um backup antes."
        confirmLabel="Apagar lançamentos"
        danger
      />
    </AppShell>
  );
}

function mergeBanksFromEntries(entries, baseBanks = []) {
  let next = Array.isArray(baseBanks) ? [...baseBanks] : [];
  for (const entry of entries) {
    next = ensureBankInLibrary(entry.bank, next);
  }
  return next;
}

function mergeSourcesFromEntries(entries, baseSources = []) {
  let next = Array.isArray(baseSources) ? [...baseSources] : [];
  for (const entry of entries) {
    next = ensureSourceInLibrary(entry.source, next);
  }
  return next;
}
