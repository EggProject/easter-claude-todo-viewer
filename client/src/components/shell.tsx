import React, { ReactElement, ReactNode, useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router';
import { useOptionalApp } from '../app-context.js';
import { Session, SessionsState } from '../types.js';
import { NotificationSidebar, RequiredModal } from './overlays.js';

function shortId(x: unknown): string {
  const s = String(x || '');
  return s.length > 18 ? `${s.slice(0, 8)}...${s.slice(-6)}` : s;
}

const fmt = (v: unknown): string => {
  if (!v) return 'unknown';
  try {
    return new Date(String(v)).toLocaleString();
  } catch {
    return String(v);
  }
};

function sessionTooltip(session: Session | null, sessionsState: SessionsState): string {
  if (!session) return 'No current session';
  return [
    `Session: ${session.id}`,
    `Project: ${session.cwd || 'none'}`,
    `Branch: ${session.gitBranch || 'none'}`,
    `Created: ${fmt(session.createdAt)}`,
    `Last activity: ${fmt(session.lastActivity)}`,
    `Session language: ${String(session.globalLanguage || 'en').toUpperCase()}`,
    `Watched: ${sessionsState.watchedSessionIds.includes(session.id) ? 'Yes' : 'No'}`,
  ].join('\n');
}

export function Shell({ children }: { children?: ReactNode }): ReactElement {
  const app = useOptionalApp();
  const a = app ?? {
    live: 'DISCONNECTED',
    currentSession: null,
    sessionsState: {
      sessions: [],
      currentSessionId: null,
      watchedSessionIds: [],
    } satisfies SessionsState,
    setSidebar: () => {},
  };

  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('dark');

  const currentSession = a.currentSession ?? null;
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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = () => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  };

  const navClass = ({ isActive }: { isActive: boolean }) => `app-side__link ${isActive ? 'is-on' : ''}`;
  const tooltip = sessionTooltip(currentSession, a.sessionsState ?? { sessions: [], currentSessionId: null, watchedSessionIds: [] });

  return (
    <div className={`app ${collapsed ? 'app--collapsed' : ''}`}>
      <aside className="app-side">
        <div className="app-side__brand">
          <img src="/assets/logo-mark.svg" alt="Logo" width="24" height="24" />
          <b>Claude Tasks</b>
        </div>
        <div className="app-side__group">
          <span className="app-side__label">Work</span>
          <NavLink to="/sessions" className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V5a2 2 0 0 1 2-2h13.4a.5.5 0 0 1 .4.8l-3.1 3.1c-.1.2-.2.5-.2.8v11.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/></svg>
            Sessions
          </NavLink>
          <NavLink to="/tasks" className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Tasks
          </NavLink>
          <NavLink to="/flow" className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
            Flow
          </NavLink>
          <NavLink to="/translations" className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
            Translations
          </NavLink>
          <NavLink to="/prompts" className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg>
            Prompts
          </NavLink>
        </div>
        <div className="app-side__group">
          <span className="app-side__label">System</span>
          <NavLink to="/settings" className={navClass}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Settings
          </NavLink>
        </div>
        <div className="app-side__footer">
          <span className="avatar avatar--blue avatar--md">CT</span>
          <span className="app-side__footer-text">
            {currentSession ? currentSession.label || shortId(currentSession.id) : 'No Session'}
            <small>Active Workspace</small>
          </span>
          <button className="ep-theme-toggle" type="button" onClick={toggleTheme} aria-label="Switch to dark theme">
            <svg className="ep-theme-toggle__moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>
            <svg className="ep-theme-toggle__sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>
          </button>
        </div>
      </aside>

      <main className="app-main">
        <header className="app-top">
          <button className="app-top__icon-btn" type="button" onClick={() => setCollapsed(!collapsed)} aria-label="Collapse sidebar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>
          </button>
          
          <div className="app-top__title" data-testid="topbar">
            <h1>{location.pathname}</h1>
          </div>
          <div className="app-top__actions">
            <span className={`connection-dot ${connection}`} title={connectionLabel} role="status" aria-label={connectionLabel} />
            <Link to="/sessions" className="btn btn--secondary btn--sm" title={tooltip}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19V5a2 2 0 0 1 2-2h13.4a.5.5 0 0 1 .4.8l-3.1 3.1c-.1.2-.2.5-.2.8v11.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/></svg>
              {currentSession ? (currentSession.label || shortId(currentSession.id)) : 'Select session'}
            </Link>
            <button className="btn btn--secondary btn--sm" onClick={() => a.setSidebar?.(true)} title="Common change history">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            </button>
          </div>
        </header>
        <section className="app-content">
          {children}
        </section>
      </main>
      <NotificationSidebar />
      <RequiredModal />
    </div>
  );
}
