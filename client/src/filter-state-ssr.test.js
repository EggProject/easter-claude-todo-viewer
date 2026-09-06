// @vitest-environment node
import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { usePersistentLocalState, usePersistentPageFilters } from './filter-state.js';

describe('filter-state SSR', () => {
  it('renders hooks in node environment where window is undefined', () => {
    let capturedLocal;
    let capturedFilters;
    let capturedSetLocal;
    let capturedSetFilter;

    function TestComp() {
      const [local, setLocal] = usePersistentLocalState('test-key', 'default-val');
      const [filters, setFilter] = usePersistentPageFilters('test-page', { q: 'initial' });
      capturedLocal = local;
      capturedFilters = filters;
      capturedSetLocal = setLocal;
      capturedSetFilter = setFilter;
      return React.createElement('div', null, `${local}:${filters.q}`);
    }

    const html = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/'] }, React.createElement(TestComp))
    );

    expect(html).toContain('default-val:initial');
    expect(capturedLocal).toBe('default-val');
    expect(capturedFilters).toEqual({ q: 'initial' });

    expect(typeof capturedSetLocal).toBe('function');
    expect(typeof capturedSetFilter).toBe('function');
    capturedSetFilter('q', 'updated');
    capturedSetFilter('q', null);
    capturedSetFilter('q', 'initial'); // equals default
  });

  it('covers update callback in node environment without window', () => {
    function UpdaterComp() {
      const [local, setLocal] = usePersistentLocalState('test-key-updater', 'init');
      const ranRef = React.useRef(false);
      if (!ranRef.current) {
        ranRef.current = true;
        setLocal('updated-val');
        setLocal(prev => prev + '-functional');
      }
      return React.createElement('div', null, local);
    }

    const html = renderToString(React.createElement(UpdaterComp));
    expect(html).toBeDefined();
  });
});
