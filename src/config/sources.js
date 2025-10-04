export const DEFAULT_SOURCES = [
  { name: "Salário", color: "#0EA5E9", icon: "💼" },
  { name: "Freelance", color: "#6366F1", icon: "🧑‍💻" },
  { name: "Dividendos", color: "#22C55E", icon: "💰" },
  { name: "Renda Fixa", color: "#F59E0B", icon: "📈" },
];

export function stringToSourceColor(input = "") {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 55%)`;
}

export function resolveSourceVisual(sourceName = "", library = DEFAULT_SOURCES) {
  const lower = sourceName.toLowerCase();
  const preset = library.find((source) => source.name.toLowerCase() === lower);
  if (preset) return preset;
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
