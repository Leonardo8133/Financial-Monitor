import { describe, expect, it } from "vitest";
import { findDoubleCharges } from "./duplicates.js";

describe("findDoubleCharges", () => {
  it("flags same description, value and day when files have no time", () => {
    const rows = [
      { id: "1", date: "2026-07-03", description: "Penny Rammersweier", value: -29.41 },
      { id: "2", date: "2026-07-03", description: "Penny Rammersweier", value: -29.41 },
      { id: "3", date: "2026-07-03", description: "Penny Rammersweier", value: -101.99 },
      { id: "4", date: "2026-07-04", description: "Penny Rammersweier", value: -29.41 },
    ];
    const { groups, extraIds } = findDoubleCharges(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].keep.id).toBe("1");
    expect(Array.from(extraIds)).toEqual(["2"]);
  });

  it("uses a 5 second window when time is present", () => {
    const rows = [
      { id: "a", date: "2026-07-03", time: "12:00:00", description: "Uber", value: -20 },
      { id: "b", date: "2026-07-03", time: "12:00:04", description: "Uber", value: -20 },
      { id: "c", date: "2026-07-03", time: "12:10:00", description: "Uber", value: -20 },
    ];
    const { extraIds } = findDoubleCharges(rows);
    expect(Array.from(extraIds)).toEqual(["b"]);
  });

  it("ignores zero values and empty descriptions", () => {
    const { extraCount } = findDoubleCharges([
      { id: "1", date: "2026-07-03", description: "", value: -5 },
      { id: "2", date: "2026-07-03", description: "", value: -5 },
      { id: "3", date: "2026-07-03", description: "X", value: 0 },
      { id: "4", date: "2026-07-03", description: "X", value: 0 },
    ]);
    expect(extraCount).toBe(0);
  });
});
