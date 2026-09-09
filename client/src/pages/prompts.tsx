import React, { ReactElement, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useApp } from '../app-context.js';
import { getJSON, postJSON } from '../api.js';
import { PromptConflict, isRecord, errorMessage } from '../types.js';
import { Brain, Package, Building2, Tag, Folder, Puzzle, Save, Undo2, Search } from 'lucide-react';

export default function PromptsPage(): ReactElement {
  const app = useApp();
  const navigate = useNavigate();
  const { promptId } = useParams();

  const migrate = async (): Promise<void> => {
    await postJSON('/api/prompts/migrate');
    await app.refreshPrompts();
  };

  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <Brain size={14} strokeWidth={1.75} className="inline-icon" /> TRANSLATION PROMPTS
          </div>
          <h1>Prompt files</h1>
        </div>
        <button className="mini" onClick={() => void migrate()}>
          ↻ Check / migrate updates
        </button>
      </div>
      <div className="prompt-grid">
        {(app.prompts || []).map((prompt) => (
          <button
            className="prompt-card"
            key={prompt.id}
            onClick={() => void navigate(`/prompts/${prompt.id}`)}
          >
            <div className="prompt-top">
              <strong>{prompt.id}</strong>
              <span className={`prompt-status ${prompt.status}`}>{status(prompt.status)}</span>
            </div>
            <div className="muted">
              {`Installed v${String(prompt.installedVersion)} · Builtin v${String(prompt.builtinVersion)}`}
            </div>
            <div className="mono small">{prompt.path}</div>
          </button>
        ))}
      </div>
      {promptId ? (
        <PromptEditor
          id={promptId}
          onClose={() => void navigate('/prompts')}
          refresh={app.refreshPrompts}
        />
      ) : null}
    </div>
  );
}

interface PromptEditorProps {
  id: string;
  onClose: () => void;
  refresh: () => Promise<void>;
}

export interface PromptDetail {
  id?: string | undefined;
  status?: string | undefined;
  installedVersion?: number | string | undefined;
  builtinVersion?: number | string | undefined;
  path?: string | undefined;
  body?: string | null | undefined;
  requiredVariables?: string[] | undefined;
  conflicts?: PromptConflict[] | null | undefined;
  diff?: string | undefined;
}

function isPromptDetail(value: unknown): value is PromptDetail {
  return isRecord(value);
}

function PromptEditor({ id, onClose, refresh }: PromptEditorProps): ReactElement {
  const [detail, setDetail] = useState<PromptDetail | null>(null);
  const [body, setBody] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    setDetail(null);
    getJSON(`/api/prompts/${encodeURIComponent(id)}`)
      .then((value) => {
        if (!active) return;
        /* v8 ignore next */
        if (!isPromptDetail(value)) return;
        setDetail(value);
        setBody(typeof value.body === 'string' ? value.body : '');
      })
      .catch((error: unknown) => {
        active && setMessage(`❌ ${errorMessage(error)}`);
      });
    return () => {
      active = false;
    };
  }, [id]);

  if (!detail) return <div className="detail-card">Loading prompt…</div>;

  const save = async (): Promise<void> => {
    try {
      const value = await postJSON(`/api/prompts/${encodeURIComponent(id)}`, { body });
      /* v8 ignore next */
      if (!isPromptDetail(value)) return;
      setDetail(value);
      setBody(typeof value.body === 'string' ? value.body : body);
      setMessage('✅ Saved');
      await refresh();
    } catch (error: unknown) {
      const err = errorMessage(error);
      setMessage(`❌ ${err}`);
    }
  };

  const restore = async (): Promise<void> => {
    if (!confirm('Restore the current built-in prompt?')) return;
    try {
      const value = await postJSON(`/api/prompts/${encodeURIComponent(id)}/restore`);
      /* v8 ignore next */
      if (!isPromptDetail(value)) return;
      setDetail(value);
      setBody(typeof value.body === 'string' ? value.body : '');
      setMessage('✅ Restored');
      await refresh();
    } catch (error: unknown) {
      const err = errorMessage(error);
      setMessage(`❌ ${err}`);
    }
  };

  return (
    <div className="detail-card prompt-editor">
      <div className="detail-head">
        <div>
          <div className="eyebrow">
            <Brain size={14} strokeWidth={1.75} className="inline-icon" /> PROMPT EDITOR
          </div>
          <h2>{id}</h2>
        </div>
        <button className="icon-btn" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="detail-grid">
        {metric(
          <>
            <Package size={14} strokeWidth={1.75} className="inline-icon" /> Installed
          </>,
          `v${String(detail.installedVersion ?? '')}`,
        )}
        {metric(
          <>
            <Building2 size={14} strokeWidth={1.75} className="inline-icon" /> Builtin
          </>,
          `v${String(detail.builtinVersion ?? '')}`,
        )}
        {metric(
          <>
            <Tag size={14} strokeWidth={1.75} className="inline-icon" /> Status
          </>,
          status(detail.status ?? ''),
        )}
        {metric(
          <>
            <Folder size={14} strokeWidth={1.75} className="inline-icon" /> File
          </>,
          String(detail.path ?? ''),
        )}
      </div>
      {Array.isArray(detail.requiredVariables) && detail.requiredVariables.length > 0 ? (
        <div className="info">
          <Puzzle size={14} strokeWidth={1.75} className="inline-icon" /> Required variables:
          {detail.requiredVariables.map((value) => `{{${value}}}`).join(', ')}
        </div>
      ) : null}
      <textarea
        className="prompt-textarea"
        value={body}
        onChange={(event) => setBody(event.target.value)}
        spellCheck={false}
      />
      <div className="actions">
        <button className="primary" onClick={() => void save()}>
          <Save size={16} strokeWidth={1.75} /> Save
        </button>
        <button className="mini" onClick={() => void restore()}>
          <Undo2 size={16} strokeWidth={1.75} /> Restore builtin
        </button>
      </div>
      {message ? <div className="info">{message}</div> : null}
      {(detail.conflicts || []).length ? (
        <details className="diff conflict-block" open>
          <summary>⚠ Migration conflict</summary>
          {(detail.conflicts || []).map((conflict) => (
            <div key={conflict.path}>
              <div className="mono small">{conflict.path}</div>
              <pre>{conflict.content}</pre>
            </div>
          ))}
        </details>
      ) : null}
      <details className="diff">
        <summary>
          <Search size={14} strokeWidth={1.75} className="inline-icon" /> Diff vs builtin
        </summary>
        <pre>{detail.diff || 'No differences.'}</pre>
      </details>
    </div>
  );
}

const status = (value: string): string => {
  const statuses: Record<string, string> = {
    current: '✅ Current',
    modified: '✏️ Modified',
    update_available: '⬆ Update available',
    conflict: '⚠ Conflict',
  };
  return statuses[value] || value;
};

const metric = (key: React.ReactNode, value: unknown): ReactElement => (
  <div className="metric">
    <small>{key}</small>
    <strong>{String(value)}</strong>
  </div>
);
