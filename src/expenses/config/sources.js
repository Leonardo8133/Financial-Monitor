export const DEFAULT_SOURCES = [
  { name: "Pessoal", color: "#0EA5E9", icon: "👤" },
  { name: "Empresa", color: "#9333EA", icon: "🏢" },
  { name: "Família", color: "#F43F5E", icon: "👪" },
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

export function resolveSourceVisual(name = "", library = DEFAULT_SOURCES) {
  const lower = name.toLowerCase();
  const preset = library.find((s) => s.name.toLowerCase() === lower);
  if (preset) return preset;
  return { name, color: stringToColor(name), icon: "💼" };
}

export function ensureSourceInLibrary(name, library = DEFAULT_SOURCES) {
  if (!name) return library;
  const lower = name.toLowerCase();
  const exists = library.some((s) => s.name.toLowerCase() === lower);
  if (exists) return library;
  const next = resolveSourceVisual(name, []);
  return [...library, next];
}
