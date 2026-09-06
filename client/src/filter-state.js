import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { resolvePersistedFilters } from './filter-state-core.js';
export { resolvePersistedFilters } from './filter-state-core.js';

function safeParse(raw, fallback = null) {
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

export function usePersistentPageFilters(pageKey, defaults) {
  const [searchParams, setSearchParams] = useSearchParams();
  const storageKey = `claude-todos:filters:${pageKey}`;
  const [stored, setStored] = useState(() => {
    if (typeof window === 'undefined') return {};
    return safeParse(window.localStorage.getItem(storageKey), {}) || {};
  });
  const values = useMemo(() => resolvePersistedFilters(defaults, searchParams, stored), [defaults, searchParams, stored]);
  const setFilter = useCallback((key, value) => {
    const stringValue = value == null ? '' : String(value);
    const nextState = { ...values, [key]: stringValue };
    setStored(nextState);
    if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, JSON.stringify(nextState));
    const next = new URLSearchParams(searchParams);
    const defaultValue = defaults[key] == null ? '' : String(defaults[key]);
    if (stringValue === defaultValue) next.delete(key); else next.set(key, stringValue);
    setSearchParams(next, { replace: true });
  }, [values, storageKey, searchParams, setSearchParams, defaults]);
  return [values, setFilter];
}

export function usePersistentLocalState(storageKey, defaultValue) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return defaultValue;
    return safeParse(window.localStorage.getItem(storageKey), defaultValue) ?? defaultValue;
  });
  const update = useCallback(next => {
    setValue(current => {
      const resolved = typeof next === 'function' ? next(current) : next;
      if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, JSON.stringify(resolved));
      return resolved;
    });
  }, [storageKey]);
  return [value, update];
}

export function parseSorting(value, fallback = []) {
  if (!value) return fallback;
  const rows = String(value).split(',').map(part => part.trim()).filter(Boolean).map(part => {
    const [id, direction] = part.split(':');
    return id ? { id, desc: direction === 'desc' } : null;
  }).filter(Boolean);
  return rows.length ? rows : fallback;
}
export function serializeSorting(sorting = []) {
  return (sorting || []).map(item => `${item.id}:${item.desc ? 'desc' : 'asc'}`).join(',');
}
