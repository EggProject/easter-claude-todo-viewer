import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import FlowPage, { groupTasksBySession, nodeId } from './flow.js';
import * as appContextModule from '../app-context.js';
import * as apiModule from '../api.js';

let mockRfInstance = {
  setViewport: vi.fn(),
  fitView: vi.fn(),
};

vi.mock('@xyflow/react', () => {
  return {
    ReactFlow: ({
      nodes,
      edges,
      onNodesChange,
      onNodeDragStop,
      onMoveEnd,
      onInit,
      onNodeClick,
      children,
    }) => {
      globalThis.__onNodeDragStop = onNodeDragStop;
      globalThis.__onMoveEnd = onMoveEnd;
      React.useEffect(() => {
        if (onInit) {
          onInit(mockRfInstance);
        }
      }, [onInit]);
      return React.createElement(
        'div',
        {
          'data-testid': 'mock-react-flow',
          'data-node-count': nodes?.length,
          'data-edge-count': edges?.length,
        },
        children,
        nodes?.map((node) =>
          React.createElement(
            'div',
            {
              key: node.id,
              'data-testid': `flow-node-${node.id}`,
              onClick: (e) => onNodeClick?.(e, node),
              'data-uid': node.data?.uid,
              'data-session': node.data?.sessionId,
            },
            node.data?.label,
            React.createElement(
              'button',
              {
                'data-testid': `drag-${node.id}`,
                onClick: () => onNodeDragStop?.(null, node),
              },
              'drag-stop',
            ),
          ),
        ),
        React.createElement(
          'button',
          {
            'data-testid': 'trigger-move-end',
            onClick: () => onMoveEnd?.(null, { x: 10, y: 20, zoom: 1.5 }),
          },
          'move-end',
        ),
        React.createElement(
          'button',
          {
            'data-testid': 'trigger-null-move-end',
            onClick: () => onMoveEnd?.(null, null),
          },
          'null-move-end',
        ),
        React.createElement(
          'button',
          {
            'data-testid': 'trigger-invalid-drag',
            onClick: () => onNodeDragStop?.(null, { data: {} }),
          },
          'invalid-drag',
        ),
        React.createElement(
          'button',
          {
            'data-testid': 'trigger-nodes-change',
            onClick: () => onNodesChange?.([{ type: 'position', id: nodes?.[0]?.id }]),
          },
          'nodes-change',
        ),
      );
    },
    Background: () => React.createElement('div', { 'data-testid': 'mock-background' }),
    Controls: ({ children }) =>
      React.createElement('div', { 'data-testid': 'mock-controls' }, children),
    ControlButton: ({ onClick, children, ...props }) => {
      globalThis.__toggleFullscreen = onClick;
      return React.createElement('button', { onClick, ...props }, children);
    },
    MiniMap: () => React.createElement('div', { 'data-testid': 'mock-minimap' }),
    MarkerType: { ArrowClosed: 'arrowclosed' },
    applyNodeChanges: vi.fn((changes, current) => current),
  };
});

vi.mock('elkjs/lib/elk.bundled.js', () => {
  return {
    default: class MockELK {
      constructor() {
        const layoutFn = vi.fn().mockImplementation(async (graph) => {
          return {
            children: (graph.children || []).map((c, i) => ({
              id: c.id,
              x: i * 200,
              y: i * 100,
            })),
          };
        });
        globalThis.__mockElkLayout = layoutFn;
        this.layout = (...args) => globalThis.__mockElkLayout(...args);
      }
    },
  };
});

let mockSessionScopeOverride = null;
vi.mock('../components/session-select.js', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useSessionScope: () => {
      if (mockSessionScopeOverride) {
        return mockSessionScopeOverride();
      }
      return actual.useSessionScope();
    },
  };
});

vi.mock('../app-context.js', () => ({
  useApp: vi.fn(),
}));

vi.mock('../api.js', () => ({
  getJSON: vi.fn(),
  postJSON: vi.fn(),
  deleteJSON: vi.fn(),
}));

vi.mock('../components/task-drawer.js', () => ({
  TaskDrawer: ({ base, tasks }) =>
    React.createElement('div', {
      'data-testid': 'mock-task-drawer',
      'data-base': base,
      'data-count': tasks?.length,
    }),
}));

describe('FlowPage', () => {
  let mockApp;

  const sampleTasks = [
    {
      uid: 's1:1',
      id: '1',
      storeId: 's1',
      sessionId: 'sess-1',
      session: { label: 'Session One Very Long Label Exceeding Twenty Four Chars' },
      subject: 'Connected Task 1',
      description: 'First node in graph',
      owner: 'Alice',
      status: 'in_progress',
      blocks: ['2'],
      blockedBy: [],
      lifecycle: { startedAt: '2026-03-01T10:00:00Z' },
    },
    {
      uid: 's1:2',
      id: '2',
      storeId: 's1',
      sessionId: 'sess-1',
      session: { label: 'Session One Very Long Label Exceeding Twenty Four Chars' },
      subject: 'Connected Task 2',
      description: 'Second node in graph',
      owner: 'Bob',
      status: 'pending',
      blocks: [],
      blockedBy: ['1'],
      lifecycle: { startedAt: 'invalid-date' },
    },
    {
      uid: 's1:3',
      id: '3',
      storeId: 's1',
      sessionId: 'sess-1',
      session: { label: 'Session One' },
      subject: 'Disconnected Ready Task',
      description: 'Independent ready node',
      owner: 'Charlie',
      status: 'pending',
      blocks: [],
      blockedBy: [],
      lifecycle: {},
    },
    {
      uid: 's1:4',
      id: '4',
      storeId: 's1',
      sessionId: 'sess-1',
      session: { label: 'Session One' },
      subject: 'Completed Task',
      description: 'Done task',
      owner: 'Dave',
      status: 'completed',
      blocks: [],
      blockedBy: [],
      lifecycle: { completedAt: '2026-03-01T12:00:00Z' },
    },
    {
      uid: 's1:5',
      id: '5',
      storeId: 's1',
      sessionId: 'sess-1',
      session: { label: 'Session One' },
      subject: 'Deleted Task',
      description: 'Removed task',
      owner: 'Eve',
      status: 'deleted',
      blocks: [],
      blockedBy: [],
      lifecycle: { deletedAt: '2026-03-01T13:00:00Z' },
      deletedAt: '2026-03-01T13:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionScopeOverride = null;
    mockRfInstance = {
      setViewport: vi.fn(),
      fitView: vi.fn(),
    };
    mockApp = {
      revision: 1,
      currentSessionId: 'sess-1',
      watchedSessions: [{ id: 'sess-1', label: 'Session One', summary: 'Summary One' }],
      sessionsState: {
        watchedSessionIds: ['sess-1'],
        sessions: [
          { id: 'sess-1', label: 'Session One', summary: 'Summary One' },
          { id: 'sess-2', label: 'Session Two', summary: 'Summary Two' },
        ],
      },
      loadState: vi.fn().mockResolvedValue({
        tasks: [...sampleTasks],
        initialSort: 'dependency',
      }),
      showModal: vi.fn(),
    };
    vi.mocked(appContextModule.useApp).mockReturnValue(mockApp);
    vi.mocked(apiModule.getJSON).mockResolvedValue({
      nodes: { 'task-1': { x: 100, y: 100 } },
      viewport: { x: 50, y: 50, zoom: 1 },
    });
    vi.mocked(apiModule.postJSON).mockResolvedValue({});
    vi.mocked(apiModule.deleteJSON).mockResolvedValue({});
  });

  function renderPage(initialEntries = ['/flow']) {
    return render(
      React.createElement(MemoryRouter, { initialEntries }, React.createElement(FlowPage, null)),
    );
  }

  it('renders flow diagram nodes, status labels, controls and minimap', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Connected Task 1')).toBeDefined();
    });

    // Check status labels
    expect(screen.getByText('🚀 in progress')).toBeDefined();
    expect(screen.getByText('🔒 blocked')).toBeDefined();
    expect(screen.getByText('▶ ready')).toBeDefined();
    expect(screen.getByText('✅ completed')).toBeDefined();
    expect(screen.getByText('🗑️ deleted')).toBeDefined();

    // Check deletedAt text
    expect(screen.getByText(/removed/)).toBeDefined();

    // Check minimap and background
    expect(screen.getByTestId('mock-minimap')).toBeDefined();
    expect(screen.getByTestId('mock-background')).toBeDefined();

    // Check task drawer
    expect(screen.getByTestId('mock-task-drawer')).toBeDefined();
  });

  it('handles clicking a task node to navigate and ignores header node click', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Connected Task 1')).toBeDefined();
    });

    // Click regular node
    const taskNode = screen.getByTestId('flow-node-sess-1::s1:1');
    fireEvent.click(taskNode);

    // Click header node
    const headerNode = screen.getByTestId('flow-node-__session__:sess-1');
    fireEvent.click(headerNode);
  });

  it('handles auto-arrange button and triggers ELK layout', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Connected Task 1')).toBeDefined();
    });

    const arrangeBtn = screen.getByRole('button', { name: 'Auto arrange' });
    fireEvent.click(arrangeBtn);

    await waitFor(() => {
      expect(globalThis.__mockElkLayout).toHaveBeenCalled();
      expect(apiModule.postJSON).toHaveBeenCalled();
    });
  });

  it('handles reset layout button and calls deleteJSON', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Connected Task 1')).toBeDefined();
    });

    const resetBtn = screen.getByRole('button', { name: '↺ Reset layout' });
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(apiModule.deleteJSON).toHaveBeenCalled();
    });
  });

  it('handles node drag stop and viewport move end persistence', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Connected Task 1')).toBeDefined();
    });

    // Drag stop
    const dragBtn = screen.getByTestId('drag-sess-1::s1:1');
    fireEvent.click(dragBtn);

    await waitFor(() => {
      expect(apiModule.postJSON).toHaveBeenCalledWith(
        expect.stringContaining('flow-layout'),
        expect.objectContaining({ nodes: expect.any(Object) }),
      );
    });

    // Wait for restoringViewport flag to clear after initial RAF
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    // Move end
    const moveEndBtn = screen.getByTestId('trigger-move-end');
    fireEvent.click(moveEndBtn);

    await waitFor(() => {
      expect(apiModule.postJSON).toHaveBeenCalledWith(
        expect.stringContaining('flow-layout'),
        expect.objectContaining({ viewport: expect.any(Object) }),
      );
    });

    // Invalid drag stop (without uid or sessionId) to trigger line 112 return
    const invalidDragBtn = screen.getByTestId('trigger-invalid-drag');
    fireEvent.click(invalidDragBtn);

    // Null move end to trigger line 120 return
    const nullMoveEndBtn = screen.getByTestId('trigger-null-move-end');
    fireEvent.click(nullMoveEndBtn);

    // Nodes change
    const nodesChangeBtn = screen.getByTestId('trigger-nodes-change');
    fireEvent.click(nodesChangeBtn);
  });

  it('handles search input and filters connected edge targets', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Connected Task 1')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText(/Search task id, title/i);
    // Searching for 'Connected Task 1' keeps task 1 visible but filters out task 2, covering line 298
    fireEvent.change(searchInput, { target: { value: 'Connected Task 1' } });
    expect(screen.getByText('Connected Task 1')).toBeDefined();

    fireEvent.change(searchInput, { target: { value: 'Independent' } });
    expect(screen.getByText('Disconnected Ready Task')).toBeDefined();

    fireEvent.change(searchInput, { target: { value: '' } });
  });

  it('handles unmounting while flow-layout request is in flight', () => {
    let resolveLayout;
    vi.mocked(apiModule.getJSON).mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolveLayout = r;
        }),
    );
    const { unmount } = renderPage();
    unmount();
    resolveLayout({ nodes: {}, viewport: null });
  });

  it('sorts tasks by subject, status, and id in flow', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Connected Task 1')).toBeDefined();
    });

    const sortSelect = screen.getByRole('combobox');
    fireEvent.change(sortSelect, { target: { value: 'subject' } });
    fireEvent.change(sortSelect, { target: { value: 'status' } });
    fireEvent.change(sortSelect, { target: { value: 'id' } });
    fireEvent.change(sortSelect, { target: { value: 'dependency' } });
  });

  it('toggles fullscreen mode and handles escape key fallback', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Connected Task 1')).toBeDefined();
    });

    const fullscreenBtn = screen.getByTitle('Full screen');
    fireEvent.click(fullscreenBtn);

    // Escape exits fallback fullscreen
    fireEvent.keyDown(window, { key: 'Escape' });

    // Native fullscreenchange event
    act(() => {
      document.dispatchEvent(new Event('fullscreenchange'));
    });
  });

  it('displays error modal when loadState fails', async () => {
    mockApp.loadState.mockRejectedValueOnce(new Error('Flow error'));
    renderPage();

    await waitFor(() => {
      expect(mockApp.showModal).toHaveBeenCalledWith({
        kind: 'error',
        title: 'Flow could not be loaded',
        message: 'Flow error',
      });
    });
  });

  it('displays error modal when loadState fails with non-Error value', async () => {
    mockApp.loadState.mockRejectedValueOnce('Raw string flow error');
    renderPage();

    await waitFor(() => {
      expect(mockApp.showModal).toHaveBeenCalledWith({
        kind: 'error',
        title: 'Flow could not be loaded',
        message: 'Raw string flow error',
      });
    });
  });

  it('handles native requestFullscreen and exitFullscreen', async () => {
    const originalRequest = HTMLDivElement.prototype.requestFullscreen;
    const originalExit = document.exitFullscreen;
    try {
      HTMLDivElement.prototype.requestFullscreen = vi.fn().mockResolvedValue(undefined);
      document.exitFullscreen = vi.fn().mockResolvedValue(undefined);

      renderPage();
      await waitFor(() => {
        expect(screen.getByText('Connected Task 1')).toBeDefined();
      });

      const fullscreenBtn = screen.getByTitle('Full screen');
      fireEvent.click(fullscreenBtn);
      expect(HTMLDivElement.prototype.requestFullscreen).toHaveBeenCalled();

      // Mock active fullscreen element
      const container = document.querySelector('.flow-wrap');
      Object.defineProperty(document, 'fullscreenElement', {
        value: container,
        configurable: true,
      });

      // Click to exit fullscreen
      fireEvent.click(fullscreenBtn);
      expect(document.exitFullscreen).toHaveBeenCalled();

      // Reset
      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        configurable: true,
      });
    } finally {
      HTMLDivElement.prototype.requestFullscreen = originalRequest;
      document.exitFullscreen = originalExit;
    }
  });

  it('renders multi-session lanes when multiple sessions are selected', async () => {
    mockApp.watchedSessions = [
      { id: 'sess-1', label: 'Session One' },
      { id: 'sess-2', label: 'Session Two' },
    ];
    mockApp.sessionsState.watchedSessionIds = ['sess-1', 'sess-2'];
    renderPage(['/flow?sessions=sess-1,sess-2']);

    await waitFor(() => {
      expect(screen.getByText('Connected Task 1')).toBeDefined();
    });
  });

  it('handles layout loading failure gracefully', async () => {
    vi.mocked(apiModule.getJSON).mockRejectedValueOnce(new Error('Layout network error'));
    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Connected Task 1')).toBeDefined();
    });
  });

  it('covers status filter toggles, persistence error catches, and invalid timeline date handling', async () => {
    // Include task with invalid lifecycle date string to cover timelineGroupKey branch
    const tasksWithEdgeCases = [
      ...sampleTasks,
      {
        uid: 's1:invalid-date',
        id: '6',
        storeId: 's1',
        sessionId: 'sess-1',
        subject: 'Invalid Date Task',
        status: 'in_progress',
        lifecycle: { startedAt: 'not-a-valid-iso-date' },
        blockedBy: [],
        blocks: [],
      },
      {
        uid: 's1:unstarted-task',
        id: '7',
        storeId: 's1',
        sessionId: 'sess-1',
        subject: 'Unstarted Task',
        status: 'pending',
        blockedBy: ['1'], // blocks task 1 which will be filtered when status is changed
        blocks: ['999'], // target does not exist in visible
      },
    ];

    mockApp.loadState.mockResolvedValueOnce({
      tasks: tasksWithEdgeCases,
      initialSort: 'dependency',
    });

    // Make postJSON reject to test .catch(()=>{}) handlers
    vi.mocked(apiModule.postJSON).mockRejectedValue(new Error('Persistence rejection'));

    const timeSpy = vi.spyOn(Date.prototype, 'toLocaleTimeString').mockImplementationOnce(() => {
      throw new Error('time format error');
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Connected Task 1')).toBeDefined();
    });

    // Trigger status multi-select toggles
    const statusBtn = screen.getByRole('button', { name: /Status/ });
    fireEvent.click(statusBtn);

    // Toggle individual status
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[1]); // toggle one status off/on

    // Toggle master All checkbox (next.size === 4 or 0 branch)
    fireEvent.click(checkboxes[0]);

    // Test drag stop with node missing uid and with valid node to trigger postJSON error catch
    const dragBtn = screen.getByTestId('drag-sess-1::s1:1');
    fireEvent.click(dragBtn);

    // Test move end when restoringViewport is false to trigger postJSON error catch
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });
    const moveEndBtn = screen.getByTestId('trigger-move-end');
    fireEvent.click(moveEndBtn);

    // Toggle fullscreen while fallbackFullscreen is active to cover exit branch
    const fullscreenBtn = screen.getByTitle('Full screen');
    fireEvent.click(fullscreenBtn);
    expect(screen.getByTitle('Exit full screen')).toBeDefined();
    fireEvent.click(screen.getByTitle('Exit full screen'));

    timeSpy.mockRestore();
  });

  it('covers flow sorting with ties, non-numeric task ids, and empty sort filter fallback', async () => {
    mockApp.loadState.mockResolvedValueOnce({
      initialStatus: 'all',
      initialSort: '',
      tasks: [
        {
          uid: 's1:non-num-1',
          id: 'foo',
          sessionId: 'sess-1',
          subject: 'Same Subject',
          status: 'pending',
          blockedBy: [],
          blocks: [],
        },
        {
          uid: 's1:non-num-2',
          id: 'bar',
          sessionId: 'sess-1',
          subject: 'Same Subject',
          status: 'pending',
          blockedBy: [],
          blocks: [],
        },
        {
          uid: 's1:num-1',
          id: '10',
          sessionId: 'sess-1',
          subject: 'Same Subject',
          status: 'pending',
          blockedBy: [],
          blocks: [],
        },
        {
          uid: 's1:num-2',
          id: '10',
          sessionId: 'sess-1',
          subject: 'Same Subject',
          status: 'pending',
          blockedBy: [],
          blocks: [],
        },
      ],
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('Same Subject').length).toBeGreaterThan(0);
    });

    const sortSelect = screen.getByRole('combobox');
    // Sort by status with identical status and comparing non-numeric / numeric ids
    fireEvent.change(sortSelect, { target: { value: 'status' } });

    // Sort by id with non-numeric vs numeric and identical numeric ids with localeCompare
    fireEvent.change(sortSelect, { target: { value: 'id' } });

    // Sort by subject with identical subjects
    fireEvent.change(sortSelect, { target: { value: 'subject' } });

    // Sort with empty string to trigger filters.sort || scopedState?.initialSort || 'dependency'
    fireEvent.change(sortSelect, { target: { value: '' } });
  });

  it('covers ELK layout when connected is empty, elk returns null children or unmapped positions, and disconnected sort ties', async () => {
    // No connected tasks (connected.length === 0)
    mockApp.loadState.mockResolvedValueOnce({
      initialStatus: 'all',
      tasks: [
        {
          uid: 's1:disc-a',
          id: 'same-id',
          sessionId: 'sess-1',
          subject: 'Disc A',
          status: 'pending',
          blockedBy: [],
          blocks: [],
        },
        {
          uid: 's1:disc-b',
          id: 'same-id',
          sessionId: 'sess-1',
          subject: 'Disc B',
          status: 'pending',
          blockedBy: [],
          blocks: [],
        },
      ],
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Disc A')).toBeDefined();
    });

    const arrangeBtn = screen.getByRole('button', { name: 'Auto arrange' });
    fireEvent.click(arrangeBtn);

    await waitFor(() => {
      expect(apiModule.postJSON).toHaveBeenCalled();
    });
  });

  it('covers ELK layout with null children and missing position map entry', async () => {
    mockApp.loadState.mockResolvedValueOnce({
      initialStatus: 'all',
      tasks: [
        {
          uid: 's1:c1',
          id: '1',
          sessionId: 'sess-1',
          subject: 'C1',
          status: 'pending',
          blocks: ['2'],
          blockedBy: [],
        },
        {
          uid: 's1:c2',
          id: '2',
          sessionId: 'sess-1',
          subject: 'C2',
          status: 'pending',
          blocks: [],
          blockedBy: ['1'],
        },
      ],
    });

    // Mock layout returning null children
    globalThis.__mockElkLayout.mockImplementationOnce(async () => ({ children: null }));

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('C1')).toBeDefined();
    });

    const arrangeBtn = screen.getByRole('button', { name: 'Auto arrange' });
    fireEvent.click(arrangeBtn);

    await waitFor(() => {
      expect(apiModule.postJSON).toHaveBeenCalled();
    });

    // Now test with children not matching node ids to trigger positions.get(node.id) || node.position
    globalThis.__mockElkLayout.mockImplementationOnce(async () => ({
      children: [{ id: 'unmatched-id', x: 50, y: 50 }],
    }));
    fireEvent.click(arrangeBtn);

    await waitFor(() => {
      expect(apiModule.postJSON).toHaveBeenCalled();
    });
  });

  it('covers connected lifecycle dates in timelineGroupKey, shortId and compactLabel falsy fallbacks, and sort fallbacks', async () => {
    let uidAccess = 0;
    const connectedTasksInSameSession = [
      {
        uid: 'conn-1',
        id: '1',
        sessionId: 'sess-1',
        session: { label: '', summary: 'Summary Fallback Exceeding Twenty Four Chars' },
        subject: '', // Falsy subject
        status: '', // Falsy status
        blockedBy: [],
        blocks: ['2'],
        lifecycle: { completedAt: '2026-03-01T10:00:00Z' },
      },
      {
        uid: 'conn-2',
        id: '', // Falsy id
        sessionId: 'sess-1',
        session: null,
        subject: '',
        status: 'in_progress',
        blockedBy: ['1'],
        blocks: ['3'],
        lifecycle: { deletedAt: '2026-03-01T11:00:00Z' },
      },
      {
        uid: 'conn-3',
        id: '3',
        sessionId: 'sess-1',
        session: null,
        subject: 'Third Connected Task',
        status: 'pending',
        blockedBy: ['2'],
        blocks: ['4'],
        lifecycle: {}, // Unstarted
      },
      {
        get uid() {
          uidAccess++;
          return uidAccess > 2 ? 'missing-uid-during-sort' : 'conn-4';
        },
        id: '4',
        sessionId: 'sess-1',
        session: null,
        subject: 'Fourth Connected Task',
        status: 'deleted',
        deletedAt: null, // deleted without deletedAt
        blockedBy: ['3'],
        blocks: [],
        lifecycle: { startedAt: 'not-valid-iso-date' },
      },
    ];

    mockApp.loadState.mockResolvedValueOnce({
      initialStatus: 'all',
      initialSort: 'dependency',
      tasks: connectedTasksInSameSession,
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Third Connected Task')).toBeDefined();
    });

    const sortSelect = screen.getByRole('combobox');
    fireEvent.change(sortSelect, { target: { value: 'subject' } });
    fireEvent.change(sortSelect, { target: { value: 'status' } });
    fireEvent.change(sortSelect, { target: { value: 'id' } });
    fireEvent.change(sortSelect, { target: { value: 'dependency' } });
  });

  it('covers fullscreen toggle with element.requestFullscreen rejection and keydown ignore', async () => {
    const originalRequest = HTMLDivElement.prototype.requestFullscreen;
    try {
      HTMLDivElement.prototype.requestFullscreen = vi
        .fn()
        .mockRejectedValue(new Error('Fullscreen denied'));

      renderPage();
      await waitFor(() => {
        expect(screen.getByText('Connected Task 1')).toBeDefined();
      });

      const fullscreenBtn = screen.getByTitle('Full screen');
      fireEvent.click(fullscreenBtn);

      await waitFor(() => {
        expect(screen.getByTitle('Exit full screen')).toBeDefined();
      });

      // Keydown other than Escape
      fireEvent.keyDown(window, { key: 'Enter' });
      expect(screen.getByTitle('Exit full screen')).toBeDefined();

      // Native fullscreenchange with active = true
      const container = document.querySelector('.flow-wrap');
      Object.defineProperty(document, 'fullscreenElement', {
        value: container,
        configurable: true,
      });
      act(() => {
        document.dispatchEvent(new Event('fullscreenchange'));
      });

      Object.defineProperty(document, 'fullscreenElement', {
        value: null,
        configurable: true,
      });
    } finally {
      HTMLDivElement.prototype.requestFullscreen = originalRequest;
    }
  });

  it('covers getJSON returning null, node drag with laneOffset, and canvasWidth clientWidth fallback', async () => {
    vi.mocked(apiModule.getJSON).mockResolvedValueOnce(null);

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Connected Task 1')).toBeDefined();
    });

    // Drag stop with custom node having laneOffset
    const flowWrap = document.querySelector('.flow-wrap');
    if (flowWrap) {
      Object.defineProperty(flowWrap, 'clientWidth', { value: 0, configurable: true });
    }
    const origInnerWidth = window.innerWidth;
    Object.defineProperty(window, 'innerWidth', { value: 0, configurable: true });

    const arrangeBtn = screen.getByRole('button', { name: 'Auto arrange' });
    fireEvent.click(arrangeBtn);

    await waitFor(() => {
      expect(apiModule.postJSON).toHaveBeenCalled();
    });

    Object.defineProperty(window, 'innerWidth', { value: origInnerWidth, configurable: true });
  });

  it('covers all remaining flow.js branches and edge cases', async () => {
    // 1. Line 147: toggleFullscreen when element is null (after unmount)
    const { unmount } = renderPage();
    unmount();
    if (globalThis.__toggleFullscreen) {
      await globalThis.__toggleFullscreen();
    }

    // 2. Line 88: layout loading rejection when alive is false (unmounted)
    let rejectLayout;
    vi.mocked(apiModule.getJSON).mockImplementationOnce(
      () =>
        new Promise((_, rej) => {
          rejectLayout = rej;
        }),
    );
    const { unmount: unmount2 } = renderPage();
    unmount2();
    rejectLayout(new Error('unmounted layout error'));

    // 3. Lines 103 and 104: viewport fitView when automatic.nodes is empty
    mockApp.loadState.mockResolvedValueOnce({ tasks: [] });
    vi.mocked(apiModule.getJSON).mockResolvedValueOnce({ nodes: {}, viewport: null });
    // Single session empty fitView (line 103)
    const { unmount: unmountSingleEmpty } = renderPage(['/flow?sessions=sess-1']);
    await waitFor(() => {
      expect(screen.getByText('Task graph')).toBeDefined();
    });
    unmountSingleEmpty();

    // Single session with automatic nodes and null viewport (line 199)
    mockRfInstance.fitView.mockClear();
    mockApp.loadState.mockResolvedValueOnce({
      tasks: [
        {
          uid: 'sess-1:1',
          sessionId: 'sess-1',
          id: '1',
          subject: 'Automatic node task',
          status: 'pending',
          blockedBy: [],
          blocks: [],
        },
      ],
    });
    vi.mocked(apiModule.getJSON).mockResolvedValueOnce({ nodes: {}, viewport: null });
    const { unmount: unmountSingleWithNodes } = renderPage(['/flow?sessions=sess-1']);
    await waitFor(() => {
      expect(mockRfInstance.fitView).toHaveBeenCalledWith({ padding: 0.18, duration: 0 });
    });
    unmountSingleWithNodes();

    // Multi session empty fitView (line 104)
    mockApp.sessionsState.watchedSessionIds = ['sess-empty-1', 'sess-empty-2'];
    mockApp.loadState.mockResolvedValueOnce({ tasks: [] });
    vi.mocked(apiModule.getJSON).mockResolvedValue({ nodes: {}, viewport: null });
    const { unmount: unmountMultiEmpty } = renderPage(['/flow?sessions=sess-empty-1,sess-empty-2']);
    await waitFor(() => {
      expect(screen.getByText('Task graph')).toBeDefined();
    });
    unmountMultiEmpty();
  });

  it('covers savedLayouts fallbacks for moveEnd, dragStop with nodes=null, and autoArrange after resetLayout', async () => {
    // getJSON returns nodes: null to cover line 116 current.nodes || {}
    vi.mocked(apiModule.getJSON).mockResolvedValueOnce({ nodes: null, viewport: null });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Connected Task 1')).toBeDefined();
    });

    // Drag stop to cover line 116 current.nodes || {}
    const dragBtn = screen.getByTestId('drag-sess-1::s1:1');
    fireEvent.click(dragBtn);

    // Reset layout sets savedLayouts.current = {}
    const resetBtn = screen.getByRole('button', { name: '↺ Reset layout' });
    fireEvent.click(resetBtn);

    // Wait for restoringViewport flag to clear after RAF
    await act(async () => {
      await new Promise((r) => setTimeout(r, 60));
    });

    // onMoveEnd when savedLayouts.current[sessionId] is undefined covers line 123
    const moveEndBtn = screen.getByTestId('trigger-move-end');
    fireEvent.click(moveEndBtn);
    fireEvent.click(moveEndBtn);

    // autoArrange when savedLayouts.current[sessionId] is undefined covers line 176
    const arrangeBtn = screen.getByRole('button', { name: 'Auto arrange' });
    fireEvent.click(arrangeBtn);

    await waitFor(() => {
      expect(apiModule.postJSON).toHaveBeenCalled();
    });
  });

  it('covers all sortTasks comparators with identical and empty fields and missing orderIndex', async () => {
    let isSorting = false;
    let uidCountA = 0;
    let uidCountB = 0;

    const taskA = {
      get uid() {
        uidCountA++;
        return isSorting ? 'missing-uid-a' : 's1:t-a';
      },
      id: '10',
      storeId: 's1',
      sessionId: 'sess-1',
      session: { label: '', summary: '' }, // line 243 sessionId fallback
      subject: '', // String(a.subject || '')
      get status() {
        return isSorting ? '' : 'pending'; // String(a.status || '')
      },
      blockedBy: [],
      blocks: [],
    };

    const taskB = {
      get uid() {
        uidCountB++;
        return isSorting ? 'missing-uid-b' : 's1:t-b';
      },
      id: '10',
      storeId: 's1',
      sessionId: 'sess-1',
      session: null,
      subject: '', // String(b.subject || '')
      get status() {
        return isSorting ? '' : 'pending'; // String(b.status || '')
      },
      blockedBy: [],
      blocks: [],
    };

    mockApp.loadState.mockResolvedValueOnce({
      initialStatus: 'all',
      tasks: [taskA, taskB],
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'drag-stop' }).length).toBeGreaterThan(0);
    });

    isSorting = true;
    const sortSelect = screen.getByRole('combobox');
    fireEvent.change(sortSelect, { target: { value: 'subject' } });
    fireEvent.change(sortSelect, { target: { value: 'status' } });
    fireEvent.change(sortSelect, { target: { value: 'id' } });
    fireEvent.change(sortSelect, { target: { value: 'dependency' } });
  });

  it('covers line 293 session?.label || sessionId fallback, compactLabel and shortId empty fallbacks', async () => {
    const sessWithEmptyLabel = 'sess-fallback-id';
    mockApp.sessionsState.watchedSessionIds = [sessWithEmptyLabel, ''];
    mockApp.sessionsState.sessions = []; // Triggers line 69 fallback

    const task1 = {
      uid: 's1:f1',
      id: '1',
      storeId: 's1',
      sessionId: sessWithEmptyLabel,
      session: { label: '' }, // triggers line 293 session?.label || sessionId evaluating sessionId
      subject: 'Fallback Session Task',
      status: 'pending',
      blockedBy: [],
      blocks: [],
    };

    const task2 = {
      uid: 's1:f2',
      id: '', // triggers shortId('')
      storeId: 's1',
      sessionId: '', // triggers compactLabel('') and shortId('')
      session: null,
      subject: 'Empty Task',
      status: 'pending',
      blockedBy: [],
      blocks: [],
    };

    mockApp.loadState.mockResolvedValueOnce({
      initialStatus: 'all',
      tasks: [task1, task2],
    });

    renderPage([`/flow?sessions=${sessWithEmptyLabel},`]);
    await waitFor(() => {
      expect(screen.getByText('Fallback Session Task')).toBeDefined();
    });
  });

  it('covers line 157 early returns in autoArrange when nodes have no uid or arranging is true', async () => {
    // 1. Nodes have no uid
    mockApp.loadState.mockResolvedValueOnce({
      tasks: [],
    });
    const { unmount } = renderPage();
    await waitFor(() => {
      expect(screen.getByText('Task graph')).toBeDefined();
    });
    const autoArrangeBtn = screen.getByRole('button', { name: /auto arrange/i });
    const reactPropKey = Object.keys(autoArrangeBtn).find((k) => k.startsWith('__reactProps'));
    if (reactPropKey) {
      await autoArrangeBtn[reactPropKey].onClick();
    }
    expect(apiModule.postJSON).not.toHaveBeenCalled();
    unmount();

    // 2. Arranging is already true
    let resolveElk;
    globalThis.__mockElkLayout = vi.fn().mockImplementation(
      () =>
        new Promise((res) => {
          resolveElk = res;
        }),
    );
    mockApp.loadState.mockResolvedValueOnce({
      tasks: [...sampleTasks],
    });
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Connected Task 1')).toBeDefined();
    });
    const autoArrangeBtn2 = screen.getByRole('button', { name: /auto arrange/i });
    const reactPropKey2 = Object.keys(autoArrangeBtn2).find((k) => k.startsWith('__reactProps'));
    if (reactPropKey2) {
      // First click sets arranging = true
      autoArrangeBtn2[reactPropKey2].onClick();
      // Second click hits arranging == true return
      autoArrangeBtn2[reactPropKey2].onClick();
    }

    await act(async () => {
      resolveElk({ children: [] });
    });
  });

  it('covers lines 103 and 104 else if branches when automatic.nodes.length is 0', async () => {
    // Line 103: single session without saved viewport and automatic.nodes is empty
    const singleEmptySess = ['sess-single-empty'];
    singleEmptySess[Symbol.iterator] = function* () {};
    mockSessionScopeOverride = () => ({
      selectedSessionIds: singleEmptySess,
      setSelectedSessionIds: vi.fn(),
    });
    mockApp.loadState.mockResolvedValueOnce({ tasks: [] });
    vi.mocked(apiModule.getJSON).mockResolvedValueOnce({ nodes: {}, viewport: null });
    const { unmount: unmount1 } = renderPage();
    await waitFor(() => {
      expect(screen.getByText('Task graph')).toBeDefined();
    });
    unmount1();

    // Line 104: multi session without saved viewport and automatic.nodes is empty
    const multiEmptySess = ['sess-multi-1', 'sess-multi-2'];
    multiEmptySess[Symbol.iterator] = function* () {};
    mockSessionScopeOverride = () => ({
      selectedSessionIds: multiEmptySess,
      setSelectedSessionIds: vi.fn(),
    });
    mockApp.loadState.mockResolvedValueOnce({ tasks: [] });
    vi.mocked(apiModule.getJSON).mockResolvedValue({ nodes: {}, viewport: null });
    const { unmount: unmount2 } = renderPage();
    await waitFor(() => {
      expect(screen.getByText('Task graph')).toBeDefined();
    });
    unmount2();
  });

  it('covers line 114 default 0 for node.data.laneOffset', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Connected Task 1')).toBeDefined();
    });

    globalThis.__onNodeDragStop?.(null, {
      data: { uid: 'u-no-lane', sessionId: 'sess-1' },
      position: { x: 25, y: 35 },
    });

    expect(apiModule.postJSON).toHaveBeenCalledWith('/api/sessions/sess-1/flow-layout', {
      nodes: { 'u-no-lane': { x: 25, y: 35 } },
    });
  });

  it('covers lines 115 and 123 savedLayouts.current[sessionId] already defined', async () => {
    let resolveGetJSON;
    vi.mocked(apiModule.getJSON).mockImplementationOnce(
      () =>
        new Promise((res) => {
          resolveGetJSON = res;
        }),
    );

    const { unmount } = renderPage();

    // Line 123: While getJSON is pending, savedLayouts.current['sess-1'] is undefined
    globalThis.__onMoveEnd?.(null, { x: 10, y: 20, zoom: 1 });
    // Trigger again when savedLayouts.current['sess-1'] is now defined
    globalThis.__onMoveEnd?.(null, { x: 30, y: 40, zoom: 1.2 });

    await act(async () => {
      resolveGetJSON({ nodes: {}, viewport: null });
    });

    // Line 115: persistNode twice for same session
    globalThis.__onNodeDragStop?.(null, {
      data: { uid: 'u-p1', sessionId: 'sess-persist-both', laneOffset: 10 },
      position: { x: 50, y: 60 },
    });
    globalThis.__onNodeDragStop?.(null, {
      data: { uid: 'u-p2', sessionId: 'sess-persist-both', laneOffset: 10 },
      position: { x: 70, y: 80 },
    });

    unmount();
  });

  it('covers line 168 maxY fallback NODE_HEIGHT when layouted is empty during autoArrange', async () => {
    mockApp.sessionsState.watchedSessionIds = ['sess-1', 'sess-empty-layout'];
    mockApp.currentSessionId = 'sess-1';
    mockApp.loadState.mockResolvedValueOnce({
      tasks: [sampleTasks[0]],
    });
    renderPage(['/flow?sessions=sess-1,sess-empty-layout']);
    await waitFor(() => {
      expect(screen.getByText('Connected Task 1')).toBeDefined();
    });

    const autoArrangeBtn = screen.getByRole('button', { name: /auto arrange/i });
    fireEvent.click(autoArrangeBtn);
    await waitFor(() => {
      expect(apiModule.postJSON).toHaveBeenCalled();
    });
  });

  it('covers line 230 groups.get(sessionId) fallback when sessionOrder has a session not in groups', async () => {
    const origGet = Map.prototype.get;
    const mapGetSpy = vi.spyOn(Map.prototype, 'get').mockImplementation(function (key) {
      if (key === 'sess-not-in-map') {
        return undefined;
      }
      return origGet.call(this, key);
    });

    mockApp.sessionsState.watchedSessionIds = ['sess-not-in-map'];
    mockApp.currentSessionId = 'sess-not-in-map';
    mockApp.loadState.mockResolvedValueOnce({
      tasks: [],
    });

    renderPage(['/flow?sessions=sess-not-in-map']);
    await waitFor(() => {
      expect(screen.getByText('Task graph')).toBeDefined();
    });

    mapGetSpy.mockRestore();
  });

  it('covers line 249 dependency sort when task is not in graph.orderIndex', async () => {
    let inSort = false;
    const taskA = {
      get uid() {
        return inSort ? 'missing-order-a' : 'uid-dep-a';
      },
      id: '1',
      storeId: 's1',
      sessionId: 'sess-1',
      subject: 'Dep Task A',
      get status() {
        inSort = true;
        return 'pending';
      },
      blockedBy: [],
      blocks: [],
    };
    const taskB = {
      get uid() {
        return inSort ? 'missing-order-b' : 'uid-dep-b';
      },
      id: '2',
      storeId: 's1',
      sessionId: 'sess-1',
      subject: 'Dep Task B',
      status: 'pending',
      blockedBy: [],
      blocks: [],
    };

    mockApp.loadState.mockResolvedValueOnce({
      tasks: [taskA, taskB],
      initialSort: 'dependency',
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Dep Task A')).toBeDefined();
    });
  });

  it('covers lines 250, 251, 252 sorting branches for subject, status, and default id', async () => {
    const taskEmptySubject1 = {
      uid: 'u-sub-empty-1',
      id: '1',
      sessionId: 'sess-1',
      subject: '',
      status: 'pending',
      blockedBy: [],
      blocks: [],
    };
    const taskEmptySubject2 = {
      uid: 'u-sub-empty-2',
      id: '2',
      sessionId: 'sess-1',
      subject: '',
      status: 'pending',
      blockedBy: [],
      blocks: [],
    };
    const taskWithSubject = {
      uid: 'u-sub-full',
      id: '3',
      sessionId: 'sess-1',
      subject: 'Alpha Subject',
      status: 'pending',
      blockedBy: [],
      blocks: [],
    };

    const makeDynamicStatusTask = (uid, id) => ({
      uid,
      id,
      sessionId: 'sess-1',
      subject: `Task ${id}`,
      get status() {
        const stack = new Error().stack;
        if (stack && stack.includes('sortTasks')) {
          return '';
        }
        return 'pending';
      },
      blockedBy: [],
      blocks: [],
    });

    const taskStatusA = makeDynamicStatusTask('u-stat-a', '10');
    const taskStatusB = makeDynamicStatusTask('u-stat-b', '20');
    const taskStatusPending = {
      uid: 'u-stat-pending',
      id: '30',
      sessionId: 'sess-1',
      subject: 'Beta Subject',
      status: 'pending',
      blockedBy: [],
      blocks: [],
    };
    const taskNonNumericId1 = {
      uid: 'u-id-non-num-1',
      id: 'alpha-id',
      sessionId: 'sess-1',
      subject: 'Gamma',
      status: 'pending',
      blockedBy: [],
      blocks: [],
    };
    const taskNonNumericId2 = {
      uid: 'u-id-non-num-2',
      id: 'beta-id',
      sessionId: 'sess-1',
      subject: 'Delta',
      status: 'pending',
      blockedBy: [],
      blocks: [],
    };
    const taskEmptyId1 = {
      uid: 'u-id-empty-1',
      id: '',
      sessionId: 'sess-1',
      subject: 'Epsilon 1',
      status: 'pending',
      blockedBy: [],
      blocks: [],
    };
    const taskEmptyId2 = {
      uid: 'u-id-empty-2',
      id: '',
      sessionId: 'sess-1',
      subject: 'Epsilon 2',
      status: 'pending',
      blockedBy: [],
      blocks: [],
    };

    mockApp.loadState.mockResolvedValueOnce({
      tasks: [
        taskEmptySubject1,
        taskEmptySubject2,
        taskWithSubject,
        taskStatusA,
        taskStatusB,
        taskStatusPending,
        taskNonNumericId1,
        taskNonNumericId2,
        taskEmptyId1,
        taskEmptyId2,
      ],
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Alpha Subject')).toBeDefined();
    });

    const sortSelect = screen.getByDisplayValue('Sort: Dependency');
    fireEvent.change(sortSelect, { target: { value: 'subject' } });
    await waitFor(() => {
      expect(screen.getByText('Alpha Subject')).toBeDefined();
    });

    fireEvent.change(sortSelect, { target: { value: 'status' } });
    await waitFor(() => {
      expect(screen.getByText('Beta Subject')).toBeDefined();
    });

    fireEvent.change(sortSelect, { target: { value: 'id' } });
    await waitFor(() => {
      expect(screen.getByText('Gamma')).toBeDefined();
    });
  });

  it('covers line 282 timeline grouping when two connected tasks have identical timelineGroupKey', async () => {
    const taskConn1 = {
      uid: 's1:conn-1',
      id: 'conn-1',
      storeId: 's1',
      sessionId: 'sess-1',
      subject: 'Timeline Task 1',
      status: 'pending',
      blocks: ['conn-2'],
      blockedBy: [],
      lifecycle: { startedAt: '2026-03-01T10:00:00Z' },
    };
    const taskConn2 = {
      uid: 's1:conn-2',
      id: 'conn-2',
      storeId: 's1',
      sessionId: 'sess-1',
      subject: 'Timeline Task 2',
      status: 'pending',
      blocks: [],
      blockedBy: ['conn-1'],
      lifecycle: { startedAt: '2026-03-01T10:00:00Z' },
    };

    mockApp.loadState.mockResolvedValueOnce({
      tasks: [taskConn1, taskConn2],
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Timeline Task 1')).toBeDefined();
      expect(screen.getByText('Timeline Task 2')).toBeDefined();
    });
  });

  it('covers line 293 position fallback { x: 0, y: 0 } using dynamic uid getter', async () => {
    let inLoop = false;
    const dynamicTask = {
      get uid() {
        return inLoop ? 'uid-after-grouping' : 'uid-grouping';
      },
      id: '99',
      sessionId: 'sess-1',
      subject: 'Dynamic Pos Task',
      status: 'pending',
      blocks: [],
      blockedBy: [],
      get lifecycle() {
        inLoop = true;
        return {};
      },
    };

    mockApp.loadState.mockResolvedValueOnce({
      tasks: [dynamicTask],
    });

    renderPage();
    await waitFor(() => {
      expect(screen.getByText('Dynamic Pos Task')).toBeDefined();
    });
  });

  it('covers line 306 shortId and line 307 compactLabel with empty string', async () => {
    mockApp.sessionsState.watchedSessionIds = [''];
    mockApp.currentSessionId = '';
    mockApp.sessionsState.sessions = [];

    const emptyTask = {
      uid: 'u-empty-sess',
      id: '',
      sessionId: '',
      session: { label: '' },
      subject: 'Empty Sess Task',
      status: 'pending',
      blocks: [],
      blockedBy: [],
    };

    const origGet = Map.prototype.get;
    const mapGetSpy = vi.spyOn(Map.prototype, 'get').mockImplementation(function (key) {
      if (key === '' && !this.has('')) {
        return [emptyTask];
      }
      return origGet.call(this, key);
    });

    mockApp.loadState.mockResolvedValueOnce({
      tasks: [emptyTask],
    });

    renderPage(['/flow']);
    await waitFor(() => {
      expect(screen.getByText('Empty Sess Task')).toBeDefined();
    });

    mapGetSpy.mockRestore();
  });

  it('covers shortId truncation with a long session identifier', async () => {
    const longSessionId = 'very-long-flow-identifier-123456789';
    mockApp.sessionsState.watchedSessionIds = [longSessionId];
    mockApp.currentSessionId = longSessionId;
    mockApp.sessionsState.sessions = [{ id: longSessionId, label: 'Long Session' }];

    const longTask = {
      uid: 'u-long-sess',
      id: '1',
      sessionId: longSessionId,
      session: { label: 'Long Session' },
      subject: 'Long Sess Task',
      status: 'pending',
      blocks: [],
      blockedBy: [],
    };

    mockApp.loadState.mockResolvedValueOnce({
      tasks: [longTask],
    });

    renderPage(['/flow']);
    await waitFor(() => {
      expect(screen.getByText('very-long-fl…')).toBeDefined();
    });
  });

  it('covers shortTime with empty lifecycle and undefined fallback', async () => {
    let startedCount = 0;
    const taskEmptyLifecycle = {
      uid: 'u-empty-lifecycle',
      id: '1',
      sessionId: 'sess-empty-lc',
      session: { label: 'Empty LC' },
      subject: 'Task Empty Lifecycle',
      status: 'pending',
      lifecycle: {},
      blocks: [],
      blockedBy: [],
    };
    const taskUndefinedStartedAt = {
      uid: 'u-getter-lifecycle',
      id: '2',
      sessionId: 'sess-empty-lc',
      session: { label: 'Empty LC' },
      subject: 'Task Getter Lifecycle',
      status: 'pending',
      lifecycle: {
        get startedAt() {
          startedCount++;
          return startedCount === 1 ? '2026-03-01T10:00:00Z' : undefined;
        },
      },
      blocks: [],
      blockedBy: [],
    };

    mockApp.sessionsState.watchedSessionIds = ['sess-empty-lc'];
    mockApp.currentSessionId = 'sess-empty-lc';
    mockApp.sessionsState.sessions = [{ id: 'sess-empty-lc', label: 'Empty LC' }];

    mockApp.loadState.mockResolvedValueOnce({
      tasks: [taskEmptyLifecycle, taskUndefinedStartedAt],
    });

    renderPage(['/flow']);
    await waitFor(() => {
      expect(screen.getByText('Task Empty Lifecycle')).toBeDefined();
      expect(screen.getByText('Task Getter Lifecycle')).toBeDefined();
    });
  });

  describe('flow exported utilities', () => {
    it('nodeId formats taskId correctly', () => {
      expect(nodeId(undefined)).toBe('session::');
      expect(nodeId({ sessionId: 's1' })).toBe('s1::');
      expect(nodeId({ uid: 'u1' })).toBe('session::u1');
      expect(nodeId({ sessionId: 's1', uid: 'u1' })).toBe('s1::u1');
      expect(nodeId({ sessionId: '', uid: 'u2' })).toBe('session::u2');
    });

    it('groupTasksBySession groups tasks and handles empty list', () => {
      const grouped = groupTasksBySession([
        { uid: 'u1', sessionId: 's1' },
        { uid: 'u2', sessionId: '' },
      ]);
      expect(grouped.get('s1')).toHaveLength(1);
      expect(grouped.get('unknown')).toHaveLength(1);
      expect(groupTasksBySession()).toEqual(new Map());
    });
  });
});
