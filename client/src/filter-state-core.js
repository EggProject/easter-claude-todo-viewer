export function resolvePersistedFilters(defaults = {}, searchParams = new URLSearchParams(), stored = {}) {
  const result = { ...defaults, ...(stored || {}) };
  for (const key of Object.keys(defaults)) {
    if (searchParams.has(key)) result[key] = searchParams.get(key);
  }
  return result;
}
