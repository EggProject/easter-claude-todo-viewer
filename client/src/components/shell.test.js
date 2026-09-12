import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Shell } from './shell.js';
import * as appContextModule from '../app-context.js';

vi.mock('./overlays.js', () => ({
  NotificationSidebar: () => React.createElement('div', { 'data-testid': 'mock-sidebar' }),
  RequiredModal: () => React.createElement('div', { 'data-testid': 'mock-modal' }),
}));

vi.mock('../app-context.js', () => ({
  useOptionalApp: vi.fn(),
}));

describe('Shell component', () => {
  let mockApp;

  beforeEach(() => {
    vi.clearAllMocks();
    document.documentElement.dataset.theme = 'dark';
    mockApp = {
      live: 'LIVE',
      currentSession: {
        id: 'sess-1',
        label: 'Alpha Session',
        cwd: '/path/to/project',
        gitBranch: 'feature/tests',
        createdAt: '2026-01-01T10:00:00Z',
        lastActivity: '2026-01-02T15:30:00Z',
        globalLanguage: 'hu',
      },
      sessionsState: {
        sessions: [{ id: 'sess-1', label: 'Alpha Session' }],
        currentSessionId: 'sess-1',
        watchedSessionIds: ['sess-1'],
      },
      setSidebar: vi.fn(),
    };
    vi.mocked(appContextModule.useOptionalApp).mockReturnValue(mockApp);
  });

  it('renders default shell when useOptionalApp returns null', () => {
    vi.mocked(appContextModule.useOptionalApp).mockReturnValue(null);

    const { container } = render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/sessions'] },
        React.createElement(Shell, null, React.createElement('div', null, 'Child Page Content')),
      ),
    );

    expect(screen.getByText('Child Page Content')).toBeDefined();
    expect(screen.getByText('No Session')).toBeDefined();
    expect(screen.getByText('Select session')).toBeDefined();

    const sessionLink = screen.getByRole('link', { name: /Select session/i });
    expect(sessionLink.getAttribute('title')).toBe('No current session');

    const statusDot = container.querySelector('.connection-dot.disconnected');
    expect(statusDot).not.toBeNull();

    const historyBtn = screen.getByRole('button', { name: /Common change history/i });
    fireEvent.click(historyBtn);
  });

  it('handles null sessionsState and short session ID without label', () => {
    mockApp.currentSession = {
      id: 'short-id',
      label: '',
    };
    mockApp.sessionsState = null;

    const { rerender } = render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/tasks'] },
        React.createElement(Shell, null),
      ),
    );

    expect(screen.getAllByText('short-id').length).toBe(2);

    mockApp.currentSession = {
      id: '',
      label: '',
    };
    rerender(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/tasks'] },
        React.createElement(Shell, null),
      ),
    );
  });

  it('toggles sidebar collapse state when toggle button is clicked', () => {
    const { container } = render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/tasks'] },
        React.createElement(Shell, null, React.createElement('div', null, 'Tasks Page Content')),
      ),
    );

    const rootApp = container.querySelector('.app');
    expect(rootApp.classList.contains('app--collapsed')).toBe(false);

    const toggleBtn = screen.getByRole('button', { name: 'Collapse sidebar' });
    fireEvent.click(toggleBtn);
    expect(rootApp.classList.contains('app--collapsed')).toBe(true);

    fireEvent.click(toggleBtn);
    expect(rootApp.classList.contains('app--collapsed')).toBe(false);
  });

  it('toggles theme between dark and light when theme button is clicked', () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/tasks'] },
        React.createElement(Shell, null),
      ),
    );

    expect(document.documentElement.dataset.theme).toBe('dark');

    const themeBtn = screen.getByRole('button', { name: 'Switch to dark theme' });
    fireEvent.click(themeBtn);
    expect(document.documentElement.dataset.theme).toBe('light');

    fireEvent.click(themeBtn);
    expect(document.documentElement.dataset.theme).toBe('dark');
  });

  it('calls setSidebar when history notification button is clicked', () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/tasks'] },
        React.createElement(Shell, null),
      ),
    );

    const historyBtn = screen.getByRole('button', { name: /Common change history/i });
    fireEvent.click(historyBtn);
    expect(mockApp.setSidebar).toHaveBeenCalledWith(true);
  });

  it('formats session tooltip with full session details and active status', () => {
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/tasks'] },
        React.createElement(Shell, null),
      ),
    );

    const sessionLink = screen.getByRole('link', { name: /Alpha Session/i });
    const tooltip = sessionLink.getAttribute('title');

    expect(tooltip).toContain('Session: sess-1');
    expect(tooltip).toContain('Project: /path/to/project');
    expect(tooltip).toContain('Branch: feature/tests');
    expect(tooltip).toContain('Session language: HU');
    expect(tooltip).toContain('Watched: Yes');
  });

  it('handles shortId abbreviation for long session IDs and unwatched session', () => {
    mockApp.currentSession = {
      id: 'very-long-session-identifier-1234567890',
      label: '',
      cwd: '',
      gitBranch: '',
      createdAt: '',
      lastActivity: '',
      globalLanguage: '',
    };
    mockApp.sessionsState.watchedSessionIds = [];

    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/tasks'] },
        React.createElement(Shell, null),
      ),
    );

    expect(screen.getAllByText('very-lon...567890').length).toBe(2);

    const sessionLink = screen.getByRole('link', { name: /very-lon\.\.\.567890/i });
    const tooltip = sessionLink.getAttribute('title');
    expect(tooltip).toContain('Project: none');
    expect(tooltip).toContain('Branch: none');
    expect(tooltip).toContain('Created: unknown');
    expect(tooltip).toContain('Last activity: unknown');
    expect(tooltip).toContain('Session language: EN');
    expect(tooltip).toContain('Watched: No');
  });

  it('handles connection status variants for reconnecting and connecting', () => {
    mockApp.live = 'RECONNECTING';
    const { container, rerender } = render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/tasks'] },
        React.createElement(Shell, null),
      ),
    );

    expect(container.querySelector('.connection-dot.reconnecting')).not.toBeNull();

    mockApp.live = 'CONNECTING';
    rerender(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/tasks'] },
        React.createElement(Shell, null),
      ),
    );
    expect(container.querySelector('.connection-dot.reconnecting')).not.toBeNull();
  });

  it('falls back gracefully when date formatting throws', () => {
    const toLocaleStringSpy = vi.spyOn(Date.prototype, 'toLocaleString').mockImplementation(() => {
      throw new Error('date format error');
    });

    mockApp.currentSession = {
      id: 'sess-err',
      label: 'Error Date Session',
      cwd: '/test',
      gitBranch: 'main',
      createdAt: '2026-03-01T00:00:00Z',
      lastActivity: '2026-03-02T00:00:00Z',
      globalLanguage: 'en',
    };

    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/tasks'] },
        React.createElement(Shell, null),
      ),
    );

    const sessionLink = screen.getByRole('link', { name: /Error Date Session/i });
    const tooltip = sessionLink.getAttribute('title');
    expect(tooltip).toContain('Created: 2026-03-01T00:00:00Z');
    expect(tooltip).toContain('Last activity: 2026-03-02T00:00:00Z');

    toLocaleStringSpy.mockRestore();
  });
});
