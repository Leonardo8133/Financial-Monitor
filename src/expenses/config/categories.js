export const DEFAULT_CATEGORIES = [
  { name: "Moradia", color: "#1F2937", icon: "🏠" },
  { name: "Alimentação", color: "#10B981", icon: "🍔" },
  { name: "Transporte", color: "#2563EB", icon: "🚌" },
  { name: "Saúde", color: "#EF4444", icon: "🩺" },
  { name: "Educação", color: "#8B5CF6", icon: "📚" },
  { name: "Lazer", color: "#F59E0B", icon: "🎮" },
  { name: "Outros", color: "#6B7280", icon: "🧩" },
];

export function stringToColor(input = "") {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 70% 50%)`;
}

export function resolveCategoryVisual(name = "", library = DEFAULT_CATEGORIES) {
  const lower = name.toLowerCase();
  const preset = library.find((c) => c.name.toLowerCase() === lower);
  if (preset) return preset;
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
