export function resolvePersistedFilters(
  defaults: Record<string, string> = {},
  searchParams: URLSearchParams = new URLSearchParams(),
  stored: Record<string, string> = {},
): Record<string, string> {
  const result: Record<string, string> = { ...defaults, ...stored };
  for (const key of Object.keys(defaults)) {
    const val = searchParams.get(key);
    if (val !== null) {
      result[key] = val;
    }
  }
  return result;
}
