import React, { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layers } from 'lucide-react';
import {
  Column,
  ColumnDef,
  ColumnFiltersState,
  ColumnSizingState,
  FilterFn,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  OnChangeFn,
  PaginationState,
  Row,
  SortingState,
  useReactTable,
  VisibilityState,
} from '@tanstack/react-table';
import { useApp } from '../app-context.js';
import { parseSorting, serializeSorting, usePersistentPageFilters } from '../filter-state.js';
import { AppContextValue, Session } from '../types.js';

interface ColumnMetaProps {
  grow?: boolean;
  fixed?: boolean;
}

function isGrowMeta(meta: unknown): boolean {
  if (typeof meta === 'object' && meta !== null && 'grow' in meta) {
    return meta.grow === true;
  }
  return false;
}

function isFixedColumn(meta: unknown): boolean {
  if (typeof meta === 'object' && meta !== null && 'fixed' in meta) {
    return meta.fixed === true;
  }
  return false;
}

function SortIcon({ direction }: { direction: false | 'asc' | 'desc' | null }): ReactElement {
  return (
    <svg
      className="data-table-sort"
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 5 L6 2 L9 5" opacity={direction === 'asc' ? 1 : 0.3} />
      <path d="M3 7 L6 10 L9 7" opacity={direction === 'desc' ? 1 : 0.3} />
    </svg>
  );
}

function SearchIcon(): ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="7" cy="7" r="4.5" />
      <path d="m14 14-3-3" />
    </svg>
  );
}

function ClearIcon(): ReactElement {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M3 3 9 9M9 3 3 9" />
    </svg>
  );
}

function ChevronIcon(): ReactElement {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m3 5 3 3 3-3" />
    </svg>
  );
}

function PageIcon({ direction }: { direction: 'prev' | 'next' }): ReactElement {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {direction === 'prev' ? (
        <path d="M7.5 2.5 4 6l3.5 3.5" />
      ) : (
        <path d="M4.5 2.5 8 6l-3.5 3.5" />
      )}
    </svg>
  );
}

function ColumnsIcon(): ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
      <path d="M6.5 2.5v11M10 2.5v11" />
    </svg>
  );
}

function FilterIcon(): ReactElement {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 3.5h12l-4.5 5.5v3.5l-3 1.5V9L2 3.5Z" />
    </svg>
  );
}

function FilterResetIcon(): ReactElement {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 3.2h8.5" />
      <path d="M2 8h5" />
      <path d="M2 12.8h3" />
      <path d="M10.5 9.5 14.5 13.5M14.5 9.5 10.5 13.5" />
    </svg>
  );
}

function GripIcon(): ReactElement {
  return (
    <svg
      className="data-table-grip"
      width="10"
      height="14"
      viewBox="0 0 10 14"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="3" cy="3" r="1.1" />
      <circle cx="7" cy="3" r="1.1" />
      <circle cx="3" cy="7" r="1.1" />
      <circle cx="7" cy="7" r="1.1" />
      <circle cx="3" cy="11" r="1.1" />
      <circle cx="7" cy="11" r="1.1" />
    </svg>
  );
}

function FilterResetButton({ onClick }: { onClick: () => void }): ReactElement {
  return (
    <button
      type="button"
      className="data-table-tool-button data-table-tool-button--icon data-table-filter-reset"
      onClick={onClick}
      title="Clear all filters"
      aria-label="Clear all filters"
    >
      <FilterResetIcon />
    </button>
  );
}

function ColumnFilterInput({ column }: { column: Column<Session> }): ReactElement {
  const filterValue = column.getFilterValue();
  const stringValue = typeof filterValue === 'string' ? filterValue : '';

  if (column.id === 'language') {
    return (
      <div className="data-table-filter-cell">
        <select
          className="select select--sm"
          value={stringValue}
          aria-label="Filter language"
          onChange={(e) => column.setFilterValue(e.target.value || undefined)}
        >
          <option value="">All</option>
          <option value="en">EN</option>
          <option value="hu">HU</option>
        </select>
      </div>
    );
  }

  if (['label', 'id', 'cwd', 'gitBranch'].includes(column.id)) {
    return (
      <div className="data-table-filter-cell">
        <input
          type="text"
          className="input input--sm"
          value={stringValue}
          onChange={(e) => column.setFilterValue(e.target.value || undefined)}
          placeholder={`Filter ${column.id}...`}
          aria-label={`Filter ${column.id}`}
        />
      </div>
    );
  }

  return <div className="data-table-filter-cell" />;
}

function cellClass(id: string): string {
  switch (id) {
    case 'watched': {
      return 'sessions-watch-cell data-table__cell--center';
    }
    case 'current': {
      return 'sessions-current-cell data-table__cell--center';
    }
    case 'action': {
      return 'sessions-action-cell data-table__cell--center';
    }
    case 'id': {
      return 'data-table__cell--mono';
    }
    case 'messageCount':
    case 'fileSize':
    case 'taskCount':
    case 'deletedTaskCount':
    case 'translationCount': {
      return 'data-table__cell--right data-table__cell--mono';
    }
    default: {
      return '';
    }
  }
}

function loadStoredPageSize(fallback: number): number {
  try {
    const raw = localStorage.getItem('sessions-pagination-page-size');
    if (!raw) return fallback;
    const parsed = Number(raw);
    if ([10, 25, 50, 100, 200].includes(parsed)) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return fallback;
}

function loadStoredBoolean(key: string, fallback: boolean): boolean {
  try {
    const val = localStorage.getItem(key);
    if (val === 'true') return true;
    if (val === 'false') return false;
  } catch {
    // ignore
  }
  return fallback;
}

function loadStoredVisibility(): VisibilityState {
  try {
    const raw = localStorage.getItem('sessions-column-visibility');
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      const result: VisibilityState = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'boolean') {
          result[k] = v;
        }
      }
      return result;
    }
  } catch {
    // ignore
  }
  return {};
}

function loadStoredOrder(): string[] {
  try {
    const raw = localStorage.getItem('sessions-column-order');
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string');
    }
  } catch {
    // ignore
  }
  return [];
}

function loadStoredSizing(): ColumnSizingState {
  try {
    const raw = localStorage.getItem('sessions-column-sizing');
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      const result: ColumnSizingState = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === 'number') {
          result[k] = v;
        }
      }
      return result;
    }
  } catch {
    // ignore
  }
  return {};
}

interface StoredColumnFilter {
  id: string;
  value: unknown;
}

function isStoredColumnFilter(item: unknown): item is StoredColumnFilter {
  return (
    typeof item === 'object' &&
    item !== null &&
    'id' in item &&
    typeof item.id === 'string' &&
    'value' in item
  );
}

function loadStoredFilters(): ColumnFiltersState {
  try {
    const raw = localStorage.getItem('sessions-column-filters');
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const items: readonly unknown[] = parsed;
      const result: ColumnFiltersState = [];
      for (const item of items) {
        if (isStoredColumnFilter(item)) {
          result.push({ id: item.id, value: item.value });
        }
      }
      return result;
    }
  } catch {
    // ignore
  }
  return [];
}

const sessionGlobalFilterFn: FilterFn<Session> = (row, _columnId, filterValue: unknown) => {
  if (typeof filterValue !== 'string' || !filterValue.trim()) return true;
  const needle = filterValue.trim().toLowerCase();
  const session = row.original;
  return `${session.label || ''} ${session.id} ${session.cwd || ''} ${session.gitBranch || ''} ${session.summary || ''} ${session.firstPrompt || ''}`
    .toLowerCase()
    .includes(needle);
};

export default function SessionsPage(): ReactElement {
  const app = useApp();
  const [filters, setFilter] = usePersistentPageFilters('sessions', {
    q: '',
    sort: 'lastActivity:desc',
  });
  const sorting = useMemo(
    () => parseSorting(filters['sort'], [{ id: 'lastActivity', desc: true }]),
    [filters],
  );
  const setSorting: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    setFilter('sort', serializeSorting(next));
  };

  const [pagination, setPagination] = useState<PaginationState>(() => ({
    pageIndex: 0,
    pageSize: loadStoredPageSize(50),
  }));

  const [globalFilter, setGlobalFilter] = useState<string>(() => {
    return localStorage.getItem('sessions-global-filter') || filters['q'] || '';
  });

  const [showFilters, setShowFilters] = useState<boolean>(() =>
    loadStoredBoolean('sessions-show-filters', false),
  );

  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(loadStoredVisibility);
  const [columnOrder, setColumnOrder] = useState<string[]>(loadStoredOrder);
  const [columnSizing, setColumnSizing] = useState<ColumnSizingState>(loadStoredSizing);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(loadStoredFilters);

  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement>(null);

  const [draggingColumnId, setDraggingColumnId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<string | null>(null);

  const [switching, setSwitching] = useState<string | null>(null);
  const switchingRef = useRef<string | null>(null);

  useEffect(() => {
    if (!columnMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        columnMenuRef.current &&
        event.target instanceof Node &&
        !columnMenuRef.current.contains(event.target)
      ) {
        setColumnMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [columnMenuOpen]);

  const handleGlobalFilterChange = useCallback(
    (value: string) => {
      setGlobalFilter(value);
      setFilter('q', value);
      try {
        localStorage.setItem('sessions-global-filter', value);
      } catch {
        // ignore
      }
    },
    [setFilter],
  );

  const handleColumnVisibilityChange: OnChangeFn<VisibilityState> = useCallback((updater) => {
    setColumnVisibility((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem('sessions-column-visibility', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const handleColumnOrderChange: OnChangeFn<string[]> = useCallback((updater) => {
    setColumnOrder((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem('sessions-column-order', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const handleColumnSizingChange: OnChangeFn<ColumnSizingState> = useCallback((updater) => {
    setColumnSizing((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem('sessions-column-sizing', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const handleColumnFiltersChange: OnChangeFn<ColumnFiltersState> = useCallback((updater) => {
    setColumnFilters((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      try {
        localStorage.setItem('sessions-column-filters', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const toggleShowFilters = useCallback(() => {
    setShowFilters((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('sessions-show-filters', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPagination((prev) => ({ ...prev, pageSize: newSize, pageIndex: 0 }));
    try {
      localStorage.setItem('sessions-pagination-page-size', String(newSize));
    } catch {
      // ignore
    }
  }, []);

  const resetColumns = useCallback(() => {
    setColumnVisibility({});
    setColumnOrder([]);
    setColumnSizing({});
    try {
      localStorage.removeItem('sessions-column-visibility');
      localStorage.removeItem('sessions-column-order');
      localStorage.removeItem('sessions-column-sizing');
    } catch {
      // ignore
    }
  }, []);

  const resetAllFilters = useCallback(() => {
    setColumnFilters([]);
    handleGlobalFilterChange('');
    try {
      localStorage.removeItem('sessions-column-filters');
      localStorage.removeItem('sessions-global-filter');
    } catch {
      // ignore
    }
  }, [handleGlobalFilterChange]);

  const reorder = useCallback((fromId: string, toId: string) => {
    setColumnOrder((prev) => {
      const currentOrder =
        prev.length > 0
          ? [...prev]
          : [
              'watched',
              'current',
              'action',
              'language',
              'label',
              'id',
              'cwd',
              'gitBranch',
              'createdAt',
              'lastActivity',
              'messageCount',
              'fileSize',
              'taskCount',
              'deletedTaskCount',
              'translationCount',
            ];
      const fromIndex = currentOrder.indexOf(fromId);
      const toIndex = currentOrder.indexOf(toId);
      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        const [moved] = currentOrder.splice(fromIndex, 1);
        if (moved) {
          currentOrder.splice(toIndex, 0, moved);
          try {
            localStorage.setItem('sessions-column-order', JSON.stringify(currentOrder));
          } catch {
            // ignore
          }
          return currentOrder;
        }
      }
      return prev;
    });
  }, []);

  const switchCurrent = useCallback(
    async (sessionId: string) => {
      if (switchingRef.current) return;
      switchingRef.current = sessionId;
      setSwitching(sessionId);
      try {
        await app.switchSessionOptimistic(sessionId);
      } finally {
        switchingRef.current = null;
        setSwitching(null);
      }
    },
    [app],
  );

  const columns = useMemo<ColumnDef<Session>[]>(
    () => buildSessionColumns(app, switchCurrent, switching),
    [app, switchCurrent, switching],
  );

  const pinnedTopRowIds = useMemo(() => {
    const ids: string[] = [];
    const current = (app.sessionsState.sessions || []).find((s) => s.current);
    if (current) {
      ids.push(current.id);
    }
    for (const session of app.sessionsState.sessions || []) {
      if (session.watched && !ids.includes(session.id)) {
        ids.push(session.id);
      }
    }
    return ids;
  }, [app.sessionsState.sessions]);

  const data = useMemo(() => {
    return app.sessionsState.sessions || [];
  }, [app.sessionsState.sessions]);

  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => row.id,
    enableRowPinning: true,
    keepPinnedRows: true,
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    globalFilterFn: sessionGlobalFilterFn,
    state: {
      sorting,
      pagination,
      columnVisibility,
      columnOrder,
      columnSizing,
      columnFilters,
      globalFilter,
      rowPinning: { top: pinnedTopRowIds },
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnVisibilityChange: handleColumnVisibilityChange,
    onColumnOrderChange: handleColumnOrderChange,
    onColumnSizingChange: handleColumnSizingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onGlobalFilterChange: handleGlobalFilterChange,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const activeSession = useMemo(
    () => (app.sessionsState.sessions || []).find((s) => s.current) || null,
    [app.sessionsState.sessions],
  );

  const topRows = table.getTopRows();
  const centerRows = table.getCenterRows();

  const filteredCount = table.getPrePaginationRowModel().rows.length;
  const pageStart = filteredCount === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const pageEnd = Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredCount);

  const activeFiltersCount = columnFilters.length + (globalFilter ? 1 : 0);
  const columnsChanged =
    Object.values(columnVisibility).includes(false) ||
    columnOrder.length > 0 ||
    Object.keys(columnSizing).length > 0;

  const renderRow = (row: Row<Session>, isPinned: boolean): ReactElement => {
    const isCurrent = Boolean(row.original.current);
    return (
      <div
        key={row.id}
        role="row"
        tabIndex={0}
        className={`data-table__row ${isCurrent ? 'is-active current-session-row' : ''}${isPinned ? ' data-table__row--pinned' : ''}`}
        onClick={(event) => {
          if (
            event.target instanceof HTMLElement &&
            event.target.closest('button, a, input, select, .switch')
          ) {
            return;
          }
          if (!isCurrent) void switchCurrent(row.original.id);
        }}
        onKeyDown={(event) => {
          if (
            event.target instanceof HTMLElement &&
            event.target.closest('button, a, input, select, .switch')
          ) {
            return;
          }
          if ((event.key === 'Enter' || event.key === ' ') && !isCurrent) {
            event.preventDefault();
            void switchCurrent(row.original.id);
          }
        }}
      >
        {row.getVisibleCells().map((cell) => {
          const isGrow = isGrowMeta(cell.column.columnDef.meta);
          return (
            <div
              key={cell.id}
              role="cell"
              className={`data-table__cell ${cellClass(cell.column.id)}`}
              style={{
                width: cell.column.getSize(),
                minWidth: cell.column.getSize(),
                flex: isGrow ? '1 1 auto' : '0 0 auto',
              }}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="page sessions-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Layers size={14} className="inline-icon" /> Sessions
          </div>
          <h1>Claude sessions</h1>
          <p className="muted">
            Choose one current session and any number of watched sessions. Session language is
            controlled here; Settings remain global.
          </p>
        </div>
      </div>
      <div className="data-table-wrapper">
        <div className="data-table-toolbar">
          <div className="data-table-toolbar__title">
            <h2>Workspaces</h2>
            <span className="data-table-toolbar__count">
              {filteredCount} of {app.sessionsState.sessions?.length || 0}
            </span>
            <span className="data-table-toolbar__engine">TanStack Table</span>
          </div>
          <div className="data-table-toolbar__tools">
            <div className="input-with-icon data-table-toolbar__search">
              <SearchIcon />
              <input
                className={`input input--sm ${globalFilter ? 'is-filled' : ''}`}
                id="sessions-search-input"
                name="sessionsSearch"
                aria-label="Search sessions"
                value={globalFilter}
                onChange={(e) => handleGlobalFilterChange(e.target.value)}
                placeholder="Search name, session id, project, branch, first prompt..."
              />
              {globalFilter ? (
                <button
                  type="button"
                  className="data-table-search-clear"
                  aria-label="Clear search"
                  onClick={() => handleGlobalFilterChange('')}
                >
                  <ClearIcon />
                </button>
              ) : null}
            </div>

            <div className="data-table-column-menu" ref={columnMenuRef}>
              <button
                type="button"
                className={`data-table-tool-button ${columnMenuOpen ? 'is-on' : ''} ${columnsChanged ? 'is-changed' : ''}`}
                onClick={() => setColumnMenuOpen((prev) => !prev)}
                aria-label="Toggle columns menu"
              >
                <ColumnsIcon /> Columns
              </button>
              {columnMenuOpen ? (
                <div className="data-table-column-menu__popover">
                  <div className="data-table-column-menu__header">
                    <span className="data-table-column-menu__title">Columns</span>
                    {columnsChanged ? (
                      <button
                        type="button"
                        className="data-table-column-menu__reset"
                        onClick={resetColumns}
                      >
                        Reset
                      </button>
                    ) : null}
                  </div>
                  {table
                    .getAllLeafColumns()
                    .filter((col) => col.id !== 'action')
                    .map((col) => {
                      const isVisible = col.getIsVisible();
                      const colHeader =
                        typeof col.columnDef.header === 'string' ? col.columnDef.header : col.id;
                      return (
                        <div key={col.id} className="data-table-column-menu__row">
                          <label className="data-table-column-menu__visibility">
                            <input
                              type="checkbox"
                              checked={isVisible}
                              disabled={!col.getCanHide()}
                              onChange={col.getToggleVisibilityHandler()}
                              aria-label={`Toggle column ${colHeader}`}
                            />
                            <span>{colHeader}</span>
                          </label>
                        </div>
                      );
                    })}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className={`data-table-tool-button ${showFilters ? 'is-on' : ''} ${activeFiltersCount > 0 ? 'is-changed' : ''}`}
              onClick={toggleShowFilters}
              aria-label="Toggle filters"
            >
              <FilterIcon /> Filters
              {activeFiltersCount > 0 ? (
                <span className="data-table-tool-button__badge">{activeFiltersCount}</span>
              ) : null}
            </button>
            {activeFiltersCount > 0 ? <FilterResetButton onClick={resetAllFilters} /> : null}

            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={() => void app.refreshSessions()}
            >
              ↻ Refresh discovery
            </button>
          </div>
        </div>
        <div className="data-table-scroll">
          <div
            className="data-table sessions-table"
            role="table"
            aria-label="Claude sessions"
            style={{ width: '100%', minWidth: table.getTotalSize() }}
          >
            <div role="rowgroup" className="data-table__header-group">
              {table.getHeaderGroups().map((headerGroup) => (
                <div className="data-table__header" role="row" key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const column = header.column;
                    const sorted = column.getIsSorted();
                    const canSort = column.getCanSort();
                    const toggleSorting = column.getToggleSortingHandler();
                    const isFixed = isFixedColumn(column.columnDef.meta);
                    const isGrow = isGrowMeta(column.columnDef.meta);
                    const handleSortKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggleSorting?.(event);
                      }
                    };
                    return (
                      <div
                        key={header.id}
                        role="columnheader"
                        aria-sort={
                          canSort
                            ? sorted === 'asc'
                              ? 'ascending'
                              : sorted === 'desc'
                                ? 'descending'
                                : 'none'
                            : undefined
                        }
                        tabIndex={canSort ? 0 : undefined}
                        onKeyDown={canSort ? handleSortKeyDown : undefined}
                        onClick={
                          canSort
                            ? (event) => {
                                if (
                                  event.target instanceof HTMLElement &&
                                  event.target.closest('.data-table__resizer')
                                ) {
                                  return;
                                }
                                toggleSorting?.(event);
                              }
                            : undefined
                        }
                        draggable={!isFixed}
                        onDragStart={() => !isFixed && setDraggingColumnId(column.id)}
                        onDragEnter={() => !isFixed && setDragOverColumnId(column.id)}
                        onDragOver={(event) => event.preventDefault()}
                        onDrop={() => {
                          if (draggingColumnId && draggingColumnId !== column.id) {
                            reorder(draggingColumnId, column.id);
                          }
                          setDraggingColumnId(null);
                          setDragOverColumnId(null);
                        }}
                        onDragEnd={() => {
                          setDraggingColumnId(null);
                          setDragOverColumnId(null);
                        }}
                        className={[
                          'data-table__cell',
                          'data-table__cell--header',
                          cellClass(column.id),
                          canSort ? 'is-sortable' : '',
                          sorted ? 'is-sorted' : '',
                          !isFixed ? 'is-draggable' : '',
                          dragOverColumnId === column.id &&
                          draggingColumnId &&
                          draggingColumnId !== column.id
                            ? 'is-dragover'
                            : '',
                          draggingColumnId === column.id ? 'is-dragging' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        style={{
                          width: column.getSize(),
                          minWidth: column.getSize(),
                          flex: isGrow ? '1 1 auto' : '0 0 auto',
                        }}
                      >
                        <span className="data-table__label">
                          {header.isPlaceholder
                            ? null
                            : flexRender(column.columnDef.header, header.getContext())}
                        </span>
                        {canSort ? <SortIcon direction={sorted || null} /> : null}
                        {!isFixed ? <GripIcon /> : null}
                        {column.getCanResize() ? (
                          // eslint-disable-next-line jsx-a11y/no-static-element-interactions
                          <span
                            className={`data-table__resizer ${column.getIsResizing() ? 'is-resizing' : ''}`}
                            onMouseDown={header.getResizeHandler()}
                            onTouchStart={header.getResizeHandler()}
                          />
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {showFilters
              ? table.getHeaderGroups().map((headerGroup) => (
                  <div
                    className="data-table__filter-row"
                    role="row"
                    key={`filter-row-${headerGroup.id}`}
                  >
                    {headerGroup.headers.map((header) => {
                      const column = header.column;
                      const isGrow = isGrowMeta(column.columnDef.meta);
                      return (
                        <div
                          key={`filter-cell-${header.id}`}
                          className="data-table__cell data-table__cell--filter"
                          style={{
                            width: column.getSize(),
                            minWidth: column.getSize(),
                            flex: isGrow ? '1 1 auto' : '0 0 auto',
                          }}
                        >
                          <ColumnFilterInput column={column} />
                        </div>
                      );
                    })}
                  </div>
                ))
              : null}

            {topRows.length > 0 ? (
              <div
                className="data-table__body data-table__body--pinned"
                role="rowgroup"
                style={{ top: showFilters ? 82 : 40 }}
              >
                {topRows.map((row) => renderRow(row, true))}
              </div>
            ) : null}

            <div className="data-table__body" role="rowgroup">
              {centerRows.length === 0 && topRows.length === 0 ? (
                <div className="data-table__empty">No sessions match your search.</div>
              ) : (
                centerRows.map((row) => renderRow(row, false))
              )}
            </div>
          </div>
        </div>
        <div className="data-table-footer">
          <span className="data-table-footer__message">
            {activeSession ? (
              <>
                Current session: <code>{activeSession.id}</code> -{' '}
                {activeSession.label || activeSession.cwd || 'Workspace'}
              </>
            ) : (
              <>Select a session row or click Switch to activate workspace</>
            )}
          </span>
          <div className="data-table-pager">
            <div className="data-table-pager__size">
              <span>Rows</span>
              <div className="data-table-select data-table-select--small">
                <select
                  aria-label="Select page size"
                  value={pagination.pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                >
                  {[10, 25, 50, 100, 200].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <ChevronIcon />
              </div>
            </div>
            <span className="data-table-pager__range">
              {pageStart} to {pageEnd} of {filteredCount}
            </span>
            <div className="data-table-pager__navigation">
              <button
                type="button"
                className="data-table-pager__button pagination-btn"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
                aria-label="Previous page"
              >
                <PageIcon direction="prev" />
              </button>
              <span className="data-table-pager__page">
                {pagination.pageIndex + 1} / {Math.max(1, table.getPageCount())}
              </span>
              <button
                type="button"
                className="data-table-pager__button pagination-btn"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
                aria-label="Next page"
              >
                <PageIcon direction="next" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SessionLanguageControl({
  session,
  app,
}: {
  session: Session;
  app: AppContextValue;
}): ReactElement {
  const hu = session.globalLanguage === 'hu';
  const pending = Boolean(session.globalTranslationPending);
  return (
    <div className="session-language-control">
      <span>EN</span>
      <button
        className={`switch ${hu ? 'on' : ''}${pending ? ' pending' : ''}`}
        role="switch"
        aria-checked={hu}
        title={hu ? 'Set this session to English' : 'Auto-translate this session to Hungarian'}
        onClick={(event) => {
          event.stopPropagation();
          void app.setSessionLanguage(session.id, hu ? 'en' : 'hu');
        }}
      >
        <span />
      </button>
      <span>HU</span>
      {pending ? <span className="spinner" title="Session translations in progress" /> : null}
      {pending ? (
        <button
          className="btn btn--danger btn--sm"
          onClick={(event) => {
            event.stopPropagation();
            void app.cancelSessionLanguage(session.id);
          }}
        >
          ■
        </button>
      ) : null}
    </div>
  );
}

function buildSessionColumns(
  app: AppContextValue,
  switchCurrent: (id: string) => Promise<void>,
  switching: string | null,
): ColumnDef<Session>[] {
  return [
    {
      id: 'watched',
      header: 'Watch',
      size: 50,
      minSize: 44,
      meta: { fixed: true } satisfies ColumnMetaProps,
      accessorFn: (row) => (row.watched ? 1 : 0),
      cell: ({ row }) => (
        <button
          type="button"
          className={`btn btn--ghost btn--sm btn--icon watch-btn ${row.original.watched ? 'is-watched' : ''}`}
          title={
            row.original.current
              ? 'Current session is always watched'
              : row.original.watched
                ? 'Watched (pinned to top)'
                : 'Watch session (pin to top)'
          }
          disabled={Boolean(row.original.current)}
          onClick={(e) => {
            e.stopPropagation();
            void app.setSessionWatched(row.original.id, !row.original.watched);
          }}
        >
          {row.original.watched ? '★' : '☆'}
        </button>
      ),
    },
    {
      id: 'current',
      header: 'Current',
      size: 50,
      minSize: 44,
      meta: { fixed: true } satisfies ColumnMetaProps,
      accessorFn: (row) => (row.current ? 1 : 0),
      cell: ({ row }) =>
        row.original.current ? (
          <span className="current-star" title="Current session">
            ★
          </span>
        ) : (
          ''
        ),
    },
    {
      id: 'action',
      header: 'Action',
      size: 90,
      minSize: 80,
      enableSorting: false,
      meta: { fixed: true } satisfies ColumnMetaProps,
      cell: ({ row }) =>
        row.original.current ? (
          <span className="badge badge--success">Current</span>
        ) : (
          <button
            type="button"
            className="btn btn--secondary btn--sm switch-session-btn"
            disabled={switching === row.original.id}
            onClick={(event) => {
              event.stopPropagation();
              void switchCurrent(row.original.id);
            }}
          >
            {switching === row.original.id ? 'Switching…' : '⇄ Switch'}
          </button>
        ),
    },
    {
      id: 'language',
      header: 'Language',
      size: 115,
      minSize: 100,
      accessorFn: (row) => row.globalLanguage || 'en',
      cell: ({ row }) => <SessionLanguageControl session={row.original} app={app} />,
    },
    {
      id: 'label',
      header: 'Name / summary',
      size: 280,
      minSize: 200,
      meta: { grow: true } satisfies ColumnMetaProps,
      accessorFn: (row) => row.label || row.id,
      cell: ({ row }) => {
        const titleText = row.original.label || row.original.id;
        const summaryText = row.original.summary || '';
        return (
          <div className="data-table-main session-name-cell">
            <strong title={titleText}>{titleText}</strong>
            {summaryText ? (
              <small title={summaryText} className="muted">
                {summaryText}
              </small>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: 'id',
      header: 'Session ID',
      size: 115,
      minSize: 90,
      cell: ({ getValue }) => <span className="mono small">{shortId(getValue())}</span>,
    },
    {
      accessorKey: 'cwd',
      header: 'Project',
      size: 160,
      minSize: 110,
      cell: ({ getValue }) => {
        const text = String(getValue() || '');
        return (
          <span title={text} className="truncate-cell">
            {text}
          </span>
        );
      },
    },
    {
      accessorKey: 'gitBranch',
      header: 'Branch',
      size: 125,
      minSize: 90,
      cell: ({ getValue }) => {
        const text = String(getValue() || '');
        return (
          <span title={text} className="truncate-cell">
            {text}
          </span>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      size: 155,
      minSize: 120,
      cell: ({ getValue }) => <span className="nowrap-cell">{fmtDate(getValue())}</span>,
    },
    {
      accessorKey: 'lastActivity',
      header: 'Last activity',
      size: 155,
      minSize: 120,
      cell: ({ getValue }) => <span className="nowrap-cell">{fmtDate(getValue())}</span>,
    },
    {
      accessorKey: 'messageCount',
      header: 'Messages',
      size: 95,
      minSize: 75,
    },
    {
      accessorKey: 'fileSize',
      header: 'File size',
      size: 95,
      minSize: 75,
      cell: ({ getValue }) => fmtBytes(getValue()),
    },
    {
      accessorKey: 'taskCount',
      header: 'Tasks',
      size: 85,
      minSize: 70,
    },
    {
      accessorKey: 'deletedTaskCount',
      header: 'Deleted',
      size: 85,
      minSize: 70,
    },
    {
      accessorKey: 'translationCount',
      header: 'Translations',
      size: 115,
      minSize: 80,
    },
  ];
}

function shortId(value: unknown): string {
  const text = String(value || '');
  return text.length > 18 ? `${text.slice(0, 8)}…${text.slice(-6)}` : text;
}

function fmtDate(value: unknown): string {
  if (!value) return 'none';
  try {
    return new Date(String(value)).toLocaleString();
  } catch {
    return String(value);
  }
}

function fmtBytes(value: unknown): string {
  const n = Number(value || 0);
  if (n < 1024) return `${n.toString()} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
