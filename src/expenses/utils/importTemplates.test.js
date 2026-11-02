import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import { detectCsvImportTemplate, normalizeImportedItems } from "./importTemplates.js";

function load(name) {
  const file = path.resolve(__dirname, "../../../tests/fixtures", name);
  const data = Papa.parse(fs.readFileSync(file, "utf8"), { header: false, skipEmptyLines: true }).data;
  const headers = data[0].map((c) => String(c).trim());
  const result = detectCsvImportTemplate({ fileName: name, headers, rows: [], rawRows: data });
  return { result, rows: data.length - 1 };
}

describe("Nubank CSV templates", () => {
  it("imports every row of the credit card statement (date,title,amount)", () => {
    const { result, rows } = load("nubank-card-sample.csv");
    expect(result?.template.id).toBe("nubank_basic_csv");
    const items = normalizeImportedItems(result.items);
    expect(items).toHaveLength(rows);
    expect(items[0]).toMatchObject({ date: "2026-07-04", description: "Plano NuCel", value: -45, sources: ["Cartão de Crédito Nubank"] });
    expect(items[2].value).toBeCloseTo(33.66); // refund becomes income
    expect(items[3].value).toBeCloseTo(-19734.81);
    expect(items[4].value).toBeCloseTo(2000); // "Pagamento recebido"
  });

  it("imports every row of the account statement (NU_*.csv)", () => {
    const { result, rows } = load("NU_000_01JUL2026_31JUL2026.csv".replace("NU_000_01JUL2026_31JUL2026.csv", "nubank-account-sample.csv"));
    // detection relies on the NU_ file name pattern, so pass it explicitly
    const file = path.resolve(__dirname, "../../../tests/fixtures/nubank-account-sample.csv");
    const data = Papa.parse(fs.readFileSync(file, "utf8"), { header: false, skipEmptyLines: true }).data;
    const detected = detectCsvImportTemplate({ fileName: "NU_955058557_01JUL2026_31JUL2026.csv", headers: data[0], rows: [], rawRows: data });
    expect(detected?.template.id).toBe("nubank_statement_detailed");
    const items = normalizeImportedItems(detected.items);
    expect(items).toHaveLength(rows);
    expect(items[0]).toMatchObject({ date: "2026-07-02", value: 5.64, sources: ["Conta Nubank"] });
    expect(items[1].value).toBeCloseTo(-389.6);
    expect(items[4].value).toBeCloseTo(-21173.36);
    expect(result === null || result.template.id === "nubank_statement_detailed").toBe(true);
  });
});
