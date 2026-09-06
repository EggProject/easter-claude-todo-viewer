import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router';
import { useApp } from '../app-context.js';

const h = React.createElement;

export function useSessionScope() {
  const app = useApp();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const pageKey = String(location.pathname || '/').split('/').filter(Boolean)[0] || 'tasks';
  const storageKey = `claude-todos:session-scope:${pageKey}`;
  const watchedSessionIds = app.sessionsState?.watchedSessionIds;
  const watchedIds = useMemo(() => watchedSessionIds || [], [watchedSessionIds]);
  const current = app.currentSessionId;
  const sessionsParam = searchParams.get('sessions');
  const selectedSessionIds = useMemo(() => {
    const fromUrl = String(sessionsParam || '').split(',').map(x => x.trim()).filter(Boolean);
    let wanted = fromUrl;
    if (!wanted.length && typeof window !== 'undefined') {
      try { wanted = JSON.parse(window.localStorage.getItem(storageKey) || '[]'); } catch { wanted = []; }
    }
    const watched = new Set(watchedIds);
    const valid = (Array.isArray(wanted) ? wanted : []).filter(id => watched.has(id));
    if (valid.length) return [...new Set(valid)];
    if (current && watched.has(current)) return [current];
    return watchedIds.length ? [watchedIds[0]] : [];
  }, [sessionsParam, storageKey, watchedIds, current]);

  const setSelectedSessionIds = React.useCallback(ids => {
    const watched = new Set(watchedIds);
    const nextIds = [...new Set((ids || []).filter(id => watched.has(id)))];
    const fallback = current && watched.has(current) ? [current] : watchedIds.slice(0, 1);
    const resolved = nextIds.length ? nextIds : fallback;
    if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, JSON.stringify(resolved));
    const next = new URLSearchParams(searchParams);
    if (resolved.length === 1 && resolved[0] === current) next.delete('sessions');
    else next.set('sessions', resolved.join(','));
    setSearchParams(next, { replace: true });
  }, [watchedIds, current, storageKey, searchParams, setSearchParams]);

  // If a watched session is removed while this page is open, normalize the URL.
  useEffect(() => {
    const raw = String(sessionsParam || '').split(',').filter(Boolean);
    if (raw.length && raw.some(id => !watchedIds.includes(id))) setSelectedSessionIds(selectedSessionIds);
  }, [sessionsParam, watchedIds, setSelectedSessionIds, selectedSessionIds]);

  return { selectedSessionIds, setSelectedSessionIds };
}

export function SessionScopeSelect({ selectedSessionIds, setSelectedSessionIds }) {
  const app = useApp();
  const watched = app.watchedSessions || [];
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const outside = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    const keyboard = event => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', outside);
    window.addEventListener('keydown', keyboard);
    return () => { document.removeEventListener('mousedown', outside); window.removeEventListener('keydown', keyboard); };
  }, [open]);

  if (watched.length <= 1) return null;
  const selected = new Set(selectedSessionIds || []);
  const all = watched.length > 0 && watched.every(session => selected.has(session.id));
  const toggle = id => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedSessionIds([...next]);
  };
  const label = all ? `Sessions · All watched (${watched.length})` : `Sessions · ${selected.size} selected`;
  return h('div', { className: 'session-scope-select', ref: root },
    h('button', { className: 'select-like', onClick: () => setOpen(v => !v), 'aria-haspopup': 'menu', 'aria-expanded': open }, label, h('span', { className: 'chevron' }, '▾')),
    open && h('div', { className: 'session-scope-popover', role: 'menu' },
      h('div', { className: 'session-scope-shortcuts' },
        h('button', { className: 'mini ghost', disabled: !app.currentSessionId, onClick: () => { setSelectedSessionIds(app.currentSessionId ? [app.currentSessionId] : []); setOpen(false); } }, '★ Current'),
        h('button', { className: 'mini ghost', onClick: () => setSelectedSessionIds(watched.map(session => session.id)) }, '☑ All watched')),
      h('div', { className: 'status-separator' }),
      ...watched.map(session => h('label', { className: 'session-scope-option', key: session.id },
        h('input', { type: 'checkbox', checked: selected.has(session.id), onChange: () => toggle(session.id) }),
        h('span', { className: 'session-scope-name' }, session.label || session.summary || session.id),
        session.current ? h('span', { className: 'session-scope-current', title: 'Current session' }, '★') : null,
        h('span', { className: 'mono session-scope-id' }, shortId(session.id))))));
}

function shortId(id) { const value = String(id || ''); return value.length > 10 ? `${value.slice(0, 8)}…` : value; }
