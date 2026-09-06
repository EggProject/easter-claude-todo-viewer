import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { useApp } from '../app-context.js';
import { postJSON } from '../api.js';
import { parseSorting, serializeSorting, usePersistentPageFilters } from '../filter-state.js';

const h = React.createElement;
const TERMINAL = new Set(['success', 'validation_failed', 'error', 'canceled', 'interrupted']);
const RETRYABLE = new Set(['validation_failed', 'error', 'canceled', 'interrupted']);
const ACTIVE = new Set(['queued', 'translating', 'validating', 'retrying', 'canceling']);
const EMPTY_CATALOG = [];

export default function TranslationsPage() {
  const app = useApp();
  const navigate = useNavigate();
  const { sessionId: routeSessionId, jobId } = useParams();
  const [filters, setFilter] = usePersistentPageFilters('translations', { q: '', session: 'all', sort: 'taskId:asc' });
  const globalFilter = filters.q || '';
  const sessionFilter = routeSessionId || filters.session || 'all';
  const sorting = useMemo(() => parseSorting(filters.sort, [{ id: 'taskId', desc: false }]), [filters.sort]);
  const setSorting = updater => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    setFilter('sort', serializeSorting(next));
  };
  const [expanded, setExpanded] = useState({});
  const [rowSelection, setRowSelection] = useState({});
  const [bulkBusy, setBulkBusy] = useState(false);

  const allData = app.translationCatalog || EMPTY_CATALOG;
  const data = useMemo(() => sessionFilter === 'all' ? allData : allData.filter(row => row.sessionId === sessionFilter), [allData, sessionFilter]);
  const sessionOptions = useMemo(() => app.sessionsState.sessions.filter(session => allData.some(row => row.sessionId === session.id)), [app.sessionsState.sessions, allData]);
  const columns = useMemo(() => buildColumns(app, navigate), [app, navigate]);

  const table = useReactTable({
    data,
    columns,
    getSubRows: row => row.children || [],
    getRowId: row => row.kind === 'task' ? `task:${row.sessionId}:${row.uid}` : `job:${row.sessionId}:${row.id}`,
    state: { expanded, sorting, rowSelection, globalFilter },
    onExpandedChange: setExpanded,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: updater => { const next = typeof updater === 'function' ? updater(globalFilter) : updater; setFilter('q', next); },
    globalFilterFn: (row, _columnId, filterValue) => searchableText(row.original).includes(String(filterValue || '').toLowerCase()),
    filterFromLeafRows: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    enableSubRowSelection: true,
  });

  useEffect(() => {
    if (!jobId) return;
    const parent = data.find(task => (!routeSessionId || task.sessionId === routeSessionId) && (task.children || []).some(child => child.id === jobId));
    if (parent) setExpanded(current => ({ ...current, [`task:${parent.sessionId}:${parent.uid}`]: true }));
  }, [routeSessionId, jobId, data]);

  useEffect(() => {
    const valid = new Set(app.jobs.map(job => `job:${job.sessionId}:${job.id}`));
    const parentIds = new Set(data.map(task => `task:${task.sessionId}:${task.uid}`));
    setRowSelection(current => Object.fromEntries(Object.entries(current).filter(([id, selected]) => selected && (valid.has(id) || parentIds.has(id)))));
  }, [app.jobs, data]);

  const selectedJobs = useMemo(() => table.getSelectedRowModel().flatRows
    .filter(row => row.original.kind === 'version')
    .map(row => row.original), [table, rowSelection, data]);

  const eligibleSelectedJobs = useMemo(() => ({
    stop: selectedJobs.filter(job => ACTIVE.has(job.status)),
    retry: selectedJobs.filter(job => RETRYABLE.has(job.status)),
    delete: selectedJobs.filter(job => TERMINAL.has(job.status)),
  }), [selectedJobs]);

  const activeAll = app.jobs.filter(job => ACTIVE.has(job.status));
  const retryAll = app.jobs.filter(job => RETRYABLE.has(job.status));

  const runBulk = async (action, jobs = [], title = 'Translation action started') => {
    if (bulkBusy) return;
    const jobRefs = jobs.map(job => ({ sessionId: job.sessionId, jobId: job.id }));
    if (action === 'delete' && jobRefs.length && !confirm(`Delete ${jobRefs.length} selected translation lifecycle(s) and their owned cache?`)) return;
    setBulkBusy(true);
    try {
      const response = await postJSON('/api/translations/bulk', { action, jobRefs });
      app.showModal({ kind: 'bulk-summary', title, summary: response.summary || {} });
      if (action === 'delete') setRowSelection({});
      await Promise.all([app.refreshJobs(), app.refreshCatalog(), app.refreshState()]);
    } catch (error) {
      app.showModal({ kind: 'error', title: 'Bulk translation action failed', message: error.message });
    } finally {
      setBulkBusy(false);
    }
  };

  const visibleLeafCount = table.getRowModel().flatRows.filter(row => row.original.kind === 'version').length;
  const selectedCount = selectedJobs.length;

  return h('div', { className: 'page' },
    h('div', { className: 'page-heading' }, h('div', null,
      h('div', { className: 'eyebrow' }, '🌍 TRANSLATIONS'),
      h('h1', null, 'Task translation history'),
      h('p', { className: 'muted' }, 'One parent row per task; expand it to inspect every text-version translation lifecycle.'))),
    h('div', { className: 'page-controls' },
      h('input', {
        className: 'search-input', value: globalFilter,
        onChange: event => setFilter('q', event.target.value),
        placeholder: 'Filter every translation field…',
      }),
      h('select', { value: sessionFilter, onChange: event => setFilter('session', event.target.value), 'aria-label': 'Filter translations by session', disabled: Boolean(routeSessionId) },
        h('option', { value: 'all' }, 'Sessions · All'),
        ...sessionOptions.map(session => h('option', { value: session.id, key: session.id }, session.label || session.summary || session.id))),
    ),
    h('div', { className: 'translation-bulk-toolbar' },
      h('div', { className: 'selection-summary' }, h('strong', null, `☑ ${selectedCount} lifecycle(s) selected`), h('span', { className: 'muted' }, `${visibleLeafCount} visible lifecycle(s)`)),
      h('div', { className: 'bulk-actions' },
        h('button', { className: 'mini danger', disabled: !eligibleSelectedJobs.stop.length || bulkBusy, onClick: () => runBulk('stop', eligibleSelectedJobs.stop, '■ Stop started') }, '■ Stop'),
        h('button', { className: 'mini', disabled: !eligibleSelectedJobs.retry.length || bulkBusy, onClick: () => runBulk('retry', eligibleSelectedJobs.retry, '↻ Retry started') }, '↻ Retry'),
        h('button', { className: 'mini danger ghost', disabled: !eligibleSelectedJobs.delete.length || bulkBusy, onClick: () => runBulk('delete', eligibleSelectedJobs.delete, '🗑 Delete completed') }, '🗑 Delete'),
      ),
      h('div', { className: 'bulk-actions global-bulk-actions' },
        h('button', { className: 'mini danger', disabled: !activeAll.length || bulkBusy, onClick: () => runBulk('stop_all', activeAll, '■ Stop all started') }, '■ Stop all'),
        h('button', { className: 'mini', disabled: !retryAll.length || bulkBusy, onClick: () => runBulk('retry_all_failed', retryAll, '↻ Retry all failed started') }, '↻ Retry all failed'),
      ),
    ),
    h('div', { className: 'table-wrap' }, h('table', { className: 'data-table translations-table tree-table' },
      h('thead', null, ...table.getHeaderGroups().map(group => h('tr', { key: group.id }, ...group.headers.map(header => h('th', { key: header.id, className: header.column.id === 'select' ? 'select-cell' : '' },
        header.isPlaceholder ? null : h('button', {
          className: `th-btn${header.column.getCanSort() ? ' sortable' : ''}`,
          disabled: !header.column.getCanSort(),
          onClick: header.column.getToggleSortingHandler(),
          title: header.column.getCanSort() ? 'Click to sort. Shift+click adds another sort column.' : undefined,
        }, flexRender(header.column.columnDef.header, header.getContext()), sortIndicator(header.column.getIsSorted()))))))),
      h('tbody', null, ...renderRows(table.getRowModel().rows, routeSessionId, jobId, navigate)),
    )),
  );
}

function buildColumns(app, navigate) {
  return [
    {
      id: 'select', enableSorting: false, size: 38,
      header: ({ table }) => h('input', {
        type: 'checkbox', checked: table.getIsAllRowsSelected(),
        'aria-label': 'Select all visible task translation rows', onChange: table.getToggleAllRowsSelectedHandler(),
      }),
      cell: ({ row }) => h('input', {
        type: 'checkbox', checked: row.getIsSelected(),
        'aria-label': row.original.kind === 'task' ? `Select task ${row.original.taskId}` : `Select translation version ${row.original.versionNumber || ''}`,
        onChange: row.getToggleSelectedHandler(),
      }),
    },
    {
      id: 'session', header: 'Session', accessorFn: row => row.session?.label || row.sessionId || '',
      cell: ({ row }) => h('span', { className: 'session-badge translation-session-badge', title: `${row.original.session?.label || row.original.sessionId || ''}\n${row.original.sessionId || ''}` }, `🧵 ${compactSession(row.original.session?.label || row.original.sessionId)}`),
    },
    {
      id: 'taskId', header: 'Task / version', accessorFn: row => row.kind === 'task' ? Number(row.taskId) || row.taskId : Number(row.versionNumber || 0),
      cell: ({ row }) => row.original.kind === 'task' ? taskCell(row) : versionCell(row),
    },
    { id: 'wanted', header: 'Wanted', accessorFn: row => row.kind === 'task' ? row.viewLanguage : '', cell: ({ row }) => row.original.kind === 'task' ? languageBadge(row.original.viewLanguage) : '—' },
    { id: 'shown', header: 'Shown', accessorFn: row => row.kind === 'task' ? row.effectiveLanguage : '', cell: ({ row }) => row.original.kind === 'task' ? languageBadge(row.original.effectiveLanguage) : '—' },
    { id: 'trigger', header: 'Trigger', accessorFn: row => row.kind === 'version' ? row.trigger || '' : '', cell: ({ row }) => row.original.kind === 'version' ? row.original.trigger || '—' : '—' },
    { id: 'provider', header: 'Provider', accessorFn: row => row.kind === 'version' ? row.provider || '' : '', cell: ({ row }) => row.original.kind === 'version' ? row.original.provider || 'agy' : '—' },
    { id: 'model', header: 'Model', accessorFn: row => row.kind === 'version' ? row.model || '' : '', cell: ({ row }) => row.original.kind === 'version' ? row.original.model || '—' : '—' },
    { id: 'attempt', header: 'Attempt', accessorFn: row => row.kind === 'version' ? Number(row.attempt || 0) : 0, cell: ({ row }) => row.original.kind === 'version' ? `${row.original.attempt || 0}/${row.original.maxAttempts || 2}` : `${row.original.versionCount || 0} version(s)` },
    { id: 'status', header: 'Status', accessorFn: row => row.kind === 'task' ? row.translationState || '' : row.status || '', cell: ({ row }) => row.original.kind === 'task' ? currentStateLabel(row.original.translationState) : statusLabel(row.original.status) },
    { id: 'queuedAt', header: 'Queued', accessorFn: row => row.kind === 'version' ? row.queuedAt || '' : '', cell: ({ row }) => row.original.kind === 'version' ? formatDate(row.original.queuedAt) : '—' },
    { id: 'duration', header: 'Duration', accessorFn: row => row.kind === 'version' ? durationSeconds(row.original) : 0, cell: ({ row }) => row.original.kind === 'version' ? duration(row.original) : '—' },
    { id: 'tokens', header: 'Tokens', accessorFn: row => row.kind === 'version' ? tokenCount(row.original) : 0, cell: ({ row }) => row.original.kind === 'version' ? tokens(row.original) : '—' },
    { id: 'action', header: 'Action', enableSorting: false, cell: ({ row }) => row.original.kind === 'version' ? actionButtons(row.original, app, navigate) : null },
  ];
}

function renderRows(rows, routeSessionId, jobId, navigate) {
  const body = [];
  for (const row of rows) {
    const original = row.original;
    body.push(h('tr', { key: row.id, className: `${original.kind === 'task' ? 'translation-task-row' : 'translation-version-row'}${jobId === original.id && (!routeSessionId || routeSessionId === original.sessionId) ? ' selected' : ''}` },
      ...row.getVisibleCells().map(cell => h('td', {
        key: cell.id,
        className: `${cell.column.id === 'select' ? 'select-cell ' : ''}${original.kind === 'version' && cell.column.id === 'taskId' ? 'tree-indent' : ''}`,
      }, flexRender(cell.column.columnDef.cell, cell.getContext()))),
    ));
    if (original.kind === 'version' && jobId === original.id && (!routeSessionId || routeSessionId === original.sessionId)) {
      body.push(h('tr', { className: 'translation-detail-row', key: `${original.id}-detail` },
        h('td', { colSpan: row.getVisibleCells().length }, h(JobDetail, { job: original, onClose: () => navigate('/translations') }))));
    }
  }
  return body;
}

function taskCell(row) {
  const task = row.original;
  const canExpand = row.getCanExpand();
  return h('div', { className: 'translation-task-cell' },
    h('button', { className: 'tree-toggle', disabled: !canExpand, onClick: row.getToggleExpandedHandler(), 'aria-label': canExpand ? `${row.getIsExpanded() ? 'Collapse' : 'Expand'} task ${task.taskId}` : `Task ${task.taskId} has no translation versions` }, canExpand ? (row.getIsExpanded() ? '▾' : '▸') : '•'),
    h('div', null, h('strong', null, `#${task.taskId} ${task.title || ''}`), h('div', { className: 'muted small' }, `${task.versionCount || 0} translation version(s)${task.present === false ? ' · deleted task' : ''}`)),
  );
}

function versionCell(row) {
  const job = row.original;
  return h('div', { className: 'translation-version-cell' },
    h('span', { className: 'tree-branch', 'aria-hidden': true }, '└─'),
    h('div', null,
      h('strong', null, `v${job.versionNumber || '?'}${job.current ? ' · current' : ''}`),
      h('div', { className: 'mono small muted' }, String(job.textFingerprint || '').slice(0, 12)),
    ),
  );
}

function actionButtons(job, app, navigate) {
  const buttons = [];
  if (ACTIVE.has(job.status)) buttons.push(h('button', { className: 'mini danger', key: 'stop', onClick: () => app.cancelJob(job.sessionId, job.id) }, '■ Stop'));
  if (RETRYABLE.has(job.status)) buttons.push(h('button', { className: 'mini', key: 'retry', onClick: () => app.retryJob(job.sessionId, job.id) }, '↻ Retry'));
  if (TERMINAL.has(job.status)) buttons.push(h('button', { className: 'mini danger ghost', key: 'del', onClick: () => confirm('Delete this translation lifecycle and owned cache?') && app.deleteJob(job.sessionId, job.id) }, '🗑 Delete'));
  buttons.push(h('button', { className: 'mini ghost', key: 'view', onClick: () => navigate(`/translations/${encodeURIComponent(job.sessionId)}/${encodeURIComponent(job.id)}`) }, '👁 View'));
  return h('div', { className: 'actions' }, buttons);
}

function compactSession(value) { const text = String(value || 'session'); return text.length > 22 ? `${text.slice(0, 20)}…` : text; }

function searchableText(value) {
  const parts = [];
  const visit = item => {
    if (item == null) return;
    if (Array.isArray(item)) { item.forEach(visit); return; }
    if (typeof item === 'object') { Object.values(item).forEach(visit); return; }
    parts.push(String(item));
  };
  visit(value);
  return parts.join(' ').toLowerCase();
}

function sortIndicator(value) { return value === 'asc' ? ' ↑' : value === 'desc' ? ' ↓' : ''; }
function languageBadge(language) { return h('span', { className: `language-badge ${language}` }, language === 'hu' ? '🇭🇺 HU' : '🇬🇧 EN'); }
function currentStateLabel(state) { return ({ ready: '✅ ready', missing: '○ missing', failed: '⚠ failed', queued: '⏳ queued', translating: '🌍 translating', validating: '🔎 validating', retrying: '🔁 retrying', canceling: '🛑 canceling' }[state] || state || '—'); }
function formatDate(value) { if (!value) return '—'; try { return new Date(value).toLocaleString(); } catch { return String(value); } }

function JobDetail({ job, onClose }) {
  const runs = [...(job.runs || []), job];
  return h('div', { className: 'detail-card' },
    h('div', { className: 'detail-head' }, h('div', null, h('div', { className: 'eyebrow' }, '🔬 TRANSLATION DEBUG'), h('h2', null, `Task #${job.taskId} · v${job.versionNumber || '?'} · ${statusLabel(job.status)}`)), h('button', { className: 'icon-btn', onClick: onClose }, '✕')),
    h('div', { className: 'detail-grid' }, metric('🆔 Job', job.id), metric('🧬 Fingerprint', job.textFingerprint), metric('🔌 Provider', job.provider || 'agy'), metric('🤖 Model', job.model), metric('🎯 Trigger', job.trigger), metric('🔁 Run', job.run || 1), metric('⏱ Duration', duration(job))),
    job.error && section('❌ Error', job.error, 'error-panel'),
    runs.map((run, runIndex) => h('section', { className: 'run', key: runIndex }, h('h3', null, `🏃 Run ${run.run || runIndex + 1}${runIndex === runs.length - 1 ? ' · current' : ''}${run.trigger ? ` · ${run.trigger}` : ''}`), (run.attempts || []).map((attempt, index) => h(Attempt, { attempt, index: index + 1, key: index })))),
  );
}

function Attempt({ attempt, index }) {
  const translator = attempt.translator || {}, validator = attempt.validator || {};
  return h('div', { className: 'attempt' }, h('h4', null, `Attempt ${index}`),
    section('🌍 Translator instructions', translator.agentInstructions), section('✉️ Exact prompt sent', translator.exactPrompt), section('📥 Protected source', prettySource(translator.protectedSource)), section('📤 Exact model output', humanModelOutput(translator, 'translator')), rawSection('🧰 Raw provider payload', translator.rawResponse), section('🧩 Parsed translation', prettyCandidate(translator.parsedCandidateRestored || translator.structuredOutput)), checks(translator.deterministicChecks),
    (validator && Object.keys(validator).length) ? h(React.Fragment, null, section('🔎 Validator instructions', validator.agentInstructions), section('✉️ Exact validator prompt', validator.exactPrompt), section('📤 Exact validator output', humanModelOutput(validator, 'validator')), rawSection('🧰 Raw validator provider payload', validator.rawResponse), section('🧾 Validator verdict', prettyVerdict(validator.parsedVerdict || validator.structuredOutput))) : section('🔎 Validator', 'Skipped — deterministic precheck rejected this candidate.'),
    attempt.issues?.length ? section('⚠ Issues', attempt.issues.map(item => `• ${item}`).join('\n'), 'warning-panel') : null,
    h('div', { className: 'usage-row' }, metric('⏱ Translator', `${Number(translator.durationSeconds || 0).toFixed(2)}s`), metric('🧮 Translator tokens', usage(translator.usage)), validator && metric('🧮 Validator tokens', usage(validator.usage))),
  );
}

function parseRawObject(raw) { try { const value = JSON.parse(String(raw || '')); return value && typeof value === 'object' ? value : null; } catch { return null; } }
function humanModelOutput(meta, kind) { const value = meta?.structuredOutput || parseRawObject(meta?.rawResponse); if (value) { if (kind === 'validator' && ('valid' in value || Array.isArray(value.issues))) return prettyVerdict(value); if ('title' in value || 'description' in value) return prettyCandidate(value); } return String(meta?.rawResponse || '—'); }
function rawSection(title, text) { if (text == null || text === '') return null; return h('details', { className: 'diag raw-payload' }, h('summary', null, title, ' · developer view'), h('div', { className: 'diag-title' }, h('button', { className: 'copy', onClick: () => navigator.clipboard?.writeText(String(text)) }, '📋 Copy raw')), h('pre', null, String(text))); }
function checks(value) { if (!value) return null; return section(value.valid ? '✅ Deterministic checks' : '❌ Deterministic checks', value.valid ? 'All deterministic structure/protected-span checks passed.' : (value.issues || []).map(item => `• ${item}`).join('\n'), value.valid ? 'ok-panel' : 'error-panel'); }
function section(title, text, className = '') { if (text == null || text === '') return null; return h('section', { className: `diag ${className}` }, h('div', { className: 'diag-title' }, title, h('button', { className: 'copy', onClick: () => navigator.clipboard?.writeText(String(text)) }, '📋 Copy')), h('pre', null, String(text))); }
const metric = (key, value) => h('div', { className: 'metric' }, h('small', null, key), h('strong', null, String(value ?? '—')));
const prettySource = value => value ? `Title\n${value.title || ''}\n\nDescription\n${value.description || ''}` : '';
const prettyCandidate = prettySource;
const prettyVerdict = value => value ? `Valid: ${value.valid ? 'yes' : 'no'}\n${(value.issues || []).map(item => `• ${item}`).join('\n')}` : '';
const statusLabel = status => ({ success: '✅ success', validation_failed: '⚠ validation failed', error: '❌ error', canceled: '🛑 canceled', interrupted: '⛔ interrupted', translating: '🌍 translating', validating: '🔎 validating', retrying: '🔁 retrying', queued: '⏳ queued', canceling: '🛑 canceling' }[status] || status);
function durationSeconds(job) { if (job.durationSeconds) return Number(job.durationSeconds) || 0; if (!job.startedAt) return 0; const end = job.finishedAt ? new Date(job.finishedAt) : new Date(); return Math.max(0, (end - new Date(job.startedAt)) / 1000); }
function duration(job) { const value = durationSeconds(job); return value ? `${Math.round(value)}s` : '—'; }
function usage(value) { if (!value) return '—'; return value.total_tokens ?? value.totalTokens ?? '—'; }
function tokenCount(job) { const current = (job.attempts || []).reduce((sum, attempt) => sum + Number(attempt.translator?.usage?.total_tokens || attempt.translator?.usage?.totalTokens || 0) + Number(attempt.validator?.usage?.total_tokens || attempt.validator?.usage?.totalTokens || 0), 0); const old = (job.runs || []).reduce((sum, run) => sum + (run.attempts || []).reduce((inner, attempt) => inner + Number(attempt.translator?.usage?.total_tokens || attempt.translator?.usage?.totalTokens || 0) + Number(attempt.validator?.usage?.total_tokens || attempt.validator?.usage?.totalTokens || 0), 0), 0); return current + old; }
function tokens(job) { return tokenCount(job) || '—'; }
