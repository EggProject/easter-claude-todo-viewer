import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import TasksPage, { groupTasksBySession } from './tasks.js';
import * as appContextModule from '../app-context.js';
import * as sessionSelectModule from '../components/session-select.js';

vi.mock('../app-context.js', () => ({
  useApp: vi.fn(),
}));

vi.mock('../components/task-drawer.js', () => ({
  TaskDrawer: ({ base, tasks }) =>
    React.createElement('div', {
      'data-testid': 'mock-task-drawer',
      'data-base': base,
      'data-count': tasks?.length,
    }),
}));

describe('TasksPage', () => {
  let mockApp;
  let mockUseSessionScope;

  const sampleTasks = [
    {
      uid: 'task-u1',
      id: '1',
      sessionId: 'sess-alpha',
      session: { label: 'Alpha Session Super Long Label Exceeding Twenty Six Chars' },
      subject: 'Build frontend',
      description: 'Create React components',
      owner: 'Alice',
      status: 'in_progress',
      effectiveLanguage: 'hu',
    },
    {
      uid: 'task-u2',
      id: '2',
      sessionId: 'sess-alpha',
      session: { label: 'Alpha Session Super Long Label Exceeding Twenty Six Chars' },
      subject: 'Write unit tests',
      description: 'Verify 100% coverage',
      owner: 'Bob',
      status: 'pending',
      effectiveLanguage: 'en',
    },
    {
      uid: 'task-u3',
      id: '3',
      sessionId: 'sess-beta',
      session: null,
      subject: 'Deploy backend',
      description: 'Run docker containers',
      owner: 'Charlie',
      status: 'completed',
      effectiveLanguage: 'en',
    },
    {
      uid: 'task-u4',
      id: '4',
      sessionId: 'sess-beta',
      session: { label: 'Beta' },
      subject: 'Clean up workspace',
      description: 'Remove obsolete logs',
      owner: 'Dave',
      status: 'deleted',
      effectiveLanguage: 'hu',
    },
    {
      uid: 'task-u5',
      id: '5',
      sessionId: 'sess-unknown-lane',
      session: null,
      subject: 'Unknown status task',
      description: 'Testing fallback icon',
      owner: 'Eve',
      status: 'custom_status',
      effectiveLanguage: 'en',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockApp = {
      revision: 1,
      sessionsState: { sessions: [{ id: 'sess-alpha' }, { id: 'sess-beta' }] },
      loadState: vi.fn().mockResolvedValue({
        tasks: [...sampleTasks],
        initialStatus: 'in_progress',
        initialSort: 'dependency',
      }),
      showModal: vi.fn(),
    };
    vi.mocked(appContextModule.useApp).mockReturnValue(mockApp);
  });

  function renderPage(initialEntries = ['/tasks']) {
    return render(
      React.createElement(MemoryRouter, { initialEntries }, React.createElement(TasksPage, null)),
    );
  }

  it('renders tasks list with badges, metadata, and handles task click', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Build frontend')).toBeDefined();
    });

    // Check task IDs
    expect(screen.getByText('#1')).toBeDefined();

    // Check task status meta
    expect(screen.getByText(/🚀 in_progress · 🇭🇺 HU/)).toBeDefined();

    // Check task drawer presence
    expect(screen.getByTestId('mock-task-drawer')).toBeDefined();

    // Click on a task card
    const card = screen.getByText('Build frontend').closest('button');
    expect(card).toBeDefined();
    fireEvent.click(card);
  });

  it('filters tasks by search input across multiple fields', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Build frontend')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Search task id, title/i);
    expect(searchInput.classList.contains('input')).toBe(true);
    expect(searchInput.classList.contains('search-input')).toBe(true);

    const sortSelect = screen.getByLabelText('Sort tasks');
    expect(sortSelect.classList.contains('select')).toBe(true);

    // Search by owner
    fireEvent.change(searchInput, { target: { value: 'Alice' } });
    expect(screen.getByText('Build frontend')).toBeDefined();
    expect(screen.queryByText('Write unit tests')).toBeNull();

    // Search by description
    fireEvent.change(searchInput, { target: { value: 'obsolete logs' } });
    // Need to include deleted in status or change status filter
    // Let's test search with empty results
    fireEvent.change(searchInput, { target: { value: 'nonexistent-match-xyz' } });
    expect(screen.getByText('No tasks match the current session/status filters.')).toBeDefined();

    // Reset search
    fireEvent.change(searchInput, { target: { value: '' } });
  });

  it('filters tasks by status multi-select', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Build frontend')).toBeDefined();
    });

    // Open status multiselect dropdown
    const statusBtn = screen.getByRole('button', { name: /Status ·/i });
    fireEvent.click(statusBtn);

    // Click 'All' checkbox
    const allCheckbox = screen.getByRole('checkbox', { name: 'All' });
    fireEvent.click(allCheckbox);

    // Now completed and deleted tasks should be visible
    expect(screen.getByText('Deploy backend')).toBeDefined();
    expect(screen.getByText('Clean up workspace')).toBeDefined();

    // Toggle specific status
    const pendingCheckbox = screen.getByRole('checkbox', { name: /Pending/i });
    fireEvent.click(pendingCheckbox);
  });

  it('renders fallback icon for unknown task status when matched', async () => {
    mockApp.loadState.mockResolvedValueOnce({
      tasks: [
        {
          uid: 'task-custom',
          id: '99',
          sessionId: 'sess-alpha',
          subject: 'Custom task status',
          status: 'other_status',
          effectiveLanguage: 'en',
        },
      ],
    });
    vi.spyOn(sessionSelectModule, 'useSessionScope').mockReturnValue({
      selectedSessionIds: ['sess-alpha'],
      setSelectedSessionIds: vi.fn(),
    });

    const { usePersistentPageFilters } = await import('../filter-state.js');
    vi.spyOn({ usePersistentPageFilters }, 'usePersistentPageFilters');

    // To match other_status, mock normalizeStatusSelection
    const statusSelectModule = await import('../components/status-multiselect.js');
    const spy = vi
      .spyOn(statusSelectModule, 'normalizeStatusSelection')
      .mockReturnValue(new Set(['other_status']));

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Custom task status')).toBeDefined();
      expect(screen.getByText(/other_status/)).toBeDefined();
    });
    spy.mockRestore();
  });

  it('covers identical status sorting and dependency orderIndex', async () => {
    mockApp.loadState.mockResolvedValueOnce({
      initialStatus: 'all',
      tasks: [
        {
          uid: 't1',
          id: '10',
          sessionId: 'sess-alpha',
          subject: 'A',
          status: 'pending',
          blockedBy: [],
        },
        {
          uid: 't2',
          id: '2',
          sessionId: 'sess-alpha',
          subject: 'B',
          status: 'pending',
          blockedBy: ['t1'],
        },
        { uid: 't3', id: '5', sessionId: 'sess-other', subject: 'C', status: 'completed' },
      ],
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('A')).toBeDefined();
    });

    const sortSelect = screen.getByRole('combobox');
    // Sort by status: t1 and t2 have same status 'pending', compares Number(a.id) - Number(b.id)
    fireEvent.change(sortSelect, { target: { value: 'status' } });

    // Sort by subject
    fireEvent.change(sortSelect, { target: { value: 'subject' } });

    // Sort by id
    fireEvent.change(sortSelect, { target: { value: 'id' } });

    // Sort by dependency: t1 and t2 have same session, compares orderIndex
    fireEvent.change(sortSelect, { target: { value: 'dependency' } });

    // Change sort to empty string to cover filters.sort || scopedState?.initialSort
    fireEvent.change(sortSelect, { target: { value: '' } });
  });

  it('covers line 32 filters.sort empty fallback to dependency and line 52 graph fallbacks', async () => {
    let sessAccessA = 0;
    let sessAccessB = 0;
    let uidAccessA = 0;
    let uidAccessB = 0;

    const taskA = {
      get uid() {
        uidAccessA++;
        return uidAccessA > 2 ? 'uid-missing-a' : 'uid-a';
      },
      get sessionId() {
        sessAccessA++;
        return sessAccessA > 2 ? 'sess-ghost-a' : 'sess-alpha';
      },
      id: '101',
      subject: 'Task A',
      status: 'pending',
    };

    const taskB = {
      get uid() {
        uidAccessB++;
        return uidAccessB > 2 ? 'uid-missing-b' : 'uid-b';
      },
      get sessionId() {
        sessAccessB++;
        return sessAccessB > 2 ? 'sess-ghost-a' : 'sess-alpha';
      },
      id: '102',
      subject: 'Task B',
      status: 'pending',
    };

    mockApp.loadState.mockResolvedValueOnce({
      initialStatus: 'all',
      initialSort: '', // Falsy initialSort to test || 'dependency'
      tasks: [taskA, taskB],
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Task A')).toBeDefined();
    });

    const sortSelect = screen.getByRole('combobox');
    fireEvent.change(sortSelect, { target: { value: '' } });
  });

  it('covers SessionBadge fallback when session and sessionId are falsy', async () => {
    mockApp.loadState.mockResolvedValueOnce({
      tasks: [
        {
          uid: 't-none',
          id: '99',
          sessionId: '',
          session: null,
          subject: 'No session task',
          status: 'in_progress',
        },
      ],
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No session task')).toBeDefined();
    });
  });

  it('displays error modal when loadState fails', async () => {
    mockApp.loadState.mockRejectedValueOnce(new Error('Network failure'));
    renderPage();

    await waitFor(() => {
      expect(mockApp.showModal).toHaveBeenCalledWith({
        kind: 'error',
        title: 'Tasks could not be loaded',
        message: 'Network failure',
      });
    });
  });

  it('handles loadState rejecting with non-Error value', async () => {
    mockApp.loadState.mockRejectedValueOnce('raw string error');
    renderPage();
    await waitFor(() => {
      expect(mockApp.showModal).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'raw string error' }),
      );
    });
  });

  it('handles empty task list', async () => {
    mockApp.loadState.mockResolvedValueOnce({
      tasks: [],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('No tasks match the current session/status filters.')).toBeDefined();
    });
  });

  it('handles unmounting while loadState is pending', () => {
    let resolveLoad;
    mockApp.loadState.mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolveLoad = r;
        }),
    );
    const { unmount } = renderPage();
    unmount();
    resolveLoad({ tasks: [] });
  });

  it('does not trigger repeated redundant loadState calls on rapid re-renders or stable session selections', async () => {
    let currentScope = ['sess-alpha'];
    const scopeSpy = vi.spyOn(sessionSelectModule, 'useSessionScope').mockImplementation(() => ({
      selectedSessionIds: currentScope,
      setSelectedSessionIds: vi.fn(),
    }));

    const { rerender } = renderPage();

    await waitFor(() => {
      expect(mockApp.loadState).toHaveBeenCalledTimes(1);
    });
    expect(mockApp.loadState).toHaveBeenLastCalledWith(['sess-alpha']);

    const searchInput = screen.getByPlaceholderText(/Search task id, title/i);
    fireEvent.change(searchInput, { target: { value: 'test1' } });
    fireEvent.change(searchInput, { target: { value: 'test2' } });
    fireEvent.change(searchInput, { target: { value: 'test3' } });

    currentScope = ['sess-alpha'];
    rerender(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/tasks'] },
        React.createElement(TasksPage, null),
      ),
    );

    rerender(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/tasks'] },
        React.createElement(TasksPage, null),
      ),
    );

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(mockApp.loadState).toHaveBeenCalledTimes(1);
    scopeSpy.mockRestore();
  });

  it('calls loadState only when session selection or revision changes', async () => {
    let currentScope = ['sess-alpha'];
    const scopeSpy = vi.spyOn(sessionSelectModule, 'useSessionScope').mockImplementation(() => ({
      selectedSessionIds: currentScope,
      setSelectedSessionIds: vi.fn(),
    }));

    const { rerender } = renderPage();

    await waitFor(() => {
      expect(mockApp.loadState).toHaveBeenCalledTimes(1);
    });
    expect(mockApp.loadState).toHaveBeenLastCalledWith(['sess-alpha']);

    rerender(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/tasks'] },
        React.createElement(TasksPage, null),
      ),
    );
    expect(mockApp.loadState).toHaveBeenCalledTimes(1);

    mockApp.revision = 2;
    rerender(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/tasks'] },
        React.createElement(TasksPage, null),
      ),
    );

    await waitFor(() => {
      expect(mockApp.loadState).toHaveBeenCalledTimes(2);
    });

    currentScope = ['sess-beta'];
    rerender(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/tasks'] },
        React.createElement(TasksPage, null),
      ),
    );

    await waitFor(() => {
      expect(mockApp.loadState).toHaveBeenCalledTimes(3);
    });
    expect(mockApp.loadState).toHaveBeenLastCalledWith(['sess-beta']);

    scopeSpy.mockRestore();
  });

  describe('groupTasksBySession helper', () => {
    it('groups tasks properly and handles tasks without sessionId or empty array', () => {
      const groups = groupTasksBySession([
        { uid: '1', sessionId: 's1' },
        { uid: '2', sessionId: 's1' },
        { uid: '3', sessionId: null },
      ]);
      expect(groups.get('s1')).toHaveLength(2);
      expect(groups.get('unknown')).toHaveLength(1);

      expect(groupTasksBySession([])).toEqual(new Map());
      expect(groupTasksBySession()).toEqual(new Map());
    });
  });
});
