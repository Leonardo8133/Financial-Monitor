import { useUnifiedStore } from "../store/unifiedStore.js";

/**
 * Compatibility wrapper around the shared unified store.
 * Returns [store, setStore] like the old hook did. `legacyKeys` are extra
 * localStorage keys that, when present, trigger the migration path.
 */
export function useUnifiedAppBootstrap(legacyKeys) {
  const { store, ready, setStore } = useUnifiedStore({ legacyKeys });
  return [ready ? store : null, setStore];
}
