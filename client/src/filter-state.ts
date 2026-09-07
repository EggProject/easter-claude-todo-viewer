import { useCallback, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { resolvePersistedFilters } from './filter-state-core.js';
import { isRecord } from './types.js';
export { resolvePersistedFilters } from './filter-state-core.js';

export interface SortItem {
  id: string;
  desc: boolean;
}

function safeParse(raw: string | null, fallback: Record<string, string>): Record<string, string> {
  try {
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (isRecord(parsed)) {
      const res: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'string') res[k] = v;
      }
      return res;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

function isUpdaterFunction<T>(value: T | ((current: T) => T)): value is (current: T) => T {
  return typeof value === 'function';
}

export function usePersistentPageFilters(
  pageKey: string,
  defaults: Record<string, string>,
): [Record<string, string>, (key: string, value: unknown) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const storageKey = `claude-todos:filters:${pageKey}`;
  const [stored, setStored] = useState<Record<string, string>>(() => {
    if (typeof window === 'undefined') return {};
    const fallback: Record<string, string> = {};
    return safeParse(window.localStorage.getItem(storageKey), fallback);
  });

  const values = useMemo(
    () => resolvePersistedFilters(defaults, searchParams, stored),
    [defaults, searchParams, stored],
  );

  const setFilter = useCallback(
    (key: string, value: unknown) => {
      const stringValue = value == null ? '' : String(value);
      const nextState: Record<string, string> = { ...values, [key]: stringValue };
      setStored(nextState);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(nextState));
      }
      const next = new URLSearchParams(searchParams);
      const defVal = defaults[key];
      const defaultValue = defVal == null ? '' : String(defVal);
      if (stringValue === defaultValue) {
        next.delete(key);
      } else {
        next.set(key, stringValue);
      }
      setSearchParams(next, { replace: true });
    },
    [values, storageKey, searchParams, setSearchParams, defaults],
  );

  return [values, setFilter];
}

function isCompatible<T>(val: unknown, fallback: T): val is T {
  if (val == null) return false;
  return typeof val === typeof fallback;
}

export function usePersistentLocalState<T>(
  storageKey: string,
  defaultValue: T,
): [T, (next: T | ((current: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return defaultValue;
      const parsed: unknown = JSON.parse(raw);
      return isCompatible(parsed, defaultValue) ? parsed : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const update = useCallback(
    (next: T | ((current: T) => T)) => {
      setValue((current) => {
        const resolved = isUpdaterFunction(next) ? next(current) : next;
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(storageKey, JSON.stringify(resolved));
        }
        return resolved;
      });
    },
    [storageKey],
  );

  return [value, update];
}

export function parseSorting(value: unknown, fallback: SortItem[] = []): SortItem[] {
  if (typeof value !== 'string' || !value) return fallback;
  const rows: SortItem[] = [];
  const parts = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  for (const part of parts) {
    const [id, direction] = part.split(':');
    if (id) {
      rows.push({ id, desc: direction === 'desc' });
    }
  }
  return rows.length ? rows : fallback;
}

export function serializeSorting(sorting: SortItem[] = []): string {
  return (sorting || []).map((item) => `${item.id}:${item.desc ? 'desc' : 'asc'}`).join(',');
}
