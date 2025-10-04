import { emptyEntry } from "../data/demoEntries.js";

export function makeId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `id-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}

export function withId(entry) {
  if (entry.id) return entry;
  const { locked, ...rest } = entry;
  return { ...rest, id: makeId() };
}

export function createDraftEntry(overrides = {}) {
  return { ...emptyEntry, ...overrides, id: makeId(), locked: false };
}
