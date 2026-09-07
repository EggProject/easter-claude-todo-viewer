import React, { ReactElement, useEffect, useRef, useState } from 'react';

export const STATUS_OPTIONS: [string, string][] = [
  ['in_progress', '🚀 In progress'],
  ['pending', '⏳ Pending'],
  ['completed', '✅ Completed'],
  ['deleted', '🗑️ Deleted'],
];

export function normalizeStatusSelection(value: unknown): Set<string> {
  const allowed = new Set(STATUS_OPTIONS.map(([status]) => status));
  const raw = String(value || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  if (!raw.length || raw.includes('all')) return new Set(STATUS_OPTIONS.map(([status]) => status));
  const selected = new Set(raw.filter((status) => allowed.has(status)));
  return selected.size ? selected : new Set(['in_progress']);
}

export interface StatusMultiSelectProps {
  value: Set<string> | string | undefined;
  onChange: (next: Set<string>) => void;
}

export function StatusMultiSelect({ value, onChange }: StatusMultiSelectProps): ReactElement {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const selected = value instanceof Set ? value : normalizeStatusSelection(value);
  const all = selected.size === STATUS_OPTIONS.length;

  useEffect(() => {
    if (!open) return undefined;
    const close = (event: MouseEvent): void => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const key = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    window.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', key);
    };
  }, [open]);

  const commit = (next: Iterable<string>): void => onChange(new Set(next));
  const toggleAll = (): void => commit(all ? [] : STATUS_OPTIONS.map(([status]) => status));
  const toggle = (status: string): void => {
    const next = new Set(selected);
    if (next.has(status)) next.delete(status);
    else next.add(status);
    commit(next);
  };

  return (
    <div className="status-multiselect" ref={root}>
      <button
        className="select-like"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {all ? 'Status · All' : `Status · ${selected.size.toString()} selected`}
        <span className="chevron">▾</span>
      </button>
      {open && (
        <div className="status-popover" role="menu">
          <label className="status-option master">
            <input type="checkbox" checked={all} onChange={toggleAll} />
            <span>All</span>
          </label>
          <div className="status-separator" />
          {STATUS_OPTIONS.map(([status, label]) => (
            <label className="status-option" key={status}>
              <input
                type="checkbox"
                checked={selected.has(status)}
                onChange={() => toggle(status)}
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
