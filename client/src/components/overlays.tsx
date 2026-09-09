import React, { ReactElement, useEffect, useMemo } from 'react';
import {
  Bell,
  Layers,
  Globe,
  Sparkles,
  Trash2,
  Pin,
  FileEdit,
  Lock,
  User,
  Puzzle,
  Tag,
  Zap,
  ShieldAlert,
  Construction,
} from 'lucide-react';
import { useApp } from '../app-context.js';
import { TaskLanguageBadge } from './language-badge.js';
import { usePersistentLocalState } from '../filter-state.js';
import { HistoryChange, HistoryEvent, ModalSummaryItem } from '../types.js';

function fmt(value: unknown): string {
  if (value == null) return 'none';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function changeRows(changes: HistoryChange[] = []): ReactElement[] {
  return changes.map((change, index) => (
    <div
      className="modal-change"
      key={`${change.field || change.label || 'change'}-${index.toString()}`}
    >
      <b>
        {fieldIcon(change.field)} {change.label || change.field || 'Change'}
      </b>
      <div className="modal-change-values">
        <span className="before">{fmt(change.before)}</span>
        <span className="change-arrow" aria-hidden="true">
          →
        </span>
        <span className="after">{fmt(change.after)}</span>
      </div>
    </div>
  ));
}

function notificationBlocks(events: HistoryEvent[] = []): ReactElement[] {
  return events.map((event, index) => (
    <section
      className="modal-task-event"
      key={event.id || `${event.taskId || 'task'}-${index.toString()}`}
    >
      <div className="modal-task-title">
        <span>
          {historyEventIcon(event)} #{event.taskId || 'none'} {event.title || event.subject || ''}
        </span>
        {event.taskSnapshot ? <TaskLanguageBadge task={event.taskSnapshot} compact /> : null}
      </div>
      {changeRows(event.changes || [])}
    </section>
  ));
}

export function NotificationSidebar(): ReactElement | null {
  const app = useApp();
  const [historyFilters, setHistoryFilters] = usePersistentLocalState(
    'claude-todos:history-filters',
    { q: '', session: 'all', type: 'all', sort: 'newest' },
  );
  const historyQuery = historyFilters.q || '';
  const historySessionFilter = historyFilters.session || 'all';
  const historyTypeFilter = historyFilters.type || 'all';
  const historySort = historyFilters.sort || 'newest';

  const setHistoryFilter = (key: string, value: string): void =>
    setHistoryFilters((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    if (!app.sidebar) return undefined;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') app.setSidebar(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [app]);

  const events = useMemo(() => {
    const needle = historyQuery.trim().toLowerCase();
    const result = (app.history || []).filter((event) => {
      if (historySessionFilter !== 'all' && event.sessionId !== historySessionFilter) return false;
      if (historyTypeFilter !== 'all' && historyEventType(event) !== historyTypeFilter)
        return false;
      if (needle && !historySearchText(event).includes(needle)) return false;
      return true;
    });
    result.sort(
      (a, b) =>
        String(a.detectedAt || '').localeCompare(String(b.detectedAt || '')) *
        (historySort === 'oldest' ? 1 : -1),
    );
    return result;
  }, [app.history, historyQuery, historySessionFilter, historyTypeFilter, historySort]);

  if (!app.sidebar) return null;
  const watched = app.watchedSessions || [];

  return (
    <>
      <button
        type="button"
        aria-label="Close sidebar backdrop"
        className="panel-backdrop"
        onClick={() => app.setSidebar(false)}
      />
      <aside className="sidebar open common-history-sidebar">
        <div className="side-head">
          <div>
            <h3>
              <Bell size={18} strokeWidth={1.75} className="inline-icon" /> Session history
            </h3>
            <div className="muted small">{`${events.length.toString()} matching event(s)`}</div>
          </div>
          <button className="icon-btn" onClick={() => app.setSidebar(false)}>
            Close
          </button>
        </div>
        <div className="history-sidebar-controls">
          <input
            className="history-filter"
            value={historyQuery}
            onChange={(event) => setHistoryFilter('q', event.target.value)}
            placeholder="Filter history…"
          />
          <select
            value={historySessionFilter}
            onChange={(event) => setHistoryFilter('session', event.target.value)}
            aria-label="Filter history session"
          >
            <option value="all">All watched sessions</option>
            {watched.map((session) => (
              <option value={session.id} key={session.id}>
                {session.label || session.summary || session.id}
              </option>
            ))}
          </select>
          <select
            value={historyTypeFilter}
            onChange={(event) => setHistoryFilter('type', event.target.value)}
            aria-label="Filter history event type"
          >
            <option value="all">All event types</option>
            <option value="translation">Translation</option>
            <option value="lifecycle">Lifecycle</option>
            <option value="status">Status</option>
            <option value="text">Text</option>
            <option value="dependency">Dependency</option>
            <option value="owner">Owner</option>
            <option value="other">Other</option>
          </select>
          <select
            value={historySort}
            onChange={(event) => setHistoryFilter('sort', event.target.value)}
            aria-label="Sort history"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
        <div className="side-body common-history-list">
          {events.length > 0 ? (
            events.map((event, index) => (
              <HistoryCard
                event={event}
                key={`${event.sessionId || 'session'}:${event.id || index.toString()}`}
              />
            ))
          ) : (
            <div className="empty">No history events match the current filters.</div>
          )}
        </div>
      </aside>
    </>
  );
}

function HistoryCard({ event }: { event: HistoryEvent }): ReactElement {
  const sessionLabel = event.session?.label || event.sessionId || 'session';
  return (
    <details className={`history-card history-event ${event.kind || ''}`}>
      <summary>
        <span className="history-event-icon">{historyEventIcon(event)}</span>
        <span className="history-event-main">
          <div className="history-title-with-badge">
            <strong>
              <Layers size={14} strokeWidth={1.75} className="inline-icon" />{' '}
              {`${compact(sessionLabel)} · #${event.taskId || 'none'} · ${historyEventTitle(event)}`}
            </strong>
            {event.taskSnapshot ? <TaskLanguageBadge task={event.taskSnapshot} compact /> : null}
          </div>
          <small>{formatDate(event.detectedAt)}</small>
        </span>
        <span className="history-event-source">{event.source === 'translation' ? 'HU' : 'EN'}</span>
      </summary>
      <div className="history-event-body">
        <div className={`history-language-note ${event.source === 'translation' ? 'hu' : 'en'}`}>
          {event.source === 'translation'
            ? 'Translation completed - EN → HU'
            : 'EN Original task event'}
        </div>
        <div className="muted small mono">{event.sessionId || ''}</div>
        {(event.changes || []).map((change, index) => (
          <div className="change" key={index}>
            <b>{`${fieldIcon(change.field)} ${change.label || change.field}`}</b>
            <div>
              <span className="before">{fmt(change.before)}</span>
              {' → '}
              <span className="after">{fmt(change.after)}</span>
            </div>
          </div>
        ))}
        {event.provider ? (
          <div className="history-meta mono">
            {`provider=${event.provider} · model=${event.model || 'none'} · run=${(event.run || 1).toString()}`}
          </div>
        ) : null}
      </div>
    </details>
  );
}

export function RequiredModal(): ReactElement | null {
  const app = useApp();
  const modal = app.modal;
  if (!modal) return null;

  const isError = modal.kind === 'translation-error' || modal.kind === 'error';
  const isNotification = modal.kind === 'notification';
  const isBulkSummary = modal.kind === 'bulk-summary';

  const notificationEvents: HistoryEvent[] =
    isNotification && Array.isArray(modal.changes)
      ? modal.changes.filter(
          (c): c is HistoryEvent =>
            typeof c === 'object' && c !== null && ('taskId' in c || 'changes' in c),
        )
      : [];

  let body: ReactElement[] = [];
  if (isNotification) {
    body = notificationBlocks(notificationEvents);
  } else if (Array.isArray(modal.changes)) {
    const rawChanges: HistoryChange[] = modal.changes.filter(
      (c): c is HistoryChange =>
        typeof c === 'object' && c !== null && ('field' in c || 'before' in c),
    );
    body = changeRows(rawChanges);
  }

  if (isBulkSummary && modal.summary) {
    const labels: Record<string, string> = {
      selected: 'Selected / considered',
      stopped: 'Stopped',
      retryStarted: 'Retry started',
      deleted: 'Deleted',
      skippedSuccess: 'Skipped success',
      skippedActive: 'Skipped active',
      skippedTerminal: 'Skipped terminal',
      skippedNotRetryable: 'Skipped not retryable',
      skippedMissing: 'Missing',
    };
    const summary = modal.summary;
    body = Object.entries(labels)
      .filter(([key]) => Number(summary[key] || 0) > 0 || key === 'selected')
      .map(([key, label]) => (
        <div className="bulk-summary-row" key={key}>
          <span>{label}</span>
          <strong>{(Number(summary[key]) || 0).toString()}</strong>
        </div>
      ));

    const errors: ModalSummaryItem[] = Array.isArray(summary.errors) ? summary.errors : [];
    if (errors.length > 0) {
      body.push(
        <div className="error-box" key="errors">
          <b>{`Errors · ${errors.length.toString()}`}</b>
          {errors.map((item, index) => (
            <div key={index}>
              {`${item.sessionId ? `${compact(item.sessionId)} · ` : ''}${item.jobId || 'job'}: ${item.message || ''}`}
            </div>
          ))}
        </div>,
      );
    }
  }

  if (modal.failures && modal.failures.length > 0) {
    body = modal.failures.map((failure, index) => (
      <div className="error-box" key={index}>
        <b>{`Task #${failure.taskId || ''}`}</b>
        <div>{failure.message || modal.message}</div>
      </div>
    ));
  }

  if (body.length === 0 && modal.message) {
    body = [<div key={0}>{modal.message}</div>];
  }

  let title = modal.title;
  if (!title && isNotification) {
    title =
      notificationEvents.length === 1
        ? `Task #${notificationEvents[0]?.taskId || 'none'} updated`
        : `${notificationEvents.length.toString()} task updates`;
  }
  if (!title) {
    title = modal.taskId ? `Task #${modal.taskId} could not be translated` : 'Session updated';
  }
  const modalSession = modal.session;

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <div className={`modal-kicker ${isError ? 'error' : ''}`}>
          {isError ? '❌ TRANSLATION FAILED' : '✨ CLAUDE TASK UPDATE'}
        </div>
        {modalSession ? (
          <div
            className="modal-session"
            title={`${modalSession.id || ''}\n${modalSession.cwd || ''}`}
          >
            <Layers size={14} strokeWidth={1.75} className="inline-icon" />{' '}
            {modalSession.label || modalSession.id || 'Session'}
          </div>
        ) : null}
        <h2>{title}</h2>
        <div className="modal-list">{body}</div>
        {isError ? (
          <div className="debug-hint">
            <ShieldAlert size={14} strokeWidth={1.75} className="inline-icon" /> Run the server with
            --log-output --log-file for detailed diagnostics.
          </div>
        ) : null}
        <div className="modal-actions">
          <button className="primary" onClick={app.acknowledge}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

type HistoryEventType =
  'translation' | 'lifecycle' | 'status' | 'text' | 'dependency' | 'owner' | 'other';

function historyEventType(event: HistoryEvent): HistoryEventType {
  if (event.source === 'translation' || event.kind === 'translated') return 'translation';
  if (event.kind === 'created' || event.kind === 'deleted') return 'lifecycle';
  const fields = new Set((event.changes || []).map((change) => change.field));
  if (fields.has('status')) return 'status';
  if (fields.has('subject') || fields.has('description')) return 'text';
  if (fields.has('blockedBy') || fields.has('blocks')) return 'dependency';
  if (fields.has('owner')) return 'owner';
  return 'other';
}

function historyEventIcon(event: HistoryEvent): ReactElement {
  const type = historyEventType(event);
  if (type === 'translation') return <Globe size={14} strokeWidth={1.75} className="inline-icon" />;
  if (type === 'lifecycle')
    return event.kind === 'deleted' ? (
      <Trash2 size={14} strokeWidth={1.75} className="inline-icon" />
    ) : (
      <Sparkles size={14} strokeWidth={1.75} className="inline-icon" />
    );
  if (type === 'status') return <Pin size={14} strokeWidth={1.75} className="inline-icon" />;
  if (type === 'text') return <FileEdit size={14} strokeWidth={1.75} className="inline-icon" />;
  if (type === 'dependency') return <Lock size={14} strokeWidth={1.75} className="inline-icon" />;
  if (type === 'owner') return <User size={14} strokeWidth={1.75} className="inline-icon" />;
  return <Puzzle size={14} strokeWidth={1.75} className="inline-icon" />;
}

function historyEventTitle(event: HistoryEvent): string {
  if (event.kind === 'translated') return 'Translation ready';
  if (event.kind === 'created') return 'Task created';
  if (event.kind === 'deleted') return 'Task removed';
  const changes = event.changes || [];
  return changes.length === 1 && changes[0]
    ? `${changes[0].label || changes[0].field} changed`
    : `${changes.length.toString()} fields changed`;
}

function fieldIcon(field: string | undefined): ReactElement {
  switch (field) {
    case 'status': {
      return <Pin size={14} strokeWidth={1.75} className="inline-icon" />;
    }
    case 'subject': {
      return <Tag size={14} strokeWidth={1.75} className="inline-icon" />;
    }
    case 'description': {
      return <FileEdit size={14} strokeWidth={1.75} className="inline-icon" />;
    }
    case 'owner': {
      return <User size={14} strokeWidth={1.75} className="inline-icon" />;
    }
    case 'blockedBy': {
      return <Lock size={14} strokeWidth={1.75} className="inline-icon" />;
    }
    case 'blocks': {
      return <Construction size={14} strokeWidth={1.75} className="inline-icon" />;
    }
    case 'activeForm': {
      return <Zap size={14} strokeWidth={1.75} className="inline-icon" />;
    }
    case 'metadata': {
      return <Puzzle size={14} strokeWidth={1.75} className="inline-icon" />;
    }
    default: {
      return <Puzzle size={14} strokeWidth={1.75} className="inline-icon" />;
    }
  }
}

function historySearchText(event: HistoryEvent): string {
  const values: (string | undefined)[] = [
    event.sessionId,
    event.session?.label,
    event.kind,
    event.source,
    event.title,
    event.taskId,
    event.provider,
    event.model,
  ];
  for (const change of event.changes || []) {
    values.push(change.field, change.label, fmt(change.before), fmt(change.after));
  }
  return values
    .filter((x): x is string => Boolean(x))
    .join(' ')
    .toLowerCase();
}

function formatDate(v: string | null | undefined): string {
  if (!v) return 'none';
  try {
    return new Date(String(v)).toLocaleString();
  } catch {
    return String(v);
  }
}

function compact(value: unknown): string {
  const text = String(value || '');
  return text.length > 28 ? `${text.slice(0, 26)}…` : text;
}
