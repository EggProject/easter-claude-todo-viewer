import React, { ReactElement, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useApp } from '../app-context.js';
import { buildGraph, TaskGraph } from '../task-graph.js';
import { TaskDrawer } from '../components/task-drawer.js';
import { StatusMultiSelect, normalizeStatusSelection } from '../components/status-multiselect.js';
import { SessionScopeSelect, useSessionScope } from '../components/session-select.js';
import { TaskLanguageBadge } from '../components/language-badge.js';
import { usePersistentPageFilters } from '../filter-state.js';
import { AppStateData, Task } from '../types.js';

const StatusDot = ({ status }: { status: string }): ReactElement => (
  <span className={`status-dot ${status}`} />
);

const icon = (status: string): string => {
  if (status === 'in_progress') return '🚀';
  if (status === 'pending') return '⏳';
  if (status === 'completed') return '✅';
  return '🗑️'; // deleted
};

export default function TasksPage(): ReactElement {
  const app = useApp();
  const { loadState, showModal, revision } = app;
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedSessionIds, setSelectedSessionIds } = useSessionScope();
  const [scopedState, setScopedState] = useState<AppStateData | null>(null);
  const [filters, setFilter] = usePersistentPageFilters('tasks', {
    q: '',
    status: scopedState?.initialStatus ?? 'in_progress',
    sort: scopedState?.initialSort ?? 'dependency',
  });

  const sessionIdsKey = selectedSessionIds.join(',');
  const memoizedSelectedSessionIds = useMemo(
    () => selectedSessionIds,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sessionIdsKey],
  );

  useEffect(() => {
    let alive = true;
    loadState(memoizedSelectedSessionIds)
      .then((value) => {
        if (alive) setScopedState(value);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        showModal({
          kind: 'error',
          title: 'Tasks could not be loaded',
          message,
        });
      });
    return () => {
      alive = false;
    };
  }, [loadState, showModal, memoizedSelectedSessionIds, revision]);

  const query = filters['q'] || '';
  const statuses = useMemo(() => normalizeStatusSelection(filters['status']), [filters]);
  const sort = filters['sort'] || scopedState?.initialSort || 'dependency';

  const setStatus = (next: Set<string>): void =>
    setFilter('status', next.size === 4 || next.size === 0 ? 'all' : [...next].join(','));

  const scopedTasks = scopedState?.tasks;
  const tasks = useMemo(() => scopedTasks || [], [scopedTasks]);
  const sessionRank = useMemo(
    () => new Map<string, number>(selectedSessionIds.map((id, index) => [id, index])),
    [selectedSessionIds],
  );

  const graphs = useMemo(() => {
    const groups = groupTasksBySession(tasks);
    return new Map<string, TaskGraph>(
      [...groups].map(([sessionId, items]) => [sessionId, buildGraph(items)]),
    );
  }, [tasks]);

  const list = [...tasks].filter((task) => {
    const statusMatch = statuses.has(task.status);
    const haystack =
      `${task.id} ${task.subject} ${task.description || ''} ${task.owner || ''} ${task.session?.label || ''} ${task.sessionId}`.toLowerCase();
    return statusMatch && (!query || haystack.includes(query.toLowerCase()));
  });

  if (sort === 'dependency') {
    list.sort((a, b) => {
      const sessionDiff =
        (sessionRank.get(a.sessionId) ?? 9999) - (sessionRank.get(b.sessionId) ?? 9999);
      if (sessionDiff) return sessionDiff;
      const graph = graphs.get(a.sessionId);
      return (
        (graph?.orderIndex.get(a.uid) ?? Number.MAX_SAFE_INTEGER) -
        (graph?.orderIndex.get(b.uid) ?? Number.MAX_SAFE_INTEGER)
      );
    });
  } else if (sort === 'subject') {
    list.sort((a, b) => a.subject.localeCompare(b.subject));
  } else if (sort === 'status') {
    list.sort((a, b) => a.status.localeCompare(b.status) || Number(a.id) - Number(b.id));
  } else {
    list.sort((a, b) => Number(a.id) - Number(b.id));
  }

  const openTask = (task: Task): void => {
    void navigate({
      pathname: `/tasks/${encodeURIComponent(task.sessionId)}/${encodeURIComponent(task.uid)}`,
      search: location.search,
    });
  };

  return (
    <div className="page">
      <div className="page-controls">
        <input
          id="task-search-input"
          name="taskSearch"
          aria-label="Search tasks"
          className="search-input"
          value={query}
          onChange={(event) => setFilter('q', event.target.value)}
          placeholder="Search task id, title, description, owner, session…"
        />
        <SessionScopeSelect
          selectedSessionIds={selectedSessionIds}
          setSelectedSessionIds={setSelectedSessionIds}
        />
        <StatusMultiSelect value={statuses} onChange={setStatus} />
        <select
          id="task-sort-select"
          name="taskSort"
          aria-label="Sort tasks"
          value={sort}
          onChange={(event) => setFilter('sort', event.target.value)}
        >
          <option value="dependency">Dependency</option>
          <option value="id">ID</option>
          <option value="subject">Title</option>
          <option value="status">Status</option>
        </select>
      </div>
      <div className="task-list">
        {list.map((task) => (
          <button
            className={`task-card ${task.status}`}
            key={`${task.sessionId}:${task.uid}`}
            onClick={() => openTask(task)}
          >
            <div className="task-num">{`#${task.id}`}</div>
            <div className="task-main">
              <div className="task-title-row">
                <strong>{task.subject}</strong>
                <div className="task-badges">
                  <TaskLanguageBadge task={task} compact />
                  <SessionBadge task={task} />
                </div>
              </div>
              <div className="task-meta">
                <StatusDot status={task.status} />
                {icon(task.status)} {task.status}
                {task.effectiveLanguage === 'hu' ? ' · 🇭🇺 HU' : ''}
              </div>
            </div>
          </button>
        ))}
        {list.length === 0 ? (
          <div className="empty">No tasks match the current session/status filters.</div>
        ) : null}
      </div>
      <TaskDrawer base="tasks" tasks={tasks} />
    </div>
  );
}

export function groupTasksBySession(tasks: Task[] = []): Map<string, Task[]> {
  const groups = new Map<string, Task[]>();
  for (const task of tasks) {
    const sessionId = task.sessionId || 'unknown';
    if (!groups.has(sessionId)) groups.set(sessionId, []);
    groups.get(sessionId)?.push(task);
  }
  return groups;
}

function SessionBadge({ task }: { task: Task }): ReactElement {
  const label = task.session?.label || task.sessionId || 'session';
  return (
    <span className="session-badge" title={`${label}\n${task.sessionId}`}>
      {compactLabel(label)}
    </span>
  );
}

function compactLabel(value: unknown): string {
  const text = String(value);
  return text.length > 26 ? `${text.slice(0, 24)}…` : text;
}
