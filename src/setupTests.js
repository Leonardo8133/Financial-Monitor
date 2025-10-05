import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// Ensure React Testing Library cleans up between tests to avoid DOM leakage
afterEach(() => {
  cleanup();
});
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
