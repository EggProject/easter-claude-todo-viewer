// @vitest-environment node
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { useSessionScope } from './session-select.js';
import * as appContextModule from '../app-context.js';

vi.mock('../app-context.js', () => ({
  useApp: vi.fn(),
}));

describe('session-select SSR', () => {
  it('covers node environment where window is undefined', () => {
    vi.mocked(appContextModule.useApp).mockReturnValue({
      sessionsState: { watchedSessionIds: ['sess-1'] },
      currentSessionId: 'sess-1',
    });

    function TestComp() {
      const { selectedSessionIds, setSelectedSessionIds } = useSessionScope();
      const ran = React.useRef(false);
      if (!ran.current) {
        ran.current = true;
        setSelectedSessionIds(['sess-1']);
      }
      return React.createElement('div', null, selectedSessionIds.join(','));
    }

    const html = renderToString(
      React.createElement(MemoryRouter, { initialEntries: ['/'] }, React.createElement(TestComp)),
    );
    expect(html).toContain('sess-1');
  });
});
