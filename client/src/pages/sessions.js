import React, { useMemo, useRef, useState } from 'react';
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { useApp } from '../app-context.js';
import { parseSorting, serializeSorting, usePersistentPageFilters } from '../filter-state.js';

const h = React.createElement;

export default function SessionsPage() {
  const app = useApp();
  const [filters, setFilter] = usePersistentPageFilters('sessions', { q: '', sort: 'lastActivity:desc' });
  const query = filters.q || '';
  const sorting = useMemo(() => parseSorting(filters.sort, [{ id: 'lastActivity', desc: true }]), [filters.sort]);
  const setSorting = updater => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    setFilter('sort', serializeSorting(next));
  };
  const [switching, setSwitching] = useState(null);
  const switchingRef = useRef(null);

  const data = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (app.sessionsState.sessions || []).filter(session => {
      if (!needle) return true;
      return `${session.label} ${session.id} ${session.cwd} ${session.gitBranch} ${session.summary} ${session.firstPrompt}`.toLowerCase().includes(needle);
    });
  }, [app.sessionsState.sessions, query]);

  const switchCurrent = async sessionId => {
    // Native double-click is two click events. Guard synchronously with a ref so the
    // second click cannot race React's state flush and send a second switch request.
    if (switchingRef.current) return;
    switchingRef.current = sessionId;
    setSwitching(sessionId);
    try { await app.switchSessionOptimistic(sessionId); }
    finally { switchingRef.current = null; setSwitching(null); }
  };

  const columns = useMemo(() => [
    {
      id: 'watched', header: 'Watch', accessorFn: row => row.watched ? 1 : 0,
      cell: ({ row }) => h('input', { type: 'checkbox', checked: Boolean(row.original.watched), disabled: Boolean(row.original.current), title: row.original.current ? 'Current session is always watched' : 'Watch session', onChange: event => app.setSessionWatched(row.original.id, event.target.checked) }),
    },
    {
      id: 'current', header: 'Current', accessorFn: row => row.current ? 1 : 0,
      cell: ({ row }) => row.original.current ? h('span', { className: 'current-star', title: 'Current session' }, '★') : '',
    },
    {
      id: 'action', header: 'Action', enableSorting: false,
      cell: ({ row }) => h('button', { className: 'mini', disabled: row.original.current || switching === row.original.id, onClick: () => switchCurrent(row.original.id) }, row.original.current ? 'Current' : switching === row.original.id ? 'Switching…' : '⇄ Switch'),
    },
    {
      id: 'language', header: 'Language', accessorFn: row => row.globalLanguage || 'en',
      cell: ({ row }) => h(SessionLanguageControl, { session: row.original, app }),
    },
    {
      id: 'label', header: 'Name / summary', accessorFn: row => row.label || row.id,
      cell: ({ row }) => h('div', { className: 'session-name-cell' }, h('strong', null, row.original.label || row.original.id), row.original.summary ? h('small', { className: 'muted' }, row.original.summary) : null),
    },
    { accessorKey: 'id', header: 'Session ID', cell: ({ getValue }) => h('span', { className: 'mono small' }, shortId(getValue())) },
    { accessorKey: 'cwd', header: 'Project' },
    { accessorKey: 'gitBranch', header: 'Branch' },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ getValue }) => fmtDate(getValue()) },
    { accessorKey: 'lastActivity', header: 'Last activity', cell: ({ getValue }) => fmtDate(getValue()) },
    { accessorKey: 'messageCount', header: 'Messages' },
    { accessorKey: 'fileSize', header: 'File size', cell: ({ getValue }) => fmtBytes(getValue()) },
    { accessorKey: 'taskCount', header: 'Tasks' },
    { accessorKey: 'deletedTaskCount', header: 'Deleted' },
    { accessorKey: 'translationCount', header: 'Translations' },
  ], [app, switching]);

  const table = useReactTable({ data, columns, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() });

  return h('div', { className: 'page sessions-page' },
    h('div', { className: 'page-heading' },
      h('div', null, h('div', { className: 'eyebrow' }, '🧵 SESSIONS'), h('h1', null, 'Claude sessions'), h('p', { className: 'muted' }, 'Choose one current session and any number of watched sessions. Session language is controlled here; Settings remain global.')),
      h('button', { className: 'mini', onClick: app.refreshSessions }, '↻ Refresh discovery')),
    h('div', { className: 'page-controls' }, h('input', { className: 'search-input', value: query, onChange: event => setFilter('q', event.target.value), placeholder: 'Search name, session id, project, branch, first prompt…' })),
    h('div', { className: 'table-wrap sessions-table-wrap' },
      h('table', { className: 'data-table sessions-table' },
        h('thead', null, ...table.getHeaderGroups().map(group => h('tr', { key: group.id }, ...group.headers.map(header => h('th', { key: header.id, className: columnClass(header.column.id) }, header.isPlaceholder ? null : h('button', { className: `th-btn${header.column.getCanSort() ? ' sortable' : ''}`, onClick: header.column.getToggleSortingHandler() }, flexRender(header.column.columnDef.header, header.getContext()), sortMark(header.column))))))),
        h('tbody', null, ...table.getRowModel().rows.map(row => h('tr', { key: row.id, className: row.original.current ? 'current-session-row' : '' }, ...row.getVisibleCells().map(cell => h('td', { key: cell.id, className: columnClass(cell.column.id) }, flexRender(cell.column.columnDef.cell, cell.getContext())))))),
      )),
  );
}

function SessionLanguageControl({ session, app }) {
  const hu = session.globalLanguage === 'hu';
  const pending = Boolean(session.globalTranslationPending);
  return h('div', { className: 'session-language-control' },
    h('span', null, 'EN'),
    h('button', { className: `switch ${hu ? 'on' : ''}${pending ? ' pending' : ''}`, role: 'switch', 'aria-checked': hu, title: hu ? 'Set this session to English' : 'Auto-translate this session to Hungarian', onClick: () => app.setSessionLanguage(session.id, hu ? 'en' : 'hu') }, h('span')),
    h('span', null, 'HU'),
    pending ? h('span', { className: 'spinner', title: 'Session translations in progress' }) : null,
    pending ? h('button', { className: 'mini danger', onClick: () => app.cancelSessionLanguage(session.id) }, '■') : null,
  );
}
function columnClass(id) { return id === 'action' ? 'sessions-action-cell' : id === 'current' ? 'sessions-current-cell' : id === 'watched' ? 'sessions-watch-cell' : ''; }
function sortMark(column) { return column.getIsSorted() === 'asc' ? ' ↑' : column.getIsSorted() === 'desc' ? ' ↓' : ''; }
function shortId(value) { const text = String(value || ''); return text.length > 18 ? `${text.slice(0, 8)}…${text.slice(-6)}` : text; }
function fmtDate(value) { if (!value) return '—'; try { return new Date(value).toLocaleString(); } catch { return String(value); } }
function fmtBytes(value) { const n = Number(value || 0); if (n < 1024) return `${n} B`; if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`; return `${(n / 1024 / 1024).toFixed(1)} MB`; }
