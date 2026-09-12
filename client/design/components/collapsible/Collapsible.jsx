/* global React */
(function () {
'use strict';
const { useState } = React;

function Collapsible({ trigger, children, defaultOpen = false, onOpenChange }) {
  const [open, setOpen] = useState(defaultOpen);
  // One top-level, unconditional useId per instance → stable, collision-free trigger/panel ids
  // (independent of `open`), safe across nested and sibling Collapsibles and SSR/hydration.
  const autoId = React.useId();
  const triggerId = `${autoId}-trigger`;
  const panelId = `${autoId}-panel`;

  const toggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    onOpenChange?.(nextOpen);
  };

  const ChevDown = () => (
    <svg className="collapsible__chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="m4 6 4 4 4-4"/>
    </svg>
  );

  return (
    <div className={`collapsible ${open ? 'is-open' : ''}`}>
      <button type="button" id={triggerId} className="collapsible__trigger" onClick={toggle} aria-expanded={open} aria-controls={panelId}>
        <span>{trigger}</span>
        <ChevDown />
      </button>
      <div className="collapsible__content" id={panelId} role="region" aria-labelledby={triggerId} hidden={!open}>
        <div className="collapsible__inner">
          {children}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Collapsible });
})();
