import React, { ReactElement, useCallback, useMemo, useRef, useState } from 'react';
import { Layers } from 'lucide-react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  OnChangeFn,
  PaginationState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useApp } from '../app-context.js';
import { parseSorting, serializeSorting, usePersistentPageFilters } from '../filter-state.js';
import { AppContextValue, Session } from '../types.js';

interface ColumnMetaWithGrow {
  grow?: boolean;
}

function isGrowMeta(meta: unknown): meta is ColumnMetaWithGrow {
  return typeof meta === 'object' && meta !== null && 'grow' in meta;
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

function cellClass(id: string): string {
  switch (id) {
    case 'watched': {
      return 'sessions-watch-cell data-table__cell--checkbox';
    }
    case 'current': {
      return 'sessions-current-cell data-table__cell--center';
    }
    case 'action': {
      return 'sessions-action-cell';
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

export default function SessionsPage(): ReactElement {
  const app = useApp();
  const [filters, setFilter] = usePersistentPageFilters('sessions', {
    q: '',
    sort: 'lastActivity:desc',
  });
  const query = filters['q'] || '';
  const sorting = useMemo(
    () => parseSorting(filters['sort'], [{ id: 'lastActivity', desc: true }]),
    [filters],
  );
  const setSorting: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    setFilter('sort', serializeSorting(next));
  };
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 50,
  });
  const [switching, setSwitching] = useState<string | null>(null);
  const switchingRef = useRef<string | null>(null);

  const data = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (app.sessionsState.sessions || []).filter((session) => {
      if (!needle) return true;
      return `${session.label || ''} ${session.id} ${session.cwd || ''} ${session.gitBranch || ''} ${session.summary || ''} ${session.firstPrompt || ''}`
        .toLowerCase()
        .includes(needle);
    });
  }, [app.sessionsState.sessions, query]);

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

  const table = useReactTable({
    data,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const activeSession = useMemo(
    () => (app.sessionsState.sessions || []).find((s) => s.current) || null,
    [app.sessionsState.sessions],
  );

  const pageStart = data.length === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const pageEnd = Math.min((pagination.pageIndex + 1) * pagination.pageSize, data.length);

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
              {data.length} of {app.sessionsState.sessions?.length || 0}
            </span>
            <span className="data-table-toolbar__engine">TanStack Table</span>
          </div>
          <div className="data-table-toolbar__tools">
            <div className="input-with-icon data-table-toolbar__search">
              <SearchIcon />
              <input
                className={`input input--sm ${query ? 'is-filled' : ''}`}
                id="sessions-search-input"
                name="sessionsSearch"
                aria-label="Search sessions"
                value={query}
                onChange={(e) => setFilter('q', e.target.value)}
                placeholder="Search name, session id, project, branch, first prompt..."
              />
              {query ? (
                <button
                  type="button"
                  className="data-table-search-clear"
                  aria-label="Clear search"
                  onClick={() => setFilter('q', '')}
                >
                  <ClearIcon />
                </button>
              ) : null}
            </div>
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
            style={{ width: '100%', minWidth: Math.max(1700, table.getTotalSize()) }}
          >
            <div role="rowgroup" className="data-table__header-group">
              {table.getHeaderGroups().map((headerGroup) => (
                <div className="data-table__header" role="row" key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const column = header.column;
                    const sorted = column.getIsSorted();
                    const canSort = column.getCanSort();
                    const toggleSorting = column.getToggleSortingHandler();
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
                        onClick={canSort ? toggleSorting : undefined}
                        className={[
                          'data-table__cell',
                          'data-table__cell--header',
                          cellClass(column.id),
                          canSort ? 'is-sortable' : '',
                          sorted ? 'is-sorted' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        style={{
                          width: column.getSize(),
                          minWidth: column.getSize(),
                          flex:
                            isGrowMeta(column.columnDef.meta) && column.columnDef.meta.grow
                              ? '1 1 auto'
                              : '0 0 auto',
                        }}
                      >
                        <span className="data-table__label">
                          {header.isPlaceholder
                            ? null
                            : flexRender(column.columnDef.header, header.getContext())}
                        </span>
                        {canSort && <SortIcon direction={sorted || null} />}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="data-table__body" role="rowgroup">
              {table.getRowModel().rows.length === 0 ? (
                <div className="data-table__empty">No sessions match your search.</div>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <div
                    key={row.id}
                    role="row"
                    tabIndex={0}
                    className={`data-table__row ${row.original.current ? 'is-active current-session-row' : ''}`}
                    onClick={(event) => {
                      if (
                        event.target instanceof HTMLElement &&
                        event.target.closest('button, a, input, select, .switch')
                      ) {
                        return;
                      }
                      if (!row.original.current) void switchCurrent(row.original.id);
                    }}
                    onKeyDown={(event) => {
                      if (
                        event.target instanceof HTMLElement &&
                        event.target.closest('button, a, input, select, .switch')
                      ) {
                        return;
                      }
                      if ((event.key === 'Enter' || event.key === ' ') && !row.original.current) {
                        event.preventDefault();
                        void switchCurrent(row.original.id);
                      }
                    }}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <div
                        key={cell.id}
                        role="cell"
                        className={`data-table__cell ${cellClass(cell.column.id)}`}
                        style={{
                          width: cell.column.getSize(),
                          minWidth: cell.column.getSize(),
                          flex:
                            isGrowMeta(cell.column.columnDef.meta) &&
                            cell.column.columnDef.meta.grow
                              ? '1 1 auto'
                              : '0 0 auto',
                        }}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    ))}
                  </div>
                ))
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
                  onChange={(e) => table.setPageSize(Number(e.target.value))}
                >
                  {[25, 50, 100, 200].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
                <ChevronIcon />
              </div>
            </div>
            <span className="data-table-pager__range">
              {pageStart} to {pageEnd} of {data.length}
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
      size: 60,
      accessorFn: (row) => (row.watched ? 1 : 0),
      cell: ({ row }) => (
        <input
          type="checkbox"
          id={`session-watch-${row.original.id}`}
          name={`session-watch-${row.original.id}`}
          aria-label={`Watch session ${row.original.label || row.original.id}`}
          checked={Boolean(row.original.watched)}
          disabled={Boolean(row.original.current)}
          title={row.original.current ? 'Current session is always watched' : 'Watch session'}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            void app.setSessionWatched(row.original.id, event.target.checked);
          }}
        />
      ),
    },
    {
      id: 'current',
      header: 'Current',
      size: 60,
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
      size: 100,
      enableSorting: false,
      cell: ({ row }) => (
        <button
          className="btn btn--secondary btn--sm"
          disabled={Boolean(row.original.current) || switching === row.original.id}
          onClick={(event) => {
            event.stopPropagation();
            void switchCurrent(row.original.id);
          }}
        >
          {row.original.current
            ? 'Current'
            : switching === row.original.id
              ? 'Switching…'
              : '⇄ Switch'}
        </button>
      ),
    },
    {
      id: 'language',
      header: 'Language',
      size: 125,
      accessorFn: (row) => row.globalLanguage || 'en',
      cell: ({ row }) => <SessionLanguageControl session={row.original} app={app} />,
    },
    {
      id: 'label',
      header: 'Name / summary',
      size: 280,
      minSize: 220,
      meta: { grow: true },
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
      size: 130,
      cell: ({ getValue }) => <span className="mono small">{shortId(getValue())}</span>,
    },
    {
      accessorKey: 'cwd',
      header: 'Project',
      size: 180,
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
      size: 150,
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
      cell: ({ getValue }) => <span className="nowrap-cell">{fmtDate(getValue())}</span>,
    },
    {
      accessorKey: 'lastActivity',
      header: 'Last activity',
      size: 155,
      cell: ({ getValue }) => <span className="nowrap-cell">{fmtDate(getValue())}</span>,
    },
    {
      accessorKey: 'messageCount',
      header: 'Messages',
      size: 85,
    },
    {
      accessorKey: 'fileSize',
      header: 'File size',
      size: 90,
      cell: ({ getValue }) => fmtBytes(getValue()),
    },
    {
      accessorKey: 'taskCount',
      header: 'Tasks',
      size: 80,
    },
    {
      accessorKey: 'deletedTaskCount',
      header: 'Deleted',
      size: 80,
    },
    {
      accessorKey: 'translationCount',
      header: 'Translations',
      size: 100,
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
