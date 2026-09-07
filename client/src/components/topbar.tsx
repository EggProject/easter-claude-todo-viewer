import React, { ReactElement } from 'react';
import { Link, NavLink } from 'react-router';
import { useApp } from '../app-context.js';
import { Session, SessionsState } from '../types.js';

const items: [string, string, string][] = [
  ['/sessions', '🧵', 'Sessions'],
  ['/tasks', '📋', 'Tasks'],
  ['/flow', '🔀', 'Flow'],
  ['/translations', '🌍', 'Translations'],
  ['/prompts', '🧠', 'Prompts'],
  ['/settings', '⚙️', 'Settings'],
];

export function Topbar(): ReactElement {
  const a = useApp();
  const currentSession = a.currentSession;
  const connection =
    a.live === 'LIVE'
      ? 'connected'
      : a.live === 'RECONNECTING' || a.live === 'CONNECTING'
        ? 'reconnecting'
        : 'disconnected';
  const connectionLabel =
    connection === 'connected'
      ? 'Connected to multi-session daemon'
      : connection === 'reconnecting'
        ? 'Reconnecting to multi-session daemon'
        : 'Disconnected from multi-session daemon';
  const tooltip = sessionTooltip(currentSession, a.sessionsState);

  return (
    <header className="topbar">
      <div className="brand">
        <span
          className={`connection-dot ${connection}`}
          title={connectionLabel}
          aria-label={connectionLabel}
          role="status"
        />
        <span>🤖</span>
        <strong>Claude Tasks</strong>
        <span className="version">v4.1.0</span>
      </div>
      {currentSession ? (
        <Link to="/sessions" className="session-button" title={tooltip}>
          {`🧵 ${currentSession.label || shortId(currentSession.id)} · ${shortId(currentSession.id)}`}
        </Link>
      ) : (
        <Link to="/sessions" className="session-button">
          🧵 Select session
        </Link>
      )}
      <div className="spacer" />
      <nav className="nav">
        {items.map(([to, icon, label]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            {`${icon} ${label}`}
          </NavLink>
        ))}
      </nav>
      <button className="icon-btn" onClick={() => a.setSidebar(true)} title="Common change history">
        🔔
      </button>
    </header>
  );
}

function shortId(x: unknown): string {
  const s = String(x || '');
  return s.length > 18 ? `${s.slice(0, 8)}…${s.slice(-6)}` : s;
}

function sessionTooltip(session: Session | null, sessionsState: SessionsState): string {
  if (!session) return 'No current session';
  return [
    `Session: ${session.id}`,
    `Project: ${session.cwd || '—'}`,
    `Branch: ${session.gitBranch || '—'}`,
    `Created: ${fmt(session.createdAt)}`,
    `Last activity: ${fmt(session.lastActivity)}`,
    `Session language: ${String(session.globalLanguage || 'en').toUpperCase()}`,
    `Watched: ${sessionsState.watchedSessionIds.includes(session.id) ? 'Yes' : 'No'}`,
  ].join('\n');
}

const fmt = (v: unknown): string => {
  if (!v) return '—';
  try {
    return new Date(String(v)).toLocaleString();
  } catch {
    return String(v);
  }
};
