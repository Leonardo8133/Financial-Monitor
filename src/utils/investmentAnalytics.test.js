import { describe, expect, it } from "vitest";
import { buildInvestmentTimeline, computeCurrentPosition, findDuplicateSnapshots, summarizeTimeline } from "./investmentAnalytics.js";

const entries = [
  { id: "1", bank: "XP", source: "A", date: "2025-01-10", invested: 1000, inAccount: 0, cashFlow: 1000 },
  { id: "2", bank: "Nu", source: "A", date: "2025-01-10", invested: 500, inAccount: 50, cashFlow: 550 },
  { id: "3", bank: "XP", source: "A", date: "2025-02-10", invested: 1100, inAccount: 0, cashFlow: 50 },
  // Nu not updated in February; updated again in March
  { id: "4", bank: "Nu", source: "A", date: "2025-03-10", invested: 600, inAccount: 50, cashFlow: 0 },
  { id: "5", bank: "XP", source: "A", date: "2025-03-10", invested: 1150, inAccount: 0, cashFlow: 0 },
];

describe("computeCurrentPosition", () => {
  it("sums the latest snapshot of each bank", () => {
    const pos = computeCurrentPosition(entries);
    expect(pos.total).toBe(1800);
    expect(pos.banks.map((b) => b.name)).toEqual(["XP", "Nu"]);
    expect(pos.asOf).toBe("2025-03-10");
  });
});

describe("buildInvestmentTimeline", () => {
  it("carries forward banks without entries in the month", () => {
    const carry = buildInvestmentTimeline(entries, { aggregation: "carry" });
    expect(carry.map((m) => m.total)).toEqual([1550, 1650, 1800]);
    const month = buildInvestmentTimeline(entries, { aggregation: "month" });
    expect(month.map((m) => m.total)).toEqual([1550, 1100, 1800]);
  });

  it("computes monthly yield from per-bank snapshots", () => {
    const tl = buildInvestmentTimeline(entries, { aggregation: "carry" });
    expect(tl[0].yieldValue).toBeNull();
    expect(tl[1].yieldValue).toBeCloseTo(50); // 1100 - (1000 + 50)
    expect(tl[2].yieldValue).toBeCloseTo(150); // XP +50, Nu +100
    const s = summarizeTimeline(tl);
    expect(s.yieldLast12).toBeCloseTo(200);
    expect(s.last.ym).toBe("2025-03");
  });

  it("groups by source", () => {
    const tl = buildInvestmentTimeline(entries, { groupBy: "source" });
    expect(tl[2].groups.map((g) => g.name)).toEqual(["A"]);
  });
});

describe("findDuplicateSnapshots", () => {
  it("flags same bank and date", () => {
    const dups = findDuplicateSnapshots(entries, [{ bank: "xp", date: "2025-03-10" }, { bank: "XP", date: "2025-04-01" }]);
    expect(dups).toHaveLength(1);
    expect(dups[0].existing.id).toBe("5");
  });
});
