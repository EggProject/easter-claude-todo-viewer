import React, { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { useApp } from '../app-context.js';

export interface SessionScopeHookResult {
  selectedSessionIds: string[];
  setSelectedSessionIds: (ids: string[]) => void;
}

export function useSessionScope(): SessionScopeHookResult {
  const app = useApp();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const pageKey =
    String(location.pathname || '/')
      .split('/')
      .find(Boolean) || 'tasks';
  const storageKey = `claude-todos:session-scope:${pageKey}`;
  const watchedSessionIds = app.sessionsState.watchedSessionIds;
  const watchedIds = useMemo(() => watchedSessionIds || [], [watchedSessionIds]);
  const current = app.currentSessionId;
  const sessionsParam = searchParams.get('sessions');
  const lastResultRef = useRef<string[] | null>(null);

  const selectedSessionIds = useMemo(() => {
    const fromUrl = String(sessionsParam || '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean);
    let wanted = fromUrl;
    if (!wanted.length && typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(storageKey);
        const parsed: unknown = raw ? JSON.parse(raw) : [];
        if (Array.isArray(parsed)) {
          wanted = parsed.filter((item): item is string => typeof item === 'string');
        }
      } catch {
        wanted = [];
      }
    }
    const watched = new Set(watchedIds);
    const valid = wanted.filter((id) => watched.has(id));
    let resolved: string[];
    if (valid.length) {
      resolved = [...new Set(valid)];
    } else if (current && watched.has(current)) {
      resolved = [current];
    } else {
      resolved = watchedIds.slice(0, 1);
    }
    if (
      lastResultRef.current !== null &&
      lastResultRef.current.length === resolved.length &&
      lastResultRef.current.join(',') === resolved.join(',')
    ) {
      return lastResultRef.current;
    }
    lastResultRef.current = resolved;
    return resolved;
  }, [sessionsParam, storageKey, watchedIds, current]);

  const setSelectedSessionIds = useCallback(
    (ids: string[]) => {
      const watched = new Set(watchedIds);
      const nextIds = [...new Set((ids || []).filter((id) => watched.has(id)))];
      const fallback = current && watched.has(current) ? [current] : watchedIds.slice(0, 1);
      const resolved = nextIds.length ? nextIds : fallback;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(resolved));
      }
      const next = new URLSearchParams(searchParams);
      if (resolved.length === 1 && resolved[0] === current) {
        next.delete('sessions');
      } else {
        next.set('sessions', resolved.join(','));
      }
      setSearchParams(next, { replace: true });
    },
    [watchedIds, current, storageKey, searchParams, setSearchParams],
  );

  useEffect(() => {
    const raw = String(sessionsParam || '')
      .split(',')
      .filter(Boolean);
    if (raw.some((id) => !watchedIds.includes(id))) {
      setSelectedSessionIds(selectedSessionIds);
    }
  }, [sessionsParam, watchedIds, setSelectedSessionIds, selectedSessionIds]);

  return { selectedSessionIds, setSelectedSessionIds };
}

export interface SessionScopeSelectProps {
  selectedSessionIds: string[];
  setSelectedSessionIds: (ids: string[]) => void;
}

export function SessionScopeSelect({
  selectedSessionIds,
  setSelectedSessionIds,
}: SessionScopeSelectProps): ReactElement | null {
  const app = useApp();
  const watched = app.watchedSessions || [];
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    const outside = (event: MouseEvent): void => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const keyboard = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', outside);
    window.addEventListener('keydown', keyboard);
    return () => {
      document.removeEventListener('mousedown', outside);
      window.removeEventListener('keydown', keyboard);
    };
  }, [open]);

  if (watched.length <= 1) return null;
  const selected = new Set(selectedSessionIds || []);
  const all = watched.length > 0 && watched.every((session) => selected.has(session.id));
  const toggle = (id: string): void => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSessionIds([...next]);
  };
  const label = all
    ? `Sessions · All watched (${watched.length.toString()})`
    : `Sessions · ${selected.size.toString()} selected`;

  return (
    <div className="session-scope-select" ref={root}>
      <button
        className="select-like"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {label}
        <span className="chevron">▾</span>
      </button>
      {open && (
        <div className="session-scope-popover" role="menu">
          <div className="session-scope-shortcuts">
            <button
              className="btn btn--ghost btn--sm"
              disabled={!app.currentSessionId}
              onClick={() => {
                setSelectedSessionIds(app.currentSessionId ? [app.currentSessionId] : []);
                setOpen(false);
              }}
            >
              ★ Current
            </button>
            <button
              className="btn btn--ghost btn--sm"
              onClick={() => setSelectedSessionIds(watched.map((session) => session.id))}
            >
              ☑ All watched
            </button>
          </div>
          <div className="status-separator" />
          {watched.map((session) => (
            <label className="session-scope-option" key={session.id}>
              <input
                type="checkbox"
                checked={selected.has(session.id)}
                onChange={() => toggle(session.id)}
              />
              <span className="session-scope-name">
                {session.label || session.summary || session.id}
              </span>
              {session.current ? (
                <span className="session-scope-current" title="Current session">
                  ★
                </span>
              ) : null}
              <span className="mono session-scope-id">{shortId(session.id)}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function shortId(id: unknown): string {
  const value = String(id || '');
  return value.length > 10 ? `${value.slice(0, 8)}…` : value;
}
