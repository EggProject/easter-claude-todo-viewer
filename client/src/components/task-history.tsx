import React, { ReactElement, useMemo, useState } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { useApp } from '../app-context.js';
import { HistoryChange, HistoryEvent, Task } from '../types.js';

const HISTORY_DEFAULTS = { defaultOpen: false };
const ORIGIN_FILTERS: [string, string][] = [
  ['source', '🇬🇧 Source'],
  ['translation', '🌐 Translation'],
];
const CHANGE_FILTERS: [string, string][] = [
  ['lifecycle', '✨ Lifecycle'],
  ['status', '📌 Status'],
  ['owner', '👤 Owner'],
  ['dependency', '🔒 Dependency'],
  ['text', '✍️ Text'],
  ['other', '🧩 Other'],
];

const DIFF_STYLES = {
  variables: {
    dark: {
      diffViewerBackground: '#11111b',
      diffViewerColor: '#cdd6f4',
      addedBackground: '#183323',
      addedColor: '#a6e3a1',
      removedBackground: '#3a1d29',
      removedColor: '#f38ba8',
      wordAddedBackground: '#255c3a',
      wordRemovedBackground: '#6b253b',
      addedGutterBackground: '#183323',
      removedGutterBackground: '#3a1d29',
      gutterBackground: '#181825',
      gutterBackgroundDark: '#181825',
      highlightBackground: '#313244',
      highlightGutterBackground: '#313244',
    },
  },
  line: { fontSize: '12px', lineHeight: '1.55' },
  contentText: { fontFamily: 'SFMono-Regular, Consolas, Liberation Mono, monospace' },
};

export interface TaskHistoryProps {
  task: Task;
}

export function TaskHistory({ task }: TaskHistoryProps): ReactElement {
  const app = useApp();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [originEnabled, setOriginEnabled] = useState<Set<string>>(
    () => new Set(ORIGIN_FILTERS.map(([value]) => value)),
  );
  const [changeEnabled, setChangeEnabled] = useState<Set<string>>(
    () => new Set(CHANGE_FILTERS.map(([value]) => value)),
  );

  const events = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = (app.history || [])
      .filter((event) => event.sessionId === task.sessionId && event.uid === task.uid)
      .filter((event) => {
        if (!originEnabled.has(eventOrigin(event))) return false;
        const types = eventChangeTypes(event);
        if (![...types].some((type) => changeEnabled.has(type))) return false;
        if (!needle) return true;
        return searchable(event).includes(needle);
      });
    filtered.sort(
      (a, b) =>
        String(a.detectedAt || '').localeCompare(String(b.detectedAt || '')) *
        (sort === 'oldest' ? 1 : -1),
    );
    return filtered;
  }, [app.history, task.sessionId, task.uid, query, sort, originEnabled, changeEnabled]);

  const toggleFilter = (
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    value: string,
  ): void =>
    setter((current) => {
      const next = new Set(current);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });

  const matchingCount = (app.history || []).filter(
    (event) => event.sessionId === task.sessionId && event.uid === task.uid,
  ).length;

  return (
    <section className="drawer-section task-history">
      <div className="section-title history-title">
        <span>{`🕘 History · ${matchingCount.toString()}`}</span>
      </div>
      <div className="history-controls">
        <input
          className="history-filter"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Filter history…"
        />
        <select
          value={sort}
          onChange={(event) => setSort(event.target.value)}
          aria-label="Sort history"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>
      <div className="history-filter-group">
        <span className="history-filter-group-label">Origin</span>
        <div className="history-filter-chips">
          {ORIGIN_FILTERS.map(([value, label]) => (
            <label
              key={value}
              className={`history-filter-chip${originEnabled.has(value) ? ' active' : ''}`}
            >
              <input
                type="checkbox"
                checked={originEnabled.has(value)}
                onChange={() => toggleFilter(setOriginEnabled, value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="history-filter-group">
        <span className="history-filter-group-label">Change type</span>
        <div className="history-filter-chips">
          {CHANGE_FILTERS.map(([value, label]) => (
            <label
              key={value}
              className={`history-filter-chip${changeEnabled.has(value) ? ' active' : ''}`}
            >
              <input
                type="checkbox"
                checked={changeEnabled.has(value)}
                onChange={() => toggleFilter(setChangeEnabled, value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>
      {events.length > 0 ? (
        <div className="history-events">
          {events.map((event) => (
            <HistoryEventCard event={event} key={event.id} />
          ))}
        </div>
      ) : (
        <div className="empty compact">No history events match the current filters.</div>
      )}
    </section>
  );
}

function HistoryEventCard({ event }: { event: HistoryEvent }): ReactElement {
  const icon = eventIcon(event);
  const title = eventTitle(event);
  return (
    <details className={`history-event ${event.kind || ''}`} open={HISTORY_DEFAULTS.defaultOpen}>
      <summary>
        <span className="history-event-icon">{icon}</span>
        <span className="history-event-main">
          <strong>{title}</strong>
          <small>{formatTime(event.detectedAt)}</small>
        </span>
        <span className="history-event-source">{event.source === 'translation' ? 'HU' : 'EN'}</span>
      </summary>
      <div className="history-event-body">
        {event.source === 'translation' ? (
          <div className="history-language-note hu">🌐 Translation completed - EN → HU</div>
        ) : (
          <div className="history-language-note en">🇬🇧 Original task event</div>
        )}
        {(event.changes || []).map((change, index) => (
          <ChangeView
            change={change}
            key={`${change.field || index.toString()}-${index.toString()}`}
          />
        ))}
        {event.provider ? (
          <div className="history-meta mono">
            {`provider=${event.provider} · model=${event.model || '-'} · run=${(event.run || 1).toString()}`}
          </div>
        ) : null}
      </div>
    </details>
  );
}

function ChangeView({ change }: { change: HistoryChange }): ReactElement {
  const textChange = change.field === 'subject' || change.field === 'description';
  const icon = fieldIcon(change.field);
  if (textChange) {
    return (
      <section className="history-change text-change">
        <div className="history-change-label">{`${icon} ${change.label || change.field}`}</div>
        <div className="history-diff-wrap">
          <ReactDiffViewer
            oldValue={stringify(change.before)}
            newValue={stringify(change.after)}
            splitView={false}
            compareMethod={DiffMethod.WORDS}
            useDarkTheme
            hideLineNumbers={false}
            styles={DIFF_STYLES}
          />
        </div>
      </section>
    );
  }
  return (
    <section className="history-change simple-change">
      <div className="history-change-label">{`${icon} ${change.label || change.field}`}</div>
      <div className="history-before-after">
        <div>
          <small>BEFORE</small>
          <div className="before">{stringify(change.before)}</div>
        </div>
        <div className="history-arrow" aria-hidden="true">
          →
        </div>
        <div>
          <small>AFTER</small>
          <div className="after">{stringify(change.after)}</div>
        </div>
      </div>
    </section>
  );
}

function eventOrigin(event: HistoryEvent): string {
  return event.source === 'translation' ? 'translation' : 'source';
}

function eventChangeTypes(event: HistoryEvent): Set<string> {
  const result = new Set<string>();
  if (event.kind === 'created' || event.kind === 'deleted') result.add('lifecycle');
  for (const change of event.changes || []) {
    if (change.field === 'status') result.add('status');
    else if (change.field === 'owner') result.add('owner');
    else if (change.field === 'blockedBy' || change.field === 'blocks') result.add('dependency');
    else if (change.field === 'subject' || change.field === 'description') result.add('text');
    else result.add('other');
  }
  if (!result.size) result.add('other');
  return result;
}

function eventIcon(event: HistoryEvent): string {
  if (event.kind === 'translated') return '🌐';
  if (event.kind === 'created') return '✨';
  if (event.kind === 'deleted') return '🗑️';
  const fields = new Set((event.changes || []).map((change) => change.field));
  if (fields.has('status')) return '📌';
  if (fields.has('description') || fields.has('subject')) return '📝';
  if (fields.has('blockedBy') || fields.has('blocks')) return '🔒';
  if (fields.has('owner')) return '👤';
  return '⚡';
}

function eventTitle(event: HistoryEvent): string {
  if (event.kind === 'translated') return 'Hungarian translation ready';
  if (event.kind === 'created') return 'Task created';
  if (event.kind === 'deleted') return 'Task removed';
  const changes = event.changes || [];
  if (changes.length === 1 && changes[0]) {
    return `${changes[0].label || changes[0].field} changed`;
  }
  return `${changes.length.toString()} fields changed`;
}

function fieldIcon(field: string | undefined): string {
  if (!field) return '🔹';
  const icons: Record<string, string> = {
    status: '📌',
    subject: '🏷️',
    description: '📝',
    owner: '👤',
    blockedBy: '🔒',
    blocks: '🚧',
    activeForm: '⚡',
    metadata: '🧩',
  };
  return icons[field] || '🔹';
}

function searchable(event: HistoryEvent): string {
  const values: (string | undefined)[] = [
    event.kind,
    event.source,
    event.title,
    event.taskId,
    event.provider,
    event.model,
  ];
  for (const change of event.changes || []) {
    values.push(change.field, change.label, stringify(change.before), stringify(change.after));
  }
  return values
    .filter((x): x is string => Boolean(x))
    .join(' ')
    .toLowerCase();
}

function stringify(value: unknown): string {
  if (value == null || value === '') return '-';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function formatTime(v: unknown): string {
  if (!v) return '-';
  try {
    return new Date(String(v)).toLocaleString();
  } catch {
    return String(v);
  }
}
