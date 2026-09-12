/* global React */
const { useState, useRef, useEffect, useLayoutEffect } = React;

/* ============ Popover ============
   Click-triggered, NON-MODAL floating panel for rich content (forms, lists, actions).
   For a pure-text hover description use <Tooltip>; for a modal overlay use the Dialog family.

   Composition:
     <Popover trigger={<button>…</button>} placement="bottom" align="center">
       <PopoverHeader title="…" onClose={…}/>
       <p className="popover__message">…</p>
       <PopoverFooter>…</PopoverFooter>
     </Popover>

   A11y contract: the real trigger carries aria-haspopup="dialog" + aria-expanded + aria-controls;
   the panel is a non-modal role="dialog" named by its trigger (aria-labelledby). Opening keeps
   focus on the trigger — Tab enters the panel by DOM order, with no focus trap and no auto-focus.
   Escape closes (returning focus to the trigger only if it was inside the panel); an outside
   pointerdown closes without stealing focus from the clicked target. Uncontrolled: defaultOpen
   seeds the initial state and the component owns it thereafter (no controlled open / onOpenChange).
============================================ */
function Popover({ trigger, placement = 'bottom', align = 'center', children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const ref = useRef(null);          // .popover-anchor — outside-click containment root (trigger + panel)
  const poRef = useRef(null);        // .popover panel
  const triggerRef = useRef(null);   // the real trigger element — focus-restore target
  const autoId = React.useId();

  // One top-level, unconditional useId per instance → stable, collision-free, SSR/hydration-safe ids.
  // A consumer-supplied trigger id wins, so aria-labelledby keeps naming the panel by the real trigger.
  const isElement = React.isValidElement(trigger);
  const triggerId = (isElement && trigger.props.id) || `${autoId}-trigger`;
  const panelId = `${autoId}-panel`;

  // ---- focus helpers (event/effect only; never read during render) ----
  const focusEl = (el) => { if (!el) return; try { el.focus({ preventScroll: true }); } catch (_) { el.focus(); } };
  // Is the trigger a safe focus target right now? (connected, enabled, visible, in the a11y tree)
  const isUsable = (el) => {
    if (!el || !el.isConnected) return false;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return false;
    if (el.closest('[hidden],[inert],[aria-hidden="true"]')) return false;
    const cs = window.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return false;
    if (!el.getClientRects().length) return false;
    return true;
  };
  const focusTrigger = () => { const t = triggerRef.current; if (isUsable(t)) focusEl(t); };

  // Close. When `restore` is set, move focus to the trigger BEFORE hiding the panel so focus never
  // flashes to <body>. Never throws, never focuses <body>, never hunts a global focus fallback.
  const closePopover = (restore) => {
    if (restore) focusTrigger();
    setOpen(false);
  };

  // Will an outside-click target take focus itself? If so, don't restore focus to the trigger.
  const willTakeFocus = (target) => {
    if (!(target instanceof Element)) return false;
    const el = target.closest('a[href],area[href],button,input,select,textarea,[tabindex],[contenteditable]');
    return !!el && !el.disabled;
  };

  // Outside pointerdown closes — only while open, per-instance, removed on close/unmount. The
  // trigger and panel live inside `ref`, so clicking either is never "outside" (no toggle race).
  useEffect(() => {
    if (!open) return;
    const onDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        const a = document.activeElement;
        const focusInPanel = !!(poRef.current && a && poRef.current.contains(a));
        closePopover(focusInPanel && !willTakeFocus(event.target)); // don't steal focus from the target
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  /* Viewport-edge correction: nudge the panel sideways/vertically so it
     stays on screen. Recomputed each time it opens or the viewport scrolls/resizes. */
  useLayoutEffect(() => {
    if (!open) return;
    const adjust = () => {
      const element = poRef.current;
      if (!element) return;
      // Reset any prior nudge so we measure the "natural" position.
      element.style.setProperty('--po-nudge-x', '0px');
      element.style.setProperty('--po-nudge-y', '0px');
      const rect = element.getBoundingClientRect();
      const margin = 8;
      let deltaX = 0, deltaY = 0;
      if (rect.left < margin)                   deltaX = margin - rect.left;
      else if (rect.right > window.innerWidth - margin) deltaX = (window.innerWidth - margin) - rect.right;
      if (rect.top < margin)                    deltaY = margin - rect.top;
      else if (rect.bottom > window.innerHeight - margin) deltaY = (window.innerHeight - margin) - rect.bottom;
      if (deltaX) element.style.setProperty('--po-nudge-x', `${deltaX}px`);
      if (deltaY) element.style.setProperty('--po-nudge-y', `${deltaY}px`);
    };
    adjust();
    window.addEventListener('resize', adjust);
    window.addEventListener('scroll', adjust, true);
    return () => {
      window.removeEventListener('resize', adjust);
      window.removeEventListener('scroll', adjust, true);
    };
  }, [open, placement, align]);

  // Escape closes from within the region only — caught off the keydown bubbling up to the anchor,
  // so there is no global Escape listener. A consumer or inner widget (combobox, select, nested
  // Popover…) whose own onKeyDown already handled this Escape will have called preventDefault by the
  // time it bubbles here, so we bail without closing or consuming it. Otherwise we close and
  // stopPropagation fires only on this handled, open branch, so a nested Popover (or a surrounding
  // overlay) does not also close on the same keypress.
  const onAnchorKeyDown = (event) => {
    if (event.key !== 'Escape' || !open) return;
    if (event.defaultPrevented) return;  // an inner/consumer handler already owned this Escape
    const a = document.activeElement;
    const focusInPanel = !!(poRef.current && a && poRef.current.contains(a));
    event.stopPropagation();
    closePopover(focusInPanel);          // panel focus → trigger; trigger focus → no needless refocus
  };

  // Merge our ref with any consumer ref on the trigger (cloneElement would otherwise drop it).
  const setTriggerRef = (node) => {
    triggerRef.current = node;
    const r = isElement ? trigger.ref : null;
    if (typeof r === 'function') r(node);
    else if (r && typeof r === 'object') r.current = node;
  };

  const isTriggerDisabled = () => isElement && (trigger.props.disabled
    || trigger.props['aria-disabled'] === true
    || trigger.props['aria-disabled'] === 'true');

  // The real trigger carries the interaction + ARIA. The consumer's onClick runs first; we toggle
  // only if it didn't preventDefault and the trigger isn't disabled. Native Enter/Space activate the
  // button → click → here (no duplicate key handling). Opening keeps focus on the trigger.
  const onTriggerClick = (event) => {
    if (isElement) trigger.props.onClick?.(event);
    if (event.defaultPrevented) return;
    if (isTriggerDisabled()) return;
    if (open) closePopover(false);       // toggle-close: focus is already on the trigger → no restore
    else setOpen(true);
  };

  const triggerProps = {
    ref: setTriggerRef,
    id: triggerId,
    'aria-haspopup': 'dialog',
    'aria-expanded': open,
    'aria-controls': panelId,
    onClick: onTriggerClick,
  };
  // A native <button> trigger must not fall back to type="submit" inside a form; an explicit
  // consumer type is preserved. A non-element trigger uses our own type="button" button.
  if (isElement && trigger.type === 'button' && trigger.props.type == null) triggerProps.type = 'button';
  const triggerEl = isElement
    ? React.cloneElement(trigger, triggerProps)
    : <button type="button" {...triggerProps}>{trigger}</button>;

  // PopoverHeader's close button lives in the panel, so closing from it returns focus to the trigger.
  const close = () => closePopover(true);

  return (
    <span ref={ref} className="popover-anchor" onKeyDown={onAnchorKeyDown}>
      {triggerEl}
      <span
        ref={poRef}
        id={panelId}
        role="dialog"
        aria-labelledby={triggerId}
        hidden={!open}
        className={`popover popover--${placement} ${align !== 'center' ? `popover--align-${align}` : ''} ${open ? 'is-open' : ''}`}
      >
        <span className="popover__body">
          {React.Children.map(children, (child) =>
            React.isValidElement(child) && child.type === PopoverHeader
              ? React.cloneElement(child, { _onClose: close })
              : child
          )}
        </span>
        <span className="popover__arrow" aria-hidden="true"/>
      </span>
    </span>
  );
}

function PopoverHeader({ title, sub, onClose, _onClose }) {
  const close = onClose ?? _onClose;
  return (
    <div className="popover__header">
      <div style={{ flex: 1 }}>
        {title && <div className="popover__title">{title}</div>}
        {sub && <div className="popover__subtitle">{sub}</div>}
      </div>
      {close && (
        <button type="button" className="popover__close" onClick={close} aria-label="Close">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>
        </button>
      )}
    </div>
  );
}

function PopoverFooter({ children }) {
  return <div className="popover__footer">{children}</div>;
}

Object.assign(window, { Popover, PopoverHeader, PopoverFooter });
