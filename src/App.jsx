import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Dashboard } from "./components/Dashboard.jsx";
import { Entrada } from "./components/Entrada.jsx";
import { Historico } from "./components/Historico.jsx";
import { KPICard } from "./components/KPICard.jsx";
import { Tabs } from "./components/Tab.jsx";
import { ActionButton } from "./components/ActionButton.jsx";
import { BackToHomeButton } from "./components/BackToHomeButton.jsx";
import { ImportModal } from "./components/ImportModal.jsx";
import { Projecoes } from "./components/Projecoes.jsx";
import { useOfflineMode } from "./hooks/useOfflineMode.js";
// import { demoBanks, demoCreatedAt, demoEntries, demoSources } from "./data/demoEntries.js";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  ChartBarIcon,
  TableCellsIcon,
  PlusIcon,
  DocumentArrowDownIcon,
  TrendingUpIcon,
  SettingsIcon,
} from "./components/icons.jsx";
import { useLocalStorageState } from "./hooks/useLocalStorageState.js";
import {
  download,
  enumerateMonths,
  fmtBRL,
  fmtPct,
  LS_KEY,
  midOfMonth,
  monthLabel,
  toNumber,
  yyyymm,
} from "./utils/formatters.js";
import {
  computeDerivedEntries,
  computeTotals,
  createDraftEntry,
  makeId,
  withId,
} from "./utils/entries.js";
import { ensureBankInLibrary } from "./config/banks.js";
import { ensureSourceInLibrary } from "./config/sources.js";
import {
  ensureInvestmentDefaults,
  INVESTMENT_STORAGE_SEED,
} from "./config/investmentStorage.js";
import { Link } from "react-router-dom";
import { UNIFIED_LS_KEY, UNIFIED_STORAGE_SEED, ensureUnifiedDefaults, migrateToUnifiedStorage, resetDataAndLoadDefaults } from "./utils/unifiedStorage.js";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Estados para dados
  const [unifiedState, setUnifiedStore] = useLocalStorageState(UNIFIED_LS_KEY, null);
  const [legacyState, setLegacyStore] = useLocalStorageState(LS_KEY, INVESTMENT_STORAGE_SEED);
  
  // Check simples ao entrar no site: se não tem dados, carregar template inicial
  useEffect(() => {
    async function initializeApp() {
      // Verificar se há alguma menção do nosso app no localStorage
      const hasAnyAppData = localStorage.getItem(UNIFIED_LS_KEY) || 
                           localStorage.getItem(LS_KEY) || 
                           localStorage.getItem('financial-monitor-expenses-v1');
      
      if (hasAnyAppData) {
        // Já tem dados, usar migração normal
        try {
          const result = await migrateToUnifiedStorage();
          if (result && Object.keys(result).length > 0) {
            setUnifiedStore(result);
          }
        } catch (error) {
          console.error('Erro na migração:', error);
        }
      } else {
        // Não tem nenhuma menção do app, carregar template inicial
        console.log('🆕 Primeiro acesso detectado, carregando template inicial...');
        try {
          const result = await resetDataAndLoadDefaults();
          if (result && Object.keys(result).length > 0) {
            setUnifiedStore(result);
            console.log('✅ Template inicial carregado com sucesso');
          }
        } catch (error) {
          console.error('Erro ao carregar template inicial:', error);
        }
      }
    }
    
    initializeApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Se não há dados unific ados, usar seed padrão
  const storeState = unifiedState || UNIFIED_STORAGE_SEED;
  const store = ensureUnifiedDefaults(storeState);
  
  // Extrair dados de investimentos
  const investmentData = store.investimentos;
  const entries = investmentData.entries;
  const banks = investmentData.banks;
  const sources = investmentData.sources;
  const personalInfo = investmentData.personalInfo;
  const settings = investmentData.settings;
  const createdAt = investmentData.createdAt;

  // Ativar modo offline
  useOfflineMode();

  // Determinar a aba ativa baseada na URL
  const getCurrentTab = () => {
    const path = location.pathname;
    if (path.includes('/investimentos/configuracoes')) return 'configuracoes';
    if (path.includes('/investimentos')) return 'dashboard';
    return 'dashboard';
  };

  const [tab, setTab] = useState(getCurrentTab());
  const [drafts, setDrafts] = useState(() => [createDraftEntry()]);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [focusArea, setFocusArea] = useState(settings.defaultFocusArea || "investimentos");
  const defaultsRef = useRef({
    tab: settings.defaultTab,
    focus: settings.defaultFocusArea,
  });
  const fileRef = useRef(null);

  useEffect(() => {
    if (settings.defaultTab && defaultsRef.current.tab !== settings.defaultTab) {
      defaultsRef.current.tab = settings.defaultTab;
      setTab(settings.defaultTab);
    }
  }, [settings.defaultTab]);

  useEffect(() => {
    if (settings.defaultFocusArea && defaultsRef.current.focus !== settings.defaultFocusArea) {
      defaultsRef.current.focus = settings.defaultFocusArea;
      setFocusArea(settings.defaultFocusArea);
    }
  }, [settings.defaultFocusArea]);

  // Atualizar aba quando a URL mudar
  useEffect(() => {
    setTab(getCurrentTab());
  }, [location.pathname]);

  const setEntries = (updater) => {
    setUnifiedStore((prev) => {
      const safePrev = ensureUnifiedDefaults(prev);
      const currentEntries = Array.isArray(safePrev.investimentos.entries) ? safePrev.investimentos.entries : [];
      const candidateEntries = typeof updater === "function" ? updater(currentEntries) : updater;
      const nextEntries = Array.isArray(candidateEntries) ? candidateEntries : [];
      const currentBanks =
        Array.isArray(safePrev.investimentos.banks) && safePrev.investimentos.banks.length ? safePrev.investimentos.banks : [];
      const currentSources =
        Array.isArray(safePrev.investimentos.sources) && safePrev.investimentos.sources.length
          ? safePrev.investimentos.sources
          : [];
      const mergedBanks = mergeBanksFromEntries(nextEntries, currentBanks);
      const mergedSources = mergeSourcesFromEntries(nextEntries, currentSources);
      return {
        ...safePrev,
        investimentos: {
          ...safePrev.investimentos,
          entries: nextEntries,
          banks: mergedBanks,
          sources: mergedSources,
        },
      };
    });
  };

  const setCreatedAt = (value) => {
    setUnifiedStore((prev) => {
      const safePrev = ensureUnifiedDefaults(prev);
      return {
        ...safePrev,
        investimentos: {
          ...safePrev.investimentos,
          createdAt: value,
        },
      };
    });
  };

  useEffect(() => {
    if (Array.isArray(storeState)) {
      const normalized = storeState.map(withId);
      setUnifiedStore((prev) => {
        const safePrev = ensureUnifiedDefaults(prev);
        return {
          ...safePrev,
          investimentos: {
            ...safePrev.investimentos,
            entries: normalized,
            banks: mergeBanksFromEntries(normalized, safePrev.investimentos.banks || []),
            sources: mergeSourcesFromEntries(normalized, safePrev.investimentos.sources || []),
            personalInfo: safePrev.investimentos.personalInfo,
            settings: safePrev.investimentos.settings,
            createdAt: safePrev.investimentos.createdAt || new Date().toISOString(),
          },
        };
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entriesWithIds = useMemo(
    () => entries.map((entry) => (entry.id ? entry : withId(entry))),
    [entries]
  );

  useEffect(() => {
    const needsIds = entries.some((entry) => !entry.id);
    if (needsIds) {
      setEntries(entriesWithIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!store.createdAt) {
      setCreatedAt(new Date().toISOString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.createdAt]);

  useEffect(() => {
    if (focusArea === "gastos") {
      setTab("historico");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusArea]);

  const derivedEntries = useMemo(
    () => computeDerivedEntries(entriesWithIds),
    [entriesWithIds]
  );

  const monthly = useMemo(() => {
    const byMonth = new Map();
    for (const entry of derivedEntries) {
      const key = yyyymm(entry.date);
      if (!key) continue;
      const base =
        byMonth.get(key) || {
          ym: key,
          invested: 0,
          inAccount: 0,
          cashFlow: 0,
          yieldValue: 0,
          previousTotal: 0,
          sources: new Map(),
        };
      base.invested += toNumber(entry.invested);
      base.inAccount += toNumber(entry.inAccount);
      base.cashFlow += toNumber(entry.cashFlow);
      if (entry.yieldValue !== null && entry.yieldValue !== undefined) {
        base.yieldValue += entry.yieldValue;
        base.previousTotal += entry.previousTotal ?? 0;
      }
      const sourceKey = (entry.source || "Outros").trim() || "Outros";
      const sourceBucket =
        base.sources.get(sourceKey) || { name: sourceKey, invested: 0, total: 0, cashFlow: 0, yieldValue: 0 };
      sourceBucket.invested += toNumber(entry.invested);
      sourceBucket.total += toNumber(entry.computedTotal ?? entry.invested ?? 0);
      sourceBucket.cashFlow += toNumber(entry.cashFlow);
      if (entry.yieldValue !== null && entry.yieldValue !== undefined) {
        sourceBucket.yieldValue += toNumber(entry.yieldValue);
      }
      base.sources.set(sourceKey, sourceBucket);
      byMonth.set(key, base);
    }

    return Array.from(byMonth.values())
      .map((month) => {
        const { sources, ...rest } = month;
        const sourceList = sources ? Array.from(sources.values()) : [];
        return {
          ...rest,
          sources: sourceList,
          yieldPct: rest.previousTotal ? rest.yieldValue / rest.previousTotal : null,
        };
      })
      .sort((a, b) => (a.ym < b.ym ? -1 : 1));
  }, [derivedEntries]);

  const monthlyLookup = useMemo(
    () => new Map(monthly.map((m) => [m.ym, m])),
    [monthly]
  );

  const timeline = useMemo(() => {
    if (monthly.length === 0) return [];
    const months = enumerateMonths(monthly[0].ym, monthly[monthly.length - 1].ym);
    return months.map((ym) => {
      const data = monthlyLookup.get(ym) || {
        ym,
        invested: 0,
        inAccount: 0,
        cashFlow: 0,
        yieldValue: 0,
        yieldPct: null,
        sources: [],
      };
      const midDate = midOfMonth(ym);
      return {
        ...data,
        sources: Array.isArray(data.sources) ? data.sources : [],
        label: monthLabel(ym),
        midDate,
        midDateValue: midDate.getTime(),
      };
    });
  }, [monthly, monthlyLookup]);

  const totals = useMemo(() => computeTotals(derivedEntries), [derivedEntries]);

  const sourceSummary = useMemo(() => {
    const map = new Map();
    for (const entry of derivedEntries) {
      const key = (entry.source || "Outros").trim() || "Outros";
      const current = map.get(key) || { name: key, invested: 0, total: 0 };
      current.invested += toNumber(entry.invested);
      current.total += toNumber(entry.computedTotal ?? entry.invested ?? 0);
      map.set(key, current);
    }
    const totalInvested = Array.from(map.values()).reduce((acc, item) => acc + item.invested, 0);
    return Array.from(map.values())
      .map((item) => ({
        name: item.name,
        invested: item.invested,
        total: item.total,
        percentage: totalInvested ? Math.round((item.invested / totalInvested) * 100) : 0,
      }))
      .sort((a, b) => b.invested - a.invested);
  }, [derivedEntries]);

  const lastMonth = timeline.at(-1);
  const lastMonthSources = useMemo(() => {
    if (!lastMonth || !Array.isArray(lastMonth.sources)) return [];
    const totalMonthInvested = lastMonth.sources.reduce(
      (acc, item) => acc + (item?.invested ?? 0),
      0
    );
    return lastMonth.sources
      .filter((item) => (item?.invested ?? 0) > 0)
      .map((item) => ({
        name: item.name || "Outros",
        invested: item.invested ?? 0,
        percentage: totalMonthInvested
          ? Math.round(((item.invested ?? 0) / totalMonthInvested) * 100)
          : null,
      }))
      .sort((a, b) => (b.invested ?? 0) - (a.invested ?? 0));
  }, [lastMonth]);
  const hoverSourceDetails = lastMonthSources.length ? lastMonthSources : sourceSummary;

  const averageMonthlyInvested = useMemo(() => {
    if (!timeline.length) return 0;
    const positiveMonths = timeline
      .map((month) => month.invested ?? 0)
      .filter((value) => value > 0);
    if (!positiveMonths.length) return 0;
    const sum = positiveMonths.reduce((acc, value) => acc + value, 0);
    return sum / positiveMonths.length;
  }, [timeline]);

  const averageMonthlyYield = useMemo(() => {
    if (!timeline.length) return null;
    const validYields = timeline
      .map((month) =>
        month.yieldPct !== null && month.yieldPct !== undefined ? month.yieldPct : null
      )
      .filter((value) => value !== null && Number.isFinite(value));
    if (!validYields.length) return null;
    const sum = validYields.reduce((acc, value) => acc + value, 0);
    return sum / validYields.length;
  }, [timeline]);

  const projectionDefaults = useMemo(
    () => ({
      initialBalance: totals.total_invested ?? 0,
      monthlyContribution: Math.max(lastMonth?.invested ?? (averageMonthlyInvested || 0), 0),
      monthlyReturn: (lastMonth?.yieldPct !== null && lastMonth?.yieldPct !== undefined)
        ? lastMonth.yieldPct
        : (averageMonthlyYield ?? 0.005),
      inflationRate: 0.04,
      contributionGrowth: 0.02,
      goalAmount:
        totals.total_invested && totals.total_invested > 0
          ? totals.total_invested * 2
          : Math.max(lastMonth?.invested ?? 0, 25000),
    }),
    [
      averageMonthlyInvested,
      averageMonthlyYield,
      lastMonth?.invested,
      lastMonth?.yieldPct,
      totals.total_invested,
    ]
  );

  const focusOptions = [
    {
      key: "investimentos",
      label: "Investimentos",
      tooltip: "Visualize os indicadores e gráficos dos seus investimentos",
    },
    {
      key: "gastos",
      label: "Gastos",
      tooltip: "Atalho para o histórico para revisar entradas negativas",
    },
  ];

  const handleTabChange = (newTab) => {
    setTab(newTab);
    if (newTab === 'configuracoes') {
      navigate('/investimentos/configuracoes');
    } else {
      navigate('/investimentos');
    }
  };

  const handleFocusChange = (newFocus) => {
    setFocusArea(newFocus);
    if (newFocus === 'gastos') {
      navigate('/gastos');
    } else {
      navigate('/investimentos');
    }
  };

  function handleSubmitDrafts(rows) {
    const prepared = rows
      .filter((row) => row.bank && row.date)
      .map((row) => ({
        id: makeId(),
        bank: row.bank.trim(),
        source: row.source?.trim() || "",
        date: row.date,
        invested: toNumber(row.invested),
        inAccount: toNumber(row.inAccount),
        cashFlow: toNumber(row.cashFlow),
      }));
    if (!prepared.length) return;

    setEntries((prev) => [...prev, ...prepared]);
    setDrafts([createDraftEntry()]);
    setTab("historico");
  }

  function exportJson() {
    // Exportar dados unificados
    const unifiedData = JSON.parse(localStorage.getItem(UNIFIED_LS_KEY) || '{}');
    const payload = {
      version: 3,
      type: "unified",
      exported_at: new Date().toISOString(),
      data: unifiedData,
    };
    download(
      `export-financial-monitor-unified-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2)
    );
  }

  function downloadTemplate() {
    const template = {
      version: 2,
      created_at: new Date().toISOString(),
      banks: [
        { name: "Banco Exemplo", color: "#2563EB", icon: "🏦" },
      ],
      sources: [
        { name: "Salário", color: "#0EA5E9", icon: "💼" },
      ],
      personal_info: {
        fullName: "Nome do Investidor",
        email: "investidor@email.com",
      },
      settings: {
        defaultTab: "dashboard",
        defaultFocusArea: "investimentos",
        reportNotes: "",
      },
      inputs: [
        {
          entries: [
            {
              bank: "Banco Exemplo",
              source: "Salário",
              date: "2025-01-15",
              inAccount: 0,
              invested: 1000,
              cashFlow: 1000,
            },
          ],
        },
      ],
    };
    download("template_investimentos.json", JSON.stringify(template, null, 2));
  }

  function importJsonFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        
        // Verificar se é um arquivo unificado
        if (data.type === "unified" && data.data) {
          // Importar dados unificados
          setUnifiedStore(data.data);
          setImportModalOpen(false);
          return;
        }
        
        if (Array.isArray(data)) {
          const normalized = data.map(withId);
          setUnifiedStore((prev) => {
            const safePrev = ensureUnifiedDefaults(prev);
            return {
              ...safePrev,
              investimentos: {
                ...safePrev.investimentos,
                entries: normalized,
                banks: mergeBanksFromEntries(normalized, safePrev.investimentos.banks),
                sources: mergeSourcesFromEntries(normalized, safePrev.investimentos.sources),
              },
            };
          });
          setImportModalOpen(false);
        } else if (data && Array.isArray(data.inputs)) {
          const inputEntries = data.inputs.flatMap((section) => section.entries || []);
          const normalized = inputEntries.map(withId);
          const incomingBanks = Array.isArray(data.banks) && data.banks.length ? data.banks : banks;
          const incomingSources = Array.isArray(data.sources) && data.sources.length ? data.sources : sources;
          const created = data.created_at || createdAt || new Date().toISOString();
          setUnifiedStore((prev) => {
            const safePrev = ensureUnifiedDefaults(prev);
            const nextPersonal = {
              ...safePrev.investimentos.personalInfo,
              ...(data.personal_info || {}),
            };
            const nextSettings = {
              ...safePrev.investimentos.settings,
              ...(data.settings || {}),
            };
            return {
              ...safePrev,
              investimentos: {
                ...safePrev.investimentos,
                entries: normalized,
                banks: mergeBanksFromEntries(normalized, incomingBanks),
                sources: mergeSourcesFromEntries(normalized, incomingSources),
                personalInfo: nextPersonal,
                settings: nextSettings,
                createdAt: created,
              },
            };
          });
          setImportModalOpen(false);
        } else if (data && Array.isArray(data.entries)) {
          const normalized = data.entries.map(withId);
          setUnifiedStore((prev) => {
            const safePrev = ensureUnifiedDefaults(prev);
            return {
              ...safePrev,
              investimentos: {
                ...safePrev.investimentos,
                entries: normalized,
                banks: mergeBanksFromEntries(normalized, safePrev.investimentos.banks),
                sources: mergeSourcesFromEntries(normalized, safePrev.investimentos.sources),
              },
            };
          });
          setImportModalOpen(false);
        } else {
          window.alert(
            "Arquivo inválido. Esperado JSON com a chave 'inputs' ou um array de lançamentos."
          );
        }
      } catch (e) {
        window.alert("Falha ao ler JSON: " + e.message);
      }
    };
    reader.readAsText(file);
  }

  // Botão/ação para carregar dados de exemplo removidos

  async function handleClearEntries() {
    if (window.confirm("Tem certeza que deseja resetar todos os dados e carregar configurações padrão?")) {
      try {
        const resetData = await resetDataAndLoadDefaults();
        setUnifiedStore(resetData);
        console.log('✅ Dados resetados com sucesso');
      } catch (error) {
        console.error('❌ Erro ao resetar dados:', error);
        alert('Erro ao resetar dados. Tente novamente.');
      }
    }
  }


  return (
    <div className="min-h-screen w-full bg-slate-50 p-6 text-slate-800">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 space-y-4">
          <BackToHomeButton />
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">Monitor de Investimentos</h1>
                <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 text-[0.7rem] font-semibold text-slate-600 shadow-sm">
                  {focusOptions.map((option) => {
                    const active = option.key === focusArea;
                    return (
                      <button
                        key={option.key}
                        type="button"
                        onClick={() => handleFocusChange(option.key)}
                        className={`rounded-full px-3 py-1 transition ${
                          active ? "bg-slate-900 text-white shadow" : "hover:bg-slate-100"
                        }`}
                        title={option.tooltip}
                        aria-pressed={active}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="text-sm text-slate-600">
                Adicione lançamentos, visualize o histórico por mês e gere gráficos. Seus dados ficam apenas no seu navegador
                (localStorage).
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-end">
              <div className="flex flex-wrap items-center gap-2">
                <ActionButton
                  icon={ArrowDownTrayIcon}
                  onClick={exportJson}
                  title="Baixe um arquivo JSON com todos os lançamentos e configurações"
                >
                  Exportar
                </ActionButton>
                <ActionButton
                  icon={ArrowUpTrayIcon}
                  onClick={() => setImportModalOpen(true)}
                  title="Importe um arquivo JSON salvo anteriormente"
                >
                  Importar
                </ActionButton>
                <Link
                  to="/investimentos/relatorio"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                >
                  <DocumentArrowDownIcon className="h-5 w-5" />
                  Relatório PDF
                </Link>
                <Link
                  to="/investimentos/configuracoes"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                >
                  <SettingsIcon className="h-5 w-5" />
                  Configurações
                </Link>
              </div>
            </div>
          </div>
          <Tabs
            tabs={[
              {
                key: 'dashboard',
                label: 'Dashboard',
                icon: <ChartBarIcon className="h-5 w-5" />,
                tooltip: 'Resumo visual com indicadores e gráficos',
              },
              {
                key: 'historico',
                label: 'Histórico',
                icon: <TableCellsIcon className="h-5 w-5" />,
                tooltip: 'Lista completa dos lançamentos realizados',
              },
              {
                key: 'entrada',
                label: 'Nova Entrada',
                icon: <PlusIcon className="h-5 w-5" />,
                tooltip: 'Adicionar um novo conjunto de valores',
              },
              {
                key: 'projecoes',
                label: 'Projeções',
                icon: <TrendingUpIcon className="h-5 w-5" />,
                tooltip: 'Simule cenários futuros considerando aportes e rentabilidade média',
              },
            ]}
            activeTab={tab}
            onChange={handleTabChange}
          />
        </header>

        <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Total de Investimentos"
            value={fmtBRL(lastMonth?.invested ?? 0)}
            subtitle={lastMonth ? `Referente a ${lastMonth.label}` : "Sem dados do mês"}
            hoverDetails={hoverSourceDetails}
            tooltip="Soma dos aportes registrados no mês selecionado; passe o mouse para ver o detalhe por fonte"
          />
          <KPICard
            title="Rendimento último mês"
            value={
              lastMonth && lastMonth.yieldValue !== null && lastMonth.yieldValue !== undefined
                ? fmtBRL(lastMonth.yieldValue)
                : "–"
            }
            secondaryValue={
              lastMonth && lastMonth.yieldPct !== null && lastMonth.yieldPct !== undefined
                ? fmtPct(lastMonth.yieldPct)
                : ""
            }
            tone={resolveTone(lastMonth?.yieldValue)}
            subtitle={lastMonth ? `Período ${lastMonth.label}` : "Sem dados do mês"}
            tooltip="Rendimento calculado subtraindo o fluxo de caixa do mês da variação entre totais"
            hoverDetails={lastMonth?.sources?.map((s) => ({ name: s.name, total: s.yieldValue })) || []}
          />
          <KPICard
            title="Entrada/Saída último mês"
            value={fmtBRL(lastMonth?.cashFlow ?? 0)}
            tone={(lastMonth?.cashFlow ?? 0) >= 0 ? "positive" : "negative"}
            subtitle={lastMonth ? `Período ${lastMonth.label}` : "Sem dados do mês"}
            tooltip="Somatório das entradas (positivas) e saídas (negativas) informadas no mês"
            hoverDetails={lastMonth?.sources?.map((s) => ({ name: s.name, total: s.cashFlow })) || []}
          />
          <KPICard
            title="Total em Conta último mês"
            value={fmtBRL(lastMonth?.inAccount ?? 0)}
            subtitle={lastMonth ? `Período ${lastMonth.label}` : "Sem dados do mês"}
            tooltip="Soma do campo 'Valor na Conta' para o mês selecionado"
          />
        </section>

        {/* Seção de "Carregar dados de exemplo" removida */}

        {tab === "dashboard" && <Dashboard monthly={timeline} sourceSummary={sourceSummary} sources={sources} />}

        {tab === "historico" && (
          <Historico
            entries={entriesWithIds}
            computedEntries={derivedEntries}
            setEntries={setEntries}
            banks={banks}
            sources={sources}
            onClearAll={handleClearEntries}
          />
        )}

        {tab === "entrada" && (
          <Entrada drafts={drafts} setDrafts={setDrafts} onSubmit={handleSubmitDrafts} banks={banks} sources={sources} />
        )}

        {tab === "projecoes" && (
          <Projecoes timeline={timeline} defaults={projectionDefaults} />
        )}

        <footer className="mt-10 text-center text-xs text-slate-500">
          <p>
            Dica: clique em <strong>Exportar</strong> para salvar um arquivo local. Você pode importar depois para continuar de
            onde parou.
          </p>
        </footer>
      </div>
      <ImportModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onImport={importJsonFile}
        onDownloadTemplate={downloadTemplate}
      />
    </div>
  );
}

function resolveTone(value) {
  if (value === null || value === undefined) return "neutral";
  if (value < 0) return "negative";
  if (value > 0) return "positive";
  return "neutral";
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
