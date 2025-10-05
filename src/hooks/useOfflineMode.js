import { useEffect } from 'react';

export function useOfflineMode() {
  useEffect(() => {
    // Bloquear todas as chamadas de rede
    const originalFetch = window.fetch;
    const originalXMLHttpRequest = window.XMLHttpRequest;
    const originalWebSocket = window.WebSocket;

    // Interceptar fetch
    window.fetch = function(...args) {
      console.warn('Chamada de rede bloqueada:', args[0]);
      return Promise.reject(new Error('Chamadas de rede estão desabilitadas para manter os dados seguros'));
    };

    // Interceptar XMLHttpRequest
    const OriginalXHR = window.XMLHttpRequest;
    window.XMLHttpRequest = function() {
      const xhr = new OriginalXHR();
      const originalOpen = xhr.open;
      xhr.open = function(method, url, ...args) {
        console.warn('Chamada XMLHttpRequest bloqueada:', url);
        throw new Error('Chamadas de rede estão desabilitadas para manter os dados seguros');
      };
      return xhr;
    };

    // Interceptar WebSocket
    window.WebSocket = function(url, ...args) {
      console.warn('Conexão WebSocket bloqueada:', url);
      throw new Error('Conexões WebSocket estão desabilitadas para manter os dados seguros');
    };

    // Restaurar funções originais quando o componente for desmontado
    return () => {
      window.fetch = originalFetch;
      window.XMLHttpRequest = originalXMLHttpRequest;
      window.WebSocket = originalWebSocket;
    };
  }, []);
}