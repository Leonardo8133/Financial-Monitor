import { normalizeDateInput } from "../../utils/formatters.js";
import { parseMoney, roundMoney } from "../../utils/money.js";

/**
 * Wise exports one CSV per currency ("statement_<id>_<CUR>_<from>_<to>.csv").
 * Amounts are in that statement's currency, so non-BRL statements need an
 * exchange rate. Rates are taken from the conversion rows found in the files
 * (the app is offline) and can be edited before importing.
 */

const META_FIELDS = ["currency", "originalAmount", "originalCurrency", "exchangeRate", "externalId", "kind", "fees", "exchangeFrom", "exchangeTo"];
export const PASSTHROUGH_FIELDS = META_FIELDS;

function indexHeaders(row = []) {
  const map = new Map();
  row.forEach((cell, index) => map.set(String(cell ?? "").trim().toLowerCase(), index));
  return map;
}

function isWiseHeader(row = []) {
  const h = indexHeaders(row);
  return h.has("transferwise id") && h.has("amount") && h.has("currency");
}

function mapWiseRow(row, h) {
  const get = (name) => {
    const i = h.get(name);
    return i === undefined ? "" : String(row[i] ?? "").trim();
  };
  const currency = get("currency").toUpperCase();
  const amount = parseMoney(get("amount"));
  const dateTime = get("date time");
  const time = (/\d{2}:\d{2}:\d{2}/.exec(dateTime) || [])[0] || "";
  const kind = get("transaction details type").toUpperCase();
  const description = get("merchant") || get("description") || get("payee name") || get("payer name");
  const rate = Number(get("exchange rate"));
  return {
    date: normalizeDateInput(get("date") || dateTime.slice(0, 10)),
    time,
    description,
    value: amount,
    categories: [],
    sources: [`Wise ${currency || ""}`.trim()],
    currency,
    externalId: get("transferwise id"),
    kind,
    fees: parseMoney(get("total fees")),
    exchangeFrom: get("exchange from").toUpperCase(),
    exchangeTo: get("exchange to").toUpperCase(),
    exchangeRate: Number.isFinite(rate) && rate > 0 ? rate : null,
  };
}

/** Template object compatible with detectCsvImportTemplate. */
export const wiseTemplate = {
  id: "wise_statement",
  displayName: "Wise - Extrato (CSV)",
  headerRowIndex: 0,
  detect({ rawRows = [] }) {
    const headerIndex = rawRows.slice(0, 5).findIndex(isWiseHeader);
    if (headerIndex === -1) return null;
    const h = indexHeaders(rawRows[headerIndex]);
    const items = rawRows
      .slice(headerIndex + 1)
      .filter((row) => Array.isArray(row) && row.some((c) => String(c ?? "").trim()))
      .map((row) => mapWiseRow(row, h))
      .filter((item) => item.date && item.description && item.value);
    return { template: this, headerRowIndex: headerIndex, items };
  },
};

/** Exchange rates to `base` found in conversion rows, most recent first. */
export function extractFxRates(items = [], base = "BRL") {
  const rates = {};
  const sorted = items
    .filter((i) => i.kind === "CONVERSION" && i.exchangeRate && i.exchangeFrom && i.exchangeTo)
    .slice()
    .sort((a, b) => `${b.date} ${b.time || ""}`.localeCompare(`${a.date} ${a.time || ""}`));
  for (const i of sorted) {
    if (i.exchangeTo === base && i.exchangeFrom !== base && !rates[i.exchangeFrom]) rates[i.exchangeFrom] = i.exchangeRate;
    if (i.exchangeFrom === base && i.exchangeTo !== base && !rates[i.exchangeTo]) rates[i.exchangeTo] = roundRate(1 / i.exchangeRate);
  }
  return rates;
}

function roundRate(n) {
  return Math.round(n * 100000) / 100000;
}

/**
 * Defaults for the import panel, or null when nothing needs attention.
 * Conversions are ignored by default only when the other side of every
 * conversion is also being imported (otherwise they are the only trace of that money).
 */
export function buildFxDefaults(items = [], base = "BRL", referenceRates = {}) {
  const foreign = Array.from(new Set(items.map((i) => i.currency).filter((c) => c && c !== base)));
  const conversions = items.filter((i) => i.kind === "CONVERSION");
  if (!foreign.length && !conversions.length) return null;
  const present = new Set(items.map((i) => i.currency || base));
  const counterpartsPresent = conversions.every((c) => {
    const other = c.currency === c.exchangeFrom ? c.exchangeTo : c.exchangeFrom;
    return other && present.has(other);
  });
  const found = extractFxRates(items, base);
  const origin = {};
  const rates = Object.fromEntries(
    foreign.map((cur) => {
      if (found[cur]) {
        origin[cur] = "file";
        return [cur, found[cur]];
      }
      if (Number(referenceRates?.[cur]) > 0) {
        origin[cur] = "reference";
        return [cur, Number(referenceRates[cur])];
      }
      origin[cur] = "missing";
      return [cur, ""];
    })
  );
  return { base, foreign, rates, found, origin, conversions: conversions.length, ignoreConversions: conversions.length > 0 && counterpartsPresent };
}

/** Converts foreign-currency items to base and optionally drops conversions. */
export function applyFx(items = [], fx) {
  if (!fx) return { items, skipped: 0, missing: [] };
  const missing = fx.foreign.filter((cur) => !(Number(fx.rates[cur]) > 0));
  let skipped = 0;
  const out = [];
  for (const item of items) {
    if (fx.ignoreConversions && item.kind === "CONVERSION") {
      skipped += 1;
      continue;
    }
    if (item.currency && item.currency !== fx.base) {
      const rate = Number(fx.rates[item.currency]);
      if (!(rate > 0)) {
        out.push(item);
        continue;
      }
      out.push({
        ...item,
        originalAmount: item.value,
        originalCurrency: item.currency,
        exchangeRate: rate,
        value: roundMoney(item.value * rate),
      });
      continue;
    }
    out.push(item);
  }
  return { items: out, skipped, missing };
}
