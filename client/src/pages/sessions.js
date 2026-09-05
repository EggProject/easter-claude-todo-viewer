import React, { useMemo, useState } from 'react';
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { useApp } from '../app-context.js';

const h = React.createElement;

export default function SessionsPage() {
  const app = useApp();
  const [query, setQuery] = useState('');
  const [sorting, setSorting] = useState([{ id: 'lastActivity', desc: true }]);

  const data = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (app.sessionsState.sessions || []).filter(session => {
      if (!needle) return true;
      return `${session.label} ${session.id} ${session.cwd} ${session.gitBranch} ${session.summary} ${session.firstPrompt}`.toLowerCase().includes(needle);
    });
  }, [app.sessionsState.sessions, query]);

  const columns = useMemo(() => [
    {
      id: 'watched',
      header: 'Watch',
      accessorFn: row => row.watched ? 1 : 0,
      cell: ({ row }) => h('input', {
        type: 'checkbox',
        checked: Boolean(row.original.watched),
        disabled: Boolean(row.original.current),
        title: row.original.current ? 'Current session is always watched' : 'Watch session',
        onChange: event => app.setSessionWatched(row.original.id, event.target.checked),
      }),
    },
    {
      id: 'current',
      header: 'Current',
      accessorFn: row => row.current ? 1 : 0,
      cell: ({ row }) => row.original.current ? h('span', { className: 'current-star', title: 'Current session' }, '★') : '',
    },
    {
      id: 'label',
      header: 'Name / summary',
      accessorFn: row => row.label || row.id,
      cell: ({ row }) => h(
        'div',
        { className: 'session-name-cell' },
        h('strong', null, row.original.label || row.original.id),
        row.original.summary ? h('small', { className: 'muted' }, row.original.summary) : null,
      ),
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
    {
      id: 'action',
      header: 'Action',
      enableSorting: false,
      cell: ({ row }) => h(
        'button',
        { className: 'mini', disabled: row.original.current, onClick: () => app.switchSession(row.original.id) },
        row.original.current ? 'Current' : 'Switch',
      ),
    },
  ], [app]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return h(
    'div',
    { className: 'page sessions-page' },
    h(
      'div',
      { className: 'page-heading' },
      h('div', null,
        h('div', { className: 'eyebrow' }, '🧵 SESSIONS'),
        h('h1', null, 'Claude sessions'),
        h('p', { className: 'muted' }, 'Choose one current session and any number of watched sessions. Settings remain global.'),
      ),
      h('button', { className: 'mini', onClick: app.refreshSessions }, '↻ Refresh'),
    ),
    h('div', { className: 'page-controls' }, h('input', {
      className: 'search-input',
      value: query,
      onChange: event => setQuery(event.target.value),
      placeholder: 'Search name, session id, project, branch, first prompt…',
    })),
    h(
      'div',
      { className: 'table-wrap' },
      h(
        'table',
        { className: 'data-table sessions-table' },
        h(
          'thead',
          null,
          ...table.getHeaderGroups().map(group => h(
            'tr',
            { key: group.id },
            ...group.headers.map(header => h(
              'th',
              { key: header.id },
              header.isPlaceholder ? null : h(
                'button',
                { className: `th-btn${header.column.getCanSort() ? ' sortable' : ''}`, onClick: header.column.getToggleSortingHandler() },
                flexRender(header.column.columnDef.header, header.getContext()),
                sortMark(header.column),
              ),
            )),
          )),
        ),
        h(
          'tbody',
          null,
          ...table.getRowModel().rows.map(row => h(
            'tr',
            { key: row.id, className: row.original.current ? 'current-session-row' : '' },
            ...row.getVisibleCells().map(cell => h('td', { key: cell.id }, flexRender(cell.column.columnDef.cell, cell.getContext()))),
          )),
        ),
      ),
    ),
  );
}

function sortMark(column) { return column.getIsSorted() === 'asc' ? ' ↑' : column.getIsSorted() === 'desc' ? ' ↓' : ''; }
function shortId(value) { const text = String(value || ''); return text.length > 18 ? `${text.slice(0, 8)}…${text.slice(-6)}` : text; }
function fmtDate(value) { if (!value) return '—'; try { return new Date(value).toLocaleString(); } catch { return String(value); } }
function fmtBytes(value) { const n = Number(value || 0); if (n < 1024) return `${n} B`; if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`; return `${(n / 1024 / 1024).toFixed(1)} MB`; }
