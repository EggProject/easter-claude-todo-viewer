import React, { useMemo, useState } from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { useApp } from '../app-context.js';

const h = React.createElement;
const HISTORY_DEFAULTS = { defaultOpen: false };
const ORIGIN_FILTERS = [
  ['source', '🇬🇧 Source'],
  ['translation', '🌐 Translation'],
];
const CHANGE_FILTERS = [
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

export function TaskHistory({ task }) {
  const app = useApp();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [originEnabled, setOriginEnabled] = useState(() => new Set(ORIGIN_FILTERS.map(([value]) => value)));
  const [changeEnabled, setChangeEnabled] = useState(() => new Set(CHANGE_FILTERS.map(([value]) => value)));

  const events = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = (app.history || []).filter(event => event.sessionId === task.sessionId && event.uid === task.uid).filter(event => {
      if (!originEnabled.has(eventOrigin(event))) return false;
      const types = eventChangeTypes(event);
      if (![...types].some(type => changeEnabled.has(type))) return false;
      if (!needle) return true;
      return searchable(event).includes(needle);
    });
    filtered.sort((a, b) => String(a.detectedAt || '').localeCompare(String(b.detectedAt || '')) * (sort === 'oldest' ? 1 : -1));
    return filtered;
  }, [app.history, task.sessionId, task.uid, query, sort, originEnabled, changeEnabled]);

  const toggleFilter = (setter, value) => setter(current => {
    const next = new Set(current);
    if (next.has(value)) next.delete(value); else next.add(value);
    return next;
  });

  return h('section', { className: 'drawer-section task-history' },
    h('div', { className: 'section-title history-title' }, h('span', null, `🕘 History · ${(app.history || []).filter(event => event.sessionId === task.sessionId && event.uid === task.uid).length}`)),
    h('div', { className: 'history-controls' },
      h('input', { className: 'history-filter', value: query, onChange: event => setQuery(event.target.value), placeholder: 'Filter history…' }),
      h('select', { value: sort, onChange: event => setSort(event.target.value), 'aria-label': 'Sort history' },
        h('option', { value: 'newest' }, 'Newest first'),
        h('option', { value: 'oldest' }, 'Oldest first')),
    ),
    h('div', { className: 'history-filter-group' },
      h('span', { className: 'history-filter-group-label' }, 'Origin'),
      h('div', { className: 'history-filter-chips' }, ...ORIGIN_FILTERS.map(([value, label]) => h('label', { key: value, className: `history-filter-chip${originEnabled.has(value) ? ' active' : ''}` },
        h('input', { type: 'checkbox', checked: originEnabled.has(value), onChange: () => toggleFilter(setOriginEnabled, value) }), h('span', null, label))))),
    h('div', { className: 'history-filter-group' },
      h('span', { className: 'history-filter-group-label' }, 'Change type'),
      h('div', { className: 'history-filter-chips' }, ...CHANGE_FILTERS.map(([value, label]) => h('label', { key: value, className: `history-filter-chip${changeEnabled.has(value) ? ' active' : ''}` },
        h('input', { type: 'checkbox', checked: changeEnabled.has(value), onChange: () => toggleFilter(setChangeEnabled, value) }), h('span', null, label))))),
    events.length
      ? h('div', { className: 'history-events' }, ...events.map(event => h(HistoryEvent, { event, key: event.id })))
      : h('div', { className: 'empty compact' }, 'No history events match the current filters.'),
  );
}

function HistoryEvent({ event }) {
  const icon = eventIcon(event);
  const title = eventTitle(event);
  return h('details', { className: `history-event ${event.kind || ''}`, open: HISTORY_DEFAULTS.defaultOpen },
    h('summary', null,
      h('span', { className: 'history-event-icon' }, icon),
      h('span', { className: 'history-event-main' }, h('strong', null, title), h('small', null, formatTime(event.detectedAt))),
      h('span', { className: 'history-event-source' }, event.source === 'translation' ? 'HU' : 'EN')),
    h('div', { className: 'history-event-body' },
      event.source === 'translation' ? h('div', { className: 'history-language-note hu' }, '🌐 Translation completed — EN → HU') : h('div', { className: 'history-language-note en' }, '🇬🇧 Original task event'),
      ...(event.changes || []).map((change, index) => h(ChangeView, { change, key: `${change.field || index}-${index}` })),
      event.provider ? h('div', { className: 'history-meta mono' }, `provider=${event.provider} · model=${event.model || '—'} · run=${event.run || 1}`) : null,
    ),
  );
}

function ChangeView({ change }) {
  const textChange = change.field === 'subject' || change.field === 'description';
  const icon = fieldIcon(change.field);
  if (textChange) {
    return h('section', { className: 'history-change text-change' },
      h('div', { className: 'history-change-label' }, `${icon} ${change.label || change.field}`),
      h('div', { className: 'history-diff-wrap' }, h(ReactDiffViewer, {
        oldValue: stringify(change.before),
        newValue: stringify(change.after),
        splitView: false,
        compareMethod: DiffMethod.WORDS,
        useDarkTheme: true,
        hideLineNumbers: false,
        styles: DIFF_STYLES,
      })),
    );
  }
  return h('section', { className: 'history-change simple-change' },
    h('div', { className: 'history-change-label' }, `${icon} ${change.label || change.field}`),
    h('div', { className: 'history-before-after' },
      h('div', null, h('small', null, 'BEFORE'), h('div', { className: 'before' }, stringify(change.before))),
      h('div', { className: 'history-arrow', 'aria-hidden': true }, '→'),
      h('div', null, h('small', null, 'AFTER'), h('div', { className: 'after' }, stringify(change.after))),
    ),
  );
}

function eventOrigin(event) {
  return event.source === 'translation' ? 'translation' : 'source';
}

function eventChangeTypes(event) {
  const result = new Set();
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

function eventIcon(event) {
  if (event.kind === 'translated') return '🌐';
  if (event.kind === 'created') return '✨';
  if (event.kind === 'deleted') return '🗑️';
  const fields = new Set((event.changes || []).map(change => change.field));
  if (fields.has('status')) return '📌';
  if (fields.has('description') || fields.has('subject')) return '📝';
  if (fields.has('blockedBy') || fields.has('blocks')) return '🔒';
  if (fields.has('owner')) return '👤';
  return '⚡';
}

function eventTitle(event) {
  if (event.kind === 'translated') return 'Hungarian translation ready';
  if (event.kind === 'created') return 'Task created';
  if (event.kind === 'deleted') return 'Task removed';
  const changes = event.changes || [];
  if (changes.length === 1) return `${changes[0].label || changes[0].field} changed`;
  return `${changes.length} fields changed`;
}

function fieldIcon(field) {
  return ({ status: '📌', subject: '🏷️', description: '📝', owner: '👤', blockedBy: '🔒', blocks: '🚧', activeForm: '⚡', metadata: '🧩' }[field] || '🔹');
}

function searchable(event) {
  const values = [event.kind, event.source, event.title, event.taskId, event.provider, event.model];
  for (const change of event.changes || []) values.push(change.field, change.label, stringify(change.before), stringify(change.after));
  return values.filter(Boolean).join(' ').toLowerCase();
}

function stringify(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

function formatTime(value) {
  if (!value) return '—';
  try { return new Date(value).toLocaleString(); } catch { return String(value); }
}
