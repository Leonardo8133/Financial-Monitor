import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const storageMocks = vi.hoisted(() => ({
  migrateToUnifiedStorage: vi.fn(),
  resetDataAndLoadDefaults: vi.fn(),
}));

vi.mock("../utils/unifiedStorage.js", async () => {
  const actual = await vi.importActual("../utils/unifiedStorage.js");
  return {
    ...actual,
    migrateToUnifiedStorage: storageMocks.migrateToUnifiedStorage,
    resetDataAndLoadDefaults: storageMocks.resetDataAndLoadDefaults,
  };
});

import { useUnifiedAppBootstrap } from "./useUnifiedAppBootstrap.js";

describe("useUnifiedAppBootstrap", () => {
  beforeEach(() => {
    localStorage.clear();
    storageMocks.migrateToUnifiedStorage.mockReset();
    storageMocks.resetDataAndLoadDefaults.mockReset();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("uses migration when legacy data exists", async () => {
    const migrated = {
      investimentos: { entries: [] },
      gastos: { expenses: [] },
    };
    localStorage.setItem("legacy-key", JSON.stringify({ entries: [{ id: 1 }] }));
    storageMocks.migrateToUnifiedStorage.mockResolvedValue(migrated);

    const { result } = renderHook(() => useUnifiedAppBootstrap(["legacy-key"]));

    await waitFor(() => expect(storageMocks.migrateToUnifiedStorage).toHaveBeenCalledTimes(1));
    expect(storageMocks.resetDataAndLoadDefaults).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current[0]).toEqual(migrated));
  });

  it("loads defaults when no app data exists", async () => {
    const initialized = {
      investimentos: { entries: [] },
      gastos: { expenses: [] },
    };
    storageMocks.resetDataAndLoadDefaults.mockResolvedValue(initialized);

    const { result } = renderHook(() => useUnifiedAppBootstrap(["legacy-key"]));

    await waitFor(() => expect(storageMocks.resetDataAndLoadDefaults).toHaveBeenCalledTimes(1));
    expect(storageMocks.migrateToUnifiedStorage).not.toHaveBeenCalled();
    await waitFor(() => expect(result.current[0]).toEqual(initialized));
  });
});