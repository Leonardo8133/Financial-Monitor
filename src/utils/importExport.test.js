import { describe, expect, it } from "vitest";
import { analyzeImport, applyImport, buildExportPayload } from "./importExport.js";
import { normalizeUnifiedStorage } from "./unifiedStorage.js";

const base = normalizeUnifiedStorage({
  investimentos: { entries: [{ id: "a", bank: "XP", date: "2025-01-01", invested: 100 }], banks: [{ name: "XP" }] },
  gastos: { expenses: [{ id: "e1", date: "2025-01-02", description: "Uber", value: -10, categories: ["Transporte"] }], categories: [{ name: "Transporte" }] },
});

describe("analyzeImport", () => {
  it("detects the v3 wrapper and raw unified stores", () => {
    const wrapper = buildExportPayload(base);
    expect(analyzeImport(wrapper).kind).toBe("unified");
    expect(analyzeImport(base).kind).toBe("unified");
    expect(analyzeImport(wrapper).summary.entries).toBe(1);
  });

  it("detects legacy investments and expenses files", () => {
    const inv = analyzeImport({ inputs: [{ entries: [{ bank: "Nu", date: "2025-02-01", invested: 50 }] }], banks: [{ name: "Nu" }] });
    expect(inv.kind).toBe("investments");
    expect(inv.summary.entries).toBe(1);
    const exp = analyzeImport({ expenses: [{ date: "01/02/2025", description: "Mercado", value: "-12,50" }] });
    expect(exp.kind).toBe("expenses");
    expect(exp.partial.gastos.expenses[0]).toMatchObject({ date: "2025-02-01", value: -12.5 });
    expect(analyzeImport([{ description: "x", value: 1 }]).kind).toBe("expenses");
    expect(analyzeImport({ foo: 1 }).kind).toBe("invalid");
  });
});

describe("applyImport", () => {
  it("merges without duplicating records", () => {
    const analysis = analyzeImport({
      investimentos: { entries: [{ id: "a", bank: "XP", date: "2025-01-01", invested: 100 }, { bank: "Inter", date: "2025-01-01", invested: 5 }], banks: [{ name: "Inter", color: "#f00" }] },
      gastos: { expenses: [{ date: "2025-01-02", description: "uber", value: -10 }, { date: "2025-01-03", description: "Padaria", value: -4 }] },
    });
    const { store, report } = applyImport(base, analysis, "merge");
    expect(report.entriesAdded).toBe(1);
    expect(report.expensesAdded).toBe(1);
    expect(store.investimentos.entries).toHaveLength(2);
    expect(store.gastos.expenses).toHaveLength(2);
    expect(store.investimentos.banks.map((b) => b.name)).toEqual(["XP", "Inter"]);
  });

  it("replaces only the sections present in the file", () => {
    const analysis = analyzeImport({ expenses: [{ date: "2025-03-01", description: "Nova", value: -1 }] });
    const { store } = applyImport(base, analysis, "replace");
    expect(store.gastos.expenses).toHaveLength(1);
    expect(store.gastos.expenses[0].description).toBe("Nova");
    expect(store.investimentos.entries).toHaveLength(1);
  });
});
