import { colorForName, isValidColor } from "../../utils/palette.js";
export const DEFAULT_CATEGORIES = [
  { name: "Moradia", color: "#1F2937", icon: "🏠" },
  { name: "Alimentação", color: "#10B981", icon: "🍔" },
  { name: "Transporte", color: "#2563EB", icon: "🚌" },
  { name: "Saúde", color: "#EF4444", icon: "🩺" },
  { name: "Educação", color: "#8B5CF6", icon: "📚" },
  { name: "Lazer", color: "#F59E0B", icon: "🎮" },
  { name: "Assinaturas", color: "#EC4899", icon: "📱" },
  { name: "Outros", color: "#6B7280", icon: "🧩" },
];

export function stringToColor(input = "") {
  return colorForName(input);
}

export function resolveCategoryVisual(name = "", library = DEFAULT_CATEGORIES) {
  const lower = name.toLowerCase();
  const preset = library.find((c) => c.name.toLowerCase() === lower);
  if (preset) return isValidColor(preset.color) ? preset : { ...preset, color: colorForName(name) };
  return { name, color: stringToColor(name), icon: "🏷️" };
}

export function ensureCategoryInLibrary(name, library = DEFAULT_CATEGORIES) {
  if (!name) return library;
  const lower = name.toLowerCase();
  const exists = library.some((c) => c.name.toLowerCase() === lower);
  if (exists) return library;
  const next = resolveCategoryVisual(name, []);
  return [...library, next];
}
