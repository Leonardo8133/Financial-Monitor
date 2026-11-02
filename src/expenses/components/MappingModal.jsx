import { useMemo, useState } from "react";
import { Modal } from "../../components/Modal.jsx";
import { MultiPillSelect } from "./MultiPillSelect.jsx";

/**
 * Description -> categories mapping editor (used by the entry form and settings).
 * actions: { add(keyword, categories, exactMatch), update(originalKeyword, {keyword, categories, exactMatch}), remove(keyword) }
 */
export function MappingList({ mappings = [], categories = [], actions, compact = false, onCreateCategory }) {
  const [filter, setFilter] = useState("");
  const [editingKeyword, setEditingKeyword] = useState(null);
  const [edit, setEdit] = useState({ keyword: "", categories: [], exactMatch: false });
  const [create, setCreate] = useState({ keyword: "", categories: [], exactMatch: false });
  const [showCreate, setShowCreate] = useState(false);

  const categoryOptions = useMemo(() => categories.map((c) => (typeof c === "string" ? c : c)), [categories]);
  const normalizedFilter = filter.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      mappings.filter((m) => {
        if (!normalizedFilter) return true;
        if (normalizedFilter === "exato") return m.exactMatch;
        if (normalizedFilter === "parcial") return !m.exactMatch;
        return (
          (m.keyword || "").toLowerCase().includes(normalizedFilter) ||
          (m.categories || []).some((c) => (c || "").toLowerCase().includes(normalizedFilter))
        );
      }),
    [mappings, normalizedFilter]
  );

  function startEdit(m) {
    setEditingKeyword(m.keyword);
    setEdit({ keyword: m.keyword, categories: m.categories || [], exactMatch: Boolean(m.exactMatch) });
  }

  function saveEdit() {
    if (!edit.keyword.trim() || !edit.categories.length) return;
    actions.update(editingKeyword, edit);
    setEditingKeyword(null);
  }

  function saveCreate() {
    if (!create.keyword.trim() || !create.categories.length) return;
    actions.add(create.keyword, create.categories, create.exactMatch);
    setCreate({ keyword: "", categories: [], exactMatch: false });
    setShowCreate(false);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filtrar por palavra-chave, categoria, 'exato' ou 'parcial'"
          className="input input-sm min-w-[200px] flex-1"
        />
        <span className="text-xs text-muted whitespace-nowrap">{filtered.length} de {mappings.length}</span>
        <button type="button" className="btn-primary btn-sm" onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? "Cancelar" : "Novo mapeamento"}
        </button>
      </div>

      {showCreate && (
        <div className="panel space-y-2 p-3 fade-in">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <input
              value={create.keyword}
              onChange={(e) => setCreate((p) => ({ ...p, keyword: e.target.value }))}
              className="input input-sm"
              placeholder="Palavra-chave (ex.: uber, farmácia)"
              autoFocus
            />
            <label className="flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={create.exactMatch} onChange={(e) => setCreate((p) => ({ ...p, exactMatch: e.target.checked }))} />
              Correspondência exata
            </label>
          </div>
          <MultiPillSelect values={create.categories} options={categoryOptions} onChange={(v) => setCreate((p) => ({ ...p, categories: v }))} onCreateOption={onCreateCategory} placeholder="Categorias aplicadas" />
          <div className="flex gap-2">
            <button type="button" className="btn-primary btn-sm" onClick={saveCreate} disabled={!create.keyword.trim() || !create.categories.length}>
              Criar
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line p-4 text-center text-sm text-muted">
          {mappings.length === 0 ? "Nenhum mapeamento ainda. Eles são criados automaticamente quando você categoriza uma transação." : "Nada encontrado com esse filtro."}
        </div>
      ) : (
        <ul className={`space-y-1 ${compact ? "max-h-72" : "max-h-[50vh]"} overflow-auto pr-1`}>
          {filtered.map((m) => {
            const isEditing = editingKeyword === m.keyword;
            return (
              <li key={m.keyword} className={`rounded-lg border px-3 py-2 ${isEditing ? "border-accent bg-accent/5" : "border-line"}`}>
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                      <input value={edit.keyword} onChange={(e) => setEdit((p) => ({ ...p, keyword: e.target.value }))} className="input input-sm" />
                      <label className="flex items-center gap-2 text-xs text-muted">
                        <input type="checkbox" checked={edit.exactMatch} onChange={(e) => setEdit((p) => ({ ...p, exactMatch: e.target.checked }))} />
                        Exata
                      </label>
                    </div>
                    <MultiPillSelect values={edit.categories} options={categoryOptions} onChange={(v) => setEdit((p) => ({ ...p, categories: v }))} onCreateOption={onCreateCategory} />
                    <div className="flex gap-2">
                      <button type="button" className="btn-primary btn-xs" onClick={saveEdit}>Salvar</button>
                      <button type="button" className="btn btn-xs" onClick={() => setEditingKeyword(null)}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-ink">{m.keyword}</span>
                    <span className={`chip ${m.exactMatch ? "text-accent" : ""}`} title={m.exactMatch ? "Só aplica se a descrição for exatamente igual" : "Aplica se a descrição contiver a palavra-chave"}>
                      {m.exactMatch ? "exato" : "parcial"}
                    </span>
                    <span className="flex flex-1 flex-wrap gap-1">
                      {(m.categories || []).map((cat) => (
                        <span key={cat} className="chip">{cat}</span>
                      ))}
                    </span>
                    <span className="flex gap-1">
                      <button type="button" className="btn btn-xs" onClick={() => startEdit(m)}>Editar</button>
                      <button type="button" className="btn-ghost btn-xs text-faint hover:text-neg" onClick={() => actions.remove(m.keyword)}>Excluir</button>
                    </span>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function MappingModal({ open, onClose, mappings, categories, actions, onCreateCategory }) {
  return (
    <Modal open={open} onClose={onClose} title="Mapeamentos de descrição → categorias" size="lg" description="Quando a descrição contém a palavra-chave, as categorias são aplicadas automaticamente.">
      <MappingList mappings={mappings} categories={categories} actions={actions} onCreateCategory={onCreateCategory} />
    </Modal>
  );
}
