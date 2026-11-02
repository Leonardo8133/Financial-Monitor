import { toNumber } from "../../utils/formatters.js";
import { normalizeDescriptionKey } from "./expenses.js";

const WINDOW_SECONDS = 5;

function timestampOf(row) {
  if (!row?.date) return null;
  const time = row.time || row.datetime?.slice(11) || null;
  if (!time) return null;
  const d = new Date(`${row.date}T${time.length === 5 ? `${time}:00` : time}`);
  return Number.isNaN(d.getTime()) ? null : d.getTime();
}

/**
 * Finds probable double charges among rows: same description, same value and
 * either the same day (files without time) or at most 5 seconds apart (when a
 * `time`/`datetime` field is present). Returns groups; the first row of each
 * group is kept, the rest are "extras".
 */
export function findDoubleCharges(rows = [], { windowSeconds = WINDOW_SECONDS } = {}) {
  const buckets = new Map();
  for (const row of rows) {
    if (!row || !row.date || !row.description) continue;
    const value = toNumber(row.value);
    if (!value) continue;
    const key = `${normalizeDescriptionKey(row.description)}|${value.toFixed(2)}|${row.date}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(row);
  }

  const groups = [];
  for (const members of buckets.values()) {
    if (members.length < 2) continue;
    const withTime = members.every((m) => timestampOf(m) !== null);
    if (!withTime) {
      groups.push({ keep: members[0], extras: members.slice(1), sameDay: true });
      continue;
    }
    const sorted = members.slice().sort((a, b) => timestampOf(a) - timestampOf(b));
    let current = [sorted[0]];
    for (let i = 1; i < sorted.length; i += 1) {
      const gap = (timestampOf(sorted[i]) - timestampOf(sorted[i - 1])) / 1000;
      if (gap <= windowSeconds) current.push(sorted[i]);
      else {
        if (current.length > 1) groups.push({ keep: current[0], extras: current.slice(1), sameDay: false });
        current = [sorted[i]];
      }
    }
    if (current.length > 1) groups.push({ keep: current[0], extras: current.slice(1), sameDay: false });
  }

  const extraIds = new Set(groups.flatMap((g) => g.extras.map((r) => r.id)));
  return { groups, extraIds, extraCount: extraIds.size };
}
