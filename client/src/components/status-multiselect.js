import React, { useEffect, useRef, useState } from 'react';
const h = React.createElement;

export const STATUS_OPTIONS = [
  ['in_progress', '🚀 In progress'],
  ['pending', '⏳ Pending'],
  ['completed', '✅ Completed'],
  ['deleted', '🗑️ Deleted'],
];

export function normalizeStatusSelection(value) {
  const allowed = new Set(STATUS_OPTIONS.map(([status]) => status));
  const raw = String(value || '').split(',').map(x => x.trim()).filter(Boolean);
  if (!raw.length || raw.includes('all')) return new Set(STATUS_OPTIONS.map(([status]) => status));
  const selected = new Set(raw.filter(status => allowed.has(status)));
  return selected.size ? selected : new Set(['in_progress']);
}

export function StatusMultiSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const selected = value instanceof Set ? value : normalizeStatusSelection(value);
  const all = selected.size === STATUS_OPTIONS.length;
  useEffect(() => {
    if (!open) return undefined;
    const close = event => { if (!root.current?.contains(event.target)) setOpen(false); };
    const key = event => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    window.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('keydown', key); };
  }, [open]);
  const commit = next => onChange(new Set(next));
  const toggleAll = () => commit(all ? [] : STATUS_OPTIONS.map(([status]) => status));
  const toggle = status => {
    const next = new Set(selected);
    if (next.has(status)) next.delete(status); else next.add(status);
    commit(next);
  };
  return h('div', { className: 'status-multiselect', ref: root },
    h('button', { className: 'select-like', onClick: () => setOpen(v => !v), 'aria-haspopup': 'menu', 'aria-expanded': open },
      all ? 'Status · All' : `Status · ${selected.size} selected`, h('span', { className: 'chevron' }, '▾')),
    open && h('div', { className: 'status-popover', role: 'menu' },
      h('label', { className: 'status-option master' }, h('input', { type: 'checkbox', checked: all, onChange: toggleAll }), h('span', null, 'All')),
      h('div', { className: 'status-separator' }),
      ...STATUS_OPTIONS.map(([status, label]) => h('label', { className: 'status-option', key: status },
        h('input', { type: 'checkbox', checked: selected.has(status), onChange: () => toggle(status) }), h('span', null, label))),
    ));
}
