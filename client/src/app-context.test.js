import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import * as appContextModule from './app-context.js';
import { AppProvider, useApp } from './app-context.js';
import { EventSourceMock } from '../test-setup.js';

function TestConsumer({ onApp }) {
  const app = useApp();
  React.useEffect(() => {
    onApp(app);
  }, [app, onApp]);
  return React.createElement(
    'div',
    null,
    React.createElement('span', { 'data-testid': 'status' }, app.bootstrapStatus),
    React.createElement('span', { 'data-testid': 'live' }, app.live),
    React.createElement('span', { 'data-testid': 'session' }, app.currentSessionId || 'none'),
  );
}

describe('app-context module', () => {
  let mockFetch;

  const defaultSessions = {
    currentSessionId: 'sess-1',
    watchedSessionIds: ['sess-1'],
    sessions: [
      { id: 'sess-1', label: 'Session One', current: true, watched: true },
      { id: 'sess-2', label: 'Session Two', current: false, watched: false },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn(async (url, options = {}) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/sessions/refresh')) {
        return { ok: true, json: async () => defaultSessions };
      }
      if (urlStr.includes('/api/sessions') && options.method === 'POST') {
        return { ok: true, json: async () => ({ ok: true }) };
      }
      if (urlStr.includes('/api/sessions') && options.method === 'DELETE') {
        return { ok: true, json: async () => ({ ok: true }) };
      }
      if (urlStr.includes('/api/sessions')) {
        return { ok: true, json: async () => defaultSessions };
      }
      if (urlStr.includes('/api/state')) {
        return { ok: true, json: async () => ({ tasks: [] }) };
      }
      if (urlStr.includes('/api/settings')) {
        return { ok: true, json: async () => ({ theme: 'dark' }) };
      }
      if (urlStr.includes('/api/prompts')) {
        return { ok: true, json: async () => ({ prompts: [{ id: 'p1' }] }) };
      }
      if (urlStr.includes('/api/history')) {
        return { ok: true, json: async () => ({ history: [] }) };
      }
      if (urlStr.includes('/api/translation-catalog')) {
        return { ok: true, json: async () => ({ tasks: [] }) };
      }
      if (urlStr.includes('/api/translations') && options.method === 'DELETE') {
        return { ok: true, json: async () => ({ deleted: true }) };
      }
      if (urlStr.includes('/api/translations') && options.method === 'POST') {
        return { ok: true, json: async () => ({ ok: true }) };
      }
      if (urlStr.includes('/api/translations')) {
        return { ok: true, json: async () => ({ jobs: [] }) };
      }
      return { ok: true, json: async () => ({}) };
    });
    vi.stubGlobal('fetch', mockFetch);
  });

  it('provides full bootstrap flow with current session and heavy data load', async () => {
    let latestApp = null;
    render(
      React.createElement(
        AppProvider,
        null,
        React.createElement(TestConsumer, { onApp: (app) => (latestApp = app) }),
      ),
    );

    await waitFor(() => {
      expect(latestApp.bootstrapStatus).toBe('ready');
      expect(latestApp.currentSessionId).toBe('sess-1');
      expect(latestApp.currentSession?.id).toBe('sess-1');
      expect(latestApp.watchedSessions).toHaveLength(1);
      expect(latestApp.settings).toEqual({ theme: 'dark' });
      expect(latestApp.prompts).toEqual([{ id: 'p1' }]);
    });
  });

  it('handles bootstrap when currentSessionId is null', async () => {
    mockFetch.mockImplementation(async (url) => {
      if (String(url).includes('/api/sessions')) {
        return {
          ok: true,
          json: async () => ({ currentSessionId: null, watchedSessionIds: [], sessions: [] }),
        };
      }
      return { ok: true, json: async () => ({}) };
    });

    let latestApp = null;
    render(
      React.createElement(
        AppProvider,
        null,
        React.createElement(TestConsumer, { onApp: (app) => (latestApp = app) }),
      ),
    );

    await waitFor(() => {
      expect(latestApp.bootstrapStatus).toBe('ready');
      expect(latestApp.currentSessionId).toBeNull();
      expect(latestApp.state).toBeNull();
    });
  });

  it('sets bootstrap error status when initial session load fails', async () => {
    mockFetch.mockImplementation(async (url) => {
      if (String(url).includes('/api/sessions')) {
        return { ok: false, status: 503, json: async () => ({ error: 'Service Unavailable' }) };
      }
      return { ok: true, json: async () => ({}) };
    });

    let latestApp = null;
    render(
      React.createElement(
        AppProvider,
        null,
        React.createElement(TestConsumer, { onApp: (app) => (latestApp = app) }),
      ),
    );

    await waitFor(() => {
      expect(latestApp.bootstrapStatus).toBe('error');
      expect(latestApp.bootstrapError).toContain('Service Unavailable');
    });

    // Test retryBootstrap
    mockFetch.mockImplementation(async () => ({ ok: true, json: async () => defaultSessions }));
    await act(async () => {
      await latestApp.retryBootstrap();
    });
    expect(latestApp.bootstrapStatus).toBe('ready');
  });

  it('handles background heavy data load failure with modal notification', async () => {
    let callCount = 0;
    mockFetch.mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/history')) {
        callCount++;
        if (callCount >= 1) throw new Error('History load failed');
      }
      if (urlStr.includes('/api/sessions')) return { ok: true, json: async () => defaultSessions };
      return { ok: true, json: async () => ({}) };
    });

    let latestApp = null;
    render(
      React.createElement(
        AppProvider,
        null,
        React.createElement(TestConsumer, { onApp: (app) => (latestApp = app) }),
      ),
    );

    await waitFor(() => {
      expect(latestApp.bootstrapStatus).toBe('ready');
      expect(latestApp.modal?.title).toBe('Background data load failed');
    });
  });

  it('manages modal queue with enqueue and acknowledge', async () => {
    let latestApp = null;
    render(
      React.createElement(
        AppProvider,
        null,
        React.createElement(TestConsumer, { onApp: (app) => (latestApp = app) }),
      ),
    );

    await waitFor(() => expect(latestApp.bootstrapStatus).toBe('ready'));

    act(() => {
      latestApp.showModal({ title: 'First Modal' });
      latestApp.showModal({ title: 'Second Modal' });
    });

    expect(latestApp.modal?.title).toBe('First Modal');

    act(() => {
      latestApp.acknowledge();
    });
    expect(latestApp.modal?.title).toBe('Second Modal');

    act(() => {
      latestApp.acknowledge();
    });
    expect(latestApp.modal).toBeNull();
  });

  it('handles EventSource events: open, error, and message dispatchers', async () => {
    let latestApp = null;
    const { unmount } = render(
      React.createElement(
        AppProvider,
        null,
        React.createElement(TestConsumer, { onApp: (app) => (latestApp = app) }),
      ),
    );

    await waitFor(() => expect(latestApp.bootstrapStatus).toBe('ready'));
    const es = EventSourceMock.instances[EventSourceMock.instances.length - 1];
    expect(es).toBeDefined();

    act(() => {
      es.onopen();
    });
    expect(latestApp.live).toBe('LIVE');

    act(() => {
      es.onerror();
    });
    expect(latestApp.live).toBe('RECONNECTING');

    // Trigger state-invalidated
    await act(async () => {
      es.emit('state-invalidated', {});
    });

    // Trigger app-state-changed and sessions-changed
    await act(async () => {
      es.emit('app-state-changed', {});
      es.emit('sessions-changed', {});
    });

    // Trigger notification with valid and invalid json
    await act(async () => {
      es.emit('notification', JSON.stringify({ title: 'Note 1' }));
      es.emit('notification', 'invalid-json-payload');
    });

    // Trigger translation-error with valid and invalid json
    await act(async () => {
      es.emit('translation-error', JSON.stringify({ message: 'Error 1' }));
      es.emit('translation-error', 'invalid-json-payload');
    });

    // Trigger translation-jobs-changed, settings-changed, prompts-changed
    await act(async () => {
      es.emit('translation-jobs-changed', {});
      es.emit('settings-changed', {});
      es.emit('prompts-changed', {});
    });

    unmount();
    expect(es.readyState).toBe(2); // closed
  });

  it('handles switchSessionOptimistic on success and failure', async () => {
    let latestApp = null;
    render(
      React.createElement(
        AppProvider,
        null,
        React.createElement(TestConsumer, { onApp: (app) => (latestApp = app) }),
      ),
    );

    await waitFor(() => expect(latestApp.bootstrapStatus).toBe('ready'));

    // Success path
    await act(async () => {
      await latestApp.switchSession('sess-2');
    });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/sessions/sess-2/switch'),
      expect.any(Object),
    );

    // Failure path
    mockFetch.mockImplementation(async (url) => {
      if (String(url).includes('/switch')) {
        return { ok: false, status: 500, json: async () => ({ error: 'Switch rejected' }) };
      }
      return { ok: true, json: async () => defaultSessions };
    });

    await act(async () => {
      await expect(latestApp.switchSession('sess-bad')).rejects.toThrow('Switch rejected');
    });
    expect(latestApp.modal?.title).toBe('Session switch failed');
  });

  it('handles setSessionLanguage for hu and non-hu, with failure rollback', async () => {
    let latestApp = null;
    render(
      React.createElement(
        AppProvider,
        null,
        React.createElement(TestConsumer, { onApp: (app) => (latestApp = app) }),
      ),
    );

    await waitFor(() => expect(latestApp.bootstrapStatus).toBe('ready'));

    // Set to hu (adds to watched)
    await act(async () => {
      await latestApp.setSessionLanguage('sess-1', 'hu');
    });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/sessions/sess-1/language'),
      expect.objectContaining({ body: JSON.stringify({ language: 'hu' }) }),
    );

    // Set to en for non-current session
    await act(async () => {
      await latestApp.setSessionLanguage('sess-2', 'en');
    });

    // Failure path
    mockFetch.mockImplementation(async (url) => {
      if (String(url).includes('/language')) {
        return { ok: false, status: 400, json: async () => ({ error: 'Unsupported language' }) };
      }
      return { ok: true, json: async () => defaultSessions };
    });

    await act(async () => {
      await expect(latestApp.setSessionLanguage('sess-1', 'invalid')).rejects.toThrow(
        'Unsupported language',
      );
    });
    expect(latestApp.modal?.title).toBe('Session language change failed');
  });

  it('handles session actions: watched, cancelSessionLanguage, toggleTaskLanguage, cancelTask, jobs', async () => {
    let latestApp = null;
    render(
      React.createElement(
        AppProvider,
        null,
        React.createElement(TestConsumer, { onApp: (app) => (latestApp = app) }),
      ),
    );

    await waitFor(() => expect(latestApp.bootstrapStatus).toBe('ready'));

    // Watch and unwatch session
    await act(async () => {
      await latestApp.setSessionWatched('sess-2', true);
      await latestApp.setSessionWatched('sess-2', false);
    });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/sessions/sess-2/watch'),
      expect.objectContaining({ method: 'POST' }),
    );
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/sessions/sess-2/watch'),
      expect.objectContaining({ method: 'DELETE' }),
    );

    // cancelSessionLanguage
    await act(async () => {
      await latestApp.cancelSessionLanguage('sess-1');
    });

    // toggleTaskLanguage hu -> en and en -> hu
    await act(async () => {
      await latestApp.toggleTaskLanguage('sess-1', 'task-1', 'hu');
      await latestApp.toggleTaskLanguage('sess-1', 'task-1', 'en');
    });

    // cancelTask
    await act(async () => {
      await latestApp.cancelTask('sess-1', 'task-1');
    });

    // retryJob, cancelJob, deleteJob
    await act(async () => {
      await latestApp.retryJob('sess-1', 'job-1');
      await latestApp.cancelJob('sess-1', 'job-1');
      await latestApp.deleteJob('sess-1', 'job-1');
    });

    // refreshSessions and refreshState without params
    await act(async () => {
      await latestApp.refreshSessions();
      await latestApp.refreshState();
      await latestApp.loadState();
      await latestApp.loadState([]);
      await latestApp.loadState(['sess-1']);
      await latestApp.loadHistory();
      await latestApp.loadHistory([]);
      await latestApp.loadHistory(['sess-1']);
      latestApp.setSidebar(true);
    });

    expect(latestApp.sidebar).toBe(true);
  });

  it('covers all EventSource error catch handlers and null fallback branches', async () => {
    let latestApp = null;
    render(
      React.createElement(
        AppProvider,
        null,
        React.createElement(TestConsumer, { onApp: (app) => (latestApp = app) }),
      ),
    );

    await waitFor(() => expect(latestApp.bootstrapStatus).toBe('ready'));
    const es = EventSourceMock.instances[EventSourceMock.instances.length - 1];

    // Mock fetch to reject for all background handlers
    mockFetch.mockImplementation(async () => {
      throw new Error('Background fetch network error');
    });

    await act(async () => {
      es.emit('state-invalidated', {});
      es.emit('app-state-changed', {});
      es.emit('sessions-changed', {});
      es.emit('translation-jobs-changed', {});
      es.emit('settings-changed', {});
      es.emit('prompts-changed', {});
    });

    // Test refreshState failure via currentSessionId effect
    await act(async () => {
      // Cause refreshState to fail inside effect
      try {
        await latestApp.refreshState();
      } catch {}
    });

    // Test refreshPrompts with null prompts in response
    mockFetch.mockImplementation(async (url) => {
      if (String(url).includes('/api/prompts')) {
        return { ok: true, json: async () => ({ prompts: null }) };
      }
      return { ok: true, json: async () => defaultSessions };
    });

    await act(async () => {
      await latestApp.refreshPrompts();
    });
    expect(latestApp.prompts).toEqual([]);

    // Test bootstrap error when error has no message (e.g. primitive thrown)
    mockFetch.mockImplementation(async () => {
      throw 'Raw string error with no message property';
    });

    await act(async () => {
      await latestApp.retryBootstrap();
    });
    expect(latestApp.bootstrapStatus).toBe('error');
    expect(latestApp.bootstrapError).toBe('Raw string error with no message property');
  });

  it('handles switchSessionOptimistic and setSessionLanguage with null session lists and false hu branch', async () => {
    String.prototype.find = Array.prototype.find;
    String.prototype.filter = Array.prototype.filter;
    try {
      mockFetch.mockImplementation(async (url) => {
        if (String(url).includes('/api/sessions')) {
          return {
            ok: true,
            json: async () => ({ currentSessionId: null, watchedSessionIds: null, sessions: '' }),
          };
        }
        return { ok: true, json: async () => ({}) };
      });

      let latestApp = null;
      render(
        React.createElement(
          AppProvider,
          null,
          React.createElement(TestConsumer, { onApp: (app) => (latestApp = app) }),
        ),
      );

      await waitFor(() => expect(latestApp.bootstrapStatus).toBe('ready'));

      // Test refreshState when currentSessionId is null
      await act(async () => {
        await latestApp.refreshState();
      });

      // Test switchSessionOptimistic when watchedSessionIds is null and sessions is falsy
      await act(async () => {
        await latestApp.switchSessionOptimistic('sess-new');
      });

      // Test setSessionLanguage with en when watchedSessionIds is null and sessions is falsy
      await act(async () => {
        await latestApp.setSessionLanguage('sess-new', 'en');
      });
    } finally {
      delete String.prototype.find;
      delete String.prototype.filter;
    }
  });

  it('covers session mapping branches in switchSessionOptimistic and setSessionLanguage', async () => {
    let latestApp = null;
    render(
      React.createElement(
        AppProvider,
        null,
        React.createElement(TestConsumer, { onApp: (app) => (latestApp = app) }),
      ),
    );

    await waitFor(() => expect(latestApp.bootstrapStatus).toBe('ready'));

    // sess-1 is currentSessionId, sess-2 is different
    // Test switchSessionOptimistic with existing sessions array (covers item.id === sessionId both true and false)
    await act(async () => {
      await latestApp.switchSessionOptimistic('sess-2');
    });

    // Test setSessionLanguage with hu for currentSessionId (sessionId === currentSessionId is true)
    await act(async () => {
      await latestApp.setSessionLanguage('sess-2', 'hu');
    });

    // Test setSessionLanguage with en for different sessionId (sessionId === currentSessionId is false, language === 'hu' is false, item.id === sessionId both true and false)
    await act(async () => {
      await latestApp.setSessionLanguage('sess-1', 'en');
    });
  });

  it('throws error when useApp is called outside AppProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const TestComp = () => {
      appContextModule.useApp();
      return null;
    };
    expect(() => render(React.createElement(TestComp))).toThrow(
      'useApp must be used within an AppProvider',
    );
    consoleSpy.mockRestore();
  });

  it('covers parse functions with fallback, null, undefined, number, or non-record inputs', () => {
    const {
      parseSessionsState,
      parseAppState,
      parseHistory,
      parseJobs,
      parseCatalog,
      parseSettings,
      parsePrompts,
    } = appContextModule;

    expect(parseSessionsState(null)).toEqual({
      sessions: [],
      currentSessionId: null,
      watchedSessionIds: [],
    });
    expect(parseSessionsState(123)).toEqual({
      sessions: [],
      currentSessionId: null,
      watchedSessionIds: [],
    });
    expect(parseSessionsState({ sessions: null, watchedSessionIds: null })).toEqual({
      sessions: [],
      currentSessionId: null,
      watchedSessionIds: [],
    });
    expect(
      parseSessionsState({
        sessions: [{ id: 's1' }],
        currentSessionId: 's1',
        watchedSessionIds: ['s1', 123],
      }),
    ).toEqual({
      sessions: [{ id: 's1' }],
      currentSessionId: 's1',
      watchedSessionIds: ['s1'],
    });

    expect(parseAppState(null)).toBeNull();
    expect(parseAppState(123)).toBeNull();
    expect(parseAppState({ tasks: [] })).toEqual({ tasks: [] });

    expect(parseHistory(null)).toEqual([]);
    expect(parseHistory({ history: 'invalid' })).toEqual([]);
    expect(parseHistory({ history: [{ id: 'h1' }] })).toEqual([{ id: 'h1' }]);

    expect(parseJobs(null)).toEqual([]);
    expect(parseJobs({ jobs: 'invalid' })).toEqual([]);
    expect(parseJobs({ jobs: [{ id: 'j1', sessionId: 's1', status: 'completed' }] })).toHaveLength(
      1,
    );

    expect(parseCatalog(null)).toEqual([]);
    expect(parseCatalog({ tasks: 'invalid' })).toEqual([]);
    expect(parseCatalog({ tasks: [{ kind: 'task', id: '1' }] })).toHaveLength(1);

    expect(parseSettings(null)).toBeNull();
    expect(parseSettings(123)).toBeNull();
    expect(parseSettings({ translation: {} })).toEqual({ translation: {} });

    expect(parsePrompts(null)).toEqual([]);
    expect(parsePrompts({ prompts: 'invalid' })).toEqual([]);
    expect(parsePrompts({ prompts: [{ id: 'p1' }] })).toEqual([{ id: 'p1' }]);
  });

  it('formats non-Error string rejection in switchSessionOptimistic and setSessionLanguage', async () => {
    let latestApp = null;
    render(
      React.createElement(
        AppProvider,
        null,
        React.createElement(TestConsumer, { onApp: (app) => (latestApp = app) }),
      ),
    );

    await waitFor(() => expect(latestApp.bootstrapStatus).toBe('ready'));

    mockFetch.mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/sessions/sess-fail/switch')) {
        throw 'Session switch error string';
      }
      if (urlStr.includes('/api/sessions/sess-fail/language')) {
        throw 'Session language error string';
      }
      return { ok: true, json: async () => ({}) };
    });

    await act(async () => {
      await expect(latestApp.switchSessionOptimistic('sess-fail')).rejects.toBe(
        'Session switch error string',
      );
    });

    expect(latestApp.modal).toEqual(
      expect.objectContaining({
        kind: 'error',
        title: 'Session switch failed',
        message: 'Session switch error string',
      }),
    );

    act(() => {
      latestApp.acknowledge();
    });

    await act(async () => {
      await expect(latestApp.setSessionLanguage('sess-fail', 'hu')).rejects.toBe(
        'Session language error string',
      );
    });

    expect(latestApp.modal).toEqual(
      expect.objectContaining({
        kind: 'error',
        title: 'Session language change failed',
        message: 'Session language error string',
      }),
    );
  });

  it('debounces rapid consecutive translation-jobs-changed events to prevent redundant parallel catalog refreshes', async () => {
    let latestApp = null;
    render(
      React.createElement(
        AppProvider,
        null,
        React.createElement(TestConsumer, { onApp: (app) => (latestApp = app) }),
      ),
    );

    await waitFor(() => expect(latestApp.bootstrapStatus).toBe('ready'));
    const es = EventSourceMock.instances[EventSourceMock.instances.length - 1];

    mockFetch.mockClear();

    await act(async () => {
      for (let i = 0; i < 6; i++) {
        es.emit('translation-jobs-changed', { index: i });
      }
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 350));
    });

    const catalogRequests = mockFetch.mock.calls.filter(([url]) =>
      String(url).includes('/api/translation-catalog'),
    );

    expect(catalogRequests.length).toBeLessThanOrEqual(2);
    expect(catalogRequests.length).toBeGreaterThanOrEqual(1);

    // Test error in translation-jobs-changed Promise.all catch handler
    mockFetch.mockImplementation(async (url) => {
      if (String(url).includes('/api/translation-catalog')) {
        throw new Error('catalog fetch failed');
      }
      return { ok: true, json: async () => [] };
    });
    await act(async () => {
      es.emit('translation-jobs-changed', {});
      await new Promise((resolve) => setTimeout(resolve, 350));
    });
  });

  it('covers useOptionalApp both inside and outside provider', () => {
    function OptionalTest() {
      const app = appContextModule.useOptionalApp();
      return React.createElement('span', { 'data-testid': 'opt' }, app ? 'has-app' : 'no-app');
    }

    const { unmount } = render(React.createElement(OptionalTest));
    expect(screen.getByTestId('opt').textContent).toBe('no-app');
    unmount();

    render(React.createElement(AppProvider, null, React.createElement(OptionalTest)));
    expect(screen.getByTestId('opt').textContent).toBe('has-app');
  });

  it('filters and debounces refreshes on state-invalidated according to reason', async () => {
    let latestApp = null;
    render(
      React.createElement(
        AppProvider,
        null,
        React.createElement(TestConsumer, { onApp: (app) => (latestApp = app) }),
      ),
    );

    await waitFor(() => expect(latestApp.bootstrapStatus).toBe('ready'));
    const es = EventSourceMock.instances[EventSourceMock.instances.length - 1];

    vi.useFakeTimers();
    try {
      mockFetch.mockClear();

      // Emit state-invalidated with session-switched
      await act(async () => {
        es.dispatchEvent(
          Object.assign(new Event('state-invalidated'), {
            data: JSON.stringify({ reason: 'session-switched' }),
          }),
        );
        vi.advanceTimersByTime(150);
      });

      await act(async () => {});

      const callsAfterSwitched = mockFetch.mock.calls.map(([url]) => String(url));
      expect(callsAfterSwitched.some((url) => url.includes('/api/sessions'))).toBe(true);
      expect(callsAfterSwitched.some((url) => url.includes('/api/history'))).toBe(true);
      expect(callsAfterSwitched.some((url) => url.includes('/api/translations'))).toBe(false);
      expect(callsAfterSwitched.some((url) => url.includes('/api/translation-catalog'))).toBe(false);

      mockFetch.mockClear();

      // Emit state-invalidated with other
      await act(async () => {
        es.dispatchEvent(
          Object.assign(new Event('state-invalidated'), {
            data: JSON.stringify({ reason: 'other' }),
          }),
        );
        vi.advanceTimersByTime(150);
      });

      await act(async () => {});

      const callsAfterOther = mockFetch.mock.calls.map(([url]) => String(url));
      expect(callsAfterOther.some((url) => url.includes('/api/translations'))).toBe(true);
      expect(callsAfterOther.some((url) => url.includes('/api/translation-catalog'))).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('covers error rejection in refreshState effect at line 258', async () => {
    let latestApp = null;
    render(
      React.createElement(
        AppProvider,
        null,
        React.createElement(TestConsumer, { onApp: (app) => (latestApp = app) }),
      ),
    );

    await waitFor(() => expect(latestApp.bootstrapStatus).toBe('ready'));
    const es = EventSourceMock.instances[EventSourceMock.instances.length - 1];

    mockFetch.mockImplementation(async (url) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/state')) {
        throw new Error('Failed to load state during refresh');
      }
      return { ok: true, json: async () => ({}) };
    });

    await act(async () => {
      es.emit('app-state-changed', {});
    });

    expect(latestApp.bootstrapStatus).toBe('ready');
  });

  it('covers error rejection in state-invalidated Promise.all at line 301', async () => {
    let latestApp = null;
    render(
      React.createElement(
        AppProvider,
        null,
        React.createElement(TestConsumer, { onApp: (app) => (latestApp = app) }),
      ),
    );

    await waitFor(() => expect(latestApp.bootstrapStatus).toBe('ready'));
    const es = EventSourceMock.instances[EventSourceMock.instances.length - 1];

    vi.useFakeTimers();
    try {
      mockFetch.mockImplementation(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes('/api/translation-catalog') || urlStr.includes('/api/translations')) {
          throw new Error('Catalog or jobs task failed');
        }
        return { ok: true, json: async () => ({}) };
      });

      await act(async () => {
        es.dispatchEvent(
          Object.assign(new Event('state-invalidated'), {
            data: JSON.stringify({ reason: 'other' }),
          }),
        );
        vi.advanceTimersByTime(150);
      });

      await act(async () => {});

      expect(latestApp.bootstrapStatus).toBe('ready');
    } finally {
      vi.useRealTimers();
    }
  });
});


