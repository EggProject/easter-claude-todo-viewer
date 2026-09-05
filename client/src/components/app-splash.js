import React from 'react';
const h = React.createElement;

export function AppSplash({ phase = 'Preparing session workspace', error = null, onRetry = null }) {
  return h('div', { className: `app-splash${error ? ' error' : ''}` },
    h('div', { className: 'splash-orb' }, error ? '⚠️' : '🤖'),
    h('div', { className: 'splash-brand' }, h('strong', null, 'Claude Tasks'), h('span', null, 'multi-session workspace')),
    error
      ? h(React.Fragment, null,
          h('h2', null, 'Dashboard could not start'),
          h('pre', { className: 'splash-error' }, String(error)),
          h('button', { className: 'primary', onClick: onRetry }, '↻ Retry'))
      : h(React.Fragment, null,
          h('span', { className: 'splash-spinner', 'aria-hidden': true }),
          h('p', null, phase || 'Preparing session workspace')),
  );
}
