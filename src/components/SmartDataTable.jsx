import { Fragment, useMemo, useState } from "react";
import { Transition } from "@headlessui/react";
import { ChevronDownIcon, ChevronUpDownIcon, FunnelIcon } from "./icons.jsx";

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];

const normalize = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export function SmartDataTable({
  data = [],
  columns = [],
  initialSort,
  initialPageSize = 10,
  pageSizeOptions = DEFAULT_PAGE_SIZES,
  getRowId = (row, index) => (row && row.id != null ? row.id : index),
  globalFilterPlaceholder = "Buscar em todos os campos...",
  emptyMessage = "Sem registros",
  enableGlobalFilter = true,
}) {
  const columnMap = useMemo(() => new Map(columns.map((column) => [column.id, column])), [columns]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [filters, setFilters] = useState(() => {
    const base = {};
    columns.forEach((column) => {
      if (column.defaultFilter != null) {
        base[column.id] = column.defaultFilter;
      }
    });
    return base;
  });
  const [sortBy, setSortBy] = useState(() => {
    if (!initialSort) return null;
    const column = columnMap.get(initialSort.id);
    if (!column) return null;
    return { id: initialSort.id, direction: initialSort.direction === "desc" ? "desc" : "asc" };
  });
  const [pageSize, setPageSize] = useState(() => {
    if (pageSizeOptions.includes(initialPageSize)) return initialPageSize;
    return pageSizeOptions[0] || 10;
  });
  const [page, setPage] = useState(0);
  const [activeFilter, setActiveFilter] = useState(null);

  const filteredData = useMemo(() => {
    const normalizedGlobal = globalFilter.trim() ? normalize(globalFilter) : "";
    return data.filter((row) => {
      if (normalizedGlobal) {
        const matchesSomeColumn = columns.some((column) => {
          if (column.enableGlobalFilter === false) return false;
          const value = column.accessor ? column.accessor(row) : row[column.id];
          return normalize(value).includes(normalizedGlobal);
        });
        if (!matchesSomeColumn) return false;
      }

      return Object.entries(filters).every(([columnId, filterValue]) => {
        if (filterValue == null || filterValue === "") return true;
        const column = columnMap.get(columnId);
        if (!column) return true;
        const value = column.accessor ? column.accessor(row) : row[columnId];
        if (typeof column.filterFn === "function") {
          return column.filterFn(value, filterValue, row);
        }
        const normalizedValue = normalize(value);
        return normalizedValue.includes(normalize(filterValue));
      });
    });
  }, [columns, data, filters, globalFilter, columnMap]);

  const sortedData = useMemo(() => {
    if (!sortBy) return filteredData;
    const column = columnMap.get(sortBy.id);
    if (!column) return filteredData;
    const compare = column.compareFn
      ? column.compareFn
      : (a, b) => {
          const aValue = column.accessor ? column.accessor(a) : a[sortBy.id];
          const bValue = column.accessor ? column.accessor(b) : b[sortBy.id];
          if (aValue == null && bValue == null) return 0;
          if (aValue == null) return -1;
          if (bValue == null) return 1;
          if (typeof aValue === "number" && typeof bValue === "number") {
            return aValue - bValue;
          }
          return String(aValue).localeCompare(String(bValue));
        };
    const sorted = [...filteredData].sort((a, b) => compare(a, b));
    if (sortBy.direction === "desc") {
      sorted.reverse();
    }
    return sorted;
  }, [filteredData, sortBy, columnMap]);

  const totalPages = Math.max(Math.ceil(sortedData.length / pageSize), 1);
  const currentPage = Math.min(page, totalPages - 1);
  const paginatedData = useMemo(() => {
    const start = currentPage * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const toggleSort = (columnId) => {
    setPage(0);
    setSortBy((current) => {
      if (!current || current.id !== columnId) {
        return { id: columnId, direction: "asc" };
      }
      if (current.direction === "asc") {
        return { id: columnId, direction: "desc" };
      }
      return null;
    });
  };

  const toggleFilterPanel = (columnId) => {
    setActiveFilter((current) => (current === columnId ? null : columnId));
  };

  const updateFilter = (columnId, value) => {
    setPage(0);
    setFilters((prev) => ({ ...prev, [columnId]: value }));
  };

  const clearFilter = (columnId) => {
    setPage(0);
    setFilters((prev) => {
      const next = { ...prev };
      delete next[columnId];
      return next;
    });
  };

  const goToPage = (nextPage) => {
    setPage(Math.max(0, Math.min(totalPages - 1, nextPage)));
  };

  return (
    <div className="space-y-3">
      {enableGlobalFilter && (
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-slate-500" htmlFor="global-filter">
              Pesquisa rápida
            </label>
            <input
              id="global-filter"
              value={globalFilter}
              onChange={(event) => {
                setPage(0);
                setGlobalFilter(event.target.value);
              }}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-200 md:w-72"
              placeholder={globalFilterPlaceholder}
            />
          </div>
          <div className="text-xs text-slate-500">
            {sortedData.length} registro{sortedData.length === 1 ? "" : "s"} encontrados
          </div>
        </div>
      )}
      {!enableGlobalFilter && (
        <div className="text-xs text-slate-500">
          {sortedData.length} registro{sortedData.length === 1 ? "" : "s"} encontrados
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {columns.map((column) => {
                const isSorted = sortBy && sortBy.id === column.id;
                const hasFilter = filters[column.id] != null && filters[column.id] !== "";
                return (
                  <th key={column.id} scope="col" className="relative whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleSort(column.id)}
                        className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-200/60 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        title={column.headerTooltip || "Ordenar"}
                      >
                        {column.header}
                        <ChevronUpDownIcon className={`h-3.5 w-3.5 transition ${isSorted ? "text-blue-600" : "text-slate-400"}`} />
                      </button>
                      {column.filterable !== false && (
                        <button
                          type="button"
                          onClick={() => toggleFilterPanel(column.id)}
                          className={`rounded-md p-1 transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${hasFilter ? "text-blue-600" : "text-slate-400"} hover:text-blue-600`}
                          title={hasFilter ? "Editar filtro" : "Filtrar coluna"}
                        >
                          <FunnelIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <Transition
                      show={activeFilter === column.id}
                      as={Fragment}
                      enter="transition ease-out duration-150"
                      enterFrom="opacity-0 -translate-y-1"
                      enterTo="opacity-100 translate-y-0"
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100 translate-y-0"
                      leaveTo="opacity-0 -translate-y-1"
                    >
                      <div className="absolute left-0 top-full z-20 mt-1 w-56 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
                        <div className="text-xs font-semibold text-slate-600">Filtrar {column.header}</div>
                        <input
                          type="text"
                          value={filters[column.id] ?? ""}
                          onChange={(event) => updateFilter(column.id, event.target.value)}
                          className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1 text-sm shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                          placeholder="Digite para filtrar..."
                          autoFocus
                        />
                        <div className="mt-2 flex items-center justify-between text-[0.7rem] text-slate-500">
                          <button
                            type="button"
                            onClick={() => clearFilter(column.id)}
                            className="rounded-md px-2 py-1 font-semibold text-blue-600 transition hover:bg-blue-50"
                          >
                            Limpar
                          </button>
                          <button
                            type="button"
                            onClick={() => setActiveFilter(null)}
                            className="rounded-md px-2 py-1 font-semibold text-slate-600 transition hover:bg-slate-100"
                          >
                            Fechar
                          </button>
                        </div>
                      </div>
                    </Transition>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => {
                const rowId = getRowId(row, rowIndex);
                return (
                  <tr key={rowId} className="group transition hover:bg-blue-50/40">
                    {columns.map((column) => {
                      const value = column.accessor ? column.accessor(row) : row[column.id];
                      const content = column.cell ? column.cell({ value, row, rowIndex, column }) : value;
                      const alignment = column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left";
                      return (
                        <td key={column.id} className={`px-4 py-3 text-sm text-slate-700 ${alignment}`}>
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span>Página {currentPage + 1} de {totalPages}</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => goToPage(currentPage - 1)}
              className="rounded-lg border border-slate-200 px-2 py-1 font-semibold transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={currentPage === 0}
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => goToPage(currentPage + 1)}
              className="rounded-lg border border-slate-200 px-2 py-1 font-semibold transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={currentPage >= totalPages - 1}
            >
              Próxima
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ChevronDownIcon className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          <label htmlFor="page-size" className="font-semibold">
            Itens por página
          </label>
          <select
            id="page-size"
            value={pageSize}
            onChange={(event) => {
              const nextSize = Number(event.target.value) || pageSizeOptions[0];
              setPage(0);
              setPageSize(nextSize);
            }}
            className="rounded-lg border border-slate-200 px-2 py-1 text-sm shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200"
          >
            {pageSizeOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
