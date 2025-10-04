import { describe, expect, it } from "vitest";
import { computeDerivedEntries, computeTotals } from "./entries";

describe("computeDerivedEntries", () => {
  it("calculates yield compared to previous entry for the same bank", () => {
    const entries = [
      { id: "a", bank: "Banco", date: "2025-08-01", invested: 1000, inAccount: 0, cashFlow: 1000 },
      { id: "b", bank: "Banco", date: "2025-09-01", invested: 1200, inAccount: 0, cashFlow: 0 },
    ];

    const [first, second] = computeDerivedEntries(entries);

    expect(first.yieldValue).toBeNull();
    expect(second.yieldValue).toBeCloseTo(200);
    expect(second.yieldPct).toBeCloseTo(0.2);
  });

  it("respects cash flow adjustments when deriving yield", () => {
    const entries = [
      { id: "a", bank: "Banco", date: "2025-08-01", invested: 2000, inAccount: 0, cashFlow: 0 },
      { id: "b", bank: "Banco", date: "2025-09-01", invested: 2100, inAccount: 0, cashFlow: 200 },
    ];

    const [, second] = computeDerivedEntries(entries);

    // Expected: current (2100) - (previous total 2000 + cashFlow 200) = -100
    expect(second.yieldValue).toBeCloseTo(-100);
  });
});

describe("computeTotals", () => {
  it("aggregates totals ignoring entries without yield", () => {
    const entries = computeDerivedEntries([
      { id: "a", bank: "Banco", date: "2025-08-01", invested: 1000, inAccount: 200, cashFlow: 200 },
      { id: "b", bank: "Banco", date: "2025-09-01", invested: 1500, inAccount: 300, cashFlow: 100 },
    ]);

    const totals = computeTotals(entries);

    expect(totals.total_invested).toBeCloseTo(2500);
    expect(totals.total_in_account).toBeCloseTo(500);
    expect(totals.total_input).toBeCloseTo(300);
    expect(totals.total_yield_value).toBeCloseTo(500);
  });
});
