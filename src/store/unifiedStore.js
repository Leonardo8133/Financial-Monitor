import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  UNIFIED_LS_KEY,
  UNIFIED_STORAGE_SEED,
  migrateToUnifiedStorage,
  normalizeUnifiedStorage,
  readUnifiedStoreFromStorage,
  resetDataAndLoadDefaults,
} from "../utils/unifiedStorage.js";
import { LS_KEY } from "../utils/formatters.js";
import { EXPENSES_LS_KEY } from "../expenses/config/storage.js";

/**
 * Single in-memory source of truth for the unified store.
 * Every page (apps, settings, reports, home) reads from here, so edits made in
 * one screen are immediately visible in another and persisted exactly once.
 */
const LEGACY_KEYS = [LS_KEY, EXPENSES_LS_KEY];

let state = null;
let ready = false;
let bootstrapPromise = null;
const listeners = new Set();
let lastRaw = null;

function emit() {
  for (const listener of listeners) listener();
}

function persist(next) {
  try {
    const raw = JSON.stringify(next);
    lastRaw = raw;
    localStorage.setItem(UNIFIED_LS_KEY, raw);
  } catch (error) {
    console.error("Não foi possível salvar os dados no navegador:", error);
  }
}

function storageHasData(keys) {
  return keys.some((key) => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null && raw !== "null" && raw !== "";
    } catch {
      return false;
    }
  });
}

export function getStoreSnapshot() {
  return state;
}

export function isStoreReady() {
  return ready;
}

export function subscribeStore(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setStore(updater) {
  const base = state ?? normalizeUnifiedStorage(UNIFIED_STORAGE_SEED);
  const candidate = typeof updater === "function" ? updater(base) : updater;
  if (!candidate) return state;
  state = normalizeUnifiedStorage(candidate);
  ready = true;
  persist(state);
  emit();
  return state;
}

export function replaceStore(next) {
  return setStore(() => next);
}

export async function bootstrapStore({ force = false, legacyKeys = LEGACY_KEYS } = {}) {
  if (bootstrapPromise && !force) return bootstrapPromise;
  bootstrapPromise = (async () => {
    try {
      const initializer = storageHasData([UNIFIED_LS_KEY, ...legacyKeys])
        ? migrateToUnifiedStorage
        : resetDataAndLoadDefaults;
      const next = await initializer();
      if (next && typeof next === "object") {
        state = normalizeUnifiedStorage(next);
        ready = true;
        persist(state);
        emit();
      }
    } catch (error) {
      console.error("Erro ao inicializar dados unificados:", error);
      state = normalizeUnifiedStorage(UNIFIED_STORAGE_SEED);
      ready = true;
      emit();
    } finally {
      bootstrapPromise = null;
    }
    return state;
  })();
  return bootstrapPromise;
}

/** Re-reads localStorage when it changed outside this module (other tab, tests). */
function syncFromStorageIfNeeded() {
  let raw = null;
  try {
    raw = localStorage.getItem(UNIFIED_LS_KEY);
  } catch {
    raw = null;
  }
  if (raw === lastRaw && state) return;
  if (!raw || raw === "null") {
    if (state !== null) {
      state = null;
      ready = false;
      lastRaw = null;
      emit();
    }
    return;
  }
  const parsed = readUnifiedStoreFromStorage();
  if (parsed) {
    state = parsed;
    ready = true;
    lastRaw = raw;
    emit();
  }
}

export async function resetStoreToDefaults() {
  const next = await resetDataAndLoadDefaults();
  state = normalizeUnifiedStorage(next);
  ready = true;
  persist(state);
  emit();
  return state;
}

/** Test helper. */
export function __resetUnifiedStoreForTests() {
  state = null;
  ready = false;
  bootstrapPromise = null;
  lastRaw = null;
  listeners.clear();
}

const EMPTY = normalizeUnifiedStorage(UNIFIED_STORAGE_SEED);

export function useUnifiedStore({ legacyKeys } = {}) {
  const snapshot = useSyncExternalStore(subscribeStore, getStoreSnapshot, getStoreSnapshot);
  const legacySignature = Array.isArray(legacyKeys) ? legacyKeys.join("|") : "";

  useEffect(() => {
    syncFromStorageIfNeeded();
    if (!getStoreSnapshot()) {
      bootstrapStore(legacySignature ? { legacyKeys: legacySignature.split("|") } : {});
    }
    const onStorage = (event) => {
      if (!event.key || event.key === UNIFIED_LS_KEY) syncFromStorageIfNeeded();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [legacySignature]);

  const updateInvestments = useCallback((updater) => {
    setStore((prev) => ({
      ...prev,
      investimentos: typeof updater === "function" ? updater(prev.investimentos, prev) : { ...prev.investimentos, ...updater },
    }));
  }, []);

  const updateExpenses = useCallback((updater) => {
    setStore((prev) => ({
      ...prev,
      gastos: typeof updater === "function" ? updater(prev.gastos, prev) : { ...prev.gastos, ...updater },
    }));
  }, []);

  return {
    store: snapshot ?? EMPTY,
    ready: Boolean(snapshot),
    setStore,
    replaceStore,
    updateInvestments,
    updateExpenses,
    resetToDefaults: resetStoreToDefaults,
  };
}
