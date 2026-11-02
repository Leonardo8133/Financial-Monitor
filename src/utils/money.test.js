import { describe, expect, it } from "vitest";
import { parseMoney, toEditingString, fmtCompact } from "./money.js";
import { normalizeDateInput } from "./formatters.js";

describe("parseMoney", () => {
  it("parses Brazilian formats", () => {
    expect(parseMoney("1.234,56")).toBeCloseTo(1234.56);
    expect(parseMoney("1234,5")).toBeCloseTo(1234.5);
    expect(parseMoney("R$ 2.500,00")).toBe(2500);
    expect(parseMoney("1.000")).toBe(1000);
    expect(parseMoney("12,30")).toBeCloseTo(12.3);
  });

  it("parses US formats and plain numbers", () => {
    expect(parseMoney("1,234.56")).toBeCloseTo(1234.56);
    expect(parseMoney("12.5")).toBeCloseTo(12.5);
    expect(parseMoney("1234")).toBe(1234);
    expect(parseMoney(42.1)).toBeCloseTo(42.1);
  });

  it("handles signs", () => {
    expect(parseMoney("-12,30")).toBeCloseTo(-12.3);
    expect(parseMoney("-12,30", { allowNegative: false })).toBeCloseTo(12.3);
    expect(parseMoney("(50,00)")).toBe(-50);
    expect(parseMoney("")).toBe(0);
    expect(parseMoney("abc")).toBe(0);
  });

  it("round-trips editing strings", () => {
    expect(toEditingString(1234.5)).toBe("1234,5");
    expect(toEditingString(-7)).toBe("-7");
    expect(toEditingString(0)).toBe("");
  });

  it("formats compact values", () => {
    expect(fmtCompact(950)).toBe("950");
    expect(fmtCompact(12500)).toContain("mil");
    expect(fmtCompact(3400000)).toContain("mi");
  });
});

describe("normalizeDateInput", () => {
  it("accepts several formats", () => {
    expect(normalizeDateInput("2025-01-31")).toBe("2025-01-31");
    expect(normalizeDateInput("31/01/2025")).toBe("2025-01-31");
    expect(normalizeDateInput("31-01-2025")).toBe("2025-01-31");
    expect(normalizeDateInput("5/1/25")).toBe("2025-01-05");
    expect(normalizeDateInput(45658)).toBe("2025-01-01");
    expect(normalizeDateInput("")).toBe("");
  });
});
