import { useMemo, useState } from "react";
import { Transition } from "@headlessui/react";
import { resolveBankVisual } from "../config/banks.js";
import { resolveSourceVisual } from "../config/sources.js";
import { fmtBRL, fmtPct, monthLabel, toNumber, yyyymm } from "../utils/formatters.js";
import { useOpenDatePickerProps } from "../hooks/useOpenDatePickerProps.js";
import { SmartDataTable } from "./SmartDataTable.jsx";
import { InfoTooltip } from "./InfoTooltip.jsx";

export function Historico({ entries, computedEntries, setEntries, banks, sources, onClearAll }) {
  const dateOpenProps = useOpenDatePickerProps();
  const [search, setSearch] = useState("");
  const [activeMonth, setActiveMonth] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const sourceOptionsId = "source-library";

  const baseLookup = useMemo(() => new Map(entries.map((entry) => [entry.id, entry])), [entries]);

  const monthlyGroups = useMemo(() => {
    const map = new Map();
    for (const entry of computedEntries) {
      const ym = yyyymm(entry.date);
      if (!ym) continue;
      const bucket = map.get(ym) || { ym, label: monthLabel(ym), items: [] };
      bucket.items.push(entry);
      map.set(ym, bucket);
    }
    return Array.from(map.values())
      .map((group) => ({
        ...group,
        totals: summarize(group.items),
      }))
      .sort((a, b) => (a.ym < b.ym ? 1 : -1));
  }, [computedEntries]);

  const filteredEntries = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return computedEntries.filter((entry) => {
      if (activeMonth && yyyymm(entry.date) !== activeMonth) {
        return false;
      }
      if (!normalizedSearch) return true;
      return [
        entry.bank,
        entry.date,
        entry.invested,
        entry.inAccount,
        entry.cashFlow,
        entry.yieldValue,
        entry.yieldPct,
      ]
        .map((value) => String(value ?? "").toLowerCase())
        .some((text) => text.includes(normalizedSearch));
    });
  }, [activeMonth, computedEntries, search]);

  const summaryRows = useMemo(() => {
    const byDate = new Map();
    for (const entry of filteredEntries) {
      const key = entry.date;
      const current =
        byDate.get(key) || {
          date: entry.date,
          invested: 0,
          inAccount: 0,
          cashFlow: 0,
          yieldValue: 0,
          hasYield: false,
        };
      current.invested += toNumber(entry.invested);
      current.inAccount += toNumber(entry.inAccount);
      current.cashFlow += toNumber(entry.cashFlow);
      if (entry.yieldValue !== null && entry.yieldValue !== undefined) {
        current.yieldValue += entry.yieldValue;
        current.hasYield = true;
      }
      byDate.set(key, current);
    }
    return Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [filteredEntries]);

  function removeEntry(id) {
    setEntries((prev) => prev.filter((item) => item.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setDraft(null);
    }
  }

  function startEdit(id) {
    const original = baseLookup.get(id);
    if (!original) return;
    setEditingId(id);
    setDraft({
      bank: original.bank ?? "",
      source: original.source ?? "",
      date: original.date ? original.date.slice(0, 10) : "",
      inAccount: original.inAccount ?? 0,
      invested: original.invested ?? 0,
      cashFlow: original.cashFlow ?? 0,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(null);
  }

  function saveEdit(id) {
    if (!draft) return;
    if (!draft.date || !draft.bank) {
      window.alert("Preencha Data e Banco antes de salvar.");
      return;
    }
    setEntries((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        return {
          ...item,
          bank: draft.bank,
          source: draft.source?.trim() || "",
          date: draft.date,
          inAccount: toNumber(draft.inAccount),
          invested: toNumber(draft.invested),
          cashFlow: toNumber(draft.cashFlow),
        };
      })
    );
    cancelEdit();
  }

  function updateDraft(name, value) {
    setDraft((prev) => (prev ? { ...prev, [name]: value } : prev));
  }

  const handleClearAll = () => {
    if (typeof onClearAll === "function") {
      onClearAll();
    }
  };

  const librarySources = Array.isArray(sources) ? sources : [];

  const detailedColumns = useMemo(() => {
    return [
      {
        id: "date",
        header: "Data",
        accessor: (row) => row.date,
        headerTooltip: "Data em que o lançamento aconteceu",
        compareFn: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        cell: ({ row }) => {
          const isEditing = editingId === row.id;
          if (isEditing) {
            return (
              <input
                type="date"
                value={draft?.date ?? ""}
                onChange={(event) => updateDraft("date", event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
                {...dateOpenProps}
              />
            );
          }
          return new Date(row.date).toLocaleDateString("pt-BR");
        },
      },
      {
        id: "bank",
        header: "Banco",
        accessor: (row) => row.bank,
        cell: ({ row }) => {
          const isEditing = editingId === row.id;
          if (isEditing) {
            return (
              <input
                type="text"
                value={draft?.bank ?? ""}
                onChange={(event) => updateDraft("bank", event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
              />
            );
          }
          return <BankBadge name={row.bank} banks={banks} />;
        },
      },
      {
        id: "source",
        header: "Fonte",
        accessor: (row) => row.source,
        cell: ({ row }) => {
          const isEditing = editingId === row.id;
          if (isEditing) {
            return (
              <input
                type="text"
                list={sourceOptionsId}
                value={draft?.source ?? ""}
                onChange={(event) => updateDraft("source", event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
              />
            );
          }
          return <SourceBadge name={row.source} sources={librarySources} />;
        },
      },
      {
        id: "inAccount",
        header: "Valor na Conta",
        accessor: (row) => toNumber(row.inAccount),
        align: "right",
        headerTooltip: "Somatório do saldo disponível informado",
        cell: ({ row }) => {
          const isEditing = editingId === row.id;
          if (isEditing) {
            return (
              <input
                type="number"
                step="0.01"
                value={draft?.inAccount ?? 0}
                onChange={(event) => updateDraft("inAccount", event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-right text-sm focus:border-blue-400 focus:outline-none"
              />
            );
          }
          return <span className={toneClass(row.inAccount)}>{fmtBRL(row.inAccount)}</span>;
        },
      },
      {
        id: "invested",
        header: "Investido",
        accessor: (row) => toNumber(row.invested),
        align: "right",
        headerTooltip: "Valor aplicado no investimento",
        cell: ({ row }) => {
          const isEditing = editingId === row.id;
          if (isEditing) {
            return (
              <input
                type="number"
                step="0.01"
                value={draft?.invested ?? 0}
                onChange={(event) => updateDraft("invested", event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-right text-sm focus:border-blue-400 focus:outline-none"
              />
            );
          }
          return fmtBRL(row.invested);
        },
      },
      {
        id: "cashFlow",
        header: "Entrada/Saída",
        accessor: (row) => toNumber(row.cashFlow),
        align: "right",
        headerTooltip: "Fluxo de caixa mensal informado",
        cell: ({ row }) => {
          const isEditing = editingId === row.id;
          if (isEditing) {
            return (
              <input
                type="number"
                step="0.01"
                value={draft?.cashFlow ?? 0}
                onChange={(event) => updateDraft("cashFlow", event.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-right text-sm focus:border-blue-400 focus:outline-none"
              />
            );
          }
          return <span className={toneClass(row.cashFlow)}>{fmtBRL(row.cashFlow)}</span>;
        },
      },
      {
        id: "yieldValue",
        header: "Rendimento (R$)",
        accessor: (row) => (row.yieldValue !== null && row.yieldValue !== undefined ? row.yieldValue : null),
        align: "right",
        enableGlobalFilter: false,
        cell: ({ row }) =>
          row.yieldValue !== null && row.yieldValue !== undefined ? (
            <span className={toneClass(row.yieldValue)}>{fmtBRL(row.yieldValue)}</span>
          ) : (
            "—"
          ),
      },
      {
        id: "yieldPct",
        header: "Rendimento (%)",
        accessor: (row) => (row.yieldPct !== null && row.yieldPct !== undefined ? row.yieldPct : null),
        align: "right",
        enableGlobalFilter: false,
        cell: ({ row }) =>
          row.yieldPct !== null && row.yieldPct !== undefined ? (
            <span className={toneClass(row.yieldPct)}>{fmtPct(row.yieldPct)}</span>
          ) : (
            "—"
          ),
      },
      {
        id: "actions",
        header: "Ações",
        filterable: false,
        enableGlobalFilter: false,
        align: "right",
        cell: ({ row }) => {
          const isEditing = editingId === row.id;
          return (
            <div className="flex justify-end gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={() => saveEdit(row.id)}
                    className="rounded-lg bg-emerald-500 px-2 py-1 text-xs font-semibold text-white transition hover:bg-emerald-600"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="rounded-lg bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-300"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => startEdit(row.id)}
                    className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:scale-105 hover:bg-slate-200"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => removeEntry(row.id)}
                    className="rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 transition hover:scale-105 hover:bg-red-100"
                  >
                    Excluir
                  </button>
                </>
              )}
            </div>
          );
        },
      },
    ];
  }, [banks, cancelEdit, dateOpenProps, draft, editingId, librarySources, removeEntry, saveEdit, startEdit, updateDraft]);

  const summaryColumns = useMemo(
    () => [
      {
        id: "date",
        header: "Data",
        accessor: (row) => row.date,
        compareFn: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
        cell: ({ row }) => new Date(row.date).toLocaleDateString("pt-BR"),
      },
      {
        id: "invested",
        header: "Investido",
        accessor: (row) => row.invested,
        align: "right",
        cell: ({ row }) => fmtBRL(row.invested),
      },
      {
        id: "inAccount",
        header: "Em conta",
        accessor: (row) => row.inAccount,
        align: "right",
        cell: ({ row }) => fmtBRL(row.inAccount),
      },
      {
        id: "cashFlow",
        header: "Entradas/Saídas",
        accessor: (row) => row.cashFlow,
        align: "right",
        cell: ({ row }) => <span className={toneClass(row.cashFlow)}>{fmtBRL(row.cashFlow)}</span>,
      },
      {
        id: "yieldValue",
        header: "Rendimento",
        accessor: (row) => row.yieldValue,
        align: "right",
        cell: ({ row }) =>
          row.hasYield ? <span className={toneClass(row.yieldValue)}>{fmtBRL(row.yieldValue)}</span> : "—",
      },
    ],
    []
  );

  return (
    <div className="rounded-2xl bg-white p-4 shadow">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="w-64 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-blue-400"
            placeholder="Busque por banco, valor ou data"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
            title={collapsed ? "Mostrar lançamentos detalhados" : "Mostrar consolidação diária"}
          >
            {collapsed ? "Ver lançamentos" : "Resumo diário"}
          </button>
          {typeof onClearAll === "function" && (
            <button
              type="button"
              onClick={handleClearAll}
              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
            >
              Limpar tudo
            </button>
          )}
        </div>
        <div className="text-xs text-slate-500">
          {filteredEntries.length} lançamento{filteredEntries.length === 1 ? "" : "s"} exibido{filteredEntries.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="relative mb-6 overflow-hidden rounded-xl border border-slate-100 bg-slate-50/60 p-3">
        <div className="flex flex-wrap gap-2">
          {monthlyGroups.map((group) => {
            const isActive = activeMonth === group.ym;
            const totalEntries = group.items.length;
            const tooltipDetails = [
              { label: "Investido", value: fmtBRL(group.totals.invested) },
              { label: "Em conta", value: fmtBRL(group.totals.inAccount) },
              { label: "Fluxo", value: fmtBRL(group.totals.cashFlow) },
            ];
            return (
              <InfoTooltip
                key={group.ym}
                title={`Resumo de ${group.label}`}
                purpose="Permite filtrar o histórico rapidamente por período para comparar evolução."
                calculation="Os totais somam todos os lançamentos com a mesma referência de mês."
                extraDetails={tooltipDetails}
                side="bottom"
              >
                <button
                  type="button"
                  onClick={() => setActiveMonth((prev) => (prev === group.ym ? null : group.ym))}
                  className={`relative overflow-hidden rounded-full px-4 py-2 text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-blue-600 text-white shadow-lg"
                      : "bg-white text-slate-600 shadow hover:bg-blue-50"
                  }`}
                >
                  <span>{group.label}</span>
                  <span className="ml-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[0.65rem] font-medium text-blue-700">
                    {totalEntries} registro{totalEntries === 1 ? "" : "s"}
                  </span>
                  <Transition
                    show={isActive}
                    enter="transition transform duration-200"
                    enterFrom="opacity-0 -translate-y-2"
                    enterTo="opacity-100 translate-y-0"
                    leave="transition transform duration-150"
                    leaveFrom="opacity-100 translate-y-0"
                    leaveTo="opacity-0 -translate-y-1"
                  >
                    <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-600/20" />
                  </Transition>
                </button>
              </InfoTooltip>
            );
          })}
        </div>
        {!monthlyGroups.length && (
          <p className="text-xs text-slate-500">Adicione lançamentos para habilitar o filtro por mês.</p>
        )}
      </div>

      <datalist id={sourceOptionsId}>
        {librarySources.map((source) => (
          <option key={source.name} value={source.name} />
        ))}
      </datalist>

      <Transition
        show={!collapsed}
        enter="transition duration-200"
        enterFrom="opacity-0 translate-y-2"
        enterTo="opacity-100 translate-y-0"
        leave="transition duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 -translate-y-1"
      >
        <div>
          <SmartDataTable
            data={filteredEntries}
            columns={detailedColumns}
            initialSort={{ id: "date", direction: "desc" }}
            getRowId={(row) => row.id}
            globalFilterPlaceholder="Pesquisar dentro dos resultados"
          />
        </div>
      </Transition>

      <Transition
        show={collapsed}
        enter="transition duration-200"
        enterFrom="opacity-0 translate-y-2"
        enterTo="opacity-100 translate-y-0"
        leave="transition duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 -translate-y-1"
      >
        <div>
          <SmartDataTable
            data={summaryRows}
            columns={summaryColumns}
            initialSort={{ id: "date", direction: "desc" }}
            getRowId={(row) => row.date}
            enableGlobalFilter={false}
            emptyMessage="Nenhum lançamento encontrado para o período selecionado"
          />
        </div>
      </Transition>
    </div>
  );
}

function summarize(entries) {
  return entries.reduce(
    (acc, entry) => {
      acc.invested += toNumber(entry.invested);
      acc.inAccount += toNumber(entry.inAccount);
      acc.cashFlow += toNumber(entry.cashFlow);
      if (entry.yieldValue !== null && entry.yieldValue !== undefined) {
        acc.yieldValue += entry.yieldValue;
      }
      return acc;
    },
    { invested: 0, inAccount: 0, cashFlow: 0, yieldValue: 0 }
  );
}

function toneClass(value) {
  if (value === null || value === undefined) return "text-slate-700";
  if (toNumber(value) > 0) return "text-emerald-600 font-semibold";
  if (toNumber(value) < 0) return "text-red-600 font-semibold";
  return "text-slate-700";
}

function BankBadge({ name, banks }) {
  const visual = resolveBankVisual(name, banks);
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: visual.color }} aria-hidden="true" />
      <span className="text-base" aria-hidden="true">
        {visual.icon}
      </span>
      <span>{name}</span>
    </span>
  );
}

function SourceBadge({ name, sources }) {
  if (!name) return <span className="text-sm text-slate-500">—</span>;
  const library = Array.isArray(sources) ? sources : [];
  const visual = resolveSourceVisual(name, library);
  return (
    <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: visual.color }} aria-hidden="true" />
      <span className="text-base" aria-hidden="true">
        {visual.icon}
      </span>
      <span>{name}</span>
    </span>
  );
}
