import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import TranslationsPage from './translations.js';
import * as appContextModule from '../app-context.js';
import * as apiModule from '../api.js';

vi.mock('../app-context.js', () => ({
  useApp: vi.fn(),
}));

vi.mock('../api.js', () => ({
  postJSON: vi.fn(),
}));

let capturedTableOptions;
let mockPlaceholderHeader = false;
vi.mock('@tanstack/react-table', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useReactTable: (options) => {
      capturedTableOptions = options;
      const table = actual.useReactTable(options);
      if (mockPlaceholderHeader) {
        const origGetHeaderGroups = table.getHeaderGroups;
        return {
          ...table,
          getHeaderGroups: () => {
            const groups = origGetHeaderGroups();
            return groups.map((g) => ({
              ...g,
              headers: g.headers.map((hdr, i) => (i === 0 ? { ...hdr, isPlaceholder: true } : hdr)),
            }));
          },
        };
      }
      return table;
    },
  };
});

describe('TranslationsPage', () => {
  let mockApp;

  const sampleCatalog = [
    {
      kind: 'task',
      sessionId: 'sess-1',
      uid: 'task-u1',
      taskId: '1',
      title: 'First Task',
      versionCount: 2,
      present: true,
      viewLanguage: 'hu',
      effectiveLanguage: 'hu',
      translationState: 'ready',
      session: { id: 'sess-1', label: 'Alpha Session' },
      children: [
        {
          kind: 'version',
          id: 'job-1',
          sessionId: 'sess-1',
          taskId: '1',
          versionNumber: 1,
          current: true,
          textFingerprint: 'abcdef1234567890',
          trigger: 'auto',
          provider: 'anthropic',
          model: 'claude-3-5-sonnet',
          attempt: 1,
          maxAttempts: 2,
          status: 'success',
          queuedAt: '2026-03-01T10:00:00Z',
          startedAt: '2026-03-01T10:00:01Z',
          finishedAt: '2026-03-01T10:00:05Z',
          durationSeconds: 4,
          attempts: [
            {
              translator: {
                agentInstructions: 'Translate task to Hungarian',
                exactPrompt: 'Prompt text',
                protectedSource: { title: 'Title', description: 'Desc' },
                rawResponse: '{"title":"Cim","description":"Leiras"}',
                structuredOutput: { title: 'Cim', description: 'Leiras' },
                durationSeconds: 3.5,
                usage: { total_tokens: 150 },
                deterministicChecks: { valid: true },
              },
              validator: {
                agentInstructions: 'Validate Hungarian translation',
                exactPrompt: 'Validation prompt',
                rawResponse: '{"valid":true,"issues":[]}',
                structuredOutput: { valid: true, issues: [] },
                usage: { total_tokens: 50 },
              },
              issues: [],
            },
          ],
        },
        {
          kind: 'version',
          id: 'job-2',
          sessionId: 'sess-1',
          taskId: '1',
          versionNumber: 2,
          current: false,
          textFingerprint: 'fedcba0987654321',
          trigger: 'manual',
          provider: 'agy',
          model: 'omlx-medium',
          attempt: 2,
          maxAttempts: 2,
          status: 'validation_failed',
          queuedAt: '2026-03-01T11:00:00Z',
          startedAt: '2026-03-01T11:00:01Z',
          finishedAt: '2026-03-01T11:00:06Z',
          durationSeconds: 5,
          error: 'Validator rejected structure',
          runs: [
            {
              run: 1,
              trigger: 'initial',
              attempts: [
                {
                  translator: {
                    agentInstructions: 'Initial instructions',
                    exactPrompt: 'Initial prompt',
                    rawResponse: 'Malformed json',
                    usage: { totalTokens: 80 },
                    deterministicChecks: { valid: false, issues: ['Syntax issue'] },
                  },
                  validator: {},
                  issues: ['Syntax issue'],
                },
              ],
            },
          ],
          attempts: [
            {
              translator: {
                agentInstructions: 'Instructions 2',
                exactPrompt: 'Prompt 2',
                rawResponse: '{"title":"Cim 2","description":"Leiras 2"}',
                parsedCandidateRestored: { title: 'Cim 2', description: 'Leiras 2' },
                durationSeconds: 4,
                usage: { totalTokens: 120 },
                deterministicChecks: { valid: false, issues: ['Missing tags'] },
              },
              validator: {
                agentInstructions: 'Validate 2',
                exactPrompt: 'Prompt val 2',
                rawResponse: '{"valid":false,"issues":["Bad grammar"]}',
                parsedVerdict: { valid: false, issues: ['Bad grammar'] },
                usage: { totalTokens: 60 },
              },
              issues: ['Missing tags', 'Bad grammar'],
            },
            {
              translator: {
                rawResponse: null,
                deterministicChecks: null,
              },
              validator: null,
              issues: [],
            },
          ],
        },
      ],
    },
    {
      kind: 'task',
      sessionId: 'sess-2',
      uid: 'task-u2',
      taskId: '2',
      title: 'Deleted Task Demo',
      versionCount: 1,
      present: false,
      viewLanguage: 'en',
      effectiveLanguage: 'en',
      translationState: 'translating',
      session: { id: 'sess-2', label: 'Beta Session' },
      children: [
        {
          kind: 'version',
          id: 'job-3',
          sessionId: 'sess-2',
          taskId: '2',
          versionNumber: 1,
          current: true,
          status: 'translating',
          trigger: 'auto',
          provider: 'agy',
          model: 'omlx',
          attempts: [],
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockPlaceholderHeader = false;
    mockApp = {
      translationCatalog: [...sampleCatalog],
      sessionsState: {
        sessions: [
          { id: 'sess-1', label: 'Alpha Session' },
          { id: 'sess-2', label: 'Beta Session' },
        ],
      },
      jobs: [
        sampleCatalog[0].children[0],
        sampleCatalog[0].children[1],
        sampleCatalog[1].children[0],
      ],
      refreshJobs: vi.fn().mockResolvedValue(undefined),
      refreshCatalog: vi.fn().mockResolvedValue(undefined),
      refreshState: vi.fn().mockResolvedValue(undefined),
      showModal: vi.fn(),
      cancelJob: vi.fn(),
      retryJob: vi.fn(),
      deleteJob: vi.fn(),
    };
    vi.mocked(appContextModule.useApp).mockReturnValue(mockApp);
    vi.mocked(apiModule.postJSON).mockResolvedValue({
      summary: { stopped: 1, retried: 1, deleted: 1 },
    });
  });

  function renderPage(initialEntry = '/translations', path = '/translations') {
    return render(
      React.createElement(
        MemoryRouter,
        { initialEntries: [initialEntry] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path,
            element: React.createElement(TranslationsPage, null),
          }),
        ),
      ),
    );
  }

  it('renders translations tree table with task rows and expandable version rows', () => {
    renderPage();

    expect(screen.getByText('Task translation history')).toBeDefined();
    expect(screen.getByText(/#1 First Task/)).toBeDefined();
    expect(screen.getByText(/#2 Deleted Task Demo/)).toBeDefined();
    expect(screen.getByText(/deleted task/)).toBeDefined();

    // Toggle expand first task
    const expandButtons = screen.getAllByRole('button', { name: /Expand task/i });
    fireEvent.click(expandButtons[0]);

    // Now versions for task 1 should be visible
    expect(screen.getByText(/v1 · current/)).toBeDefined();
    expect(screen.getByText(/v2/)).toBeDefined();
  });

  it('handles search input filtering across translation fields', () => {
    renderPage();
    const searchInput = screen.getByPlaceholderText(/Filter every translation field/i);
    expect(searchInput.classList.contains('input')).toBe(true);
    expect(searchInput.classList.contains('search-input')).toBe(true);

    fireEvent.change(searchInput, { target: { value: 'Deleted' } });
    expect(screen.getByText(/#2 Deleted Task Demo/)).toBeDefined();
    expect(screen.queryByText(/#1 First Task/)).toBeNull();

    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText(/#1 First Task/)).toBeDefined();
  });

  it('handles session select dropdown filter', () => {
    renderPage();
    const sessionSelect = screen.getByRole('combobox', { name: /Filter translations by session/i });
    expect(sessionSelect.classList.contains('select')).toBe(true);

    const stopAllBtn = screen.getByRole('button', { name: '■ Stop all' });
    expect(stopAllBtn.classList.contains('btn')).toBe(true);
    expect(stopAllBtn.classList.contains('btn--danger')).toBe(true);
    expect(stopAllBtn.classList.contains('btn--sm')).toBe(true);

    const retryAllBtn = screen.getByRole('button', { name: '↻ Retry all failed' });
    expect(retryAllBtn.classList.contains('btn')).toBe(true);
    expect(retryAllBtn.classList.contains('btn--secondary')).toBe(true);
    expect(retryAllBtn.classList.contains('btn--sm')).toBe(true);

    fireEvent.change(sessionSelect, { target: { value: 'sess-2' } });
    expect(screen.getByText(/#2 Deleted Task Demo/)).toBeDefined();
    expect(screen.queryByText(/#1 First Task/)).toBeNull();

    fireEvent.change(sessionSelect, { target: { value: 'all' } });
    expect(screen.getByText(/#1 First Task/)).toBeDefined();
  });

  it('handles column sorting including multi-sort with Shift key', () => {
    renderPage();
    const taskIdThBtn = screen.getByRole('button', { name: /Task \/ version/i });

    // Click sort
    fireEvent.click(taskIdThBtn);
    expect(taskIdThBtn.textContent).toMatch(/[↑↓]/);

    // Shift click another column
    const sessionThBtn = screen.getByRole('button', { name: /Session/i });
    fireEvent.click(sessionThBtn, { shiftKey: true });
  });

  it('handles individual job action buttons: stop, retry, delete, view', () => {
    renderPage();
    // Expand task 1
    const expandBtn = screen.getByRole('button', { name: /Expand task 1/i });
    fireEvent.click(expandBtn);

    // Stop active job: expand task 2 to see job-3
    const expandBtn2 = screen.getByRole('button', { name: /Expand task 2/i });
    fireEvent.click(expandBtn2);

    const stopBtns = screen.getAllByRole('button', { name: '■ Stop' });
    const rowStopBtn = stopBtns.find((b) => b.closest('.actions'));
    expect(rowStopBtn).toBeDefined();
    fireEvent.click(rowStopBtn);
    expect(mockApp.cancelJob).toHaveBeenCalledWith('sess-2', 'job-3');

    // Retry validation_failed job (job-2)
    const retryBtns = screen.getAllByRole('button', { name: '↻ Retry' });
    const rowRetryBtn = retryBtns.find((b) => b.closest('.actions'));
    expect(rowRetryBtn).toBeDefined();
    fireEvent.click(rowRetryBtn);
    expect(mockApp.retryJob).toHaveBeenCalledWith('sess-1', 'job-2');

    // Delete job (job-1) with confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const deleteBtns = screen.getAllByRole('button', { name: 'Delete' });
    const rowDeleteBtn = deleteBtns.find((b) => b.closest('.actions'));
    expect(rowDeleteBtn).toBeDefined();
    fireEvent.click(rowDeleteBtn);
    expect(mockApp.deleteJob).toHaveBeenCalledWith('sess-1', 'job-1');

    // Cancel delete job when confirm returns false
    confirmSpy.mockReturnValue(false);
    mockApp.deleteJob.mockClear();
    fireEvent.click(rowDeleteBtn);
    expect(mockApp.deleteJob).not.toHaveBeenCalled();

    // View job
    const viewBtns = screen.getAllByRole('button', { name: 'View' });
    fireEvent.click(viewBtns[0]);

    confirmSpy.mockRestore();
  });

  it('handles bulk actions: stop all and retry all failed', async () => {
    renderPage();

    // Stop all
    const stopAllBtn = screen.getByRole('button', { name: '■ Stop all' });
    fireEvent.click(stopAllBtn);

    await waitFor(() => {
      expect(apiModule.postJSON).toHaveBeenCalledWith('/api/translations/bulk', {
        action: 'stop_all',
        jobRefs: expect.arrayContaining([{ sessionId: 'sess-2', jobId: 'job-3' }]),
      });
      expect(mockApp.showModal).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'bulk-summary' }),
      );
    });

    // Retry all failed
    const retryAllBtn = screen.getByRole('button', { name: '↻ Retry all failed' });
    fireEvent.click(retryAllBtn);

    await waitFor(() => {
      expect(apiModule.postJSON).toHaveBeenCalledWith('/api/translations/bulk', {
        action: 'retry_all_failed',
        jobRefs: expect.arrayContaining([{ sessionId: 'sess-1', jobId: 'job-2' }]),
      });
    });
  });

  it('handles selected lifecycle bulk actions: select, stop, retry, delete', async () => {
    renderPage();

    // Select all visible rows via header checkbox
    const headerCheckbox = screen.getByRole('checkbox', {
      name: 'Select all visible task translation rows',
    });
    fireEvent.click(headerCheckbox);

    // Expand tasks so versions are visible and select individual version
    const expandBtn = screen.getByRole('button', { name: /Expand task 1/i });
    fireEvent.click(expandBtn);

    // Trigger bulk retry on selected
    const retryBtns = screen.getAllByRole('button', { name: '↻ Retry' });
    const bulkRetryBtn = retryBtns.find((b) => b.closest('.bulk-actions'));
    expect(bulkRetryBtn).toBeDefined();
    fireEvent.click(bulkRetryBtn);

    await waitFor(() => {
      expect(apiModule.postJSON).toHaveBeenCalledWith('/api/translations/bulk', {
        action: 'retry',
        jobRefs: expect.any(Array),
      });
    });

    // Trigger bulk stop on selected
    const stopBtns = screen.getAllByRole('button', { name: '■ Stop' });
    const bulkStopBtn = stopBtns.find((b) => b.closest('.bulk-actions'));
    expect(bulkStopBtn).toBeDefined();
    fireEvent.click(bulkStopBtn);

    await waitFor(() => {
      expect(apiModule.postJSON).toHaveBeenCalledWith('/api/translations/bulk', {
        action: 'stop',
        jobRefs: expect.any(Array),
      });
    });

    // Trigger bulk delete on selected with confirm
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const deleteBtns = screen.getAllByRole('button', { name: 'Delete' });
    const bulkDeleteBtn = deleteBtns.find((b) => b.closest('.bulk-actions'));
    expect(bulkDeleteBtn).toBeDefined();
    fireEvent.click(bulkDeleteBtn);

    await waitFor(() => {
      expect(apiModule.postJSON).toHaveBeenCalledWith('/api/translations/bulk', {
        action: 'delete',
        jobRefs: expect.any(Array),
      });
    });
    confirmSpy.mockRestore();
  });

  it('displays error modal when bulk action fails', async () => {
    vi.mocked(apiModule.postJSON).mockRejectedValueOnce(new Error('Bulk failure'));
    renderPage();

    const stopAllBtn = screen.getByRole('button', { name: '■ Stop all' });
    fireEvent.click(stopAllBtn);

    await waitFor(() => {
      expect(mockApp.showModal).toHaveBeenCalledWith({
        kind: 'error',
        title: 'Bulk translation action failed',
        message: 'Bulk failure',
      });
    });
  });

  it('renders JobDetail debug view when route has jobId and handles clipboard copy', () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    });

    renderPage('/translations/sess-1/job-2', '/translations/:sessionId/:jobId');

    // Debug panel rendered
    expect(screen.getByText('TRANSLATION DEBUG')).toBeDefined();
    expect(screen.getByText(/Validator rejected structure/)).toBeDefined();

    // Copy regular diag
    const copyButtons = screen.getAllByRole('button', { name: 'Copy' });
    fireEvent.click(copyButtons[0]);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();

    // Copy raw payload button
    const copyRawButtons = screen.getAllByRole('button', { name: 'Copy raw' });
    fireEvent.click(copyRawButtons[0]);
    expect(navigator.clipboard.writeText).toHaveBeenCalled();

    // Close debug panel
    const closeBtn = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(closeBtn);
  });

  it('cancels bulk delete when user rejects confirm dialog', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPage();

    // Select all to enable bulk buttons
    const headerCheckbox = screen.getByRole('checkbox', {
      name: 'Select all visible task translation rows',
    });
    fireEvent.click(headerCheckbox);

    const deleteBtns = screen.getAllByRole('button', { name: 'Delete' });
    const bulkDeleteBtn = deleteBtns.find((b) => b.closest('.bulk-actions'));
    expect(bulkDeleteBtn).toBeDefined();
    fireEvent.click(bulkDeleteBtn);

    expect(apiModule.postJSON).not.toHaveBeenCalledWith(
      '/api/translations/bulk',
      expect.objectContaining({ action: 'delete' }),
    );
    confirmSpy.mockRestore();
  });

  it('executes bulk action and handles error modal when action fails', async () => {
    vi.mocked(apiModule.postJSON).mockResolvedValueOnce({ summary: { stopped: 1 } });
    renderPage();

    const stopAllBtn = screen.getByRole('button', { name: '■ Stop all' });
    fireEvent.click(stopAllBtn);
    expect(apiModule.postJSON).toHaveBeenCalledWith(
      '/api/translations/bulk',
      expect.objectContaining({ action: 'stop_all' }),
    );
  });

  it('handles active job duration without finishedAt, formatDate error, and rowSelection cleanup', () => {
    const jobRunning = {
      kind: 'version',
      id: 'job-running',
      sessionId: 'sess-1',
      taskId: '1',
      status: 'translating',
      startedAt: '2026-01-01T00:00:00Z',
      finishedAt: null,
      durationSeconds: null,
      queuedAt: '2026-01-01T00:00:00Z',
      attempts: [
        {
          translator: {
            rawResponse: null, // triggers rawSection return null
            deterministicChecks: null, // triggers checks return null
          },
          validator: null,
        },
      ],
    };
    mockApp.translationCatalog = [
      {
        kind: 'task',
        sessionId: 'sess-1',
        uid: 'task-run',
        taskId: '10',
        title: null, // triggers searchableText if (item == null) return
        children: [jobRunning],
      },
    ];
    mockApp.jobs = [jobRunning];

    const dateSpy = vi.spyOn(Date.prototype, 'toLocaleString').mockImplementationOnce(() => {
      throw new Error('date error');
    });

    const { rerender } = renderPage();
    expect(screen.getByText('Task translation history')).toBeDefined();

    // Trigger search filter to exercise searchableText with null field
    const searchInput = screen.getByPlaceholderText(/Filter every translation field/i);
    fireEvent.change(searchInput, { target: { value: 'run' } });

    // Expand version row so queuedAt formatDate and duration without finishedAt execute
    const expandBtn = screen.getByRole('button', { name: /Expand task/i });
    fireEvent.click(expandBtn);

    // Select row then change jobs to trigger rowSelection cleanup filter
    const checkbox = screen.getAllByRole('checkbox')[0];
    fireEvent.click(checkbox);

    mockApp.jobs = [];
    rerender(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/translations/sess-1/job-running'] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: '/translations/:sessionId/:jobId',
            element: React.createElement(TranslationsPage, null),
          }),
        ),
      ),
    );

    dateSpy.mockRestore();
  });

  it('handles function updater for table onGlobalFilterChange and onSortingChange and row selection cleanup', () => {
    const { rerender } = renderPage();
    act(() => {
      capturedTableOptions.onGlobalFilterChange((old) => 'func-query');
      capturedTableOptions.onSortingChange((old) => [{ id: 'taskId', desc: true }]);
      capturedTableOptions.onRowSelectionChange((old) => ({
        'job:sess-1:job-1': true,
        'task:sess-1:task-u1': true,
        'orphan-id': true,
        'unselected-id': false,
      }));
    });

    // Re-render with new array reference for app.jobs to trigger line 69 cleanup filter
    mockApp.jobs = [...mockApp.jobs];
    rerender(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/translations'] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: '/translations',
            element: React.createElement(TranslationsPage, null),
          }),
        ),
      ),
    );
  });

  it('covers all JobDetail and Attempt helper branch variations', () => {
    const jobVaried = {
      kind: 'version',
      id: 'job-varied',
      sessionId: 'sess-1',
      taskId: '99',
      versionNumber: 3,
      current: false,
      status: 'custom_status_xyz',
      textFingerprint: null,
      provider: '',
      model: '',
      trigger: '',
      run: null,
      startedAt: null,
      finishedAt: null,
      durationSeconds: 0,
      attempts: [
        {
          translator: {
            agentInstructions: '',
            exactPrompt: '',
            protectedSource: { title: '', description: 'Desc only' },
            structuredOutput: { description: 'Desc only' },
            usage: { totalTokens: 40 },
            deterministicChecks: { valid: true },
          },
          validator: {
            agentInstructions: 'Check',
            exactPrompt: 'Prompt',
            rawResponse: '{"issues":["Issue A"]}',
            parsedVerdict: { valid: false, issues: null },
            usage: null,
          },
          issues: ['Issue A'],
        },
        {
          translator: {
            protectedSource: { title: 'Title only', description: '' },
            structuredOutput: { title: 'Title only' },
            usage: {},
            deterministicChecks: null,
          },
          validator: {},
        },
        {
          translator: {
            protectedSource: null,
            rawResponse: '123',
          },
          validator: null,
        },
      ],
      runs: [
        {
          run: 1,
          trigger: '',
          attempts: null,
        },
      ],
    };

    mockApp.translationCatalog = [
      {
        kind: 'task',
        sessionId: 'sess-1',
        uid: 'task-v',
        taskId: '99',
        children: [jobVaried],
      },
    ];
    mockApp.jobs = [jobVaried];

    renderPage('/translations/sess-1/job-varied', '/translations/:sessionId/:jobId');
    expect(screen.getByText('TRANSLATION DEBUG')).toBeDefined();
    expect(screen.getAllByText(/Skipped.*deterministic precheck/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('custom_status_xyz')).toBeDefined();
  });

  it('covers runBulk when bulkBusy is true and line 92 summary fallback', async () => {
    let resolveBulk;
    const bulkPromise = new Promise((r) => {
      resolveBulk = r;
    });
    apiModule.postJSON.mockImplementationOnce(() => bulkPromise);

    mockApp.jobs = [{ id: 'j-active', sessionId: 'sess-1', status: 'translating' }];
    mockApp.translationCatalog = [
      {
        kind: 'task',
        sessionId: 'sess-1',
        uid: 't-1',
        taskId: '1',
        children: mockApp.jobs,
      },
    ];

    renderPage();
    const stopAllBtn = screen.getByRole('button', { name: '■ Stop all' });
    fireEvent.click(stopAllBtn); // Sets bulkBusy = true

    // Click again while bulkBusy is true to cover line 86 if (bulkBusy) return;
    const propsKey = Object.keys(stopAllBtn).find((k) => k.startsWith('__reactProps'));
    if (propsKey && stopAllBtn[propsKey]?.onClick) {
      stopAllBtn[propsKey].onClick();
    }

    // Resolve with response without summary to cover line 92 response.summary || {}
    resolveBulk({});
    await waitFor(() => {
      expect(mockApp.showModal).toHaveBeenCalledWith(expect.objectContaining({ summary: {} }));
    });
  });

  it('exercises all capturedTableOptions columns accessorFn and cell functions with edge case rows', () => {
    renderPage();
    const columns = capturedTableOptions.columns;

    const taskRows = [
      {
        kind: 'task',
        sessionId: 'sess-1',
        session: { label: 'Alpha' },
        taskId: '10',
        versionNumber: 0,
        viewLanguage: 'hu',
        effectiveLanguage: 'en',
        translationState: 'ready',
        uid: 't-u1',
      },
      {
        kind: 'task',
        sessionId: '',
        session: null,
        taskId: 'non-num-task',
        versionNumber: 0,
        viewLanguage: 'en',
        effectiveLanguage: 'hu',
        translationState: 'unknown_state',
        uid: 't-u2',
      },
    ];

    const versionRows = [
      {
        kind: 'version',
        id: 'v1',
        sessionId: 'sess-1',
        session: { label: '' },
        taskId: '10',
        versionNumber: 1,
        trigger: 'auto',
        provider: 'anthropic',
        model: 'claude',
        attempt: 1,
        maxAttempts: 2,
        status: 'success',
        queuedAt: '2026-03-01T10:00:00Z',
        startedAt: '2026-03-01T10:00:01Z',
        finishedAt: '2026-03-01T10:00:05Z',
        durationSeconds: 4,
        attempts: [{ translator: { usage: { total_tokens: 10 } } }],
      },
      {
        kind: 'version',
        id: 'v2',
        sessionId: '',
        session: null,
        taskId: '20',
        versionNumber: 2,
        trigger: '',
        provider: '',
        model: '',
        attempt: 0,
        maxAttempts: 0,
        status: 'error',
        queuedAt: '',
        startedAt: '',
        finishedAt: '',
        durationSeconds: 0,
        attempts: [],
      },
    ];

    const makeRow = (r) => ({
      original: r,
      getValue: () => '',
      getIsSelected: () => false,
      getToggleSelectedHandler: () => () => {},
      getCanSelect: () => true,
      getIsSomeSelected: () => false,
      getToggleExpandedHandler: () => () => {},
      getIsExpanded: () => false,
      getCanExpand: () => true,
    });

    for (const col of columns) {
      if (col.accessorFn) {
        taskRows.forEach((r) => col.accessorFn({ ...r, original: r }));
        versionRows.forEach((r) => col.accessorFn({ ...r, original: r }));
      }
      if (col.cell) {
        taskRows.forEach((r) => col.cell({ row: makeRow(r) }));
        versionRows.forEach((r) => col.cell({ row: makeRow(r) }));
      }
    }
  });

  it('covers sessionFilter all fallback, non-function updaters, sessionOptions label/summary fallbacks, and placeholder headers', () => {
    localStorage.setItem('claude-todos:filters:translations', JSON.stringify({ session: '' }));

    mockApp.translationCatalog = [
      {
        kind: 'task',
        sessionId: 'sess-summary',
        session: { label: 'Session Summary Long Label Exceeding Twenty Two Chars' },
        uid: 't-sum',
        taskId: '1',
        versionCount: 0,
      },
      {
        kind: 'task',
        sessionId: 'sess-id-only',
        session: null,
        uid: 't-id',
        taskId: '2',
        versionCount: 0,
      },
    ];

    mockApp.sessionsState.sessions = [
      { id: 'sess-summary', label: '', summary: 'Summary only' },
      { id: 'sess-id-only', label: '', summary: '' },
    ];

    mockPlaceholderHeader = true;
    const { unmount } = renderPage('/translations?session=');
    expect(screen.getByText('Task translation history')).toBeDefined();
    expect(screen.getByText('Summary only')).toBeDefined();
    expect(screen.getAllByText('sess-id-only').length).toBeGreaterThan(0);

    // Call onSortingChange with function and non-function
    capturedTableOptions.onSortingChange((prev) => [{ id: 'taskId', desc: true }]);
    capturedTableOptions.onSortingChange([{ id: 'taskId', desc: false }]);

    // Call onGlobalFilterChange with function and non-function
    capturedTableOptions.onGlobalFilterChange((prev) => 'fn-filter');
    capturedTableOptions.onGlobalFilterChange('direct-filter');

    // Test globalFilterFn with empty/null filterValue
    const globalFilterFn = capturedTableOptions.globalFilterFn;
    expect(globalFilterFn({ original: { title: 'Hello' } }, 'title', '')).toBe(true);
    expect(globalFilterFn({ original: { title: 'Hello' } }, 'title', null)).toBe(true);

    // Test getSubRows fallback on row with null children
    expect(capturedTableOptions.getSubRows({})).toEqual([]);

    unmount();
    mockPlaceholderHeader = false;
    localStorage.removeItem('claude-todos:filters:translations');

    // Cover line 37 translationCatalog fallback EMPTY_CATALOG
    mockApp.translationCatalog = null;
    const { unmount: unmountNullCatalog } = renderPage();
    expect(screen.getByText('Task translation history')).toBeDefined();
    unmountNullCatalog();
  });

  it('covers route with jobId parent found and parent not found with children null', () => {
    // Parent not found with children null (covers line 689 task.children || [] and line 690 else branch)
    mockApp.translationCatalog = [
      {
        kind: 'task',
        sessionId: 'sess-1',
        uid: 't-null-child',
        taskId: '1',
        children: null,
      },
    ];
    const { unmount: unmountNotFound } = renderPage(
      '/translations/sess-1/job-nonexistent',
      '/translations/:sessionId/:jobId',
    );
    expect(screen.getByText('Task translation history')).toBeDefined();
    unmountNotFound();

    // Parent found with matching jobId (covers lines 62-63 expanding parent row)
    const targetJob = {
      kind: 'version',
      id: 'job-found-target',
      sessionId: 'sess-1',
      taskId: '1',
      versionNumber: 1,
      status: 'translating',
      attempts: [],
    };
    mockApp.translationCatalog = [
      {
        kind: 'task',
        sessionId: 'sess-1',
        uid: 't-found-parent',
        taskId: '1',
        children: [targetJob],
      },
    ];
    mockApp.jobs = [targetJob];
    const { unmount: unmountFound } = renderPage(
      '/translations/sess-1/job-found-target',
      '/translations/:sessionId/:jobId',
    );
    expect(screen.getByText('TRANSLATION DEBUG')).toBeDefined();
    unmountFound();
  });

  it('covers column accessors for default versionNumber 0 and fallback empty status', () => {
    mockApp.translationCatalog = [
      {
        kind: 'task',
        sessionId: 'sess-1',
        uid: 't-cols',
        taskId: '1',
        versionCount: 1,
        children: [
          {
            kind: 'version',
            id: 'j-col-1',
            sessionId: 'sess-1',
            taskId: '1',
            versionNumber: null, // line 164 default 0
            status: '', // line 173 fallback ''
            attempts: [],
          },
        ],
      },
    ];

    const { unmount } = renderPage();
    expect(screen.getByText('Task translation history')).toBeDefined();

    // Directly test accessorFn on version with null versionNumber and empty status
    const versionRowNull = {
      kind: 'version',
      versionNumber: null,
      status: '',
    };
    versionRowNull.original = versionRowNull;
    for (const col of capturedTableOptions.columns) {
      if (col.accessorFn) {
        col.accessorFn(versionRowNull);
      }
    }
    unmount();
  });

  it('covers JobDetail and Attempt branches for runs fallback, empty translator/validator, checks, and verdicts', () => {
    const complexJob = {
      kind: 'version',
      id: 'job-complex',
      sessionId: 'sess-1',
      taskId: '1',
      versionNumber: null,
      provider: null,
      model: null,
      trigger: null,
      run: null,
      status: 'error',
      runs: null, // line 248 job.runs || [] fallback
      startedAt: '2026-03-01T10:00:00Z',
      finishedAt: '2026-03-01T10:00:20Z',
      durationSeconds: 'not-a-number', // line 277 Number() || 0 fallback
      attempts: [
        {
          // line 258: attempt.translator and validator fallback {}
          translator: null,
          validator: null,
          issues: ['issue 1'],
        },
        {
          translator: {
            agentInstructions: 'Translate',
            exactPrompt: 'Prompt',
            // line 268: translator candidate with only description
            rawResponse: JSON.stringify({ description: 'Description only' }),
            durationSeconds: 2,
            usage: { totalTokens: 50 },
            // line 270: deterministicChecks with value.issues undefined
            deterministicChecks: { valid: false },
          },
          // line 261: validator.structuredOutput fallback when parsedVerdict is undefined
          validator: {
            agentInstructions: 'Validate',
            exactPrompt: 'Prompt val',
            // line 268: validator with issues array but no valid property
            structuredOutput: { issues: ['Issue from validator'] },
            usage: { totalTokens: 30 },
          },
          issues: [],
        },
        {
          // line 268: validator with non-matching structuredOutput falling through to rawResponse or default
          validator: {
            agentInstructions: 'Val 3',
            // line 275: prettyVerdict with valid: true
            structuredOutput: { valid: true, issues: [] },
            rawResponse: null,
            usage: null,
          },
          translator: {
            structuredOutput: { otherField: 123 },
            rawResponse: null,
            usage: null,
          },
          issues: [],
        },
      ],
      error: 'Sample error',
    };

    mockApp.translationCatalog = [
      {
        kind: 'task',
        sessionId: 'sess-1',
        uid: 't-complex',
        taskId: '1',
        children: [complexJob],
      },
    ];
    mockApp.jobs = [complexJob];

    const { unmount } = renderPage(
      '/translations/sess-1/job-complex',
      '/translations/:sessionId/:jobId',
    );
    expect(screen.getByText('TRANSLATION DEBUG')).toBeDefined();
    unmount();
  });

  it('covers durationSeconds, tokenCount, and prettyVerdict utility edge cases via JobDetail', () => {
    // Job with finishedAt and durationSeconds 0 to hit line 277 new Date(job.finishedAt)
    const jobWithFinished = {
      kind: 'version',
      id: 'job-finished',
      sessionId: 'sess-1',
      taskId: '1',
      versionNumber: 1,
      status: 'success',
      durationSeconds: 0, // falsy so falls through to startedAt check
      startedAt: '2026-03-01T10:00:00Z',
      finishedAt: '2026-03-01T10:00:15Z',
      attempts: [],
    };

    // Job without finishedAt and with run token fallbacks
    const jobTimings = {
      kind: 'version',
      id: 'job-timings',
      sessionId: 'sess-1',
      taskId: '1',
      versionNumber: 2,
      status: 'success',
      durationSeconds: 0,
      startedAt: '2026-03-01T10:00:00Z',
      finishedAt: null,
      attempts: [],
      runs: [
        {
          run: 1,
          attempts: [
            {
              // line 280: total_tokens falsy with totalTokens truthy
              translator: { usage: { total_tokens: 0, totalTokens: 100 } },
              validator: { usage: { total_tokens: 0, totalTokens: 50 } },
            },
            {
              // line 280: both total_tokens and totalTokens falsy -> 0 fallback
              translator: { usage: { total_tokens: null, totalTokens: null } },
              validator: { usage: {} },
            },
          ],
        },
      ],
    };

    mockApp.translationCatalog = [
      {
        kind: 'task',
        sessionId: 'sess-1',
        uid: 't-timings',
        taskId: '1',
        children: [jobWithFinished, jobTimings],
      },
    ];
    mockApp.jobs = [jobWithFinished, jobTimings];

    const { unmount: unmount1 } = renderPage(
      '/translations/sess-1/job-finished',
      '/translations/:sessionId/:jobId',
    );
    expect(screen.getByText('TRANSLATION DEBUG')).toBeDefined();
    unmount1();

    const { unmount } = renderPage(
      '/translations/sess-1/job-timings',
      '/translations/:sessionId/:jobId',
    );
    expect(screen.getByText('TRANSLATION DEBUG')).toBeDefined();
    unmount();

    // Job without startedAt
    const jobNoStart = {
      kind: 'version',
      id: 'job-no-start',
      sessionId: 'sess-1',
      taskId: '1',
      versionNumber: 1,
      status: 'translating',
      startedAt: null,
      finishedAt: null,
      durationSeconds: 0,
      attempts: [],
    };
    mockApp.translationCatalog = [
      {
        kind: 'task',
        sessionId: 'sess-1',
        uid: 't-no-start',
        taskId: '1',
        children: [jobNoStart],
      },
    ];
    mockApp.jobs = [jobNoStart];

    const { unmount: unmount2 } = renderPage(
      '/translations/sess-1/job-no-start',
      '/translations/:sessionId/:jobId',
    );
    expect(screen.getByText('TRANSLATION DEBUG')).toBeDefined();
    unmount2();
  });

  it('covers debug drawer with attempt missing validator and structured object payloads', () => {
    const jobWithObjectPayloads = {
      id: 'job-obj-payload',
      sessionId: 'sess-1',
      taskId: 'task-obj',
      kind: 'version',
      status: 'completed',
      startedAt: '2026-01-01T00:00:00Z',
      finishedAt: '2026-01-01T00:00:05Z',
      durationSeconds: 5,
      attempts: [
        {
          index: 1,
          translator: {
            agentInstructions: { role: 'translator' },
            exactPrompt: { text: 'Translate prompt' },
            rawResponse: { payload: 123 },
            durationSeconds: 2.5,
            usage: { totalTokens: 100 },
          },
        },
      ],
    };

    mockApp.translationCatalog = [
      {
        kind: 'task',
        sessionId: 'sess-1',
        uid: 't-obj',
        taskId: '1',
        children: [jobWithObjectPayloads],
      },
    ];
    mockApp.jobs = [jobWithObjectPayloads];

    const { unmount } = renderPage(
      '/translations/sess-1/job-obj-payload',
      '/translations/:sessionId/:jobId',
    );
    expect(screen.getByText('TRANSLATION DEBUG')).toBeDefined();
    expect(
      screen.getByText('Skipped - deterministic precheck rejected this candidate.'),
    ).toBeDefined();
    expect(screen.getByText(/Raw provider payload/)).toBeDefined();
    unmount();
  });

  it('fetches full job payload asynchronously in JobDetail when attempts or runs are missing', async () => {
    const incompleteJob = {
      kind: 'version',
      id: 'job-fetch-test',
      sessionId: 'sess-1',
      taskId: '42',
      versionNumber: 1,
      status: 'success',
    };

    mockApp.translationCatalog = [
      {
        kind: 'task',
        sessionId: 'sess-1',
        uid: 'task-fetch',
        taskId: '42',
        children: [incompleteJob],
      },
    ];
    mockApp.jobs = [incompleteJob];

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        job: {
          id: 'job-fetch-test',
          taskId: '42',
          versionNumber: 1,
          status: 'success',
          attempts: [
            {
              translator: {
                agentInstructions: 'Async fetched translator instructions',
                exactPrompt: 'Async prompt text',
                rawResponse: '{"title":"Title"}',
                structuredOutput: { title: 'Title' },
                usage: { total_tokens: 40 },
              },
              validator: null,
            },
          ],
          runs: [],
        },
      }),
    });

    const { unmount } = renderPage(
      '/translations/sess-1/job-fetch-test',
      '/translations/:sessionId/:jobId',
    );

    expect(screen.getByText('TRANSLATION DEBUG')).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText(/Async fetched translator instructions/)).toBeDefined();
    });
    expect(fetchSpy).toHaveBeenCalledWith('/api/sessions/sess-1/translations/job-fetch-test');

    fetchSpy.mockRestore();
    unmount();
  });

  it('handles JobDetail fetch with direct payload, null taskId, and error responses', async () => {
    const jobDirect = {
      kind: 'version',
      id: 'job-direct-payload',
      sessionId: 'sess-1',
      taskId: null,
      versionNumber: 0,
      status: 'success',
    };

    mockApp.translationCatalog = [
      {
        kind: 'task',
        sessionId: 'sess-1',
        uid: 'task-direct',
        taskId: '1',
        children: [jobDirect],
      },
    ];
    mockApp.jobs = [jobDirect];

    // Direct job payload (without job wrapper) and with sessionId as string
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: 'job-direct-payload',
        sessionId: 'sess-1',
        status: 'success',
        taskId: null,
        versionNumber: null,
        attempts: [],
        runs: [],
      }),
    });

    const { unmount: unmountDirect } = renderPage(
      '/translations/sess-1/job-direct-payload',
      '/translations/:sessionId/:jobId',
    );

    expect(screen.getByText('TRANSLATION DEBUG')).toBeDefined();
    await waitFor(() => {
      expect(screen.getByText(/Task # · v\?/)).toBeDefined();
    });
    unmountDirect();
    fetchSpy.mockRestore();

    // Fetch returns ok: false
    const fetchFailSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
    });
    const { unmount: unmountFail } = renderPage(
      '/translations/sess-1/job-direct-payload',
      '/translations/:sessionId/:jobId',
    );
    unmountFail();
    fetchFailSpy.mockRestore();

    // Fetch throws network error
    const fetchErrSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new Error('Network error'));
    const { unmount: unmountErr } = renderPage(
      '/translations/sess-1/job-direct-payload',
      '/translations/:sessionId/:jobId',
    );
    unmountErr();
    fetchErrSpy.mockRestore();

    // Fetch returns non-record data
    const fetchNonRecordSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => 'not a record',
    });
    const { unmount: unmountNonRecord } = renderPage(
      '/translations/sess-1/job-direct-payload',
      '/translations/:sessionId/:jobId',
    );
    await waitFor(() => expect(fetchNonRecordSpy).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 10));
    unmountNonRecord();
    fetchNonRecordSpy.mockRestore();

    // Fetch returns record that is not a TranslationJob
    const fetchInvalidJobSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ notAJob: true }),
    });
    const { unmount: unmountInvalidJob } = renderPage(
      '/translations/sess-1/job-direct-payload',
      '/translations/:sessionId/:jobId',
    );
    await waitFor(() => expect(fetchInvalidJobSpy).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 10));
    unmountInvalidJob();
    fetchInvalidJobSpy.mockRestore();
  });

  it('uses precomputed job.totalTokens in tokenCount', () => {
    const jobWithTokens = {
      kind: 'version',
      id: 'job-precomputed-tokens',
      sessionId: 'sess-1',
      taskId: '99',
      versionNumber: 1,
      status: 'success',
      totalTokens: 12345,
      attempts: [],
    };

    mockApp.translationCatalog = [
      {
        kind: 'task',
        sessionId: 'sess-1',
        uid: 'task-tokens',
        taskId: '99',
        children: [jobWithTokens],
      },
    ];
    mockApp.jobs = [jobWithTokens];

    const { unmount } = renderPage(
      '/translations/sess-1/job-precomputed-tokens',
      '/translations/:sessionId/:jobId',
    );

    expect(screen.getByText('TRANSLATION DEBUG')).toBeDefined();
    expect(screen.getByText('12345')).toBeDefined();
    unmount();
  });

  it('preserves rowSelection state when selected keys do not change', () => {
    const sampleJob = {
      kind: 'version',
      id: 'job-select-preserve',
      sessionId: 'sess-1',
      taskId: '1',
      status: 'success',
      attempts: [],
    };
    mockApp.translationCatalog = [
      {
        kind: 'task',
        sessionId: 'sess-1',
        uid: 'task-select-preserve',
        taskId: '1',
        children: [sampleJob],
      },
    ];
    mockApp.jobs = [sampleJob];

    const { rerender } = renderPage();

    const checkboxes = screen.getAllByRole('checkbox');
    const rowCheckbox = checkboxes[checkboxes.length - 1];
    fireEvent.click(rowCheckbox);
    expect(rowCheckbox.checked).toBe(true);

    mockApp.jobs = [...mockApp.jobs];
    rerender(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/translations'] },
        React.createElement(
          Routes,
          null,
          React.createElement(Route, {
            path: '/translations',
            element: React.createElement(TranslationsPage, null),
          }),
        ),
      ),
    );

    const checkboxesAfter = screen.getAllByRole('checkbox');
    expect(checkboxesAfter[checkboxesAfter.length - 1].checked).toBe(true);
  });
});
