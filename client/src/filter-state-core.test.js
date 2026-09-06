import { describe, it, expect } from 'vitest';
import { resolvePersistedFilters } from './filter-state-core.js';

describe('filter-state-core module', () => {
  it('returns empty object when all arguments are omitted or default', () => {
    expect(resolvePersistedFilters()).toEqual({});
  });

  it('uses default values when no searchParams or stored values exist', () => {
    const defaults = { status: 'all', query: '' };
    expect(resolvePersistedFilters(defaults)).toEqual({ status: 'all', query: '' });
  });

  it('merges stored values on top of defaults', () => {
    const defaults = { status: 'all', sort: 'newest', query: '' };
    const stored = { status: 'pending', sort: 'oldest' };
    expect(resolvePersistedFilters(defaults, new URLSearchParams(), stored)).toEqual({
      status: 'pending',
      sort: 'oldest',
      query: '',
    });
  });

  it('handles null stored values safely', () => {
    const defaults = { status: 'all' };
    expect(resolvePersistedFilters(defaults, new URLSearchParams(), null)).toEqual({
      status: 'all',
    });
  });

  it('overrides with searchParams when present for keys in defaults', () => {
    const defaults = { status: 'all', sort: 'newest' };
    const stored = { status: 'pending', sort: 'oldest' };
    const searchParams = new URLSearchParams('status=completed&unrelated=123');

    const result = resolvePersistedFilters(defaults, searchParams, stored);
    expect(result).toEqual({
      status: 'completed',
      sort: 'oldest',
    });
    expect(result.unrelated).toBeUndefined();
  });
});
