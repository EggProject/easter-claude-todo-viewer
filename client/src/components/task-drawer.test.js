import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { TaskDrawer } from './task-drawer.js';
import * as appContextModule from '../app-context.js';

vi.mock('../app-context.js', () => ({
  useApp: vi.fn(),
}));

vi.mock('./task-history.js', () => ({
  TaskHistory: () => React.createElement('div', { 'data-testid': 'mock-task-history' }),
}));

describe('TaskDrawer component', () => {
  let mockApp;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApp = {
      state: { tasks: [] },
      currentSessionId: 'sess-current',
      toggleTaskLanguage: vi.fn(),
      cancelTask: vi.fn(),
    };
    vi.mocked(appContextModule.useApp).mockReturnValue(mockApp);
  });

  function renderDrawer({ initialEntry = '/tasks/task-1', path = '/tasks/:uid', scopedTasks = null, base = 'tasks' } = {}) {
    return render(
      React.createElement(
        MemoryRouter,
        { initialEntries: [initialEntry] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path,
            element: React.createElement(TaskDrawer, { base, tasks: scopedTasks }),
          }),
          React.createElement(Route, {
            path: '/tasks',
            element: React.createElement('div', null, 'Tasks Root Page'),
          }),
        ),
      ),
    );
  }

  it('renders null when uid is not in route params', () => {
    const { container } = render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/tasks'] },
        React.createElement(TaskDrawer, { base: 'tasks' }),
      ),
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders null when task matching uid is not found', () => {
    mockApp.state.tasks = [{ uid: 'task-other', id: '2', sessionId: 'sess-1' }];
    const { container } = renderDrawer({ initialEntry: '/tasks/task-not-found' });
    expect(container.firstChild).toBeNull();
  });

  it('finds task matching routeSessionId or currentSessionId or fallback', () => {
    const tasks = [
      {
        uid: 'task-1',
        id: '1',
        sessionId: 'sess-other',
        subject: 'Other Session Task',
      },
      {
        uid: 'task-1',
        id: '1',
        sessionId: 'sess-current',
        subject: 'Current Session Task',
      },
    ];
    mockApp.state.tasks = tasks;

    const r1 = renderDrawer({ initialEntry: '/tasks/sess-other/task-1', path: '/tasks/:sessionId/:uid' });
    expect(screen.getByText('Other Session Task')).toBeDefined();
    r1.unmount();

    const r2 = renderDrawer({ initialEntry: '/tasks/sess-unknown/task-1', path: '/tasks/:sessionId/:uid' });
    expect(screen.getByText('Current Session Task')).toBeDefined();
    r2.unmount();

    mockApp.currentSessionId = 'sess-none';
    const r3 = renderDrawer({ initialEntry: '/tasks/sess-unknown/task-1', path: '/tasks/:sessionId/:uid' });
    expect(screen.getByText('Other Session Task')).toBeDefined();
    r3.unmount();
  });

  it('renders full drawer with fields, dependencies, and language states', () => {
    const tasks = [
      {
        uid: 'dep-1',
        id: '99',
        sessionId: 'sess-1',
        storeId: 'store-1',
        subject: 'Prerequisite Task',
      },
      {
        uid: 'task-1',
        id: '1',
        sessionId: 'sess-1',
        storeId: 'store-1',
        session: { label: 'Session One' },
        subject: 'Main Task Subject',
        status: 'in_progress',
        activeForm: 'Executing tests',
        owner: 'claude',
        description: 'Detailed instructions here',
        blockedBy: ['99', '100'],
        blocks: ['99'],
        viewLanguage: 'hu',
        effectiveLanguage: 'en',
        translationState: 'translating',
        translationPending: true,
      },
    ];

    renderDrawer({
      initialEntry: '/tasks/sess-1/task-1',
      path: '/tasks/:sessionId/:uid',
      scopedTasks: tasks,
    });

    expect(screen.getByText('🧵 Session One')).toBeDefined();
    expect(screen.getByText('Main Task Subject')).toBeDefined();
    expect(screen.getByText('Executing tests')).toBeDefined();
    expect(screen.getByText('claude')).toBeDefined();
    expect(screen.getByText('Detailed instructions here')).toBeDefined();
    expect(screen.getByText('#100')).toBeDefined(); // missing dependency in byId
    expect(screen.getByText('🌍 Translating')).toBeDefined();
    expect(
      screen.getByText('Showing current English source until the Hungarian translation is ready.', { exact: false }),
    ).toBeDefined();

    // Click language switch
    const langSwitch = screen.getByRole('switch');
    expect(langSwitch.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(langSwitch);
    expect(mockApp.toggleTaskLanguage).toHaveBeenCalledWith('sess-1', 'task-1', 'hu');

    // Click stop translation button
    const stopBtn = screen.getByRole('button', { name: '■ Stop' });
    fireEvent.click(stopBtn);
    expect(mockApp.cancelTask).toHaveBeenCalledWith('sess-1', 'task-1');
  });

  it('handles empty optional fields and translation error state', () => {
    const tasks = [
      {
        uid: 'task-minimal',
        id: '5',
        sessionId: 'sess-bare',
        subject: 'Minimal Task',
        viewLanguage: 'hu',
        effectiveLanguage: 'hu',
        translationState: 'failed',
        translationError: 'LLM timeout',
      },
    ];

    renderDrawer({
      initialEntry: '/tasks/sess-bare/task-minimal',
      path: '/tasks/:sessionId/:uid',
      scopedTasks: tasks,
    });

    expect(screen.getByText('🧵 sess-bare')).toBeDefined();
    expect(screen.getByText('⚠ Failed')).toBeDefined();
    expect(screen.getByText('LLM timeout', { exact: false })).toBeDefined();
  });

  it('handles translation state labels across all states', () => {
    const states = ['ready', 'missing', 'queued', 'validating', 'retrying', 'canceling', 'custom_val'];
    for (const state of states) {
      const tasks = [
        {
          uid: 'task-test',
          id: '1',
          sessionId: 'sess-1',
          subject: 'State test',
          viewLanguage: 'hu',
          translationState: state,
        },
      ];
      const { unmount } = renderDrawer({
        initialEntry: '/tasks/sess-1/task-test',
        path: '/tasks/:sessionId/:uid',
        scopedTasks: tasks,
      });
      unmount();
    }
  });

  it('closes drawer on close button click, backdrop click, and Escape key', () => {
    const tasks = [
      { uid: 'task-1', id: '1', sessionId: 'sess-1', subject: 'Close Test' },
    ];

    const { unmount } = renderDrawer({
      initialEntry: '/tasks/sess-1/task-1',
      path: '/tasks/:sessionId/:uid',
      scopedTasks: tasks,
    });

    // Close button click
    const closeBtn = screen.getByRole('button', { name: '✕' });
    fireEvent.click(closeBtn);
    expect(screen.getByText('Tasks Root Page')).toBeDefined();

    unmount();

    // Re-render and test backdrop click
    const r2 = renderDrawer({
      initialEntry: '/tasks/sess-1/task-1',
      path: '/tasks/:sessionId/:uid',
      scopedTasks: tasks,
    });
    const backdrop = document.querySelector('.panel-backdrop');
    fireEvent.click(backdrop);
    expect(screen.getByText('Tasks Root Page')).toBeDefined();
    r2.unmount();

    // Re-render and test non-Escape keydown followed by Escape keydown
    const r3 = renderDrawer({
      initialEntry: '/tasks/sess-1/task-1',
      path: '/tasks/:sessionId/:uid',
      scopedTasks: tasks,
    });
    fireEvent.keyDown(window, { key: 'Enter' });
    expect(screen.queryByText('Tasks Root Page')).toBeNull();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.getByText('Tasks Root Page')).toBeDefined();
    r3.unmount();
  });

  it('handles fallback note, custom translationState, and missing session/app.state', () => {
    mockApp.state = null; // app.state is null

    const task = {
      uid: 'task-fallback',
      id: '99',
      subject: 'Fallback Task',
      viewLanguage: 'hu',
      effectiveLanguage: 'en',
      translationState: 'unknown_stage',
      sessionId: null,
      session: null,
    };

    const { unmount } = renderDrawer({
      initialEntry: '/tasks/none/task-fallback',
      path: '/tasks/:sessionId/:uid',
      scopedTasks: [task],
    });

    expect(
      screen.getByText('🇬🇧 Showing current English source until the Hungarian translation is ready.'),
    ).toBeDefined();
    expect(screen.getByText('unknown_stage')).toBeDefined();
    expect(screen.getByText('🧵 session')).toBeDefined();

    unmount();

    // Line 85 fallback: viewLanguage is 'hu' but translationState is null
    const taskMissingTranslationState = {
      uid: 'task-no-state',
      id: '100',
      subject: 'No State Task',
      viewLanguage: 'hu',
      translationState: null,
      sessionId: 's1',
    };

    const rMissing = renderDrawer({
      initialEntry: '/tasks/task-no-state',
      scopedTasks: [taskMissingTranslationState],
    });
    expect(screen.getByText('○ Missing')).toBeDefined();
    rMissing.unmount();

    // Line 14 fallback: scopedTasks is null and app.state is null -> falls back to []
    mockApp.state = null;
    const rFallback = renderDrawer({
      initialEntry: '/tasks/task-none',
      scopedTasks: null,
    });
    expect(rFallback.container.firstChild).toBeNull();
  });
});
