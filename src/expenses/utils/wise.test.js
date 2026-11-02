import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { detectCsvImportTemplate, normalizeImportedItems } from "./importTemplates.js";
import { applyFx, buildFxDefaults, extractFxRates } from "./wise.js";

function load(name) {
  const file = path.resolve(__dirname, "../../../tests/fixtures", name);
  const data = Papa.parse(fs.readFileSync(file, "utf8"), { header: false, skipEmptyLines: true }).data;
  const res = detectCsvImportTemplate({ fileName: name, headers: data[0], rows: [], rawRows: data });
  return { res, items: res ? normalizeImportedItems(res.items) : [] };
}

describe("Wise statements", () => {
  it("detects and maps the BRL statement", () => {
    const { res, items } = load("statement_000_BRL_2026-06-01_2026-10-08.csv");
    expect(res.template.id).toBe("wise_statement");
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ date: "2026-10-01", time: "22:35:10", value: 116.19, currency: "BRL", kind: "CONVERSION", externalId: "BALANCE-3", sources: ["Wise BRL"] });
    expect(items[1].value).toBe(-100);
  });

  it("maps card purchases using the merchant name", () => {
    const { items } = load("statement_000_EUR_2026-06-01_2026-10-08.csv");
    expect(items[0]).toMatchObject({ description: "Loja Exemplo", value: -65.17, currency: "EUR", kind: "CARD" });
  });

  it("finds rates from conversions in both directions", () => {
    const { items: brl } = load("statement_000_BRL_2026-06-01_2026-10-08.csv");
    expect(extractFxRates(brl).EUR).toBeCloseTo(5.87092);
    const onlyReverse = brl.filter((i) => i.exchangeFrom === "BRL");
    expect(extractFxRates(onlyReverse).EUR).toBeCloseTo(1 / 0.16928, 3);
  });

  it("converts foreign values and ignores conversions when both sides are imported", () => {
    const all = [...load("statement_000_BRL_2026-06-01_2026-10-08.csv").items, ...load("statement_000_EUR_2026-06-01_2026-10-08.csv").items];
    const fx = buildFxDefaults(all);
    expect(fx.foreign).toEqual(["EUR"]);
    expect(fx.ignoreConversions).toBe(true);
    const { items, skipped, missing } = applyFx(all, fx);
    expect(missing).toEqual([]);
    expect(skipped).toBe(3);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ originalAmount: -65.17, originalCurrency: "EUR" });
    expect(items[0].value).toBeCloseTo(-65.17 * 5.87092, 2);
  });

  it("keeps conversions by default when only the BRL statement is imported", () => {
    const { items } = load("statement_000_BRL_2026-06-01_2026-10-08.csv");
    const fx = buildFxDefaults(items);
    expect(fx.foreign).toEqual([]);
    expect(fx.ignoreConversions).toBe(false);
  });

  it("falls back to reference rates when the file has no conversion for a currency", () => {
    const eur = load("statement_000_EUR_2026-06-01_2026-10-08.csv").items.filter((i) => i.kind === "CARD");
    const fx = buildFxDefaults(eur, "BRL", { EUR: 5.615, USD: 5.02 });
    expect(fx.rates.EUR).toBe(5.615);
    expect(fx.origin.EUR).toBe("reference");
    expect(applyFx(eur, fx).items[0].value).toBeCloseTo(-65.17 * 5.615, 2);
    const none = buildFxDefaults(eur, "BRL", {});
    expect(none.origin.EUR).toBe("missing");
    expect(applyFx(eur, none).missing).toEqual(["EUR"]);
  });
});
