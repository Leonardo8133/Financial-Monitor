import { useMemo, useState } from "react";
import { createDraftEntry } from "../../utils/entries.js";
import { Field } from "./Field.jsx";
import { BankSelect } from "./BankSelect.jsx";
import { CurrencyInput } from "../../components/CurrencyInput.jsx";
import { resolveBankVisual } from "../config/banks.js";
import { resolveSourceVisual } from "../config/sources.js";
import { findDuplicateSnapshots } from "../../utils/investmentAnalytics.js";
import { MAX_YIELD_GAP_MONTHS, monthsBetween } from "../../utils/entries.js";
import { fmtBRL, fmtDate, toNumber, todayISO } from "../../utils/formatters.js";
import { TrashIcon, SparklesIcon, PlusIcon } from "../../components/icons.jsx";

const bankKey = (name) => (name || "").trim().toLowerCase();

/**
 * Entry form for investment snapshots.
 * Autofill: new rows pick the next bank that is not in the form yet and start from
 * its last known balance; choosing a bank fills its last values; date follows the last row.
 */
export function Entrada({ drafts, setDrafts, onSubmit, banks, sources, entries = [], lastSnapshots = [], singleSource = false, fixedSource = "", onCreateBank }) {
  const sourceOptionsId = "source-options";
  const sourceLibrary = Array.isArray(sources) ? sources : [];
  const [pendingDuplicates, setPendingDuplicates] = useState(null);

  const snapshotByBank = useMemo(() => new Map(lastSnapshots.map((s) => [bankKey(s.bank), s])), [lastSnapshots]);
  const defaultSource = singleSource ? fixedSource : lastSnapshots[0]?.source || sourceLibrary[0]?.name || "";

  function nextBankSuggestion(currentDrafts) {
    const used = new Set(currentDrafts.map((d) => bankKey(d.bank)).filter(Boolean));
    return lastSnapshots.find((s) => !used.has(bankKey(s.bank))) || null;
  }

  function draftFromSnapshot(snapshot, date) {
    return createDraftEntry({
      bank: snapshot?.bank || "",
      source: singleSource ? fixedSource : snapshot?.source || defaultSource,
      invested: snapshot ? toNumber(snapshot.invested) : 0,
      inAccount: snapshot ? toNumber(snapshot.inAccount) : 0,
      cashFlow: 0,
      date,
    });
  }

  function updateRow(id, name, value) {
    setDrafts((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, [name]: value };
        if (name === "bank") {
          const snap = snapshotByBank.get(bankKey(value));
          const untouched = !toNumber(row.invested) && !toNumber(row.inAccount) && !toNumber(row.cashFlow);
          if (snap && untouched) {
            next.invested = toNumber(snap.invested);
            next.inAccount = toNumber(snap.inAccount);
            if (!row.source && !singleSource) next.source = snap.source || "";
          }
        }
        return next;
      })
    );
  }

  function addRow() {
    setDrafts((prev) => {
      const date = prev.at(-1)?.date || todayISO();
      const suggestion = nextBankSuggestion(prev);
      return [...prev, suggestion ? draftFromSnapshot(suggestion, date) : createDraftEntry({ date, source: prev.at(-1)?.source || defaultSource })];
    });
  }

  function fillAllBanks() {
    if (!lastSnapshots.length) return;
    const date = drafts.find((d) => d.date)?.date || todayISO();
    setDrafts(lastSnapshots.map((snap) => draftFromSnapshot(snap, date)));
  }

  function removeRow(id) {
    setDrafts((prev) => {
      const next = prev.filter((row) => row.id !== id);
      return next.length ? next : [createDraftEntry({ source: defaultSource })];
    });
  }

  function resetRows() {
    setDrafts([createDraftEntry({ source: defaultSource })]);
    setPendingDuplicates(null);
  }

  function setAllDates(date) {
    if (!date) return;
    setDrafts((prev) => prev.map((row) => ({ ...row, date })));
  }

  function handleSubmit(event) {
    event?.preventDefault?.();
    const valid = drafts.filter((d) => d.bank && d.date);
    if (!valid.length) return;
    const dups = findDuplicateSnapshots(entries, valid);
    if (dups.length) {
      setPendingDuplicates(dups);
      return;
    }
    onSubmit(drafts);
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      handleSubmit();
      return;
    }
    if (event.key === "Enter" && event.target.tagName === "INPUT" && event.target.type !== "submit") {
      // Enter moves to the next field instead of submitting the whole form.
      event.preventDefault();
      const form = event.currentTarget;
      const focusables = Array.from(form.querySelectorAll("input:not([disabled]):not([type=hidden])"));
      const index = focusables.indexOf(event.target);
      const next = focusables[index + 1];
      if (next) next.focus();
      else addRow();
    }
  }

  const totals = useMemo(
    () =>
      drafts.reduce(
        (acc, d) => {
          acc.invested += toNumber(d.invested);
          acc.inAccount += toNumber(d.inAccount);
          acc.cashFlow += toNumber(d.cashFlow);
          return acc;
        },
        { invested: 0, inAccount: 0, cashFlow: 0 }
      ),
    [drafts]
  );

  return (
    <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="card-pad space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-ink">Lançamentos em preparação</div>
          <div className="text-xs text-muted">
            Informe o saldo atual de cada banco. Aportes e retiradas entram no campo Aporte/Retirada para o rendimento ficar certo.
            {singleSource && fixedSource ? ` Fonte: ${fixedSource}.` : ""}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {lastSnapshots.length > 0 && (
            <button type="button" onClick={fillAllBanks} className="btn-primary btn-sm" title="Cria uma linha por banco com o último saldo registrado">
              <SparklesIcon className="h-4 w-4" />
              Preencher com último saldo ({lastSnapshots.length})
            </button>
          )}
          <button type="button" onClick={addRow} className="btn btn-sm" title="Adiciona uma linha (sugere o próximo banco ainda não preenchido)">
            <PlusIcon className="h-4 w-4" />
            Adicionar linha
          </button>
          <button type="button" onClick={resetRows} className="btn-ghost btn-sm" title="Limpa todas as linhas">
            Limpar
          </button>
        </div>
      </div>
      <datalist id={sourceOptionsId}>
        {sourceLibrary.map((source) => (
          <option key={source.name} value={source.name} />
        ))}
      </datalist>

      {drafts.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>Mesma data para todas as linhas:</span>
          <input
            type="date"
            className="input input-sm w-auto"
            defaultValue={drafts[0]?.date || todayISO()}
            onChange={(e) => setAllDates(e.target.value)}
          />
        </div>
      )}

      <div className="space-y-2">
        {drafts.map((row, index) => {
          const bankVisual = resolveBankVisual(row.bank || "", banks);
          const sourceVisual = resolveSourceVisual(row.source || "", sourceLibrary);
          const snap = snapshotByBank.get(bankKey(row.bank));
          const total = toNumber(row.invested) + toNumber(row.inAccount);
          const gapMonths = snap ? monthsBetween(snap.date, row.date) : null;
          const tooOld = gapMonths !== null && gapMonths > MAX_YIELD_GAP_MONTHS;
          const previewYield = snap && !tooOld ? total - (toNumber(snap.invested) + toNumber(snap.inAccount) + toNumber(row.cashFlow)) : null;
          const sameDate = snap && snap.date === row.date;
          return (
            <div key={row.id} className={`rounded-xl border p-3 ${sameDate ? "border-amber-300 bg-amber-50" : "border-line bg-surface-2/50"}`}>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-12">
                <Field className="md:col-span-2" label="Data" required>
                  <input
                    type="date"
                    required
                    value={row.date}
                    onChange={(e) => updateRow(row.id, "date", e.target.value)}
                    className="input input-sm"
                  />
                </Field>
                <Field className={singleSource ? "md:col-span-5" : "md:col-span-3"} label="Banco" required>
                  <BankSelect
                    value={row.bank}
                    banks={banks}
                    required
                    onChange={(value) => updateRow(row.id, "bank", value)}
                    autoFocus={index === drafts.length - 1 && !row.bank}
                    onCreateBank={onCreateBank}
                  />
                </Field>
                {!singleSource && (
                <Field className="md:col-span-2" label="Fonte">
                  <div className="relative">
                    <input
                      type="text"
                      list={sourceOptionsId}
                      placeholder="ex.: Salário"
                      value={row.source}
                      onChange={(e) => updateRow(row.id, "source", e.target.value)}
                      className="input input-sm pl-7"
                    />
                    <span
                      className="pointer-events-none absolute left-2.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full"
                      style={{ backgroundColor: row.source ? sourceVisual.color : "rgb(var(--c-line))" }}
                      aria-hidden="true"
                    />
                  </div>
                </Field>
                )}
                <Field className="md:col-span-2" label="Investido" helpText="Saldo total aplicado neste banco na data">
                  <CurrencyInput size="sm" tone={false} value={Number(row.invested) || 0} onChange={(num) => updateRow(row.id, "invested", num)} />
                </Field>
                <Field className="md:col-span-1" label="Em conta" helpText="Saldo parado na conta corrente">
                  <CurrencyInput size="sm" tone={false} value={Number(row.inAccount) || 0} onChange={(num) => updateRow(row.id, "inAccount", num)} />
                </Field>
                <Field className="md:col-span-2" label="Aporte / retirada" helpText="Positivo = aporte, negativo = retirada desde o último saldo">
                  <div className="flex items-center gap-1">
                    <CurrencyInput size="sm" allowNegative value={Number(row.cashFlow) || 0} onChange={(num) => updateRow(row.id, "cashFlow", num)} className="flex-1" />
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="btn-ghost btn-xs text-faint hover:text-neg"
                      title="Remover linha"
                      aria-label={`Remover linha ${index + 1}`}
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </Field>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.7rem] text-muted">
                <span>
                  Total da linha: <strong className="num text-ink">{fmtBRL(total)}</strong>
                </span>
                {snap ? (
                  <>
                    <span>
                      Último saldo ({fmtDate(snap.date)}): <strong className="num">{fmtBRL(toNumber(snap.invested) + toNumber(snap.inAccount))}</strong>
                    </span>
                    {previewYield !== null && (
                      <span>
                        Rendimento estimado:{" "}
                        <strong className={`num ${previewYield > 0 ? "text-pos" : previewYield < 0 ? "text-neg" : ""}`}>{fmtBRL(previewYield)}</strong>
                      </span>
                    )}
                    {tooOld && <span className="text-amber-700">Último saldo há {gapMonths} meses: rendimento não será calculado.</span>}
                    {sameDate && <span className="font-semibold text-amber-700">Já existe um lançamento deste banco nesta data.</span>}
                  </>
                ) : row.bank ? (
                  <span>Primeiro lançamento deste banco.</span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {pendingDuplicates && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">
          <div className="font-semibold text-amber-800">
            {pendingDuplicates.length} lançamento(s) já existem para o mesmo banco e data:
          </div>
          <ul className="mt-1 list-disc pl-5 text-xs text-amber-800">
            {pendingDuplicates.map((d) => (
              <li key={d.existing.id}>
                {d.existing.bank} em {fmtDate(d.existing.date)} (atual {fmtBRL(toNumber(d.existing.invested) + toNumber(d.existing.inAccount))})
              </li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className="btn-primary btn-sm" onClick={() => { setPendingDuplicates(null); onSubmit(drafts, { replaceDuplicates: true }); }}>
              Substituir existentes
            </button>
            <button type="button" className="btn btn-sm" onClick={() => { setPendingDuplicates(null); onSubmit(drafts, { replaceDuplicates: false }); }}>
              Manter os dois
            </button>
            <button type="button" className="btn-ghost btn-sm" onClick={() => setPendingDuplicates(null)}>
              Voltar e revisar
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
        <div className="flex flex-wrap gap-x-4 text-xs text-muted">
          <span>Investido: <strong className="num text-ink">{fmtBRL(totals.invested)}</strong></span>
          <span>Em conta: <strong className="num text-ink">{fmtBRL(totals.inAccount)}</strong></span>
          <span>Aportes: <strong className={`num ${totals.cashFlow >= 0 ? "text-pos" : "text-neg"}`}>{fmtBRL(totals.cashFlow)}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[0.7rem] text-faint md:inline">
            <span className="kbd">Enter</span> próximo campo · <span className="kbd">Ctrl</span>+<span className="kbd">Enter</span> salvar
          </span>
          <button type="submit" className="btn-primary">
            Salvar {drafts.filter((d) => d.bank && d.date).length || ""} lançamento(s)
          </button>
        </div>
      </div>
    </form>
  );
}
