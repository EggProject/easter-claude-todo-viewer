/* global React */
(function () {
'use strict';
const { useState, useRef, useId } = React;

function HoverCard({ trigger, children, side = 'top' }) {
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);
  // Instance-stable id for the trigger↔panel disclosure relationship. Not a
  // public prop — generated per instance so multiple HoverCards never collide.
  const panelId = useId();

  const show = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(true), 180);
  };
  const hide = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setOpen(false), 120);
  };

  // Rich hover-card (not an ARIA tooltip/dialog widget): Escape dismisses the
  // open panel. Focus stays on the already-focused trigger, so no refocus is
  // issued (a refocus would re-fire onFocus and reopen). Closed → no-op.
  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      clearTimeout(timerRef.current);
      setOpen(false);
    }
  };

  return (
    <div
      className="hover-card"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={handleKeyDown}
    >
      <span
        className="hover-card__trigger"
        tabIndex={0}
        aria-controls={panelId}
        aria-expanded={open}
      >
        {trigger}
      </span>
      <div
        id={panelId}
        className={`hover-card__panel hover-card__panel--${side} ${open ? 'is-open' : ''}`}
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        {children}
      </div>
    </div>
  );
}

/* Convenience sub-components */
HoverCard.Head = function HoverCardHead({ avatar, name, subtitle }) {
  return (
    <div className="hover-card__header">
      {avatar && <div className="hover-card__avatar">{avatar}</div>}
      <div>
        <div className="hover-card__name">{name}</div>
        {subtitle && <div className="hover-card__subtitle">{subtitle}</div>}
      </div>
    </div>
  );
};

HoverCard.Body = function HoverCardBody({ children }) {
  return <div className="hover-card__body">{children}</div>;
};

HoverCard.Tags = function HoverCardTags({ tags }) {
  return (
    <div className="hover-card__footer">
      {tags.map((tag, i) => <span key={i} className="hover-card__tag">{tag}</span>)}
    </div>
  );
};

Object.assign(window, { HoverCard });
})();
