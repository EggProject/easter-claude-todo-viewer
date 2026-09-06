import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Topbar } from './topbar.js';
import * as appContextModule from '../app-context.js';

vi.mock('../app-context.js', () => ({
  useApp: vi.fn(),
}));

describe('Topbar component', () => {
  let mockApp;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApp = {
      live: 'LIVE',
      currentSession: null,
      sessionsState: { watchedSessionIds: [] },
      setSidebar: vi.fn(),
    };
    vi.mocked(appContextModule.useApp).mockReturnValue(mockApp);
  });

  function renderTopbar(initialEntries = ['/tasks']) {
    return render(
      React.createElement(
        MemoryRouter,
        { initialEntries },
        React.createElement(Topbar),
      ),
    );
  }

  it('renders brand and connected status dot when live is LIVE', () => {
    renderTopbar();
    expect(screen.getByText('Claude Tasks')).toBeDefined();
    expect(screen.getByText('v4.1.0')).toBeDefined();
    const statusDot = screen.getByRole('status');
    expect(statusDot.getAttribute('title')).toBe('Connected to multi-session daemon');
    expect(screen.getByText('🧵 Select session')).toBeDefined();
  });

  it('renders reconnecting status when live is CONNECTING or RECONNECTING', () => {
    mockApp.live = 'CONNECTING';
    const { unmount } = renderTopbar();
    expect(screen.getByRole('status').getAttribute('title')).toBe('Reconnecting to multi-session daemon');
    unmount();

    mockApp.live = 'RECONNECTING';
    renderTopbar();
    expect(screen.getByRole('status').getAttribute('title')).toBe('Reconnecting to multi-session daemon');
  });

  it('renders disconnected status when live is any other value', () => {
    mockApp.live = 'CLOSED';
    renderTopbar();
    expect(screen.getByRole('status').getAttribute('title')).toBe('Disconnected from multi-session daemon');
  });

  it('renders session button with label, shortId, and detailed tooltip when session exists', () => {
    mockApp.currentSession = {
      id: 'session-identifier-1234567890',
      label: 'Main Dev Session',
      cwd: '/home/user/project',
      gitBranch: 'feature/tests',
      createdAt: '2026-01-01T00:00:00Z',
      lastActivity: '2026-01-02T00:00:00Z',
      globalLanguage: 'hu',
    };
    mockApp.sessionsState.watchedSessionIds = ['session-identifier-1234567890'];

    renderTopbar();
    const sessionBtn = screen.getByRole('link', { name: /Main Dev Session/ });
    expect(sessionBtn).toBeDefined();
    const tooltip = sessionBtn.getAttribute('title');
    expect(tooltip).toContain('Session: session-identifier-1234567890');
    expect(tooltip).toContain('Project: /home/user/project');
    expect(tooltip).toContain('Branch: feature/tests');
    expect(tooltip).toContain('Session language: HU');
    expect(tooltip).toContain('Watched: Yes');
  });

  it('handles session without label, shortId truncation, and unwatched status in tooltip', () => {
    mockApp.currentSession = {
      id: 'session-long-id-without-label',
    };
    mockApp.sessionsState.watchedSessionIds = [];

    renderTopbar();
    const sessionBtn = screen.getByRole('link', { name: /session-…/ });
    expect(sessionBtn).toBeDefined();
    const tooltip = sessionBtn.getAttribute('title');
    expect(tooltip).toContain('Watched: No');
    expect(tooltip).toContain('Session language: EN');
  });

  it('opens history sidebar when bell icon button is clicked', () => {
    renderTopbar();
    const bellBtn = screen.getByTitle('Common change history');
    fireEvent.click(bellBtn);
    expect(mockApp.setSidebar).toHaveBeenCalledWith(true);
  });

  it('handles short session id without truncation and date format errors', () => {
    mockApp.currentSession = {
      id: 'short-id',
      createdAt: '2026-01-01',
    };
    const spy = vi.spyOn(Date.prototype, 'toLocaleString').mockImplementationOnce(() => {
      throw new Error('topbar date err');
    });

    const r1 = renderTopbar();
    expect(screen.getByRole('link', { name: /short-id · short-id/ })).toBeDefined();

    spy.mockRestore();
    r1.unmount();

    // Test null session id (covers line 18 x || '')
    mockApp.currentSession = {
      id: null,
      label: null,
    };
    renderTopbar();
    expect(screen.getAllByRole('link', { name: /🧵/ })[0]).toBeDefined();
  });
});
