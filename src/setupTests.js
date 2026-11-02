import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Node 22+ exposes an experimental `localStorage` global that is undefined unless
// `--localstorage-file` is passed, and it shadows jsdom's implementation.
// Provide a small in-memory Storage so tests behave like a browser.
function createMemoryStorage() {
  let map = new Map();
  return {
    get length() {
      return map.size;
    },
    key(index) {
      return Array.from(map.keys())[index] ?? null;
    },
    getItem(key) {
      return map.has(String(key)) ? map.get(String(key)) : null;
    },
    setItem(key, value) {
      map.set(String(key), String(value));
    },
    removeItem(key) {
      map.delete(String(key));
    },
    clear() {
      map = new Map();
    },
  };
}

function ensureStorage(name) {
  const current = globalThis[name];
  if (!current || typeof current.getItem !== "function") {
    const storage = createMemoryStorage();
    Object.defineProperty(globalThis, name, { value: storage, configurable: true, writable: true });
    if (typeof window !== "undefined" && window !== globalThis) {
      Object.defineProperty(window, name, { value: storage, configurable: true, writable: true });
    }
  }
}

ensureStorage("localStorage");
ensureStorage("sessionStorage");

afterEach(() => {
  cleanup();
});

if (typeof window !== "undefined") {
  if (!window.DOMMatrix) {
    window.DOMMatrix = class {
      constructor() {}
    };
  }
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = () => "blob:mock";
  }
  if (!window.URL.revokeObjectURL) {
    window.URL.revokeObjectURL = () => {};
  }
  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  if (!window.matchMedia) {
    window.matchMedia = () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
    });
  }
  if (!window.HTMLElement.prototype.scrollIntoView) {
    window.HTMLElement.prototype.scrollIntoView = () => {};
  }
}
