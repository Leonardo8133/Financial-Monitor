import { useEffect } from "react";
import { useLocalStorageState } from "./useLocalStorageState.js";
import {
  UNIFIED_LS_KEY,
  migrateToUnifiedStorage,
  resetDataAndLoadDefaults,
} from "../utils/unifiedStorage.js";

function hasStoredData(keys) {
  return keys.some((key) => {
    const raw = localStorage.getItem(key);
    return raw !== null && raw !== "null";
  });
}

export function useUnifiedAppBootstrap(legacyKeys = []) {
  const [unifiedState, setUnifiedStore] = useLocalStorageState(UNIFIED_LS_KEY, null);
  const legacyKeysSignature = legacyKeys.join("|");

  useEffect(() => {
    if (unifiedState && typeof unifiedState === "object" && Object.keys(unifiedState).length > 0) {
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      try {
        const initializer = hasStoredData([UNIFIED_LS_KEY, ...legacyKeys])
          ? migrateToUnifiedStorage
          : resetDataAndLoadDefaults;
        const nextState = await initializer();

        if (!cancelled && nextState && typeof nextState === "object" && Object.keys(nextState).length > 0) {
          setUnifiedStore(nextState);
        }
      } catch (error) {
        console.error("Erro ao inicializar dados unificados:", error);
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, [legacyKeysSignature, legacyKeys, setUnifiedStore, unifiedState]);

  return [unifiedState, setUnifiedStore];
}