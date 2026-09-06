import React, { useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { useApp } from '../app-context.js';
import { TaskHistory } from './task-history.js';
import { TaskLanguageBadge } from './language-badge.js';

const h = React.createElement;

export function TaskDrawer({ base, tasks: scopedTasks = null }) {
  const { sessionId: routeSessionId, uid } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const app = useApp();
  const tasks = scopedTasks || app.state?.tasks || [];
  const close = () => navigate({ pathname: `/${base}`, search: location.search });

  useEffect(() => {
    if (!uid) return undefined;
    const onKeyDown = event => { if (event.key === 'Escape') close(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [uid, routeSessionId, base, navigate, location.search]);

  if (!uid) return null;
  const task = tasks.find(item => item.uid === uid && (!routeSessionId || item.sessionId === routeSessionId))
    || tasks.find(item => item.uid === uid && item.sessionId === app.currentSessionId)
    || tasks.find(item => item.uid === uid);
  if (!task) return null;

  const sameStore = tasks.filter(item => item.sessionId === task.sessionId && item.storeId === task.storeId);
  const byId = new Map(sameStore.map(item => [String(item.id), item]));
  const sessionLabel = task.session?.label || task.sessionId || 'session';

  return h(React.Fragment, null,
    h('div', { className: 'panel-backdrop', onClick: close }),
    h('aside', { className: 'drawer open' },
      h('div', { className: 'drawer-head' },
        h('div', null,
          h('div', { className: 'drawer-session-badge', title: `${sessionLabel}\n${task.sessionId || ''}` }, `🧵 ${sessionLabel}`),
          h('div', { className: 'muted mono' }, `#${task.id}`),
          h('div',{className:'drawer-title-row'},h('h2', null, task.subject),h(TaskLanguageBadge,{task}))),
        h('button', { className: 'icon-btn', onClick: close }, '✕')),
      h('div', { className: 'drawer-body' },
        field('📌', 'Status', task.status),
        field('⚡', 'Active form', task.activeForm || '—'),
        field('👤', 'Owner', task.owner || '—'),
        dependencyField('🔒','Blocked by',task.blockedBy||[],byId),
        dependencyField('🚧','Blocks',task.blocks||[],byId),
        h('section', { className: 'drawer-section' },
          h('div', { className: 'section-title' }, '🌐 Task language'),
          h('div', { className: 'task-language-row' },
            h('div', { className: 'lang-control' },
              h('span', null, 'EN'),
              h('button', {
                className: `switch ${task.viewLanguage === 'hu' ? 'on' : ''}`,
                onClick: () => app.toggleTaskLanguage(task.sessionId, task.uid, task.viewLanguage),
                role: 'switch', 'aria-checked': task.viewLanguage === 'hu',
                title: task.viewLanguage === 'hu' ? 'Show this task in English' : 'Show this task in Hungarian when translation is ready',
              }, h('span')),
              h('span', null, 'HU')),
            h('span', { className: `translation-state ${task.translationState || 'missing'}` }, translationStateLabel(task)),
            task.translationPending ? h('div', { className: 'lang-progress' }, h('span', { className: 'spinner' }), h('button', { className: 'mini danger', onClick: () => app.cancelTask(task.sessionId, task.uid) }, '■ Stop')) : null),
          task.viewLanguage === 'hu' && task.effectiveLanguage === 'en' && !task.translationError
            ? h('div', { className: 'translation-fallback-note' }, '🇬🇧 Showing current English source until the Hungarian translation is ready.') : null,
          task.translationError ? h('div', { className: 'warning' }, '⚠ HU unavailable: ', task.translationError) : null),
        h('section', { className: 'drawer-section' }, h('div', { className: 'section-title' }, '📝 Description'), h('div', { className: 'prose prewrap' }, task.description || '—')),
        h(TaskHistory, { task }),
      )),
  );
}


function dependencyField(icon,label,ids,byId){
  const children = ids.length
    ? ids.map(id=>{const task=byId.get(String(id));return h('div',{className:'dependency-item',key:String(id)},h('span',null,task?`#${id} — ${task.subject}`:`#${id}`),task?h(TaskLanguageBadge,{task,compact:true}):null);})
    : [h('span',{key:'empty'},'—')];
  return h('div',{className:'field'},h('div',{className:'field-label'},`${icon} ${label}`),h('div',{className:'field-value dependency-list'},...children));
}

function field(icon, label, value) {
  return h('div', { className: 'field' }, h('div', { className: 'field-label' }, `${icon} ${label}`), h('div', { className: 'field-value' }, String(value ?? '—')));
}
function translationStateLabel(task) {
  if (task.viewLanguage !== 'hu') return '🇬🇧 English';
  return ({ ready: '🇭🇺 Ready', missing: '○ Missing', queued: '⏳ Queued', translating: '🌍 Translating', validating: '🔎 Validating', retrying: '🔁 Retrying', canceling: '🛑 Canceling', failed: '⚠ Failed' }[task.translationState] || task.translationState || '○ Missing');
}
