import { colorForName, isValidColor } from "../../utils/palette.js";
export const DEFAULT_SOURCES = [
  { name: "Salário", color: "#0EA5E9", icon: "💼" },
  { name: "Freelance", color: "#6366F1", icon: "🧑‍💻" },
  { name: "Dividendos", color: "#22C55E", icon: "💰" },
  { name: "Renda Fixa", color: "#F59E0B", icon: "📈" },
];

export function stringToSourceColor(input = "") {
  return colorForName(input);
}

export function resolveSourceVisual(sourceName = "", library = DEFAULT_SOURCES) {
  const lower = sourceName.toLowerCase();
  const preset = library.find((source) => source.name.toLowerCase() === lower);
  if (preset) return isValidColor(preset.color) ? preset : { ...preset, color: colorForName(sourceName) };
  return { name: sourceName, color: stringToSourceColor(sourceName), icon: "📊" };
}

export function ensureSourceInLibrary(sourceName, library = DEFAULT_SOURCES) {
  if (!sourceName) return library;
  const lower = sourceName.toLowerCase();
  const exists = library.some((source) => source.name.toLowerCase() === lower);
  if (exists) return library;
  const nextSource = resolveSourceVisual(sourceName, []);
  return [...library, nextSource];
}
