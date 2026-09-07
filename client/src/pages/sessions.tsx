import React, { ReactElement, useCallback, useMemo, useRef, useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  OnChangeFn,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { useApp } from '../app-context.js';
import { parseSorting, serializeSorting, usePersistentPageFilters } from '../filter-state.js';
import { AppContextValue, Session } from '../types.js';

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
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="page sessions-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">🧵 SESSIONS</div>
          <h1>Claude sessions</h1>
          <p className="muted">
            Choose one current session and any number of watched sessions. Session language is
            controlled here; Settings remain global.
          </p>
        </div>
        <button className="mini" onClick={() => void app.refreshSessions()}>
          ↻ Refresh discovery
        </button>
      </div>
      <div className="page-controls">
        <input
          className="search-input"
          value={query}
          onChange={(event) => setFilter('q', event.target.value)}
          placeholder="Search name, session id, project, branch, first prompt…"
        />
      </div>
      <div className="table-wrap sessions-table-wrap">
        <table className="data-table sessions-table">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th key={header.id} className={columnClass(header.column.id)}>
                    {header.isPlaceholder ? null : (
                      <button
                        className={`th-btn${header.column.getCanSort() ? ' sortable' : ''}`}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sortMark(header.column)}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className={row.original.current ? 'current-session-row' : ''}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={columnClass(cell.column.id)}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
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
        onClick={() => void app.setSessionLanguage(session.id, hu ? 'en' : 'hu')}
      >
        <span />
      </button>
      <span>HU</span>
      {pending ? <span className="spinner" title="Session translations in progress" /> : null}
      {pending ? (
        <button className="mini danger" onClick={() => void app.cancelSessionLanguage(session.id)}>
          ■
        </button>
      ) : null}
    </div>
  );
}

function columnClass(id: string): string {
  return id === 'action'
    ? 'sessions-action-cell'
    : id === 'current'
      ? 'sessions-current-cell'
      : id === 'watched'
        ? 'sessions-watch-cell'
        : '';
}

function sortMark(column: { getIsSorted: () => false | 'asc' | 'desc' }): string {
  const sorted = column.getIsSorted();
  return sorted === 'asc' ? ' ↑' : sorted === 'desc' ? ' ↓' : '';
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
      accessorFn: (row) => (row.watched ? 1 : 0),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={Boolean(row.original.watched)}
          disabled={Boolean(row.original.current)}
          title={row.original.current ? 'Current session is always watched' : 'Watch session'}
          onChange={(event) => {
            void app.setSessionWatched(row.original.id, event.target.checked);
          }}
        />
      ),
    },
    {
      id: 'current',
      header: 'Current',
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
      enableSorting: false,
      cell: ({ row }) => (
        <button
          className="mini"
          disabled={Boolean(row.original.current) || switching === row.original.id}
          onClick={() => void switchCurrent(row.original.id)}
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
      accessorFn: (row) => row.globalLanguage || 'en',
      cell: ({ row }) => <SessionLanguageControl session={row.original} app={app} />,
    },
    {
      id: 'label',
      header: 'Name / summary',
      accessorFn: (row) => row.label || row.id,
      cell: ({ row }) => (
        <div className="session-name-cell">
          <strong>{row.original.label || row.original.id}</strong>
          {row.original.summary ? <small className="muted">{row.original.summary}</small> : null}
        </div>
      ),
    },
    {
      accessorKey: 'id',
      header: 'Session ID',
      cell: ({ getValue }) => <span className="mono small">{shortId(getValue())}</span>,
    },
    { accessorKey: 'cwd', header: 'Project' },
    { accessorKey: 'gitBranch', header: 'Branch' },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ getValue }) => fmtDate(getValue()),
    },
    {
      accessorKey: 'lastActivity',
      header: 'Last activity',
      cell: ({ getValue }) => fmtDate(getValue()),
    },
    { accessorKey: 'messageCount', header: 'Messages' },
    {
      accessorKey: 'fileSize',
      header: 'File size',
      cell: ({ getValue }) => fmtBytes(getValue()),
    },
    { accessorKey: 'taskCount', header: 'Tasks' },
    { accessorKey: 'deletedTaskCount', header: 'Deleted' },
    { accessorKey: 'translationCount', header: 'Translations' },
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
