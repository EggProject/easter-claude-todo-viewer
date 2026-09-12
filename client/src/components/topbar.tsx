import React, { ReactElement } from 'react';
import { Link, NavLink } from 'react-router';
import {
  Layers,
  ClipboardList,
  Shuffle,
  Globe,
  Brain,
  Settings as SettingsIcon,
  Bell,
  Bot,
} from 'lucide-react';
import { useApp } from '../app-context.js';
import { Session, SessionsState } from '../types.js';

const items = [
  ['/sessions', Layers, 'Sessions'],
  ['/tasks', ClipboardList, 'Tasks'],
  ['/flow', Shuffle, 'Flow'],
  ['/translations', Globe, 'Translations'],
  ['/prompts', Brain, 'Prompts'],
  ['/settings', SettingsIcon, 'Settings'],
] as const;

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
        <Bot size={20} strokeWidth={1.75} />
        <strong>Claude Tasks</strong>
        <span className="version">v4.1.0</span>
      </div>
      {currentSession ? (
        <Link to="/sessions" className="session-button" title={tooltip}>
          <>
            <Layers size={14} strokeWidth={1.75} className="inline-icon" />{' '}
            {currentSession.label || shortId(currentSession.id)} · {shortId(currentSession.id)}
          </>
        </Link>
      ) : (
        <Link to="/sessions" className="session-button">
          <>
            <Layers size={14} strokeWidth={1.75} className="inline-icon" /> Select session
          </>
        </Link>
      )}
      <div className="spacer" />
      <nav className="nav">
        {items.map(([to, Icon, label]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <Icon size={20} strokeWidth={1.75} className="inline-icon" /> {label}
          </NavLink>
        ))}
      </nav>
      <button className="icon-btn" onClick={() => a.setSidebar(true)} title="Common change history">
        <Bell size={16} strokeWidth={1.75} />
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
    `Project: ${session.cwd || '-'}`,
    `Branch: ${session.gitBranch || '-'}`,
    `Created: ${fmt(session.createdAt)}`,
    `Last activity: ${fmt(session.lastActivity)}`,
    `Session language: ${String(session.globalLanguage || 'en').toUpperCase()}`,
    `Watched: ${sessionsState.watchedSessionIds.includes(session.id) ? 'Yes' : 'No'}`,
  ].join('\n');
}

const fmt = (v: unknown): string => {
  if (!v) return '-';
  try {
    return new Date(String(v)).toLocaleString();
  } catch {
    return String(v);
  }
};
