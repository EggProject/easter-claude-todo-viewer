import React, { ReactElement, useCallback, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useApp } from '../app-context.js';
import { TaskHistory } from './task-history.js';
import { TaskLanguageBadge } from './language-badge.js';
import { Task } from '../types.js';

export interface TaskDrawerProps {
  base: string;
  tasks?: Task[] | null | undefined;
}

export function TaskDrawer({
  base,
  tasks: scopedTasks = null,
}: TaskDrawerProps): ReactElement | null {
  const { sessionId: routeSessionId, uid } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const app = useApp();
  const tasks = scopedTasks || app.state?.tasks || [];

  const close = useCallback(
    () => void navigate({ pathname: `/${base}`, search: location.search }),
    [navigate, base, location.search],
  );

  useEffect(() => {
    if (!uid) return undefined;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [uid, close]);

  if (!uid) return null;
  const task =
    tasks.find(
      (item) => item.uid === uid && (!routeSessionId || item.sessionId === routeSessionId),
    ) ||
    tasks.find((item) => item.uid === uid && item.sessionId === app.currentSessionId) ||
    tasks.find((item) => item.uid === uid);
  if (!task) return null;

  const sameStore = tasks.filter(
    (item) => item.sessionId === task.sessionId && item.storeId === task.storeId,
  );
  const byId = new Map<string, Task>(sameStore.map((item) => [String(item.id), item]));
  const sessionLabel = task.session?.label || task.sessionId || 'session';

  return (
    <>
      <button
        type="button"
        aria-label="Close drawer backdrop"
        className="panel-backdrop"
        onClick={close}
      />
      <aside className="drawer open">
        <div className="drawer-head">
          <div>
            <div
              className="drawer-session-badge"
              title={`${sessionLabel}\n${task.sessionId || ''}`}
            >
              {`🧵 ${sessionLabel}`}
            </div>
            <div className="muted mono">{`#${task.id}`}</div>
            <div className="drawer-title-row">
              <h2>{task.subject}</h2>
              <TaskLanguageBadge task={task} />
            </div>
          </div>
          <button className="icon-btn" onClick={close}>
            ✕
          </button>
        </div>
        <div className="drawer-body">
          {field('📌', 'Status', task.status)}
          {field('⚡', 'Active form', task.activeForm || 'none')}
          {field('👤', 'Owner', task.owner || 'none')}
          {dependencyField('🔒', 'Blocked by', task.blockedBy || [], byId)}
          {dependencyField('🚧', 'Blocks', task.blocks || [], byId)}
          <section className="drawer-section">
            <div className="section-title">🌐 Task language</div>
            <div className="task-language-row">
              <div className="lang-control">
                <span>EN</span>
                <button
                  className={`switch ${task.viewLanguage === 'hu' ? 'on' : ''}`}
                  onClick={() => {
                    void app.toggleTaskLanguage(task.sessionId, task.uid, task.viewLanguage);
                  }}
                  role="switch"
                  aria-checked={task.viewLanguage === 'hu'}
                  title={
                    task.viewLanguage === 'hu'
                      ? 'Show this task in English'
                      : 'Show this task in Hungarian when translation is ready'
                  }
                >
                  <span />
                </button>
                <span>HU</span>
              </div>
              <span className={`translation-state ${task.translationState || 'missing'}`}>
                {translationStateLabel(task)}
              </span>
              {task.translationPending ? (
                <div className="lang-progress">
                  <span className="spinner" />
                  <button
                    className="mini danger"
                    onClick={() => {
                      void app.cancelTask(task.sessionId, task.uid);
                    }}
                  >
                    ■ Stop
                  </button>
                </div>
              ) : null}
            </div>
            {task.viewLanguage === 'hu' &&
            task.effectiveLanguage !== 'hu' &&
            !task.translationError ? (
              <div className="translation-fallback-note">
                🇬🇧 Showing current English source until the Hungarian translation is ready.
              </div>
            ) : null}
            {task.translationError ? (
              <div className="warning">⚠ HU unavailable: {task.translationError}</div>
            ) : null}
          </section>
          <section className="drawer-section">
            <div className="section-title">📝 Description</div>
            <div className="prose prewrap">{task.description || 'none'}</div>
          </section>
          <TaskHistory task={task} />
        </div>
      </aside>
    </>
  );
}

function dependencyField(
  icon: string,
  label: string,
  ids: string[],
  byId: Map<string, Task>,
): ReactElement {
  const children = ids.length
    ? ids.map((id) => {
        const depTask = byId.get(String(id));
        return (
          <div className="dependency-item" key={String(id)}>
            <span>{depTask ? `#${id} - ${depTask.subject}` : `#${id}`}</span>
            {depTask ? <TaskLanguageBadge task={depTask} compact /> : null}
          </div>
        );
      })
    : [<span key="empty">none</span>];

  return (
    <div className="field">
      <div className="field-label">{`${icon} ${label}`}</div>
      <div className="field-value dependency-list">{children}</div>
    </div>
  );
}

function field(icon: string, label: string, value: unknown): ReactElement {
  return (
    <div className="field">
      <div className="field-label">{`${icon} ${label}`}</div>
      <div className="field-value">{String(value ?? 'none')}</div>
    </div>
  );
}

function translationStateLabel(task: Task): string {
  if (task.viewLanguage !== 'hu') return '🇬🇧 English';
  const labels: Record<string, string> = {
    ready: '🇭🇺 Ready',
    missing: '○ Missing',
    queued: '⏳ Queued',
    translating: '🌍 Translating',
    validating: '🔎 Validating',
    retrying: '🔁 Retrying',
    canceling: '🛑 Canceling',
    failed: '⚠ Failed',
  };
  return labels[task.translationState || ''] || task.translationState || '○ Missing';
}
