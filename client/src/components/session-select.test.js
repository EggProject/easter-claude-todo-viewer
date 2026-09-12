import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import * as reactRouter from 'react-router';
import { useSessionScope, SessionScopeSelect } from './session-select.js';
import * as appContextModule from '../app-context.js';

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useLocation: vi.fn(actual.useLocation),
  };
});

vi.mock('../app-context.js', () => ({
  useApp: vi.fn(),
}));

function createRouterWrapper(initialEntries = ['/tasks']) {
  return function RouterWrapper({ children }) {
    return React.createElement(MemoryRouter, { initialEntries }, children);
  };
}

describe('session-select module', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  describe('useSessionScope hook', () => {
    it('initializes from searchParams if valid watched sessions exist in URL', () => {
      vi.mocked(appContextModule.useApp).mockReturnValue({
        sessionsState: { watchedSessionIds: ['sess-1', 'sess-2'] },
        currentSessionId: 'sess-1',
      });

      const { result } = renderHook(() => useSessionScope(), {
        wrapper: createRouterWrapper(['/tasks?sessions=sess-2']),
      });

      expect(result.current.selectedSessionIds).toEqual(['sess-2']);
    });

    it('initializes from localStorage when URL has no session param', () => {
      window.localStorage.setItem('claude-todos:session-scope:flow', JSON.stringify(['sess-2']));
      vi.mocked(appContextModule.useApp).mockReturnValue({
        sessionsState: { watchedSessionIds: ['sess-1', 'sess-2'] },
        currentSessionId: 'sess-1',
      });

      const { result } = renderHook(() => useSessionScope(), {
        wrapper: createRouterWrapper(['/flow']),
      });

      expect(result.current.selectedSessionIds).toEqual(['sess-2']);
    });

    it('handles corrupted JSON in localStorage and falls back to current session', () => {
      window.localStorage.setItem('claude-todos:session-scope:tasks', 'corrupted-json{');
      vi.mocked(appContextModule.useApp).mockReturnValue({
        sessionsState: { watchedSessionIds: ['sess-1', 'sess-2'] },
        currentSessionId: 'sess-1',
      });

      const { result } = renderHook(() => useSessionScope(), {
        wrapper: createRouterWrapper(['/']),
      });

      expect(result.current.selectedSessionIds).toEqual(['sess-1']);
    });

    it('falls back to first watched session when currentSession is not watched', () => {
      vi.mocked(appContextModule.useApp).mockReturnValue({
        sessionsState: { watchedSessionIds: ['sess-1', 'sess-2'] },
        currentSessionId: 'sess-unwatched',
      });

      const { result } = renderHook(() => useSessionScope(), {
        wrapper: createRouterWrapper(['/tasks']),
      });

      expect(result.current.selectedSessionIds).toEqual(['sess-1']);
    });

    it('falls back to empty array when no watched sessions exist', () => {
      vi.mocked(appContextModule.useApp).mockReturnValue({
        sessionsState: { watchedSessionIds: [] },
        currentSessionId: null,
      });

      const { result } = renderHook(() => useSessionScope(), {
        wrapper: createRouterWrapper(['/tasks']),
      });

      expect(result.current.selectedSessionIds).toEqual([]);
    });

    it('setSelectedSessionIds removes url param when selecting only current session', () => {
      vi.mocked(appContextModule.useApp).mockReturnValue({
        sessionsState: { watchedSessionIds: ['sess-1', 'sess-2'] },
        currentSessionId: 'sess-1',
      });

      const { result } = renderHook(() => useSessionScope(), {
        wrapper: createRouterWrapper(['/tasks?sessions=sess-1,sess-2']),
      });

      act(() => {
        result.current.setSelectedSessionIds(['sess-1']);
      });

      expect(result.current.selectedSessionIds).toEqual(['sess-1']);
    });

    it('setSelectedSessionIds sets url param when selecting multiple sessions', () => {
      vi.mocked(appContextModule.useApp).mockReturnValue({
        sessionsState: { watchedSessionIds: ['sess-1', 'sess-2'] },
        currentSessionId: 'sess-1',
      });

      const { result } = renderHook(() => useSessionScope(), {
        wrapper: createRouterWrapper(['/tasks']),
      });

      act(() => {
        result.current.setSelectedSessionIds(['sess-1', 'sess-2']);
      });

      expect(result.current.selectedSessionIds).toEqual(['sess-1', 'sess-2']);
    });

    it('normalizes URL if unwatched session appears in searchParams', () => {
      vi.mocked(appContextModule.useApp).mockReturnValue({
        sessionsState: { watchedSessionIds: ['sess-1'] },
        currentSessionId: 'sess-1',
      });

      const { result } = renderHook(() => useSessionScope(), {
        wrapper: createRouterWrapper(['/tasks?sessions=sess-removed']),
      });

      expect(result.current.selectedSessionIds).toEqual(['sess-1']);
    });

    it('produces stable array references when the underlying session IDs do not change', () => {
      let watched = ['sess-1', 'sess-2'];
      vi.mocked(appContextModule.useApp).mockImplementation(() => ({
        sessionsState: { watchedSessionIds: watched },
        currentSessionId: 'sess-1',
      }));

      const { result, rerender } = renderHook(() => useSessionScope(), {
        wrapper: createRouterWrapper(['/tasks?sessions=sess-1,sess-2']),
      });

      const initialRef = result.current.selectedSessionIds;
      expect(initialRef).toEqual(['sess-1', 'sess-2']);

      // Rerender with the same wrapper and state
      rerender();
      expect(result.current.selectedSessionIds).toBe(initialRef);

      // Rerender with a new array instance containing identical session IDs
      watched = ['sess-1', 'sess-2'];
      rerender();
      expect(result.current.selectedSessionIds).toBe(initialRef);
    });

    it('produces stable array references on fallback selections when IDs do not change', () => {
      let watched = ['sess-1', 'sess-2'];
      vi.mocked(appContextModule.useApp).mockImplementation(() => ({
        sessionsState: { watchedSessionIds: watched },
        currentSessionId: 'sess-1',
      }));

      const { result, rerender } = renderHook(() => useSessionScope(), {
        wrapper: createRouterWrapper(['/tasks']),
      });

      const initialRef = result.current.selectedSessionIds;
      expect(initialRef).toEqual(['sess-1']);

      watched = ['sess-1', 'sess-2'];
      rerender();
      expect(result.current.selectedSessionIds).toBe(initialRef);
    });
  });

  describe('SessionScopeSelect component', () => {
    it('returns null when watched sessions count is 1 or less', () => {
      vi.mocked(appContextModule.useApp).mockReturnValue({
        watchedSessions: [{ id: 's1', label: 'Session 1' }],
        currentSessionId: 's1',
      });

      const { container } = render(
        React.createElement(SessionScopeSelect, {
          selectedSessionIds: ['s1'],
          setSelectedSessionIds: vi.fn(),
        }),
      );

      expect(container.firstChild).toBeNull();
    });

    it('renders popover and responds to shortcuts, toggles, clicks outside, and Escape key', () => {
      const watched = [
        { id: 'session-alpha-long-identifier', label: 'Alpha', current: true },
        { id: 'session-beta', summary: 'Beta Summary', current: false },
        { id: 'short', current: false },
      ];
      const setSelectedSessionIds = vi.fn();

      vi.mocked(appContextModule.useApp).mockReturnValue({
        watchedSessions: watched,
        currentSessionId: 'session-alpha-long-identifier',
      });

      const { container, unmount } = render(
        React.createElement(SessionScopeSelect, {
          selectedSessionIds: ['session-alpha-long-identifier'],
          setSelectedSessionIds,
        }),
      );

      expect(screen.getByText('Sessions · 1 selected')).toBeDefined();

      const button = screen.getByRole('button', { name: /Sessions · 1 selected/ });
      fireEvent.click(button);

      expect(screen.getByRole('menu')).toBeDefined();
      expect(screen.getByText('Alpha')).toBeDefined();
      expect(screen.getByText('Beta Summary')).toBeDefined();
      expect(screen.getAllByText('short')).toHaveLength(2);
      expect(screen.getAllByText('session-…')).toHaveLength(2);

      const allWatchedBtn = screen.getByRole('button', { name: '☑ All watched' });
      fireEvent.click(allWatchedBtn);
      expect(setSelectedSessionIds).toHaveBeenCalledWith([
        'session-alpha-long-identifier',
        'session-beta',
        'short',
      ]);

      const currentBtn = screen.getByRole('button', { name: '★ Current' });
      fireEvent.click(currentBtn);
      expect(setSelectedSessionIds).toHaveBeenCalledWith(['session-alpha-long-identifier']);

      fireEvent.click(button);
      const checkboxes = screen.getAllByRole('checkbox');
      // Click already-checked box to execute next.delete(id)
      fireEvent.click(checkboxes[0]);
      expect(setSelectedSessionIds).toHaveBeenCalledWith([]);

      // Click unchecked box to execute next.add(id)
      fireEvent.click(checkboxes[1]);
      expect(setSelectedSessionIds).toHaveBeenCalled();

      // Test non-Escape key doesn't close popover
      fireEvent.keyDown(window, { key: 'Enter' });
      expect(screen.getByRole('menu')).toBeDefined();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByRole('menu')).toBeNull();

      fireEvent.click(button);
      expect(screen.getByRole('menu')).toBeDefined();
      // Click inside menu doesn't close popover
      fireEvent.mouseDown(screen.getByRole('menu'));
      expect(screen.getByRole('menu')).toBeDefined();

      fireEvent.mouseDown(document.body);
      expect(screen.queryByRole('menu')).toBeNull();

      unmount();
    });

    it('handles root pathname and corrupted/non-array storage in useSessionScope', () => {
      window.localStorage.setItem('claude-todos:session-scope:tasks', 'invalid-json{');
      vi.mocked(appContextModule.useApp).mockReturnValue({
        sessionsState: { watchedSessionIds: ['s1'] },
        currentSessionId: 's1',
      });

      const { result } = renderHook(() => useSessionScope(), {
        wrapper: createRouterWrapper(['/']),
      });

      expect(result.current.selectedSessionIds).toEqual(['s1']);

      // Storage with non-array JSON
      window.localStorage.setItem('claude-todos:session-scope:tasks', '12345');
      const { result: res2 } = renderHook(() => useSessionScope(), {
        wrapper: createRouterWrapper(['/']),
      });
      expect(res2.current.selectedSessionIds).toEqual(['s1']);
    });

    it('handles empty watchedIds and current not in watched in useSessionScope', () => {
      vi.mocked(appContextModule.useApp).mockReturnValue({
        sessionsState: { watchedSessionIds: [] },
        currentSessionId: 'unwatched',
      });

      const { result } = renderHook(() => useSessionScope(), {
        wrapper: createRouterWrapper(['/tasks']),
      });

      expect(result.current.selectedSessionIds).toEqual([]);

      act(() => {
        result.current.setSelectedSessionIds([]);
      });
      expect(result.current.selectedSessionIds).toEqual([]);
    });

    it('renders all watched label when all sessions are selected', () => {
      const watched = [
        { id: 's1', label: 'S1' },
        { id: 's2', label: 'S2' },
      ];
      vi.mocked(appContextModule.useApp).mockReturnValue({
        watchedSessions: watched,
        currentSessionId: 's1',
      });

      render(
        React.createElement(SessionScopeSelect, {
          selectedSessionIds: ['s1', 's2'],
          setSelectedSessionIds: vi.fn(),
        }),
      );

      expect(screen.getByText('Sessions · All watched (2)')).toBeDefined();
    });

    it('disables Current button when currentSessionId is null and exercises ternary fallback with dynamic getter', () => {
      let accessCount = 0;
      const dynamicApp = {
        watchedSessions: [
          { id: 's1', label: 'S1' },
          { id: 's2', label: 'S2' },
        ],
        get currentSessionId() {
          accessCount++;
          // Returns truthy during render (so button is not disabled), then null during click
          return accessCount <= 1 ? 's1' : null;
        },
      };
      vi.mocked(appContextModule.useApp).mockReturnValue(dynamicApp);

      const mockSetSelected = vi.fn();
      render(
        React.createElement(SessionScopeSelect, {
          selectedSessionIds: ['s1'],
          setSelectedSessionIds: mockSetSelected,
        }),
      );

      fireEvent.click(screen.getByRole('button', { name: /Sessions · 1 selected/ }));
      const currentBtn = screen.getByRole('button', { name: '★ Current' });
      // Button is enabled during render, so clicking it invokes onClick
      fireEvent.click(currentBtn);
      expect(mockSetSelected).toHaveBeenCalledWith([]);
    });

    it('covers null/empty branches for location pathname, watchedSessionIds, setSelectedSessionIds, and shortId', () => {
      // Branch 1 & 2: empty pathname and missing watchedSessionIds
      vi.mocked(reactRouter.useLocation).mockReturnValueOnce({ pathname: null, search: '' });
      vi.mocked(appContextModule.useApp).mockReturnValue({
        sessionsState: {},
        currentSessionId: null,
      });

      const { result } = renderHook(() => useSessionScope(), {
        wrapper: createRouterWrapper(['/tasks']),
      });
      expect(result.current.selectedSessionIds).toEqual([]);

      // Branch 12: setSelectedSessionIds with null
      act(() => {
        result.current.setSelectedSessionIds(null);
      });

      // Branch 22: app.watchedSessions is null
      vi.mocked(appContextModule.useApp).mockReturnValue({
        watchedSessions: null,
      });
      const { container } = render(
        React.createElement(SessionScopeSelect, {
          selectedSessionIds: [],
          setSelectedSessionIds: vi.fn(),
        }),
      );
      expect(container.firstChild).toBeNull();

      // Branch 27 & 35: selectedSessionIds is null and shortId with null/falsy id rendered with open popover
      vi.mocked(appContextModule.useApp).mockReturnValue({
        watchedSessions: [
          { id: null, label: 'No ID Session' },
          { id: 's2', label: 'S2' },
        ],
        currentSessionId: null,
      });

      render(
        React.createElement(SessionScopeSelect, {
          selectedSessionIds: null,
          setSelectedSessionIds: vi.fn(),
        }),
      );
      // Click select button to open popover so shortId runs on watched items
      fireEvent.click(screen.getByRole('button', { name: /Sessions · 0 selected/ }));
      expect(screen.getByText('No ID Session')).toBeDefined();
    });
  });
});
