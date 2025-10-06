export const DEFAULT_DESCRIPTION_CATEGORY_MAPPINGS = [
  { keyword: "uber", categories: ["Transporte"] },
  { keyword: "99", categories: ["Transporte"] },
  { keyword: "cartao", categories: ["Crédito"] },
  { keyword: "cartão", categories: ["Crédito"] },
  { keyword: "ifood", categories: ["Alimentação"] },
  { keyword: "super", categories: ["Alimentação"] },
  { keyword: "mercado", categories: ["Alimentação"] },
  { keyword: "farmácia", categories: ["Saúde"] },
  { keyword: "farmacia", categories: ["Saúde"] },
  { keyword: "iptu", categories: ["Moradia"] },
  { keyword: "energia", categories: ["Moradia"] },
  { keyword: "luz", categories: ["Moradia"] },
];

export function normalizeMappingKeyword(keyword = "") {
  return keyword.trim().toLowerCase();
}

export function mergeDescriptionMappings(base = [], incoming = []) {
  const map = new Map();
  for (const entry of [...base, ...incoming]) {
    const keyword = normalizeMappingKeyword(entry.keyword);
    if (!keyword) continue;
    const categories = Array.isArray(entry.categories)
      ? entry.categories.filter(Boolean)
      : entry.categories
      ? [entry.categories].filter(Boolean)
      : [];
    if (!categories.length) continue;
    const existing = map.get(keyword);
    const merged = existing ? Array.from(new Set([...existing, ...categories])) : categories;
    map.set(keyword, merged);
  }
  return Array.from(map.entries()).map(([keyword, categories]) => ({ keyword, categories }));
}
