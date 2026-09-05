import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useApp } from '../app-context.js';
import { buildGraph } from '../task-graph.js';
import { TaskDrawer } from '../components/task-drawer.js';
import { StatusMultiSelect, normalizeStatusSelection } from '../components/status-multiselect.js';
import { SessionScopeSelect, useSessionScope } from '../components/session-select.js';
import { TaskLanguageBadge } from '../components/language-badge.js';

const h = React.createElement;
const icon = status => ({ in_progress: '🚀', pending: '⏳', completed: '✅', deleted: '🗑️' }[status] || '❔');

export default function TasksPage() {
  const app = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedSessionIds, setSelectedSessionIds } = useSessionScope();
  const [scopedState, setScopedState] = useState(null);
  const [query, setQuery] = useState('');
  const [statusOverride, setStatus] = useState(null);
  const [sortOverride, setSort] = useState(null);

  useEffect(() => {
    let alive = true;
    app.loadState(selectedSessionIds).then(value => { if (alive) setScopedState(value); }).catch(error => app.showModal({ kind: 'error', title: 'Tasks could not be loaded', message: error.message }));
    return () => { alive = false; };
  }, [selectedSessionIds.join(','), app.revision]);

  const initialStatuses = useMemo(() => normalizeStatusSelection(scopedState?.initialStatus ?? 'in_progress'), [scopedState?.initialStatus]);
  const statuses = statusOverride ?? initialStatuses;
  const sort = sortOverride ?? scopedState?.initialSort ?? 'dependency';
  const tasks = scopedState?.tasks || [];
  const sessionRank = useMemo(() => new Map(selectedSessionIds.map((id, index) => [id, index])), [selectedSessionIds.join(',')]);
  const graphs = useMemo(() => {
    const groups = groupTasksBySession(tasks);
    return new Map([...groups.entries()].map(([sessionId, items]) => [sessionId, buildGraph(items)]));
  }, [tasks]);

  let list = [...tasks].filter(task => {
    const statusMatch = statuses.has(task.status);
    const haystack = `${task.id} ${task.subject} ${task.description} ${task.owner} ${task.session?.label || ''} ${task.sessionId || ''}`.toLowerCase();
    return statusMatch && (!query || haystack.includes(query.toLowerCase()));
  });

  if (sort === 'dependency') {
    list.sort((a, b) => {
      const sessionDiff = (sessionRank.get(a.sessionId) ?? 9999) - (sessionRank.get(b.sessionId) ?? 9999);
      if (sessionDiff) return sessionDiff;
      const graph = graphs.get(a.sessionId);
      return (graph?.orderIndex.get(a.uid) ?? Number.MAX_SAFE_INTEGER) - (graph?.orderIndex.get(b.uid) ?? Number.MAX_SAFE_INTEGER);
    });
  } else if (sort === 'subject') {
    list.sort((a, b) => a.subject.localeCompare(b.subject));
  } else if (sort === 'status') {
    list.sort((a, b) => a.status.localeCompare(b.status) || Number(a.id) - Number(b.id));
  } else {
    list.sort((a, b) => Number(a.id) - Number(b.id));
  }

  const openTask = task => navigate({ pathname: `/tasks/${encodeURIComponent(task.sessionId)}/${encodeURIComponent(task.uid)}`, search: location.search });

  return h('div', { className: 'page' },
    h('div', { className: 'page-controls' },
      h('input', { className: 'search-input', value: query, onChange: event => setQuery(event.target.value), placeholder: 'Search task id, title, description, owner, session…' }),
      h(SessionScopeSelect, { selectedSessionIds, setSelectedSessionIds }),
      h(StatusMultiSelect, { value: statuses, onChange: setStatus }),
      h('select', { value: sort, onChange: event => setSort(event.target.value) },
        ...[['dependency', 'Dependency'], ['id', 'ID'], ['subject', 'Title'], ['status', 'Status']].map(([value, label]) => h('option', { value, key: value }, label))),
    ),
    h('div', { className: 'task-list' },
      ...list.map(task => h('button', {
        className: `task-card ${task.status}`, key: `${task.sessionId}:${task.uid}`,
        onClick: () => openTask(task),
      },
      h('div', { className: 'task-num' }, `#${task.id}`),
      h('div', { className: 'task-main' },
        h('div', { className: 'task-title-row' }, h('strong', null, task.subject), h('div',{className:'task-badges'},h(TaskLanguageBadge,{task,compact:true}),h(SessionBadge, { task }))),
        h('div', { className: 'task-meta' }, `${icon(task.status)} ${task.status}${task.effectiveLanguage === 'hu' ? ' · 🇭🇺' : ''}`)),
      )),
      !list.length ? h('div', { className: 'empty' }, 'No tasks match the current session/status filters.') : null,
    ),
    h(TaskDrawer, { base: 'tasks', tasks }),
  );
}

export function groupTasksBySession(tasks = []) {
  const groups = new Map();
  for (const task of tasks) {
    const sessionId = task.sessionId || 'unknown';
    if (!groups.has(sessionId)) groups.set(sessionId, []);
    groups.get(sessionId).push(task);
  }
  return groups;
}

function SessionBadge({ task }) {
  const label = task.session?.label || task.sessionId || 'session';
  return h('span', { className: 'session-badge', title: `${label}\n${task.sessionId || ''}` }, `🧵 ${compactLabel(label)}`);
}
function compactLabel(value) { const text = String(value || ''); return text.length > 26 ? `${text.slice(0, 24)}…` : text; }
