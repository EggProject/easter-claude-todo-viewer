import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import SessionsPage from './sessions.js';
import * as appContextModule from '../app-context.js';
import * as tanstackTableModule from '@tanstack/react-table';
import * as filterStateModule from '../filter-state.js';

vi.mock('@tanstack/react-table', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useReactTable: vi.fn(actual.useReactTable),
  };
});

vi.mock('../app-context.js', () => ({
  useApp: vi.fn(),
}));

describe('SessionsPage', () => {
  let mockApp;

  const sampleSessions = [
    {
      id: 'session-alpha-1234567890',
      label: 'Alpha Session',
      summary: 'Summary of Alpha',
      cwd: '/home/user/project-alpha',
      gitBranch: 'main',
      firstPrompt: 'Implement alpha feature',
      watched: true,
      current: true,
      globalLanguage: 'en',
      globalTranslationPending: false,
      createdAt: '2026-01-01T10:00:00.000Z',
      lastActivity: '2026-01-01T12:00:00.000Z',
      messageCount: 42,
      fileSize: 512,
      taskCount: 5,
      deletedTaskCount: 1,
      translationCount: 3,
    },
    {
      id: 'session-beta-short',
      label: 'Beta Session',
      summary: '',
      cwd: '/home/user/project-beta',
      gitBranch: 'develop',
      firstPrompt: 'Beta work',
      watched: false,
      current: false,
      globalLanguage: 'hu',
      globalTranslationPending: true,
      createdAt: null,
      lastActivity: 'invalid-date',
      messageCount: 10,
      fileSize: 2048,
      taskCount: 2,
      deletedTaskCount: 0,
      translationCount: 1,
    },
    {
      id: 'session-gamma-large',
      label: 'Gamma Session',
      summary: 'Gamma summary',
      cwd: '/home/user/project-gamma',
      gitBranch: 'feature/gamma',
      firstPrompt: 'Gamma prompt',
      watched: false,
      current: false,
      globalLanguage: null,
      globalTranslationPending: false,
      createdAt: '2026-02-01T10:00:00.000Z',
      lastActivity: '2026-02-02T10:00:00.000Z',
      messageCount: 100,
      fileSize: 10 * 1024 * 1024,
      taskCount: 20,
      deletedTaskCount: 4,
      translationCount: 15,
    },
    {
      id: 'session-no-label',
      label: '',
      summary: '',
      cwd: '',
      gitBranch: '',
      firstPrompt: '',
      watched: false,
      current: false,
      globalLanguage: 'en',
      globalTranslationPending: false,
      createdAt: '2026-03-01T10:00:00.000Z',
      lastActivity: '2026-03-02T10:00:00.000Z',
      messageCount: 5,
      fileSize: 1024,
      taskCount: 1,
      deletedTaskCount: 0,
      translationCount: 0,
    },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();
    const actualTable = await vi.importActual('@tanstack/react-table');
    vi.mocked(tanstackTableModule.useReactTable).mockImplementation(actualTable.useReactTable);
    mockApp = {
      sessionsState: {
        sessions: [...sampleSessions],
      },
      refreshSessions: vi.fn(),
      switchSessionOptimistic: vi.fn().mockResolvedValue(undefined),
      setSessionWatched: vi.fn(),
      setSessionLanguage: vi.fn(),
      cancelSessionLanguage: vi.fn(),
    };
    vi.mocked(appContextModule.useApp).mockReturnValue(mockApp);
  });

  function renderPage() {
    return render(React.createElement(MemoryRouter, null, React.createElement(SessionsPage, null)));
  }

  it('renders table headers, rows, and session details properly', () => {
    renderPage();

    expect(screen.getByText('Claude sessions')).toBeDefined();
    expect(screen.getByText('Alpha Session')).toBeDefined();
    expect(screen.getByText('Summary of Alpha')).toBeDefined();
    expect(screen.getByText('Beta Session')).toBeDefined();
    expect(screen.getByText('Gamma Session')).toBeDefined();

    // Check Star for current session
    expect(screen.getByTitle('Current session')).toBeDefined();

    // File sizes: 512 B, 2.0 KB, 10.0 MB
    expect(screen.getByText('512 B')).toBeDefined();
    expect(screen.getByText('2.0 KB')).toBeDefined();
    expect(screen.getByText('10.0 MB')).toBeDefined();
  });

  it('handles search filtering matching across various fields', () => {
    renderPage();
    const searchInput = screen.getByPlaceholderText(/Search name, session id/i);

    // Filter by branch
    fireEvent.change(searchInput, { target: { value: 'develop' } });
    expect(screen.getByText('Beta Session')).toBeDefined();
    expect(screen.queryByText('Alpha Session')).toBeNull();

    // Filter by prompt
    fireEvent.change(searchInput, { target: { value: 'alpha feature' } });
    expect(screen.getByText('Alpha Session')).toBeDefined();
    expect(screen.queryByText('Beta Session')).toBeNull();

    // Filter with no matches
    fireEvent.change(searchInput, { target: { value: 'non-existent-needle' } });
    expect(screen.queryByText('Alpha Session')).toBeNull();
    expect(screen.queryByText('Beta Session')).toBeNull();

    // Reset search
    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('Alpha Session')).toBeDefined();
  });

  it('handles sorting columns clicking header buttons', () => {
    renderPage();
    const thButtons = screen.getAllByRole('button');
    const nameHeaderBtn = thButtons.find((b) => b.textContent?.includes('Name / summary'));
    expect(nameHeaderBtn).toBeDefined();

    // Toggle sort on Name / summary
    fireEvent.click(nameHeaderBtn);
    expect(nameHeaderBtn.textContent).toMatch(/[↑↓]/);

    // Toggle again
    fireEvent.click(nameHeaderBtn);
    expect(nameHeaderBtn.textContent).toMatch(/[↑↓]/);

    // Toggle other headers like ID, Watch, Created
    const idHeaderBtn = thButtons.find((b) => b.textContent?.includes('Session ID'));
    if (idHeaderBtn) {
      fireEvent.click(idHeaderBtn);
    }
  });

  it('triggers refresh discovery when clicking refresh button', () => {
    renderPage();
    const refreshBtn = screen.getByRole('button', { name: '↻ Refresh discovery' });
    fireEvent.click(refreshBtn);
    expect(mockApp.refreshSessions).toHaveBeenCalledTimes(1);
  });

  it('toggles session watch status and prevents toggling current session', () => {
    renderPage();
    // Current session checkbox is disabled
    const currentWatch = screen.getByTitle('Current session is always watched');
    expect(currentWatch.disabled).toBe(true);

    // Non-current session checkbox can be toggled
    const watchCheckboxes = screen.getAllByTitle('Watch session');
    expect(watchCheckboxes[0].disabled).toBe(false);
    fireEvent.click(watchCheckboxes[0]);
    expect(mockApp.setSessionWatched).toHaveBeenCalled();
  });

  it('handles switching session with optimistic update and guards against double-click', async () => {
    let resolveSwitch;
    const switchPromise = new Promise((resolve) => {
      resolveSwitch = resolve;
    });
    mockApp.switchSessionOptimistic.mockReturnValue(switchPromise);

    renderPage();
    const switchButtons = screen.getAllByRole('button', { name: '⇄ Switch' });
    const firstSwitchBtn = switchButtons[0];

    fireEvent.click(firstSwitchBtn);

    // Verify optimistic update and disabled state guarding against double-click
    const switchingBtn = screen.getByRole('button', { name: 'Switching…' });
    expect(switchingBtn.disabled).toBe(true);
    expect(mockApp.switchSessionOptimistic).toHaveBeenCalledTimes(1);

    // Resolve switch
    resolveSwitch();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Switching…' })).toBeNull();
    });
  });

  it('guards against concurrent switch when a switch is already active', async () => {
    let resolveSwitch;
    const switchPromise = new Promise((resolve) => {
      resolveSwitch = resolve;
    });
    mockApp.switchSessionOptimistic.mockReturnValue(switchPromise);
    mockApp.sessionsState.sessions = [
      { id: 'sess-1', label: 'One', current: true },
      { id: 'sess-2', label: 'Two', current: false },
      { id: 'sess-3', label: 'Three', current: false },
    ];

    renderPage();
    const switchButtons = screen.getAllByRole('button', { name: '⇄ Switch' });
    expect(switchButtons).toHaveLength(2);

    fireEvent.click(switchButtons[0]);
    const nextSwitch = screen.getByRole('button', { name: '⇄ Switch' });
    fireEvent.click(nextSwitch);

    expect(mockApp.switchSessionOptimistic).toHaveBeenCalledTimes(1);
    expect(mockApp.switchSessionOptimistic).toHaveBeenCalledWith('sess-2');

    resolveSwitch();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Switching…' })).toBeNull();
    });
  });

  it('toggles session language and handles pending state with cancel', () => {
    renderPage();

    // Alpha session has globalLanguage = 'en'
    const enSwitches = screen.getAllByTitle('Auto-translate this session to Hungarian');
    expect(enSwitches[0].getAttribute('aria-checked')).toBe('false');
    fireEvent.click(enSwitches[0]);
    expect(mockApp.setSessionLanguage).toHaveBeenCalled();

    // Beta session has globalLanguage = 'hu'
    const huSwitch = screen.getByTitle('Set this session to English');
    expect(huSwitch.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(huSwitch);
    expect(mockApp.setSessionLanguage).toHaveBeenCalledWith('session-beta-short', 'en');

    // Beta session has a cancel button for pending translation
    const cancelBtn = screen.getByRole('button', { name: '■' });
    fireEvent.click(cancelBtn);
    expect(mockApp.cancelSessionLanguage).toHaveBeenCalledWith('session-beta-short');
  });

  it('handles empty session list and null sessionsState gracefully', () => {
    mockApp.sessionsState.sessions = [];
    const { container } = renderPage();
    expect(container.querySelectorAll('tbody tr')).toHaveLength(0);

    mockApp.sessionsState = {};
    const { container: container2 } = renderPage();
    expect(container2.querySelectorAll('tbody tr')).toHaveLength(0);
  });

  it('covers fmtDate error handling when date throws on toLocaleString', () => {
    const originalToLocaleString = Date.prototype.toLocaleString;
    try {
      Date.prototype.toLocaleString = () => {
        throw new Error('Locale error');
      };
      mockApp.sessionsState.sessions = [
        {
          id: 'error-date-session',
          createdAt: '2026-01-01T00:00:00Z',
          lastActivity: null,
          watched: false,
          current: false,
        },
      ];
      renderPage();
      expect(screen.getByText('2026-01-01T00:00:00Z')).toBeDefined();
    } finally {
      Date.prototype.toLocaleString = originalToLocaleString;
    }
  });

  it('covers custom sorting updaters, accessor functions, and column classes', () => {
    let capturedSetFilter;
    vi.spyOn(filterStateModule, 'usePersistentPageFilters').mockImplementation((page, defaults) => {
      const [state, setState] = React.useState(defaults);
      capturedSetFilter = (key, val) => setState((prev) => ({ ...prev, [key]: val }));
      return [state, capturedSetFilter];
    });

    renderPage();
    const thButtons = screen.getAllByRole('button');

    // Click 'Watch' header to trigger watched accessorFn
    const watchHeaderBtn = thButtons.find((b) => b.textContent?.includes('Watch'));
    if (watchHeaderBtn) {
      fireEvent.click(watchHeaderBtn);
      fireEvent.click(watchHeaderBtn);
    }

    // Click 'Current' header to trigger current accessorFn
    const currentHeaderBtn = thButtons.find((b) => b.textContent?.includes('Current'));
    if (currentHeaderBtn) {
      fireEvent.click(currentHeaderBtn);
      fireEvent.click(currentHeaderBtn);
    }

    // Click 'Language' header to trigger language accessorFn
    const langHeaderBtn = thButtons.find((b) => b.textContent?.includes('Language'));
    if (langHeaderBtn) {
      fireEvent.click(langHeaderBtn);
      fireEvent.click(langHeaderBtn);
    }

    // Click 'Name / summary' to trigger label accessorFn with both label and fallback id
    const nameHeaderBtn = thButtons.find((b) => b.textContent?.includes('Name / summary'));
    if (nameHeaderBtn) {
      fireEvent.click(nameHeaderBtn);
    }

    const msgCountBtn = thButtons.find((b) => b.textContent?.includes('Messages'));
    if (msgCountBtn) {
      fireEvent.click(msgCountBtn);
    }
  });

  it('verifies switching text is rendered during active session switch', async () => {
    let resolveSwitch;
    const switchPromise = new Promise((resolve) => {
      resolveSwitch = resolve;
    });
    mockApp.switchSessionOptimistic.mockReturnValue(switchPromise);

    renderPage();
    const switchButtons = screen.getAllByRole('button', { name: '⇄ Switch' });
    fireEvent.click(switchButtons[0]);

    // Button text changes to Switching…
    expect(screen.getByRole('button', { name: 'Switching…' })).toBeDefined();

    resolveSwitch();
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Switching…' })).toBeNull();
    });
  });

  it('covers non-function setSorting updater, missing label, isPlaceholder header, and null session id', async () => {
    let capturedOnSortingChange;

    // Test session with empty label and null id
    mockApp.sessionsState.sessions = [
      {
        id: null,
        label: '',
        summary: '',
        cwd: '/test',
        gitBranch: 'main',
        firstPrompt: '',
        watched: false,
        current: false,
      },
    ];

    // Spy to inject placeholder header
    const actualTable = await vi.importActual('@tanstack/react-table');
    vi.mocked(tanstackTableModule.useReactTable).mockImplementation((options) => {
      capturedOnSortingChange = options.onSortingChange;
      const inst = {
        getHeaderGroups: () => [
          {
            id: 'g1',
            headers: [
              {
                id: 'h-placeholder',
                isPlaceholder: true,
                column: {
                  id: 'placeholder',
                  columnDef: { header: 'Placeholder' },
                  getCanSort: () => false,
                  getIsSorted: () => false,
                },
                getContext: () => ({}),
              },
            ],
          },
        ],
        getRowModel: () => ({
          rows: [
            {
              id: 'r1',
              original: { current: false, id: null, label: '' },
              getVisibleCells: () => [],
            },
          ],
        }),
        getState: () => ({ pagination: { pageIndex: 0, pageSize: 50 }, sorting: [] }),
        setPageSize: vi.fn(),
        previousPage: vi.fn(),
        getCanPreviousPage: () => false,
        nextPage: vi.fn(),
        getCanNextPage: () => false,
        getPageCount: () => 1,
      };
      return inst;
    });

    const { unmount } = renderPage();
    // Test line 14: non-function updater passed to setSorting
    act(() => {
      capturedOnSortingChange([{ id: 'label', desc: true }]);
    });
    unmount();
    vi.mocked(tanstackTableModule.useReactTable).mockImplementation(actualTable.useReactTable);
  });

  it('covers missing session label and null session id with real table rendering', () => {
    mockApp.sessionsState.sessions = [
      {
        id: null,
        label: '',
        summary: '',
        cwd: '/test',
        gitBranch: 'main',
        firstPrompt: '',
        watched: false,
        current: false,
      },
    ];

    const { unmount } = renderPage();
    expect(screen.getByText('Claude sessions')).toBeDefined();
    unmount();
  });

  it('handles pagination controls and correctly slices data according to page size', () => {
    const generatedSessions = Array.from({ length: 75 }, (_, i) => ({
      id: `session-page-test-${i + 1}`,
      label: `Session Number ${i + 1}`,
      summary: `Summary ${i + 1}`,
      cwd: `/projects/p-${i + 1}`,
      gitBranch: 'main',
      firstPrompt: `Prompt ${i + 1}`,
      watched: false,
      current: i === 0,
      globalLanguage: 'en',
      globalTranslationPending: false,
      createdAt: '2026-01-01T10:00:00.000Z',
      lastActivity: '2026-01-01T12:00:00.000Z',
      messageCount: 1,
      fileSize: 100,
      taskCount: 1,
      deletedTaskCount: 0,
      translationCount: 0,
    }));
    mockApp.sessionsState.sessions = generatedSessions;

    renderPage();

    expect(screen.getByText('Showing 1 to 50 of 75 sessions')).toBeDefined();
    expect(screen.getByText('Page 1 of 2')).toBeDefined();

    const initialRows = document.querySelectorAll('tbody tr');
    expect(initialRows).toHaveLength(50);
    expect(screen.getByText('Session Number 1')).toBeDefined();
    expect(screen.getByText('Session Number 50')).toBeDefined();
    expect(screen.queryByText('Session Number 51')).toBeNull();

    const paginationContainer = document.querySelector('.sessions-pagination');
    expect(paginationContainer.classList.contains('pagination')).toBe(true);
    const paginationLeft = document.querySelector('.sessions-pagination__left');
    expect(paginationLeft.classList.contains('pagination__meta')).toBe(true);

    const searchInput = screen.getByPlaceholderText(/Search name, session id/i);
    expect(searchInput.classList.contains('input')).toBe(true);

    const refreshBtn = screen.getByRole('button', { name: '↻ Refresh discovery' });
    expect(refreshBtn.classList.contains('btn')).toBe(true);
    expect(refreshBtn.classList.contains('btn--secondary')).toBe(true);
    expect(refreshBtn.classList.contains('btn--sm')).toBe(true);

    const prevBtn = screen.getByRole('button', { name: 'Previous page' });
    const nextBtn = screen.getByRole('button', { name: 'Next page' });
    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.disabled).toBe(false);
    expect(prevBtn.classList.contains('btn')).toBe(true);
    expect(prevBtn.classList.contains('btn--secondary')).toBe(true);
    expect(prevBtn.classList.contains('btn--sm')).toBe(true);
    expect(prevBtn.classList.contains('pagination__page')).toBe(true);
    expect(nextBtn.classList.contains('pagination__page')).toBe(true);

    const sizeSelect = screen.getByRole('combobox', { name: 'Select page size' });
    expect(sizeSelect.classList.contains('select')).toBe(true);
    expect(sizeSelect.classList.contains('select--sm')).toBe(true);

    fireEvent.click(nextBtn);

    expect(screen.getByText('Showing 51 to 75 of 75 sessions')).toBeDefined();
    expect(screen.getByText('Page 2 of 2')).toBeDefined();
    const page2Rows = document.querySelectorAll('tbody tr');
    expect(page2Rows).toHaveLength(25);
    expect(screen.queryByText('Session Number 50')).toBeNull();
    expect(screen.getByText('Session Number 51')).toBeDefined();
    expect(screen.getByText('Session Number 75')).toBeDefined();

    expect(nextBtn.disabled).toBe(true);
    expect(prevBtn.disabled).toBe(false);

    fireEvent.click(prevBtn);
    expect(screen.getByText('Showing 1 to 50 of 75 sessions')).toBeDefined();
    expect(screen.getByText('Page 1 of 2')).toBeDefined();

    fireEvent.change(sizeSelect, { target: { value: '25' } });

    expect(screen.getByText('Showing 1 to 25 of 75 sessions')).toBeDefined();
    expect(screen.getByText('Page 1 of 3')).toBeDefined();
    expect(document.querySelectorAll('tbody tr')).toHaveLength(25);

    fireEvent.change(sizeSelect, { target: { value: '100' } });
    expect(screen.getByText('Showing 1 to 75 of 75 sessions')).toBeDefined();
    expect(screen.getByText('Page 1 of 1')).toBeDefined();
    expect(document.querySelectorAll('tbody tr')).toHaveLength(75);
    expect(prevBtn.disabled).toBe(true);
    expect(nextBtn.disabled).toBe(true);
  });
});
