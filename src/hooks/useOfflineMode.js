import { useEffect } from "react";

/**
 * Privacy guard: blocks cross-origin network calls made by the page at runtime.
 * Same-origin requests (the app itself, configuracoes-padrao.json) stay allowed.
 * Disabled in development so Vite's HMR keeps working.
 */
export function useOfflineMode() {
  useEffect(() => {
    if (import.meta.env?.DEV) return undefined;
    if (typeof window === "undefined" || window.__fmOfflineGuard) return undefined;
    window.__fmOfflineGuard = true;

    const originalFetch = window.fetch;
    const OriginalXHR = window.XMLHttpRequest;
    const OriginalWebSocket = window.WebSocket;

    const isAllowed = (urlLike) => {
      try {
        const url = typeof urlLike === "string" ? urlLike : urlLike?.url || String(urlLike || "");
        const resolved = new URL(url, window.location.origin);
        return resolved.origin === window.location.origin || resolved.protocol === "blob:" || resolved.protocol === "data:";
      } catch {
        return false;
      }
    };

    window.fetch = function (...args) {
      if (isAllowed(args[0])) return originalFetch.apply(this, args);
      console.warn("Chamada de rede bloqueada:", args[0]);
      return Promise.reject(new Error("Chamadas de rede externas estão desabilitadas para manter os dados seguros"));
    };

    window.XMLHttpRequest = function () {
      const xhr = new OriginalXHR();
      const originalOpen = xhr.open;
      xhr.open = function (method, url, ...rest) {
        if (isAllowed(url)) return originalOpen.call(this, method, url, ...rest);
        console.warn("Chamada XMLHttpRequest bloqueada:", url);
        throw new Error("Chamadas de rede externas estão desabilitadas para manter os dados seguros");
      };
      return xhr;
    };

    window.WebSocket = function (url, ...rest) {
      if (isAllowed(url)) return new OriginalWebSocket(url, ...rest);
      console.warn("Conexão WebSocket bloqueada:", url);
      throw new Error("Conexões WebSocket externas estão desabilitadas para manter os dados seguros");
    };

    return () => {
      window.fetch = originalFetch;
      window.XMLHttpRequest = OriginalXHR;
      window.WebSocket = OriginalWebSocket;
      window.__fmOfflineGuard = false;
    };
  }, []);
}
