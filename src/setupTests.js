import "@testing-library/jest-dom/vitest";
// Polyfills needed by pdfjs in jsdom
if (typeof window !== "undefined") {
  // Basic DOMMatrix polyfill for tests
  if (!window.DOMMatrix) {
    window.DOMMatrix = class {
      constructor() {}
    };
  }
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = () => "blob:mock";
  }
  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
}
