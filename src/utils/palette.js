/**
 * Categorical palette: 12 hues with similar perceived lightness, distinct from
 * each other and readable on light and dark surfaces.
 */
export const CATEGORICAL_PALETTE = [
  "#2563eb", // blue
  "#059669", // emerald
  "#d97706", // amber
  "#dc2626", // red
  "#7c3aed", // violet
  "#0891b2", // cyan
  "#db2777", // pink
  "#65a30d", // lime
  "#ea580c", // orange
  "#4f46e5", // indigo
  "#0d9488", // teal
  "#9f1239", // rose dark
];

export function hashString(input = "") {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Deterministic palette color for a name (used when an item has no color yet). */
export function colorForName(name = "") {
  return CATEGORICAL_PALETTE[hashString(String(name).toLowerCase()) % CATEGORICAL_PALETTE.length];
}

/** Reassigns palette colors to a list of {name,...} items, cycling through the palette. */
export function assignPaletteColors(items = []) {
  return items.map((item, index) => ({ ...item, color: CATEGORICAL_PALETTE[index % CATEGORICAL_PALETTE.length] }));
}

/** Text color that stays readable: the hue mixed toward the theme's ink color. */
export function pillTextColor(color) {
  return `color-mix(in srgb, ${color} 60%, rgb(var(--c-ink)))`;
}

export function pillBackground(color, strength = 16) {
  return `color-mix(in srgb, ${color} ${strength}%, transparent)`;
}

export function pillBorder(color, strength = 45) {
  return `color-mix(in srgb, ${color} ${strength}%, transparent)`;
}

export function isValidColor(color) {
  return typeof color === "string" && /^(#[0-9a-f]{3,8}|hsl|rgb)/i.test(color.trim());
}
