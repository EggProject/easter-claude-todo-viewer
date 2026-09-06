import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../app-context.js';
import { TaskLanguageBadge } from './language-badge.js';
import { usePersistentLocalState } from '../filter-state.js';

const h = React.createElement;

function fmt(value) {
  if (value == null) return '—';
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}
function changeRows(changes = []) {
  return changes.map((change, index) => h('div', { className: 'modal-change', key: `${change.field || change.label || 'change'}-${index}` },
    h('b', null, `${fieldIcon(change.field)} ${change.label || change.field || 'Change'}`),
    h('div', { className: 'modal-change-values' }, h('span', { className: 'before' }, fmt(change.before)), h('span', { className: 'change-arrow', 'aria-hidden': true }, '→'), h('span', { className: 'after' }, fmt(change.after)))));
}
function notificationBlocks(events = []) {
  return events.map((event, index) => h('section', { className: 'modal-task-event', key: event.id || `${event.taskId || 'task'}-${index}` },
    h('div', { className: 'modal-task-title' }, h('span',null,`${historyEventIcon(event)} #${event.taskId || '—'} ${event.title || event.subject || ''}`.trim()), event.taskSnapshot ? h(TaskLanguageBadge,{task:event.taskSnapshot,compact:true}) : null),
    ...changeRows(event.changes || [])));
}

export function NotificationSidebar() {
  const app = useApp();
  const [historyFilters, setHistoryFilters] = usePersistentLocalState('claude-todos:history-filters', { q: '', session: 'all', type: 'all', sort: 'newest' });
  const historyQuery = historyFilters.q || '';
  const historySessionFilter = historyFilters.session || 'all';
  const historyTypeFilter = historyFilters.type || 'all';
  const historySort = historyFilters.sort || 'newest';
  const setHistoryFilter = (key, value) => setHistoryFilters(current => ({ ...current, [key]: value }));
  useEffect(() => {
    if (!app.sidebar) return undefined;
    const onKeyDown = event => { if (event.key === 'Escape') app.setSidebar(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [app.sidebar]);

  const events = useMemo(() => {
    const needle = historyQuery.trim().toLowerCase();
    const result = (app.history || []).filter(event => {
      if (historySessionFilter !== 'all' && event.sessionId !== historySessionFilter) return false;
      if (historyTypeFilter !== 'all' && historyEventType(event) !== historyTypeFilter) return false;
      if (needle && !historySearchText(event).includes(needle)) return false;
      return true;
    });
    result.sort((a, b) => String(a.detectedAt || '').localeCompare(String(b.detectedAt || '')) * (historySort === 'oldest' ? 1 : -1));
    return result;
  }, [app.history, historyQuery, historySessionFilter, historyTypeFilter, historySort]);

  if (!app.sidebar) return null;
  const watched = app.watchedSessions || [];
  return h(React.Fragment, null,
    h('div', { className: 'panel-backdrop', onClick: () => app.setSidebar(false) }),
    h('aside', { className: 'sidebar open common-history-sidebar' },
      h('div', { className: 'side-head' }, h('div', null, h('h3', null, '🔔 Session history'), h('div', { className: 'muted small' }, `${events.length} matching event(s)`)), h('button', { className: 'icon-btn', onClick: () => app.setSidebar(false) }, '✕')),
      h('div', { className: 'history-sidebar-controls' },
        h('input', { className: 'history-filter', value: historyQuery, onChange: event => setHistoryFilter('q', event.target.value), placeholder: 'Filter history…' }),
        h('select', { value: historySessionFilter, onChange: event => setHistoryFilter('session', event.target.value), 'aria-label': 'Filter history session' },
          h('option', { value: 'all' }, 'All watched sessions'),
          ...watched.map(session => h('option', { value: session.id, key: session.id }, session.label || session.summary || session.id))),
        h('select', { value: historyTypeFilter, onChange: event => setHistoryFilter('type', event.target.value), 'aria-label': 'Filter history event type' },
          h('option', { value: 'all' }, 'All event types'),
          h('option', { value: 'translation' }, '🌐 Translation'), h('option', { value: 'lifecycle' }, '✨ Lifecycle'), h('option', { value: 'status' }, '📌 Status'), h('option', { value: 'text' }, '✍️ Text'), h('option', { value: 'dependency' }, '🔒 Dependency'), h('option', { value: 'owner' }, '👤 Owner'), h('option', { value: 'other' }, '🧩 Other')),
        h('select', { value: historySort, onChange: event => setHistoryFilter('sort', event.target.value), 'aria-label': 'Sort history' }, h('option', { value: 'newest' }, 'Newest first'), h('option', { value: 'oldest' }, 'Oldest first'))),
      h('div', { className: 'side-body common-history-list' },
        ...(events.length
          ? events.map((event, index) => h(HistoryCard, { event, key: `${event.sessionId || 'session'}:${event.id || index}` }))
          : [h('div', { className: 'empty', key: 'empty' }, 'No history events match the current filters.')])),
    ));
}

function HistoryCard({ event }) {
  const sessionLabel = event.session?.label || event.sessionId || 'session';
  return h('details', { className: `history-card history-event ${event.kind || ''}` },
    h('summary', null,
      h('span', { className: 'history-event-icon' }, historyEventIcon(event)),
      h('span', { className: 'history-event-main' }, h('div',{className:'history-title-with-badge'},h('strong', null, `🧵 ${compact(sessionLabel)} · #${event.taskId || '—'} · ${historyEventTitle(event)}`),event.taskSnapshot?h(TaskLanguageBadge,{task:event.taskSnapshot,compact:true}):null), h('small', null, formatDate(event.detectedAt))),
      h('span', { className: 'history-event-source' }, event.source === 'translation' ? 'HU' : 'EN')),
    h('div', { className: 'history-event-body' },
      h('div', { className: `history-language-note ${event.source === 'translation' ? 'hu' : 'en'}` }, event.source === 'translation' ? '🌐 Translation completed — EN → HU' : '🇬🇧 Original task event'),
      h('div', { className: 'muted small mono' }, event.sessionId || ''),
      ...(event.changes || []).map((change, index) => h('div', { className: 'change', key: index }, h('b', null, `${fieldIcon(change.field)} ${change.label || change.field}`), h('div', null, h('span', { className: 'before' }, fmt(change.before)), ' → ', h('span', { className: 'after' }, fmt(change.after))))),
      event.provider ? h('div', { className: 'history-meta mono' }, `provider=${event.provider} · model=${event.model || '—'} · run=${event.run || 1}`) : null));
}

export function RequiredModal() {
  const app = useApp();
  const modal = app.modal;
  if (!modal) return null;
  const isError = modal.kind === 'translation-error' || modal.kind === 'error';
  const isNotification = modal.kind === 'notification';
  const isBulkSummary = modal.kind === 'bulk-summary';
  const notificationEvents = isNotification && Array.isArray(modal.changes) ? modal.changes : [];
  let body = [];
  if (isNotification) body = notificationBlocks(notificationEvents);
  else if (Array.isArray(modal.changes)) body = changeRows(modal.changes);
  if (isBulkSummary && modal.summary) {
    const labels = { selected: 'Selected / considered', stopped: 'Stopped', retryStarted: 'Retry started', deleted: 'Deleted', skippedSuccess: 'Skipped success', skippedActive: 'Skipped active', skippedTerminal: 'Skipped terminal', skippedNotRetryable: 'Skipped not retryable', skippedMissing: 'Missing' };
    body = Object.entries(labels).filter(([key]) => Number(modal.summary[key] || 0) > 0 || key === 'selected').map(([key, label]) => h('div', { className: 'bulk-summary-row', key }, h('span', null, label), h('strong', null, String(modal.summary[key] || 0))));
    if ((modal.summary.errors || []).length) body.push(h('div', { className: 'error-box', key: 'errors' }, h('b', null, `Errors · ${modal.summary.errors.length}`), ...(modal.summary.errors || []).map((item, index) => h('div', { key: index }, `${item.sessionId ? `${compact(item.sessionId)} · ` : ''}${item.jobId || 'job'}: ${item.message}`))));
  }
  if (modal.failures) body = modal.failures.map((failure, index) => h('div', { className: 'error-box', key: index }, h('b', null, `Task #${failure.taskId || ''}`), h('div', null, failure.message || modal.message)));
  if (!body.length && modal.message) body = [h('div', { key: 0 }, modal.message)];

  let title = modal.title;
  if (!title && isNotification) title = notificationEvents.length === 1 ? `Task #${notificationEvents[0]?.taskId || '—'} updated` : `${notificationEvents.length || 0} task updates`;
  if (!title) title = modal.taskId ? `Task #${modal.taskId} could not be translated` : 'Session updated';
  const modalSession = modal.session;
  return h('div', { className: 'modal-backdrop' }, h('div', { className: 'modal' },
    h('div', { className: `modal-kicker ${isError ? 'error' : ''}` }, isError ? '❌ TRANSLATION FAILED' : '✨ CLAUDE TASK UPDATE'),
    modalSession ? h('div', { className: 'modal-session', title: `${modalSession.id || ''}\n${modalSession.cwd || ''}` }, `🧵 ${modalSession.label || modalSession.id || 'Session'}`) : null,
    h('h2', null, title),
    h('div', { className: 'modal-list' }, ...body),
    isError ? h('div', { className: 'debug-hint' }, '🧰 Run the server with --log-output --log-file for detailed diagnostics.') : null,
    h('div', { className: 'modal-actions' }, h('button', { className: 'primary', onClick: app.acknowledge }, 'OK'))));
}

function historyEventType(event) {
  if (event.source === 'translation' || event.kind === 'translated') return 'translation';
  if (event.kind === 'created' || event.kind === 'deleted') return 'lifecycle';
  const fields = new Set((event.changes || []).map(change => change.field));
  if (fields.has('status')) return 'status';
  if (fields.has('subject') || fields.has('description')) return 'text';
  if (fields.has('blockedBy') || fields.has('blocks')) return 'dependency';
  if (fields.has('owner')) return 'owner';
  return 'other';
}
function historyEventIcon(event) { return ({ translation: '🌐', lifecycle: event.kind === 'deleted' ? '🗑️' : '✨', status: '📌', text: '✍️', dependency: '🔒', owner: '👤', other: '🧩' }[historyEventType(event)]); }
function historyEventTitle(event) { if (event.kind === 'translated') return 'Translation ready'; if (event.kind === 'created') return 'Task created'; if (event.kind === 'deleted') return 'Task removed'; const changes = event.changes || []; return changes.length === 1 ? `${changes[0].label || changes[0].field} changed` : `${changes.length} fields changed`; }
function fieldIcon(field) { return ({ status: '📌', subject: '🏷️', description: '📝', owner: '👤', blockedBy: '🔒', blocks: '🚧', activeForm: '⚡', metadata: '🧩' }[field] || '🔹'); }
function historySearchText(event) { const values = [event.sessionId, event.session?.label, event.kind, event.source, event.title, event.taskId, event.provider, event.model]; for (const change of event.changes || []) values.push(change.field, change.label, fmt(change.before), fmt(change.after)); return values.filter(Boolean).join(' ').toLowerCase(); }
function formatDate(value) { if (!value) return '—'; try { return new Date(value).toLocaleString(); } catch { return String(value); } }
function compact(value) { const text = String(value || ''); return text.length > 28 ? `${text.slice(0, 26)}…` : text; }
