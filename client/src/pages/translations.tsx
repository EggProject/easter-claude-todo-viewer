import React, { ReactElement, useEffect, useMemo, useState } from 'react';
import { NavigateFunction, useNavigate, useParams } from 'react-router';
import {
  ColumnDef,
  ExpandedState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  OnChangeFn,
  Row,
  RowSelectionState,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import { Layers, Trash2, Eye, Search, Microscope, Copy, Puzzle, Wrench } from 'lucide-react';
import { useApp } from '../app-context.js';
import { postJSON } from '../api.js';
import {
  parseSorting,
  serializeSorting,
  usePersistentPageFilters,
  SortItem,
} from '../filter-state.js';
import {
  AppContextValue,
  TranslationAgentMeta,
  TranslationAttempt,
  TranslationJob,
  TranslationTableRow,
  TranslationTaskRow,
  TranslationUsage,
  TranslationVersionRow,
  errorMessage,
  isRecord,
} from '../types.js';

const TERMINAL = new Set(['success', 'validation_failed', 'error', 'canceled', 'interrupted']);
const RETRYABLE = new Set(['validation_failed', 'error', 'canceled', 'interrupted']);
const ACTIVE = new Set(['queued', 'translating', 'validating', 'retrying', 'canceling']);
const EMPTY_CATALOG: TranslationTableRow[] = [];

function isUpdaterFunction<T>(value: unknown): value is (prev: T) => T {
  return typeof value === 'function';
}

export default function TranslationsPage(): ReactElement {
  const app = useApp();
  const navigate = useNavigate();
  const { sessionId: routeSessionId, jobId } = useParams();
  const [filters, setFilter] = usePersistentPageFilters('translations', {
    q: '',
    session: 'all',
    sort: 'taskId:asc',
  });
  const globalFilter = filters['q'] || '';
  const sessionFilter = routeSessionId || filters['session'] || 'all';
  const sorting = useMemo<SortItem[]>(
    () => parseSorting(filters['sort'], [{ id: 'taskId', desc: false }]),
    [filters],
  );
  const setSorting: OnChangeFn<SortingState> = (updater) => {
    const next = typeof updater === 'function' ? updater(sorting) : updater;
    setFilter('sort', serializeSorting(next));
  };
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [bulkBusy, setBulkBusy] = useState(false);

  const allData = useMemo<TranslationTableRow[]>(() => {
    return (app.translationCatalog || EMPTY_CATALOG) satisfies TranslationTableRow[];
  }, [app.translationCatalog]);

  const data = useMemo(
    () =>
      sessionFilter === 'all' ? allData : allData.filter((row) => row.sessionId === sessionFilter),
    [allData, sessionFilter],
  );

  const sessionOptions = useMemo(
    () =>
      app.sessionsState.sessions.filter((session) =>
        allData.some((row) => row.sessionId === session.id),
      ),
    [app.sessionsState.sessions, allData],
  );

  const columns = useMemo(() => buildColumns(app, navigate), [app, navigate]);

  const table = useReactTable<TranslationTableRow>({
    data,
    columns,
    getSubRows: (row) => (row.kind === 'task' ? row.children || [] : []),
    getRowId: (row) =>
      row.kind === 'task' ? `task:${row.sessionId}:${row.uid}` : `job:${row.sessionId}:${row.id}`,
    state: { expanded, sorting, rowSelection, globalFilter },
    onExpandedChange: setExpanded,
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: (updater: unknown) => {
      const next = isUpdaterFunction<string>(updater) ? updater(globalFilter) : String(updater);
      setFilter('q', next);
    },
    globalFilterFn: (row, _columnId, filterValue: unknown) => {
      return searchableText(row.original).includes(String(filterValue ?? '').toLowerCase());
    },
    filterFromLeafRows: true,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    enableSubRowSelection: true,
  });

  useEffect(() => {
    if (!jobId) return;
    const parent = data.find(
      (task) =>
        (!routeSessionId || task.sessionId === routeSessionId) &&
        task.kind === 'task' &&
        (task.children || []).some((child: TranslationVersionRow) => child.id === jobId),
    );
    if (parent?.kind === 'task') {
      const key = `task:${parent.sessionId}:${parent.uid}`;
      setExpanded((current) => {
        /* v8 ignore next */
        if (typeof current !== 'object' || !current) return { [key]: true };
        return { ...current, [key]: true };
      });
    }
  }, [routeSessionId, jobId, data]);

  useEffect(() => {
    const valid = new Set(app.jobs.map((job) => `job:${job.sessionId}:${job.id}`));
    const parentIds = new Set(
      data
        .filter((task): task is TranslationTaskRow => task.kind === 'task')
        .map((task) => `task:${task.sessionId}:${task.uid}`),
    );
    setRowSelection((current) =>
      Object.fromEntries(
        Object.entries(current).filter(
          ([id, selected]) => selected && (valid.has(id) || parentIds.has(id)),
        ),
      ),
    );
  }, [app.jobs, data]);

  const selectedJobs: TranslationVersionRow[] = table
    .getSelectedRowModel()
    .flatRows.filter((row): row is Row<TranslationVersionRow> => row.original.kind === 'version')
    .map((row) => row.original);

  const eligibleSelectedJobs = {
    stop: selectedJobs.filter((job) => ACTIVE.has(job.status)),
    retry: selectedJobs.filter((job) => RETRYABLE.has(job.status)),
    delete: selectedJobs.filter((job) => TERMINAL.has(job.status)),
  };

  const activeAll = app.jobs.filter((job) => ACTIVE.has(job.status));
  const retryAll = app.jobs.filter((job) => RETRYABLE.has(job.status));

  const runBulk = async (
    action: string,
    jobs: TranslationJob[] = [],
    title = 'Translation action started',
  ): Promise<void> => {
    if (bulkBusy) return;
    const jobRefs = jobs.map((job) => ({ sessionId: job.sessionId, jobId: job.id }));
    if (
      action === 'delete' &&
      jobRefs.length > 0 &&
      !confirm(
        `Delete ${jobRefs.length.toString()} selected translation lifecycle(s) and their owned cache?`,
      )
    )
      return;
    setBulkBusy(true);
    try {
      const response: unknown = await postJSON('/api/translations/bulk', { action, jobRefs });
      const summary =
        isRecord(response) && isRecord(response['summary']) ? response['summary'] : {};
      app.showModal({ kind: 'bulk-summary', title, summary });
      if (action === 'delete') setRowSelection({});
      await Promise.all([app.refreshJobs(), app.refreshCatalog(), app.refreshState()]);
    } catch (error: unknown) {
      const message = errorMessage(error);
      app.showModal({
        kind: 'error',
        title: 'Bulk translation action failed',
        message,
      });
    } finally {
      setBulkBusy(false);
    }
  };

  const visibleLeafCount = table
    .getRowModel()
    .flatRows.filter((row) => row.original.kind === 'version').length;
  const selectedCount = selectedJobs.length;

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">TRANSLATIONS</div>
          <h1>Task translation history</h1>
          <p className="muted">
            One parent row per task; expand it to inspect every text-version translation lifecycle.
          </p>
        </div>
      </div>
      <div className="page-controls">
        <input
          className="search-input"
          value={globalFilter}
          onChange={(event) => setFilter('q', event.target.value)}
          placeholder="Filter every translation field…"
        />
        <select
          value={sessionFilter}
          onChange={(event) => setFilter('session', event.target.value)}
          aria-label="Filter translations by session"
          disabled={Boolean(routeSessionId)}
        >
          <option value="all">Sessions · All</option>
          {sessionOptions.map((session) => (
            <option value={session.id} key={session.id}>
              {session.label || session.summary || session.id}
            </option>
          ))}
        </select>
      </div>
      <div className="translation-bulk-toolbar">
        <div className="selection-summary">
          <strong>{`${selectedCount.toString()} lifecycle(s) selected`}</strong>
          <span className="muted">{`${visibleLeafCount.toString()} visible lifecycle(s)`}</span>
        </div>
        <div className="bulk-actions">
          <button
            className="mini danger"
            disabled={!eligibleSelectedJobs.stop.length || bulkBusy}
            onClick={() => void runBulk('stop', eligibleSelectedJobs.stop, '■ Stop started')}
          >
            ■ Stop
          </button>
          <button
            className="mini"
            disabled={!eligibleSelectedJobs.retry.length || bulkBusy}
            onClick={() => void runBulk('retry', eligibleSelectedJobs.retry, '↻ Retry started')}
          >
            ↻ Retry
          </button>
          <button
            className="mini danger ghost"
            disabled={!eligibleSelectedJobs.delete.length || bulkBusy}
            onClick={() => void runBulk('delete', eligibleSelectedJobs.delete, 'Delete completed')}
          >
            Delete
          </button>
        </div>
        <div className="bulk-actions global-bulk-actions">
          <button
            className="mini danger"
            disabled={!activeAll.length || bulkBusy}
            onClick={() => void runBulk('stop_all', activeAll, '■ Stop all started')}
          >
            ■ Stop all
          </button>
          <button
            className="mini"
            disabled={!retryAll.length || bulkBusy}
            onClick={() => void runBulk('retry_all_failed', retryAll, '↻ Retry all failed started')}
          >
            ↻ Retry all failed
          </button>
        </div>
      </div>
      <div className="table-wrap">
        <table className="data-table translations-table tree-table">
          <thead>
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id}>
                {group.headers.map((header) => (
                  <th
                    key={header.id}
                    className={header.column.id === 'select' ? 'select-cell' : ''}
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        className={`th-btn${header.column.getCanSort() ? ' sortable' : ''}`}
                        disabled={!header.column.getCanSort()}
                        onClick={header.column.getToggleSortingHandler()}
                        title={
                          header.column.getCanSort()
                            ? 'Click to sort. Shift+click adds another sort column.'
                            : undefined
                        }
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {sortIndicator(header.column.getIsSorted())}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>{renderRows(table.getRowModel().rows, routeSessionId, jobId, navigate)}</tbody>
        </table>
      </div>
    </div>
  );
}

function buildColumns(
  app: AppContextValue,
  navigate: NavigateFunction,
): ColumnDef<TranslationTableRow>[] {
  return [
    {
      id: 'select',
      enableSorting: false,
      size: 38,
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          aria-label="Select all visible task translation rows"
          onChange={table.getToggleAllRowsSelectedHandler()}
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          aria-label={
            row.original.kind === 'task'
              ? `Select task ${row.original.taskId}`
              : `Select translation version ${String(row.original.versionNumber || '')}`
          }
          onChange={row.getToggleSelectedHandler()}
        />
      ),
    },
    {
      id: 'session',
      header: 'Session',
      accessorFn: (row) =>
        (row.kind === 'task' ? row.session?.label : undefined) || row.sessionId || '',
      cell: ({ row }) => {
        const label =
          (row.original.kind === 'task' ? row.original.session?.label : undefined) ||
          row.original.sessionId ||
          '';
        return (
          <span
            className="session-badge translation-session-badge"
            title={`${label}\n${row.original.sessionId}`}
          >
            <Layers size={14} strokeWidth={1.75} className="inline-icon" /> {compactSession(label)}
          </span>
        );
      },
    },
    {
      id: 'taskId',
      header: 'Task / version',
      accessorFn: (row) =>
        row.kind === 'task' ? Number(row.taskId) || row.taskId : Number(row.versionNumber || 0),
      cell: ({ row }) => (isTaskRow(row) ? taskCell(row) : versionCell(row)),
    },
    {
      id: 'wanted',
      header: 'Wanted',
      accessorFn: (row) => (row.kind === 'task' ? row.viewLanguage || '' : ''),
      cell: ({ row }) =>
        row.original.kind === 'task' ? languageBadge(row.original.viewLanguage) : 'none',
    },
    {
      id: 'shown',
      header: 'Shown',
      accessorFn: (row) => (row.kind === 'task' ? row.effectiveLanguage || '' : ''),
      cell: ({ row }) =>
        row.original.kind === 'task' ? languageBadge(row.original.effectiveLanguage) : 'none',
    },
    {
      id: 'trigger',
      header: 'Trigger',
      accessorFn: (row) => (row.kind === 'version' ? row.trigger || '' : ''),
      cell: ({ row }) =>
        row.original.kind === 'version' ? row.original.trigger || 'none' : 'none',
    },
    {
      id: 'provider',
      header: 'Provider',
      accessorFn: (row) => (row.kind === 'version' ? row.provider || '' : ''),
      cell: ({ row }) =>
        row.original.kind === 'version' ? row.original.provider || 'agy' : 'none',
    },
    {
      id: 'model',
      header: 'Model',
      accessorFn: (row) => (row.kind === 'version' ? row.model || '' : ''),
      cell: ({ row }) => (row.original.kind === 'version' ? row.original.model || 'none' : 'none'),
    },
    {
      id: 'attempt',
      header: 'Attempt',
      accessorFn: (row) => (row.kind === 'version' ? Number(row.attempt || 0) : 0),
      cell: ({ row }) =>
        row.original.kind === 'version'
          ? `${(row.original.attempt || 0).toString()}/${(row.original.maxAttempts || 2).toString()}`
          : `${(row.original.versionCount || 0).toString()} version(s)`,
    },
    {
      id: 'status',
      header: 'Status',
      accessorFn: (row) => (row.kind === 'task' ? row.translationState || '' : row.status || ''),
      cell: ({ row }) =>
        row.original.kind === 'task'
          ? currentStateLabel(row.original.translationState)
          : statusLabel(row.original.status),
    },
    {
      id: 'queuedAt',
      header: 'Queued',
      accessorFn: (row) => (row.kind === 'version' ? row.queuedAt || '' : ''),
      cell: ({ row }) =>
        row.original.kind === 'version' ? formatDate(row.original.queuedAt) : 'none',
    },
    {
      id: 'duration',
      header: 'Duration',
      accessorFn: (row) => (row.kind === 'version' ? durationSeconds(row) : 0),
      cell: ({ row }) => (row.original.kind === 'version' ? duration(row.original) : 'none'),
    },
    {
      id: 'tokens',
      header: 'Tokens',
      accessorFn: (row) => (row.kind === 'version' ? tokenCount(row) : 0),
      cell: ({ row }) => (row.original.kind === 'version' ? tokens(row.original) : 'none'),
    },
    {
      id: 'action',
      header: 'Action',
      enableSorting: false,
      cell: ({ row }) =>
        row.original.kind === 'version' ? actionButtons(row.original, app, navigate) : null,
    },
  ];
}

function renderRows(
  rows: Row<TranslationTableRow>[],
  routeSessionId: string | undefined,
  jobId: string | undefined,
  navigate: NavigateFunction,
): ReactElement[] {
  const body: ReactElement[] = [];
  for (const row of rows) {
    const original = row.original;
    const isSelected =
      jobId === original.id && (!routeSessionId || routeSessionId === original.sessionId);

    body.push(
      <tr
        key={row.id}
        className={`${original.kind === 'task' ? 'translation-task-row' : 'translation-version-row'}${isSelected ? ' selected' : ''}`}
      >
        {row.getVisibleCells().map((cell) => (
          <td
            key={cell.id}
            className={`${cell.column.id === 'select' ? 'select-cell ' : ''}${original.kind === 'version' && cell.column.id === 'taskId' ? 'tree-indent' : ''}`}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        ))}
      </tr>,
    );

    if (
      original.kind === 'version' &&
      jobId === original.id &&
      (!routeSessionId || routeSessionId === original.sessionId)
    ) {
      body.push(
        <tr className="translation-detail-row" key={`${original.id}-detail`}>
          <td colSpan={row.getVisibleCells().length}>
            <JobDetail job={original} onClose={() => void navigate('/translations')} />
          </td>
        </tr>,
      );
    }
  }
  return body;
}

function isTaskRow(row: Row<TranslationTableRow>): row is Row<TranslationTaskRow> {
  return row.original.kind === 'task';
}

function taskCell(row: Row<TranslationTaskRow>): ReactElement {
  const task = row.original;
  const canExpand = row.getCanExpand();
  return (
    <div className="translation-task-cell">
      <button
        className="tree-toggle"
        disabled={!canExpand}
        onClick={row.getToggleExpandedHandler()}
        aria-label={
          canExpand
            ? `${row.getIsExpanded() ? 'Collapse' : 'Expand'} task ${task.taskId}`
            : `Task ${task.taskId} has no translation versions`
        }
      >
        {canExpand ? (row.getIsExpanded() ? '▾' : '▸') : '•'}
      </button>
      <div>
        <strong>{`#${task.taskId} ${task.title || ''}`}</strong>
        <div className="muted small">
          {`${(task.versionCount || 0).toString()} translation version(s)${task.present === false ? ' · deleted task' : ''}`}
        </div>
      </div>
    </div>
  );
}

function versionCell(row: Row<TranslationTableRow>): ReactElement {
  const job = row.original;
  const versionNumber = 'versionNumber' in job ? job.versionNumber : undefined;
  const current = 'current' in job && job.current;
  const textFingerprint = 'textFingerprint' in job ? job.textFingerprint : undefined;
  return (
    <div className="translation-version-cell">
      <span className="tree-branch" aria-hidden="true">
        └─
      </span>
      <div>
        <strong>{`v${String(versionNumber || '?')}${current ? ' · current' : ''}`}</strong>
        <div className="mono small muted">{String(textFingerprint || '').slice(0, 12)}</div>
      </div>
    </div>
  );
}

function actionButtons(
  job: TranslationJob,
  app: AppContextValue,
  navigate: NavigateFunction,
): ReactElement {
  const buttons: ReactElement[] = [];
  if (ACTIVE.has(job.status)) {
    buttons.push(
      <button
        className="mini danger"
        key="stop"
        onClick={() => void app.cancelJob(job.sessionId, job.id)}
      >
        ■ Stop
      </button>,
    );
  }
  if (RETRYABLE.has(job.status)) {
    buttons.push(
      <button className="mini" key="retry" onClick={() => void app.retryJob(job.sessionId, job.id)}>
        ↻ Retry
      </button>,
    );
  }
  if (TERMINAL.has(job.status)) {
    buttons.push(
      <button
        className="mini danger ghost"
        key="del"
        onClick={() => {
          if (confirm('Delete this translation lifecycle and owned cache?')) {
            void app.deleteJob(job.sessionId, job.id);
          }
        }}
      >
        <Trash2 size={16} strokeWidth={1.75} /> Delete
      </button>,
    );
  }
  buttons.push(
    <button
      className="mini ghost"
      key="view"
      onClick={() =>
        void navigate(
          `/translations/${encodeURIComponent(job.sessionId)}/${encodeURIComponent(job.id)}`,
        )
      }
    >
      <Eye size={16} strokeWidth={1.75} /> View
    </button>,
  );
  return <div className="actions">{buttons}</div>;
}

function compactSession(value: unknown): string {
  const text = String(value || 'session');
  return text.length > 22 ? `${text.slice(0, 20)}…` : text;
}

function searchableText(row: TranslationTableRow): string {
  return [
    'taskId' in row ? row.taskId : '',
    'title' in row ? row.title : '',
    'viewLanguage' in row ? row.viewLanguage : '',
    'effectiveLanguage' in row ? row.effectiveLanguage : '',
    'translationState' in row ? row.translationState : '',
    row.sessionId,
    'session' in row ? row.session?.label : '',
    'status' in row ? row.status : '',
    'id' in row ? row.id : '',
    'error' in row ? row.error : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function sortIndicator(value: false | 'asc' | 'desc'): string {
  return value === 'asc' ? ' ↑' : value === 'desc' ? ' ↓' : '';
}

function languageBadge(language: string | undefined): ReactElement {
  return (
    <span className={`language-badge ${language || ''}`}>
      {language === 'hu' ? '🇭🇺 HU' : '🇬🇧 EN'}
    </span>
  );
}

function currentStateLabel(state: string | undefined): string {
  const labels: Record<string, string> = {
    ready: '✅ ready',
    missing: '○ missing',
    failed: '⚠ failed',
    queued: '⏳ queued',
    translating: '🌍 translating',
    validating: '🔎 validating',
    retrying: '🔁 retrying',
    canceling: '🛑 canceling',
  };
  return labels[state || ''] || state || 'none';
}

function fmtDate(v: unknown): string {
  if (!v) return 'none';
  try {
    return new Date(String(v)).toLocaleString();
  } catch {
    return String(v);
  }
}
const formatDate = fmtDate;

function JobDetail({ job, onClose }: { job: TranslationJob; onClose: () => void }): ReactElement {
  const runs = [...(job.runs || []), job];
  return (
    <div className="detail-card">
      <div className="detail-head">
        <div>
          <div className="eyebrow">
            <Microscope size={14} strokeWidth={1.75} className="inline-icon" /> TRANSLATION DEBUG
          </div>
          <h2>
            {`Task #${job.taskId} · v${String(job.versionNumber || '?')} · ${statusLabel(job.status)}`}
          </h2>
        </div>
        <button className="icon-btn" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="detail-grid">
        {metric('Job', job.id)}
        {metric('Fingerprint', job.textFingerprint)}
        {metric('Provider', job.provider || 'agy')}
        {metric('Model', job.model)}
        {metric('Trigger', job.trigger)}
        {metric('Run', job.run || 1)}
        {metric('Duration', duration(job))}
      </div>
      {job.error ? section('❌ Error', job.error, 'error-panel') : null}
      {runs.map((run, runIndex) => (
        <section className="run" key={runIndex}>
          <h3>
            {`Run ${(run.run || runIndex + 1).toString()}${runIndex === runs.length - 1 ? ' · current' : ''}${run.trigger ? ` · ${run.trigger}` : ''}`}
          </h3>
          {(run.attempts || []).map((attempt, index) => (
            <Attempt attempt={attempt} index={index + 1} key={index} />
          ))}
        </section>
      ))}
    </div>
  );
}

function Attempt({ attempt, index }: { attempt: TranslationAttempt; index: number }): ReactElement {
  const translator = attempt.translator || {};
  const validator = attempt.validator;
  return (
    <div className="attempt">
      <h4>{`Attempt ${index.toString()}`}</h4>
      {section('Translator instructions', translator.agentInstructions)}
      {section('Exact prompt sent', translator.exactPrompt)}
      {section('Protected source', prettySource(translator.protectedSource))}
      {section('Exact model output', humanModelOutput(translator, 'translator'))}
      {rawSection(
        <>
          <Wrench size={16} strokeWidth={1.75} className="inline-icon" /> Raw provider payload
        </>,
        translator.rawResponse,
      )}
      {section(
        <>
          <Puzzle size={16} strokeWidth={1.75} className="inline-icon" /> Parsed translation
        </>,
        prettyCandidate(translator.parsedCandidateRestored || translator.structuredOutput),
      )}
      {checks(translator.deterministicChecks)}
      {validator && Object.keys(validator).length > 0 ? (
        <>
          {section(
            <>
              <Search size={16} strokeWidth={1.75} className="inline-icon" /> Validator instructions
            </>,
            validator.agentInstructions,
          )}
          {section('Exact validator prompt', validator.exactPrompt)}
          {section('Exact validator output', humanModelOutput(validator, 'validator'))}
          {rawSection(
            <>
              <Wrench size={16} strokeWidth={1.75} className="inline-icon" /> Raw validator provider
              payload
            </>,
            validator.rawResponse,
          )}
          {section(
            <>
              <Search size={16} strokeWidth={1.75} className="inline-icon" /> Validator verdict
            </>,
            prettyVerdict(validator.parsedVerdict || validator.structuredOutput),
          )}
        </>
      ) : (
        section(
          <>
            <Search size={16} strokeWidth={1.75} className="inline-icon" /> Validator
          </>,
          'Skipped - deterministic precheck rejected this candidate.',
        )
      )}
      {attempt.issues && attempt.issues.length > 0
        ? section('Issues', attempt.issues.map((item) => `• ${item}`).join('\n'), 'warning-panel')
        : null}
      <div className="usage-row">
        {metric('Translator', `${Number(translator.durationSeconds || 0).toFixed(2)}s`)}
        {metric('Translator tokens', usage(translator.usage))}
        {validator ? metric('Validator tokens', usage(validator.usage)) : null}
      </div>
    </div>
  );
}

function parseRawObject(raw: unknown): Record<string, unknown> | null {
  if (typeof raw !== 'string') return null;
  try {
    const value: unknown = JSON.parse(raw);
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

function humanModelOutput(meta: TranslationAgentMeta | undefined, kind: string): string {
  const value = meta?.structuredOutput || parseRawObject(meta?.rawResponse);
  if (isRecord(value)) {
    if (kind === 'validator' && ('valid' in value || Array.isArray(value['issues']))) {
      return prettyVerdict(value);
    }
    if ('title' in value || 'description' in value) {
      return prettyCandidate(value);
    }
  }
  return typeof meta?.rawResponse === 'string' ? meta.rawResponse : 'none';
}

function rawSection(title: React.ReactNode, text: unknown): ReactElement | null {
  if (text == null || text === '') return null;
  const content = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
  return (
    <details className="diag raw-payload">
      <summary>{title} · developer view</summary>
      <div className="diag-title">
        <button className="copy" onClick={() => void navigator.clipboard?.writeText(content)}>
          <Copy size={16} strokeWidth={1.75} /> Copy raw
        </button>
      </div>
      <pre>{content}</pre>
    </details>
  );
}

function checks(
  value: { valid?: boolean | undefined; issues?: string[] | undefined } | undefined,
): ReactElement | null {
  if (!value) return null;
  return section(
    value.valid ? '✅ Deterministic checks passed' : '❌ Deterministic checks failed',
    value.valid
      ? 'All deterministic structure/protected-span checks passed.'
      : (value.issues || []).map((item) => `• ${String(item)}`).join('\n'),
    value.valid ? 'ok-panel' : 'error-panel',
  );
}

function section(title: React.ReactNode, text: unknown, className = ''): ReactElement | null {
  if (text == null || text === '') return null;
  const content = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
  return (
    <section className={`diag ${className}`}>
      <div className="diag-title">
        {title}
        <button className="copy" onClick={() => void navigator.clipboard?.writeText(content)}>
          <Copy size={16} strokeWidth={1.75} /> Copy
        </button>
      </div>
      <pre>{content}</pre>
    </section>
  );
}

const metric = (key: string, value: unknown): ReactElement => {
  const display =
    typeof value === 'string' ? value : typeof value === 'number' ? value.toString() : 'none';
  return (
    <div className="metric">
      <small>{key}</small>
      <strong>{display}</strong>
    </div>
  );
};

const prettySource = (value: unknown): string => {
  if (!isRecord(value)) return '';
  const title = typeof value['title'] === 'string' ? value['title'] : '';
  const desc = typeof value['description'] === 'string' ? value['description'] : '';
  return `Title\n${title}\n\nDescription\n${desc}`;
};

const prettyCandidate = prettySource;

const prettyVerdict = (value: unknown): string => {
  if (!isRecord(value)) return '';
  const valid = Boolean(value['valid']);
  const issues = Array.isArray(value['issues'])
    ? value['issues'].map((item) => `• ${String(item)}`).join('\n')
    : '';
  return `Valid: ${valid ? 'yes' : 'no'}\n${issues}`;
};

const statusLabel = (status: string | undefined = ''): string => {
  const labels: Record<string, string> = {
    success: '✅ success',
    validation_failed: '❌ validation failed',
    error: '❌ error',
    canceled: '🛑 canceled',
    interrupted: '🛑 interrupted',
    translating: '🌍 translating',
    validating: '🔎 validating',
    retrying: '🔁 retrying',
    queued: '⏳ queued',
    canceling: '🛑 canceling',
  };
  return labels[status] || status;
};

function durationSeconds(job: TranslationJob): number {
  if (job.durationSeconds) return Number(job.durationSeconds) || 0;
  if (!job.startedAt) return 0;
  const end = job.finishedAt ? new Date(job.finishedAt) : new Date();
  return Math.max(0, (end.getTime() - new Date(job.startedAt).getTime()) / 1000);
}

function duration(job: TranslationJob): string {
  const value = durationSeconds(job);
  return value ? `${Math.round(value).toString()}s` : 'none';
}

function usage(value: TranslationUsage | undefined): string {
  if (!value) return 'none';
  const tokensVal = value.total_tokens ?? value.totalTokens;
  return tokensVal !== undefined ? String(tokensVal) : 'none';
}

function tokenCount(job: TranslationJob): number {
  const current = (job.attempts || []).reduce(
    (sum, attempt) =>
      sum +
      Number(
        attempt.translator?.usage?.total_tokens || attempt.translator?.usage?.totalTokens || 0,
      ) +
      Number(attempt.validator?.usage?.total_tokens || attempt.validator?.usage?.totalTokens || 0),
    0,
  );
  const old = (job.runs || []).reduce(
    (sum, run) =>
      sum +
      (run.attempts || []).reduce(
        (inner, attempt) =>
          inner +
          Number(
            attempt.translator?.usage?.total_tokens || attempt.translator?.usage?.totalTokens || 0,
          ) +
          Number(
            attempt.validator?.usage?.total_tokens || attempt.validator?.usage?.totalTokens || 0,
          ),
        0,
      ),
    0,
  );
  return current + old;
}

function tokens(job: TranslationJob): string {
  const count = tokenCount(job);
  return count ? String(count) : 'none';
}
