import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import SessionsPage, { SessionLanguageControl } from './sessions.js';
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
      watched: true,
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
    localStorage.clear();
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

  it('renders table headers, pinned top rows, and center rows with badges and stars', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'Claude sessions' })).toBeDefined();
    expect(screen.getByRole('heading', { level: 2, name: 'Workspaces' })).toBeDefined();
    expect(screen.getByText('Alpha Session')).toBeDefined();
    expect(screen.getByText('Summary of Alpha')).toBeDefined();
    expect(screen.getByText('Beta Session')).toBeDefined();
    expect(screen.getByText('Gamma Session')).toBeDefined();

    // Current session badge
    expect(document.querySelector('.badge.badge--success')?.textContent).toBe('Current');

    // Automatic pinned rows: Alpha (current) and Beta (watched)
    const pinnedRows = document.querySelectorAll('.data-table__body--pinned [role="row"]');
    expect(pinnedRows.length).toBe(2);
    expect(pinnedRows[0].classList.contains('data-table__row--pinned')).toBe(true);

    // Verify NO manual pin buttons exist anywhere
    expect(document.querySelector('.pin-btn')).toBeNull();

    // Watch buttons: Alpha (current) disabled with title, Beta (watched) with star, Gamma (unwatched) with empty star
    const watchBtns = document.querySelectorAll('.watch-btn');
    expect(watchBtns.length).toBeGreaterThan(0);
    const alphaWatch = document.querySelector(
      '.current-session-row button[title="Current session is always watched"]',
    );
    expect(alphaWatch).not.toBeNull();
    expect(alphaWatch.disabled).toBe(true);

    // Switch button for non-current sessions
    const switchBtns = document.querySelectorAll('.switch-session-btn');
    expect(switchBtns.length).toBeGreaterThan(0);
    expect(switchBtns[0].textContent).toContain('Switch');

    // Column headers
    const headers = screen.getAllByRole('columnheader');
    expect(headers).toHaveLength(15);
  });

  it('toggles session watch state on non-current session and stops click propagation', () => {
    renderPage();

    // Beta session is watched: click watch button to unwatch
    const betaWatchBtn = screen.getByTitle('Watched (pinned to top)');
    expect(betaWatchBtn.textContent).toContain('★');
    fireEvent.click(betaWatchBtn);
    expect(mockApp.setSessionWatched).toHaveBeenCalledWith('session-beta-short', false);

    // Unwatched session: click watch button to watch
    const unwatchedWatchBtns = screen.getAllByTitle('Watch session (pin to top)');
    expect(unwatchedWatchBtns[0].textContent).toContain('☆');
    fireEvent.click(unwatchedWatchBtns[0]);
    expect(mockApp.setSessionWatched).toHaveBeenCalledWith('session-no-label', true);

    // Current session watch button is disabled and cannot be toggled
    const currentWatchBtn = screen.getByTitle('Current session is always watched');
    expect(currentWatchBtn.disabled).toBe(true);
    fireEvent.click(currentWatchBtn);
    expect(mockApp.switchSessionOptimistic).not.toHaveBeenCalled();
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

    // Verify optimistic update and disabled state
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

  it('handles row clicks and keyboard events to switch session with interactive child guards', async () => {
    renderPage();
    const currentRow = document.querySelector('.current-session-row');
    const nonCurrentRow = document.querySelector(
      '.data-table__body [role="row"]:not(.current-session-row)',
    );

    expect(currentRow).not.toBeNull();
    expect(nonCurrentRow).not.toBeNull();

    // Clicking current session row does not switch
    fireEvent.click(currentRow);
    expect(mockApp.switchSessionOptimistic).not.toHaveBeenCalled();

    // Keydown on current session row does not switch
    fireEvent.keyDown(currentRow, { key: 'Enter' });
    expect(mockApp.switchSessionOptimistic).not.toHaveBeenCalled();

    // Keydown on interactive element inside non-current row (e.g. switch button) is ignored
    const innerBtn = nonCurrentRow.querySelector('button');
    expect(innerBtn).not.toBeNull();
    fireEvent.keyDown(innerBtn, { key: 'Enter' });
    expect(mockApp.switchSessionOptimistic).not.toHaveBeenCalled();

    // Non-Enter/Space key on non-current row does not switch
    fireEvent.keyDown(nonCurrentRow, { key: 'ArrowDown' });
    expect(mockApp.switchSessionOptimistic).not.toHaveBeenCalled();

    // Keydown Space on non-current row triggers switchCurrent
    await act(async () => {
      fireEvent.keyDown(nonCurrentRow, { key: ' ' });
    });
    expect(mockApp.switchSessionOptimistic).toHaveBeenCalledTimes(1);

    mockApp.switchSessionOptimistic.mockClear();

    // Keydown Enter on non-current row triggers switchCurrent
    await act(async () => {
      fireEvent.keyDown(nonCurrentRow, { key: 'Enter' });
    });
    expect(mockApp.switchSessionOptimistic).toHaveBeenCalledTimes(1);

    mockApp.switchSessionOptimistic.mockClear();

    // Clicking non-current row triggers switchCurrent
    await act(async () => {
      fireEvent.click(nonCurrentRow);
    });
    expect(mockApp.switchSessionOptimistic).toHaveBeenCalledTimes(1);
  });

  it('handles global search filter, verifies filtered rows, clear button, and localStorage persistence', () => {
    mockApp.sessionsState.sessions = sampleSessions.map((s) => ({
      ...s,
      current: false,
      watched: false,
    }));
    renderPage();
    const searchInput = screen.getByPlaceholderText(/Search name, session id/i);

    // Filter by branch
    fireEvent.change(searchInput, { target: { value: 'develop' } });
    expect(screen.getByText('Beta Session')).toBeDefined();
    expect(screen.queryByText('Alpha Session')).toBeNull();
    expect(localStorage.getItem('sessions-global-filter')).toBe('develop');

    // Filter by prompt
    fireEvent.change(searchInput, { target: { value: 'alpha feature' } });
    expect(screen.getByText('Alpha Session')).toBeDefined();
    expect(screen.queryByText('Beta Session')).toBeNull();

    // Filter by project / cwd
    fireEvent.change(searchInput, { target: { value: 'project-gamma' } });
    expect(screen.getByText('Gamma Session')).toBeDefined();
    expect(screen.queryByText('Alpha Session')).toBeNull();

    // Filter with no matches
    fireEvent.change(searchInput, { target: { value: 'non-existent-needle' } });
    expect(screen.queryByText('Alpha Session')).toBeNull();
    expect(screen.queryByText('Beta Session')).toBeNull();
    expect(screen.getByText('No sessions match your search.')).toBeDefined();

    // Clear search using clear button
    const clearBtn = screen.getByRole('button', { name: 'Clear search' });
    fireEvent.click(clearBtn);
    expect(screen.getByText('Alpha Session')).toBeDefined();
    expect(localStorage.getItem('sessions-global-filter')).toBe('');
    expect(screen.queryByRole('button', { name: 'Clear search' })).toBeNull();
  });

  it('handles column filters: toggle filter row, input filters, select language, badge count, and reset', () => {
    mockApp.sessionsState.sessions = sampleSessions.map((s) => ({
      ...s,
      current: false,
      watched: false,
    }));
    renderPage();

    const filtersBtn = screen.getByRole('button', { name: 'Toggle filters' });
    expect(document.querySelector('.data-table__filter-row')).toBeNull();

    // Open filters row
    fireEvent.click(filtersBtn);
    expect(document.querySelector('.data-table__filter-row')).not.toBeNull();
    expect(localStorage.getItem('sessions-show-filters')).toBe('true');

    // Input text in label filter
    const labelFilter = screen.getByRole('textbox', { name: 'Filter label' });
    fireEvent.change(labelFilter, { target: { value: 'Alpha' } });
    expect(screen.getByText('Alpha Session')).toBeDefined();
    expect(screen.queryByText('Beta Session')).toBeNull();
    expect(document.querySelector('.data-table-tool-button__badge')?.textContent).toBe('1');

    // Filter by language
    const langSelect = screen.getByRole('combobox', { name: 'Filter language' });
    fireEvent.change(langSelect, { target: { value: 'hu' } });
    expect(document.querySelector('.data-table-tool-button__badge')?.textContent).toBe('2');

    // Clear filter values with empty string to test || undefined branch
    fireEvent.change(langSelect, { target: { value: '' } });
    fireEvent.change(labelFilter, { target: { value: '' } });

    // Filter again to test reset button
    fireEvent.change(labelFilter, { target: { value: 'Alpha' } });
    expect(document.querySelector('.data-table-tool-button__badge')?.textContent).toBe('1');

    // Clear via FilterResetButton
    const resetFiltersBtn = screen.getByRole('button', { name: 'Clear all filters' });
    fireEvent.click(resetFiltersBtn);
    expect(document.querySelector('.data-table-tool-button__badge')).toBeNull();

    // Toggle filter row off
    fireEvent.click(filtersBtn);
    expect(document.querySelector('.data-table__filter-row')).toBeNull();
    expect(localStorage.getItem('sessions-show-filters')).toBe('false');
  });

  it('handles column visibility menu: toggle columns, reset visibility, and click outside', () => {
    renderPage();

    const columnsMenuBtn = screen.getByRole('button', { name: 'Toggle columns menu' });
    expect(document.querySelector('.data-table-column-menu__popover')).toBeNull();

    // Open columns menu
    fireEvent.click(columnsMenuBtn);
    const popover = document.querySelector('.data-table-column-menu__popover');
    expect(popover).not.toBeNull();

    // Toggle Project column visibility off
    const projectCheckbox = screen.getByRole('checkbox', { name: 'Toggle column Project' });
    expect(projectCheckbox.checked).toBe(true);
    fireEvent.click(projectCheckbox);
    expect(projectCheckbox.checked).toBe(false);
    expect(localStorage.getItem('sessions-column-visibility')).toContain('"cwd":false');

    // Reset button should now be visible
    const resetBtn = document.querySelector('.data-table-column-menu__reset');
    expect(resetBtn).not.toBeNull();
    fireEvent.click(resetBtn);
    expect(projectCheckbox.checked).toBe(true);
    expect(localStorage.getItem('sessions-column-visibility')).toBeNull();

    // Click inside popover (should not close popover)
    fireEvent.mouseDown(popover);
    expect(document.querySelector('.data-table-column-menu__popover')).not.toBeNull();

    // Click with non-Node target (e.g. window)
    const nonNodeEvent = new MouseEvent('mousedown', { bubbles: true });
    Object.defineProperty(nonNodeEvent, 'target', { value: window });
    document.dispatchEvent(nonNodeEvent);
    expect(document.querySelector('.data-table-column-menu__popover')).not.toBeNull();

    // Click outside popover to close it
    fireEvent.mouseDown(document.body);
    expect(document.querySelector('.data-table-column-menu__popover')).toBeNull();
  });

  it('handles column reorder drag and drop handlers', () => {
    renderPage();
    const headers = screen.getAllByRole('columnheader');
    const labelHeader = headers.find((h) => h.textContent?.includes('Name / summary'));
    const cwdHeader = headers.find((h) => h.textContent?.includes('Project'));

    expect(labelHeader).toBeDefined();
    expect(cwdHeader).toBeDefined();

    // Drag start on label column
    fireEvent.dragStart(labelHeader);
    expect(labelHeader.classList.contains('is-dragging')).toBe(true);

    // Drag enter on cwd column
    fireEvent.dragEnter(cwdHeader);
    expect(cwdHeader.classList.contains('is-dragover')).toBe(true);

    // Drag over
    fireEvent.dragOver(cwdHeader);

    // Drop on cwd column
    fireEvent.drop(cwdHeader);
    expect(localStorage.getItem('sessions-column-order')).not.toBeNull();
    expect(labelHeader.classList.contains('is-dragging')).toBe(false);
    expect(cwdHeader.classList.contains('is-dragover')).toBe(false);

    // Test drag end resets state
    fireEvent.dragStart(labelHeader);
    fireEvent.dragEnd(labelHeader);
    expect(labelHeader.classList.contains('is-dragging')).toBe(false);

    // Test dropping on same column does not crash
    fireEvent.dragStart(labelHeader);
    fireEvent.drop(labelHeader);

    // Test reorder when splice returns empty array (moved falsy branch)
    const originalSplice = Array.prototype.splice;
    let mockSpliceOnce = false;
    Array.prototype.splice = function (...args) {
      if (mockSpliceOnce) {
        mockSpliceOnce = false;
        return [];
      }
      return originalSplice.apply(this, args);
    };
    try {
      fireEvent.dragStart(labelHeader);
      mockSpliceOnce = true;
      fireEvent.drop(cwdHeader);
    } finally {
      Array.prototype.splice = originalSplice;
    }

    // Fixed columns like Watch and Action cannot be dragged
    const watchHeader = headers.find((h) => h.textContent?.includes('Watch'));
    expect(watchHeader.getAttribute('draggable')).toBe('false');
  });

  it('handles column resize events via resizer element', () => {
    renderPage();
    const resizers = document.querySelectorAll('.data-table__resizer');
    expect(resizers.length).toBeGreaterThan(0);

    const firstResizer = resizers[0];

    // Mousedown with clientX, Touchstart with touches, and Click
    fireEvent.mouseDown(firstResizer, { clientX: 100 });
    fireEvent.touchStart(firstResizer, { touches: [{ clientX: 100 }] });
    fireEvent.click(firstResizer);
  });

  it('handles 10-row page size selection, pagination slicing, and page size dropdown', () => {
    const generatedSessions = Array.from({ length: 75 }, (_, i) => ({
      id: `session-page-test-${i + 1}`,
      label: `Session Number ${i + 1}`,
      summary: `Summary ${i + 1}`,
      cwd: `/projects/p-${i + 1}`,
      gitBranch: 'main',
      firstPrompt: `Prompt ${i + 1}`,
      watched: false,
      current: false,
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

    const sizeSelect = screen.getByRole('combobox', { name: 'Select page size' });

    // Select 10 from page size dropdown
    fireEvent.change(sizeSelect, { target: { value: '10' } });
    expect(screen.getByText('1 to 10 of 75')).toBeDefined();
    expect(screen.getByText('1 / 8')).toBeDefined();
    expect(localStorage.getItem('sessions-pagination-page-size')).toBe('10');

    const page1Rows = document.querySelectorAll(
      '.data-table__body:not(.data-table__body--pinned) [role="row"]',
    );
    expect(page1Rows).toHaveLength(10);

    // Next page button
    const nextBtn = screen.getByRole('button', { name: 'Next page' });
    const prevBtn = screen.getByRole('button', { name: 'Previous page' });
    expect(prevBtn.disabled).toBe(true);

    fireEvent.click(nextBtn);
    expect(screen.getByText('11 to 20 of 75')).toBeDefined();
    expect(screen.getByText('2 / 8')).toBeDefined();
    expect(prevBtn.disabled).toBe(false);

    // Previous page button
    fireEvent.click(prevBtn);
    expect(screen.getByText('1 to 10 of 75')).toBeDefined();
    expect(screen.getByText('1 / 8')).toBeDefined();

    // Select 25
    fireEvent.change(sizeSelect, { target: { value: '25' } });
    expect(screen.getByText('1 to 25 of 75')).toBeDefined();
    expect(screen.getByText('1 / 3')).toBeDefined();

    // Select 100
    fireEvent.change(sizeSelect, { target: { value: '100' } });
    expect(screen.getByText('1 to 75 of 75')).toBeDefined();
    expect(screen.getByText('1 / 1')).toBeDefined();

    // Select 200
    fireEvent.change(sizeSelect, { target: { value: '200' } });
    expect(screen.getByText('1 to 75 of 75')).toBeDefined();
  });

  it('initializes component state from all localStorage keys on mount', () => {
    localStorage.setItem('sessions-pagination-page-size', '10');
    localStorage.setItem('sessions-show-filters', 'true');
    localStorage.setItem('sessions-global-filter', 'alpha');
    localStorage.setItem('sessions-column-visibility', JSON.stringify({ cwd: false }));
    localStorage.setItem('sessions-column-order', JSON.stringify(['id', 'label']));
    localStorage.setItem('sessions-column-sizing', JSON.stringify({ id: 250 }));
    localStorage.setItem(
      'sessions-column-filters',
      JSON.stringify([{ id: 'label', value: 'Alpha' }]),
    );

    renderPage();

    expect(screen.getByText('1 to 1 of 1')).toBeDefined();
    expect(document.querySelector('.data-table__filter-row')).not.toBeNull();
    const searchInput = screen.getByPlaceholderText(/Search name, session id/i);
    expect(searchInput.value).toBe('alpha');
  });

  it('handles corrupted localStorage JSON and invalid formats with robust fallbacks', () => {
    localStorage.setItem('sessions-pagination-page-size', '999');
    localStorage.setItem('sessions-show-filters', 'not-a-bool');
    localStorage.setItem('sessions-column-visibility', '{corrupt json');
    localStorage.setItem('sessions-column-order', 'not array');
    localStorage.setItem('sessions-column-sizing', '{corrupt');
    localStorage.setItem('sessions-column-filters', 'bad');

    const { unmount: u1 } = renderPage();
    expect(screen.getByRole('heading', { level: 2, name: 'Workspaces' })).toBeDefined();
    u1();

    // Non-object visibility and non-array order
    localStorage.setItem('sessions-column-visibility', JSON.stringify(['array']));
    localStorage.setItem('sessions-column-order', JSON.stringify({ not: 'array' }));
    localStorage.setItem('sessions-column-sizing', JSON.stringify(['array']));
    localStorage.setItem('sessions-column-filters', JSON.stringify('string'));

    const { unmount: u2 } = renderPage();
    expect(screen.getByRole('heading', { level: 2, name: 'Workspaces' })).toBeDefined();
    u2();

    // Non-boolean visibility values, non-number sizing values, and invalid filter items
    localStorage.setItem(
      'sessions-column-visibility',
      JSON.stringify({ cwd: false, invalid: 'not-bool' }),
    );
    localStorage.setItem(
      'sessions-column-sizing',
      JSON.stringify({ id: 250, invalid: 'not-number' }),
    );
    localStorage.setItem(
      'sessions-column-filters',
      JSON.stringify([
        { id: 'label', value: 'Alpha' },
        42,
        null,
        { notId: 'foo' },
        { id: 123, value: 'foo' },
        { id: 'foo' },
      ]),
    );

    const { unmount: u3 } = renderPage();
    expect(screen.getByRole('heading', { level: 2, name: 'Workspaces' })).toBeDefined();
    u3();

    // Stored boolean 'false'
    localStorage.setItem('sessions-show-filters', 'false');
    const { unmount: u4 } = renderPage();
    expect(document.querySelector('.data-table__filter-row')).toBeNull();
    u4();
  });

  it('safely catches and ignores localStorage exceptions when storage throws', () => {
    const originalSetItem = localStorage.setItem;
    const originalRemoveItem = localStorage.removeItem;
    const originalGetItem = localStorage.getItem;

    try {
      localStorage.setItem = (key, val) => {
        if (key.startsWith('sessions-')) {
          throw new Error('Quota exceeded');
        }
        return originalSetItem.call(localStorage, key, val);
      };
      localStorage.removeItem = (key) => {
        if (key.startsWith('sessions-')) {
          throw new Error('Storage error');
        }
        return originalRemoveItem.call(localStorage, key);
      };

      const { unmount } = renderPage();

      // Trigger search filter change
      const searchInput = screen.getByPlaceholderText(/Search name, session id/i);
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Trigger filters toggle
      const filtersBtn = screen.getByRole('button', { name: 'Toggle filters' });
      fireEvent.click(filtersBtn);

      // Trigger page size change
      const sizeSelect = screen.getByRole('combobox', { name: 'Select page size' });
      fireEvent.change(sizeSelect, { target: { value: '25' } });

      // Trigger reset all filters
      const resetFiltersBtn = screen.getByRole('button', { name: 'Clear all filters' });
      fireEvent.click(resetFiltersBtn);

      unmount();

      // Test load functions when getItem throws
      localStorage.getItem = (key) => {
        if (key.startsWith('sessions-') && key !== 'sessions-global-filter') {
          throw new Error('GetItem error');
        }
        return originalGetItem.call(localStorage, key);
      };
      const { unmount: u2 } = renderPage();
      expect(screen.getByRole('heading', { level: 2, name: 'Workspaces' })).toBeDefined();
      u2();
    } finally {
      localStorage.setItem = originalSetItem;
      localStorage.removeItem = originalRemoveItem;
      localStorage.getItem = originalGetItem;
    }
  });

  it('handles sorting columns clicking header, keyboard interactions, and non-sortable columns', () => {
    renderPage();
    const headers = screen.getAllByRole('columnheader');
    const nameHeader = headers.find((b) => b.textContent?.includes('Name / summary'));
    expect(nameHeader).toBeDefined();

    // Toggle sort on Name / summary (click)
    fireEvent.click(nameHeader);
    expect(nameHeader.classList.contains('is-sorted')).toBe(true);

    // Toggle sort again
    fireEvent.click(nameHeader);
    expect(nameHeader.classList.contains('is-sorted')).toBe(true);

    // Test keyboard sorting with Enter and Space
    const idHeader = headers.find((b) => b.textContent?.includes('Session ID'));
    expect(idHeader).toBeDefined();

    fireEvent.keyDown(idHeader, { key: 'Enter' });
    expect(idHeader.classList.contains('is-sorted')).toBe(true);

    fireEvent.keyDown(idHeader, { key: ' ' });
    expect(idHeader.classList.contains('is-sorted')).toBe(true);

    // Test ignored key on sortable header
    fireEvent.keyDown(idHeader, { key: 'Escape' });

    // Non-sortable header like Action
    const actionHeader = headers.find((b) => b.textContent?.includes('Action'));
    expect(actionHeader).toBeDefined();
    expect(actionHeader.getAttribute('tabindex')).toBeNull();
    expect(actionHeader.classList.contains('is-sortable')).toBe(false);
  });

  it('triggers refresh discovery when clicking refresh button', () => {
    renderPage();
    const refreshBtn = screen.getByRole('button', { name: '↻ Refresh discovery' });
    fireEvent.click(refreshBtn);
    expect(mockApp.refreshSessions).toHaveBeenCalledTimes(1);
  });

  it('toggles session language, handles pending state with cancel, and stops propagation', () => {
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

    // Clicking language control wrapper stops propagation
    const langControls = document.querySelectorAll('.session-language-control');
    if (langControls.length > 0) {
      fireEvent.click(langControls[0].parentElement);
    }
  });

  it('renders SessionLanguageControl directly to cover isolated branches', () => {
    const sessionNoPending = {
      id: 'sess-no-pending',
      globalLanguage: 'en',
      globalTranslationPending: false,
    };
    const { rerender } = render(
      React.createElement(SessionLanguageControl, {
        session: sessionNoPending,
        app: mockApp,
      }),
    );
    expect(screen.queryByTitle('Session translations in progress')).toBeNull();

    const sessionWithPending = {
      id: 'sess-pending',
      globalLanguage: 'hu',
      globalTranslationPending: true,
    };
    rerender(
      React.createElement(SessionLanguageControl, {
        session: sessionWithPending,
        app: mockApp,
      }),
    );
    expect(screen.getByTitle('Session translations in progress')).toBeDefined();
    expect(screen.getByRole('button', { name: '■' })).toBeDefined();
  });

  it('handles empty session list and null sessionsState gracefully', () => {
    mockApp.sessionsState.sessions = [];
    const { container, unmount } = renderPage();
    expect(container.querySelectorAll('.data-table__body [role="row"]')).toHaveLength(0);
    expect(screen.getByText('No sessions match your search.')).toBeDefined();
    expect(
      screen.getByText('Select a session row or click Switch to activate workspace'),
    ).toBeDefined();
    unmount();

    mockApp.sessionsState = {};
    const { container: container2, unmount: u2 } = renderPage();
    expect(container2.querySelectorAll('.data-table__body [role="row"]')).toHaveLength(0);
    expect(screen.getByText('No sessions match your search.')).toBeDefined();
    u2();
  });

  it('renders active session footer variants for cwd fallback and generic Workspace fallback', () => {
    // Active session with cwd but no label
    mockApp.sessionsState.sessions = [
      {
        id: 'sess-cwd-only',
        label: '',
        cwd: '/path/to/my-repo',
        current: true,
      },
    ];
    const { container: c1, unmount: u1 } = renderPage();
    expect(c1.querySelector('.data-table-footer__message')?.textContent).toContain(
      '/path/to/my-repo',
    );
    u1();

    // Active session with neither label nor cwd
    mockApp.sessionsState.sessions = [
      {
        id: 'sess-no-name-no-cwd',
        label: '',
        cwd: '',
        current: true,
      },
    ];
    const { container: c2, unmount: u2 } = renderPage();
    expect(c2.querySelector('.data-table-footer__message')?.textContent).toContain('Workspace');
    u2();
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

  it('covers table change handlers (sizing, order, visibility, filters), non-function updaters, and meta branches', async () => {
    let capturedOptions;

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

    const actualTable = await vi.importActual('@tanstack/react-table');
    vi.mocked(tanstackTableModule.useReactTable).mockImplementation((options) => {
      capturedOptions = options;
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
                  columnDef: {
                    header: 'Placeholder',
                    meta: { grow: false, fixed: false },
                  },
                  getCanSort: () => false,
                  getIsSorted: () => false,
                  getSize: () => 100,
                  getToggleSortingHandler: () => vi.fn(),
                  getCanResize: () => false,
                  getIsResizing: () => false,
                },
                getContext: () => ({}),
              },
              {
                id: 'h-other',
                isPlaceholder: false,
                getResizeHandler: () => vi.fn(),
                column: {
                  id: 'other',
                  columnDef: {
                    header: 'Other',
                    meta: {},
                  },
                  getCanSort: () => true,
                  getIsSorted: () => false,
                  getSize: () => 100,
                  getToggleSortingHandler: () => vi.fn(),
                  getCanResize: () => true,
                  getIsResizing: () => true,
                  getResizeHandler: () => vi.fn(),
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
              getVisibleCells: () => [
                {
                  id: 'c1',
                  column: {
                    id: 'placeholder',
                    getSize: () => 100,
                    columnDef: {
                      cell: () => 'cell-val',
                      meta: { grow: false },
                    },
                  },
                  getContext: () => ({}),
                },
              ],
            },
          ],
        }),
        getTopRows: () => [],
        getCenterRows: () => [],
        getPrePaginationRowModel: () => ({ rows: [] }),
        getAllLeafColumns: () => [
          {
            id: 'custom-col',
            columnDef: { header: () => 'Custom Function Header' },
            getIsVisible: () => true,
            getCanHide: () => true,
            getToggleVisibilityHandler: () => vi.fn(),
          },
        ],
        getState: () => ({ pagination: { pageIndex: 0, pageSize: 50 }, sorting: [] }),
        getTotalSize: () => 1700,
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

    // Trigger onSortingChange with direct value and function updater
    act(() => {
      capturedOptions.onSortingChange([{ id: 'label', desc: true }]);
    });
    act(() => {
      capturedOptions.onSortingChange((prev) => [{ id: 'lastActivity', desc: false }]);
    });

    // Trigger onColumnSizingChange with direct value and function updater
    act(() => {
      capturedOptions.onColumnSizingChange({ id: 200 });
    });
    act(() => {
      capturedOptions.onColumnSizingChange((prev) => ({ ...prev, label: 280 }));
    });

    // Set order with empty string to trigger reorder if(moved) false branch
    act(() => {
      capturedOptions.onColumnOrderChange(['', 'other']);
    });
    act(() => {
      capturedOptions.onColumnOrderChange((prev) => [...prev, 'cwd']);
    });

    // Trigger onColumnVisibilityChange with direct value and function updater
    act(() => {
      capturedOptions.onColumnVisibilityChange({ cwd: false });
    });
    act(() => {
      capturedOptions.onColumnVisibilityChange((prev) => ({ ...prev, cwd: true }));
    });

    // Trigger onColumnFiltersChange with direct value and function updater
    act(() => {
      capturedOptions.onColumnFiltersChange([{ id: 'label', value: 'Alpha' }]);
    });
    act(() => {
      capturedOptions.onColumnFiltersChange((prev) => [...prev]);
    });

    // Test globalFilterFn directly with various inputs
    const dummyRow = {
      original: {
        id: 'sess-test',
        label: 'My Label',
        cwd: '/path',
        gitBranch: 'main',
        summary: 'sum',
        firstPrompt: 'prompt',
      },
    };
    expect(capturedOptions.globalFilterFn(dummyRow, 'label', 123)).toBe(true);
    expect(capturedOptions.globalFilterFn(dummyRow, 'label', ' '.repeat(3))).toBe(true);
    expect(capturedOptions.globalFilterFn(dummyRow, 'label', 'my label')).toBe(true);
    expect(capturedOptions.globalFilterFn(dummyRow, 'label', 'no-match')).toBe(false);

    // Render columns popover to cover non-string header line 811
    const columnsMenuBtn = screen.getByRole('button', { name: 'Toggle columns menu' });
    fireEvent.click(columnsMenuBtn);
    expect(screen.getByText('custom-col')).toBeDefined();

    // Drag and drop between placeholder and other to hit reorder line 611 and 601
    const headers = screen.getAllByRole('columnheader');
    if (headers.length >= 2) {
      fireEvent.dragStart(headers[0]);
      fireEvent.drop(headers[1]);
    }

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
    expect(screen.getByRole('heading', { level: 1, name: 'Claude sessions' })).toBeDefined();
    unmount();
  });
});
