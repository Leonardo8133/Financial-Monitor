import { describe, expect, it } from "vitest";
import { fmtBRL, fmtPct, monthLabel, toNumber, yyyymm } from "./formatters";

describe("toNumber", () => {
  it("converts localized numbers", () => {
    expect(toNumber("1.234,56")).toBeCloseTo(1234.56);
  });

  it("strips non numeric characters", () => {
    expect(toNumber("R$ 2.500,00")).toBe(2500);
  });

  it("handles invalid input", () => {
    expect(toNumber("invalid")).toBe(0);
  });
});

describe("date helpers", () => {
  it("creates yyyymm string", () => {
    expect(yyyymm("2024-05-12")).toBe("2024-05");
  });

  it("formats month labels", () => {
    const label = monthLabel("2024-05").toLowerCase();
    expect(label).toContain("mai");
    expect(label).toContain("2024");
  });
});

describe("formatters", () => {
  it("formats BRL currency", () => {
    const normalized = fmtBRL(1000).replace(/\s+/g, " ");
    expect(normalized).toContain("R$");
    expect(normalized).toContain("1.000,00");
  });

  it("formats percentages", () => {
    const normalized = fmtPct(0.1234).replace(/\s+/g, "");
    expect(normalized).toBe("12,34%");
  });
});
