import "@testing-library/jest-dom/vitest";
import { afterAll, afterEach, beforeAll } from "vitest";
import { cleanup } from "@testing-library/react";

import { server } from "@/api/mock/server";
import { resetDb } from "@/api/mock/db";

/**
 * Node 22+ exposes a half-configured global `localStorage` that shadows
 * jsdom's and throws on use. Replace it with a simple in-memory store.
 */
class MemoryStorage implements Storage {
  #map = new Map<string, string>();
  get length() {
    return this.#map.size;
  }
  clear() {
    this.#map.clear();
  }
  getItem(key: string) {
    return this.#map.has(key) ? this.#map.get(key)! : null;
  }
  key(index: number) {
    return [...this.#map.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.#map.delete(key);
  }
  setItem(key: string, value: string) {
    this.#map.set(key, String(value));
  }
}

for (const target of [globalThis, window]) {
  Object.defineProperty(target, "localStorage", {
    value: new MemoryStorage(),
    configurable: true,
    writable: true,
  });
}

// jsdom lacks these browser APIs that Recharts / MapLibre expect.
if (!("ResizeObserver" in window)) {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, "ResizeObserver", { value: ResizeObserverStub });
  Object.defineProperty(globalThis, "ResizeObserver", {
    value: ResizeObserverStub,
  });
}

// Radix primitives call these on elements; jsdom implements none of them.
for (const method of [
  "hasPointerCapture",
  "releasePointerCapture",
  "setPointerCapture",
  "scrollIntoView",
] as const) {
  Object.defineProperty(window.HTMLElement.prototype, method, {
    value: () => false,
    configurable: true,
    writable: true,
  });
}

if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetDb();
  window.localStorage.clear();
});

afterAll(() => server.close());
