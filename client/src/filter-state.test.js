import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router';
import {
  usePersistentPageFilters,
  usePersistentLocalState,
  parseSorting,
  serializeSorting,
  resolvePersistedFilters,
} from './filter-state.js';

function createWrapper(initialEntries = ['/']) {
  return function RouterWrapper({ children }) {
    return React.createElement(MemoryRouter, { initialEntries }, children);
  };
}

describe('filter-state module', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('re-exported resolvePersistedFilters', () => {
    it('is callable and functions identically to filter-state-core', () => {
      expect(resolvePersistedFilters({ a: '1' })).toEqual({ a: '1' });
    });
  });

  describe('parseSorting and serializeSorting', () => {
    it('parseSorting returns fallback for falsy or empty values', () => {
      expect(parseSorting('')).toEqual([]);
      expect(parseSorting(null)).toEqual([]);
      expect(parseSorting(undefined, [{ id: 'default', desc: false }])).toEqual([
        { id: 'default', desc: false },
      ]);
    });

    it('parseSorting parses comma-separated id:direction strings correctly', () => {
      expect(parseSorting('name:desc,created:asc')).toEqual([
        { id: 'name', desc: true },
        { id: 'created', desc: false },
      ]);
      expect(parseSorting('  status:desc , priority:asc  ')).toEqual([
        { id: 'status', desc: true },
        { id: 'priority', desc: false },
      ]);
    });

    it('parseSorting filters invalid segments and returns fallback if no valid rows', () => {
      expect(parseSorting(':,:desc,', [{ id: 'fallback', desc: true }])).toEqual([
        { id: 'fallback', desc: true },
      ]);
    });

    it('serializeSorting serializes array of sort objects', () => {
      expect(
        serializeSorting([
          { id: 'name', desc: true },
          { id: 'created', desc: false },
        ]),
      ).toBe('name:desc,created:asc');
      expect(serializeSorting([])).toBe('');
      expect(serializeSorting(null)).toBe('');
      expect(serializeSorting(undefined)).toBe('');
    });
  });

  describe('usePersistentLocalState hook', () => {
    it('initializes with default value when storage is empty', () => {
      const { result } = renderHook(() => usePersistentLocalState('test-key', { count: 0 }));
      expect(result.current[0]).toEqual({ count: 0 });
    });

    it('initializes with stored value from localStorage', () => {
      window.localStorage.setItem('test-key', JSON.stringify({ count: 42 }));
      const { result } = renderHook(() => usePersistentLocalState('test-key', { count: 0 }));
      expect(result.current[0]).toEqual({ count: 42 });
    });

    it('falls back to defaultValue if localStorage contains corrupted JSON', () => {
      window.localStorage.setItem('test-key', 'not-valid-json{');
      const { result } = renderHook(() => usePersistentLocalState('test-key', 'fallback'));
      expect(result.current[0]).toBe('fallback');
    });

    it('falls back to defaultValue if localStorage contains JSON null', () => {
      window.localStorage.setItem('test-key', 'null');
      const { result } = renderHook(() => usePersistentLocalState('test-key', 'fallback'));
      expect(result.current[0]).toBe('fallback');
    });

    it('updates state with direct value and saves to localStorage', () => {
      const { result } = renderHook(() => usePersistentLocalState('test-key', 'init'));
      act(() => {
        result.current[1]('updated');
      });
      expect(result.current[0]).toBe('updated');
      expect(JSON.parse(window.localStorage.getItem('test-key'))).toBe('updated');
    });

    it('updates state using functional updater and saves to localStorage', () => {
      const { result } = renderHook(() => usePersistentLocalState('counter', 10));
      act(() => {
        result.current[1]((prev) => prev + 5);
      });
      expect(result.current[0]).toBe(15);
      expect(JSON.parse(window.localStorage.getItem('counter'))).toBe(15);
    });
  });

  describe('usePersistentPageFilters hook', () => {
    it('initializes with defaults when neither storage nor search params exist', () => {
      const defaults = { status: 'all', search: '' };
      const { result } = renderHook(() => usePersistentPageFilters('tasks', defaults), {
        wrapper: createWrapper(['/']),
      });
      expect(result.current[0]).toEqual({ status: 'all', search: '' });
    });

    it('initializes with stored filters if localStorage has valid data', () => {
      window.localStorage.setItem(
        'claude-todos:filters:tasks',
        JSON.stringify({ status: 'completed', search: 'hello' }),
      );
      const defaults = { status: 'all', search: '' };
      const { result } = renderHook(() => usePersistentPageFilters('tasks', defaults), {
        wrapper: createWrapper(['/']),
      });
      expect(result.current[0]).toEqual({ status: 'completed', search: 'hello' });
    });

    it('handles invalid JSON in localStorage safely', () => {
      window.localStorage.setItem('claude-todos:filters:tasks', 'invalid-json');
      const defaults = { status: 'all' };
      const { result } = renderHook(() => usePersistentPageFilters('tasks', defaults), {
        wrapper: createWrapper(['/']),
      });
      expect(result.current[0]).toEqual({ status: 'all' });
    });

    it('handles null JSON in localStorage safely', () => {
      window.localStorage.setItem('claude-todos:filters:tasks', 'null');
      const defaults = { status: 'all' };
      const { result } = renderHook(() => usePersistentPageFilters('tasks', defaults), {
        wrapper: createWrapper(['/']),
      });
      expect(result.current[0]).toEqual({ status: 'all' });
    });

    it('ignores non-string values stored in localStorage JSON', () => {
      window.localStorage.setItem(
        'claude-todos:filters:tasks',
        JSON.stringify({ q: 123, sort: true, status: 'in_progress' }),
      );
      const defaults = { status: 'all', q: '', sort: 'dependency' };
      const { result } = renderHook(() => usePersistentPageFilters('tasks', defaults), {
        wrapper: createWrapper(['/']),
      });
      expect(result.current[0]).toEqual({ status: 'in_progress', q: '', sort: 'dependency' });
    });

    it('updates filter, updates localStorage and searchParams', () => {
      const defaults = { status: 'all', sort: 'newest' };
      const { result } = renderHook(
        () => {
          const [filters, setFilter] = usePersistentPageFilters('tasks', defaults);
          const [searchParams] = useSearchParams();
          return { filters, setFilter, searchParams };
        },
        {
          wrapper: createWrapper(['/?status=all']),
        },
      );

      act(() => {
        result.current.setFilter('status', 'in_progress');
      });

      expect(result.current.filters.status).toBe('in_progress');
      expect(result.current.searchParams.get('status')).toBe('in_progress');
      expect(JSON.parse(window.localStorage.getItem('claude-todos:filters:tasks'))).toMatchObject({
        status: 'in_progress',
      });
    });

    it('removes search param when filter value equals default value', () => {
      const defaults = { status: 'all' };
      const { result } = renderHook(
        () => {
          const [filters, setFilter] = usePersistentPageFilters('tasks', defaults);
          const [searchParams] = useSearchParams();
          return { filters, setFilter, searchParams };
        },
        {
          wrapper: createWrapper(['/?status=in_progress']),
        },
      );

      act(() => {
        result.current.setFilter('status', 'all');
      });

      expect(result.current.filters.status).toBe('all');
      expect(result.current.searchParams.has('status')).toBe(false);
    });

    it('handles null and undefined filter values and default values', () => {
      const defaults = { tag: null };
      const { result } = renderHook(
        () => {
          const [filters, setFilter] = usePersistentPageFilters('tasks', defaults);
          const [searchParams] = useSearchParams();
          return { filters, setFilter, searchParams };
        },
        {
          wrapper: createWrapper(['/?tag=important']),
        },
      );

      act(() => {
        result.current.setFilter('tag', null);
      });

      expect(result.current.filters.tag).toBe('');
      expect(result.current.searchParams.has('tag')).toBe(false);
    });
  });
});
