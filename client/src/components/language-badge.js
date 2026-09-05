import React from 'react';
const h = React.createElement;

export function languageBadgeSpec(task = {}) {
  const wanted = task.viewLanguage || task.desiredLanguage || 'en';
  const shown = task.effectiveLanguage || 'en';
  const state = task.translationState || 'missing';
  const sessionGlobalLanguage = task.sessionGlobalLanguage || task.session?.globalLanguage || 'en';
  if (wanted === 'hu') {
    if (shown === 'hu' && state === 'ready') return { key: 'hu-ready', label: '🌐 HU', title: 'Hungarian translation is ready and shown' };
    if (state === 'failed') return { key: 'hu-failed', label: '⚠ HU', title: 'Hungarian requested, but the current translation failed' };
    return { key: 'hu-pending', label: '⏳ HU', title: `Hungarian requested; current translation state: ${state}` };
  }
  if (sessionGlobalLanguage === 'hu') return { key: 'en-override', label: 'EN override', title: 'This task is explicitly English while the session default is Hungarian' };
  if (state === 'ready') return { key: 'hu-cached', label: '✓ HU cached', title: 'Showing English; a valid Hungarian translation is cached for this version' };
  return { key: 'en', label: 'EN', title: 'Showing English' };
}

export function TaskLanguageBadge({ task, compact = false }) {
  const spec = languageBadgeSpec(task);
  return h('span', { className: `task-language-badge ${spec.key}${compact ? ' compact' : ''}`, title: spec.title }, spec.label);
}
