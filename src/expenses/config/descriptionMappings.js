export const DEFAULT_DESCRIPTION_CATEGORY_MAPPINGS = [];

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
    const existingCategories = existing ? existing.categories : [];
    const merged = Array.from(new Set([...existingCategories, ...categories]));
    map.set(keyword, { 
      categories: merged, 
      exactMatch: entry.exactMatch !== undefined ? entry.exactMatch : (existing ? existing.exactMatch : false)
    });
  }
  return Array.from(map.entries()).map(([keyword, data]) => ({ 
    keyword, 
    categories: data.categories,
    exactMatch: data.exactMatch
  }));
}
