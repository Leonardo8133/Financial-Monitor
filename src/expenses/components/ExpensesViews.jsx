import { useEffect, useMemo, useRef, useState } from "react";
import { ExpensesHistorico } from "./ExpensesHistorico.jsx";
import { ConfirmDialog, Modal } from "../../components/Modal.jsx";
import { builtinViews, describeFilters, normalizeViewFilters } from "../utils/views.js";
import { PlusIcon, TrashIcon } from "../../components/icons.jsx";

/**
 * "Visões": the history table opened with a saved set of filters.
 * Built-in presets always exist; user views live in store.gastos.views.
 */
export function ExpensesViews({ views = [], onChangeViews, categories, ...historyProps }) {
  const presets = useMemo(() => builtinViews(categories), [categories]);
  // A user view with the same name as a preset replaces it (e.g. after hiding rows in a preset).
  const all = useMemo(() => {
    const userNames = new Set(views.map((v) => v.name.toLowerCase()));
    return [...views, ...presets.filter((p) => !userNames.has(p.name.toLowerCase()))];
  }, [views, presets]);
  const [activeId, setActiveIdState] = useState(() => all[0]?.id || null);
  const pickedRef = useRef(false);
  const setActiveId = (id) => {
    pickedRef.current = true;
    setActiveIdState(id);
  };
  // Views load asynchronously on a fresh page; select the first user view once they arrive.
  useEffect(() => {
    if (!pickedRef.current && views.length && !views.some((v) => v.id === activeId)) setActiveIdState(views[0].id);
  }, [views, activeId]);
  const [rename, setRename] = useState(null); // { id, name, icon }
  const [confirmDelete, setConfirmDelete] = useState(null);

  const active = all.find((v) => v.id === activeId) || all[0] || null;
  const isUser = Boolean(active && !active.builtin);

  /** Hides ids/descriptions in the active view; builtin or unsaved views become a user view first. */
  function hideInView({ ids = [], descriptions = [], filters }) {
    const base = normalizeViewFilters(filters || active?.filters || {});
    const previous = normalizeViewFilters(active?.filters || {});
    const nextFilters = {
      ...base,
      hiddenIds: Array.from(new Set([...previous.hiddenIds, ...base.hiddenIds, ...ids])),
      hiddenDescriptions: Array.from(new Set([...previous.hiddenDescriptions, ...base.hiddenDescriptions, ...descriptions])),
    };
    if (isUser) {
      onChangeViews(views.map((v) => (v.id === active.id ? { ...v, filters: nextFilters } : v)));
      return;
    }
    const baseName = activeId === "__new__" || !active ? "Nova visão" : active.name;
    let name = baseName;
    let n = 2;
    while (views.some((v) => v.name.toLowerCase() === name.toLowerCase())) name = `${baseName} ${n++}`;
    const id = `view-${Date.now().toString(36)}`;
    onChangeViews([...views, { id, name, icon: active?.icon || "", filters: nextFilters }]);
    setActiveId(id);
  }

  function unhide({ id, description }) {
    if (!isUser) return;
    onChangeViews(
      views.map((v) =>
        v.id !== active.id
          ? v
          : {
              ...v,
              filters: {
                ...v.filters,
                hiddenIds: (v.filters.hiddenIds || []).filter((x) => x !== id),
                hiddenDescriptions: (v.filters.hiddenDescriptions || []).filter((x) => x !== description),
              },
            }
      )
    );
  }

  function saveView({ name, filters }) {
    const existing = views.find((v) => v.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      onChangeViews(views.map((v) => (v.id === existing.id ? { ...v, filters } : v)));
      setActiveId(existing.id);
      return;
    }
    const id = `view-${Date.now().toString(36)}`;
    onChangeViews([...views, { id, name, icon: "", filters }]);
    setActiveId(id);
  }

  function removeView(id) {
    onChangeViews(views.filter((v) => v.id !== id));
    if (activeId === id) setActiveId(presets[0]?.id || null);
  }

  function applyRename() {
    if (!rename?.name.trim()) return;
    onChangeViews(views.map((v) => (v.id === rename.id ? { ...v, name: rename.name.trim(), icon: rename.icon } : v)));
    setRename(null);
  }

  return (
    <div className="space-y-3">
      <div className="card p-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {all.map((v) => {
            const on = v.id === active?.id;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setActiveId(v.id)}
                className={`${on ? "chip-on" : "chip"} py-1`}
                aria-pressed={on}
                title={describeFilters(v.filters)}
              >
                {v.icon && <span aria-hidden="true">{v.icon}</span>}
                {v.name}
              </button>
            );
          })}
          <button
            type="button"
            className="chip border-dashed py-1 text-muted hover:text-ink"
            onClick={() => setActiveId("__new__")}
            title="Começa do histórico completo; ajuste os filtros e clique em Salvar como visão"
          >
            <PlusIcon className="h-3.5 w-3.5" /> Nova visão
          </button>
        </div>
        {active && activeId !== "__new__" && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
            <span>
              <strong className="text-ink">{active.name}</strong> · {describeFilters(active.filters)}
              {active.builtin && <span className="ml-1 text-faint">(padrão)</span>}
            </span>

            {isUser && (
              <span className="flex gap-1">
                <button type="button" className="btn btn-xs" onClick={() => setRename({ id: active.id, name: active.name, icon: active.icon || "" })}>Renomear</button>
                <button type="button" className="btn-ghost btn-xs text-faint hover:text-neg" onClick={() => setConfirmDelete(active)} title="Excluir visão">
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </span>
            )}
          </div>
        )}
        {activeId === "__new__" && (
          <p className="mt-2 text-xs text-muted">Ajuste os filtros abaixo e use <strong className="text-ink">Salvar como visão</strong> para guardar.</p>
        )}
      </div>

      <ExpensesHistorico
        key={activeId || "none"}
        {...historyProps}
        categories={categories}
        preset={activeId === "__new__" ? null : active?.filters || null}
        viewName={isUser ? active.name : ""}
        onSaveView={saveView}
        onlyUncategorized={active?.special === "uncategorized" && activeId !== "__new__"}
        onHideInView={hideInView}
        onUnhideInView={unhide}
        monthPageSize={15}
      />


      <Modal
        open={Boolean(rename)}
        onClose={() => setRename(null)}
        title="Renomear visão"
        size="sm"
        footer={
          <>
            <button type="button" className="btn" onClick={() => setRename(null)}>Cancelar</button>
            <button type="button" className="btn-primary" onClick={applyRename} disabled={!rename?.name?.trim()}>Salvar</button>
          </>
        }
      >
        {rename && (
          <div className="flex gap-2">
            <input className="input input-sm w-14 text-center" value={rename.icon} onChange={(e) => setRename((p) => ({ ...p, icon: e.target.value }))} placeholder="🔖" title="Emoji opcional" />
            <input className="input flex-1" value={rename.name} onChange={(e) => setRename((p) => ({ ...p, name: e.target.value }))} autoFocus />
          </div>
        )}
      </Modal>
      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && removeView(confirmDelete.id)}
        title={`Excluir a visão "${confirmDelete?.name}"?`}
        message="As transações não são afetadas; só o conjunto de filtros é removido."
        confirmLabel="Excluir"
        danger
      />
    </div>
  );
}
