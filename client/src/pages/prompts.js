import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useApp } from '../app-context.js';
import { getJSON, postJSON } from '../api.js';

const h = React.createElement;

export default function PromptsPage() {
  const app = useApp();
  const navigate = useNavigate();
  const { promptId } = useParams();

  const migrate = async () => {
    await postJSON('/api/prompts/migrate');
    await app.refreshPrompts();
  };

  return h(
    'div',
    { className: 'page' },
    h(
      'div',
      { className: 'page-heading' },
      h('div', null, h('div', { className: 'eyebrow' }, '🧠 TRANSLATION PROMPTS'), h('h1', null, 'Prompt files')),
      h('button', { className: 'mini', onClick: migrate }, '↻ Check / migrate updates'),
    ),
    h(
      'div',
      { className: 'prompt-grid' },
      ...(app.prompts || []).map(prompt =>
        h(
          'button',
          { className: 'prompt-card', key: prompt.id, onClick: () => navigate(`/prompts/${prompt.id}`) },
          h(
            'div',
            { className: 'prompt-top' },
            h('strong', null, prompt.id),
            h('span', { className: `prompt-status ${prompt.status}` }, status(prompt.status)),
          ),
          h('div', { className: 'muted' }, `Installed v${prompt.installedVersion} · Builtin v${prompt.builtinVersion}`),
          h('div', { className: 'mono small' }, prompt.path),
        ),
      ),
    ),
    promptId
      ? h(PromptEditor, { id: promptId, onClose: () => navigate('/prompts'), refresh: app.refreshPrompts })
      : null,
  );
}

function PromptEditor({ id, onClose, refresh }) {
  const [detail, setDetail] = useState(null);
  const [body, setBody] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    setDetail(null);
    getJSON(`/api/prompts/${encodeURIComponent(id)}`)
      .then(value => {
        if (!active) return;
        setDetail(value);
        setBody(value.body || '');
      })
      .catch(error => active && setMessage(`❌ ${error.message}`));
    return () => {
      active = false;
    };
  }, [id]);

  if (!detail) return h('div', { className: 'detail-card' }, 'Loading prompt…');

  const save = async () => {
    try {
      const value = await postJSON(`/api/prompts/${encodeURIComponent(id)}`, { body });
      setDetail(value);
      setBody(value.body || body);
      setMessage('✅ Saved');
      await refresh();
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  };

  const restore = async () => {
    if (!confirm('Restore the current built-in prompt?')) return;
    try {
      const value = await postJSON(`/api/prompts/${encodeURIComponent(id)}/restore`);
      setDetail(value);
      setBody(value.body || '');
      setMessage('✅ Restored');
      await refresh();
    } catch (error) {
      setMessage(`❌ ${error.message}`);
    }
  };

  return h(
    'div',
    { className: 'detail-card prompt-editor' },
    h(
      'div',
      { className: 'detail-head' },
      h('div', null, h('div', { className: 'eyebrow' }, '🧠 PROMPT EDITOR'), h('h2', null, id)),
      h('button', { className: 'icon-btn', onClick: onClose }, '✕'),
    ),
    h(
      'div',
      { className: 'detail-grid' },
      metric('📦 Installed', `v${detail.installedVersion}`),
      metric('🏗 Builtin', `v${detail.builtinVersion}`),
      metric('📄 Status', status(detail.status)),
      metric('📁 File', detail.path),
    ),
    detail.requiredVariables?.length
      ? h('div', { className: 'info' }, '🧩 Required variables: ', detail.requiredVariables.map(value => `{{${value}}}`).join(', '))
      : null,
    h('textarea', {
      className: 'prompt-textarea',
      value: body,
      onChange: event => setBody(event.target.value),
      spellCheck: false,
    }),
    h(
      'div',
      { className: 'actions' },
      h('button', { className: 'primary', onClick: save }, '💾 Save'),
      h('button', { className: 'mini', onClick: restore }, '↩ Restore builtin'),
    ),
    message ? h('div', { className: 'info' }, message) : null,
    (detail.conflicts || []).length
      ? h(
          'details',
          { className: 'diff conflict-block', open: true },
          h('summary', null, '⚠ Migration conflict'),
          ...(detail.conflicts || []).map(conflict =>
            h(
              'div',
              { key: conflict.path },
              h('div', { className: 'mono small' }, conflict.path),
              h('pre', null, conflict.content),
            ),
          ),
        )
      : null,
    h('details', { className: 'diff' }, h('summary', null, '🔍 Diff vs builtin'), h('pre', null, detail.diff || 'No differences.')),
  );
}

const status = value =>
  ({ current: '✅ Current', modified: '✏️ Modified', update_available: '⬆ Update available', conflict: '⚠ Conflict' }[value] || value);
const metric = (key, value) => h('div', { className: 'metric' }, h('small', null, key), h('strong', null, String(value ?? '—')));
