/* global React */
const { useState, useEffect, useCallback, useRef } = React;

/* ============ Toast primitives ============
   <ToastViewport position="br|bl|tr|tl|tc|bc" /> — mount once
   useToasts() — returns { toasts, push, dismiss }
   push({ title, message, variant, meta, duration, action })

   Simpler standalone usage: render <Toast .../> manually inside a viewport.
============================================ */
const Toast = React.forwardRef(function Toast({ variant = 'info', title, message, meta, action, onClose, className = '', onMouseEnter, onMouseLeave, onFocus, onBlur }, ref) {
  const classNames = ['toast', `toast--${variant}`, className].filter(Boolean).join(' ');
  return (
    <div className={classNames} ref={ref} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} onFocus={onFocus} onBlur={onBlur}>
      <span className="toast__dot"/>
      <div className="toast__body">
        {title && <span className="toast__title">{title}</span>}
        {message && <span className="toast__message">{message}</span>}
        {meta && <span className="toast__meta">{meta}</span>}
        {action && (
          <div className="toast__actions">
            <button type="button" className="toast__action" onClick={action.onClick}>{action.label}</button>
          </div>
        )}
      </div>
      {onClose && (
        <button type="button" className="toast__close" onClick={onClose} aria-label="Dismiss">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <path d="M4 4l8 8M12 4l-8 8"/>
          </svg>
        </button>
      )}
    </div>
  );
});

/* Hook + Viewport pair for managed stacking.
   The auto-dismiss clock no longer lives here: it now runs inside each rendered
   toast (ManagedToast) so it can sense hover, focus-within and unmount. The store
   only owns identity + the list; duration data rides along on each record. */
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((toast) => {
    const id = ++idRef.current;
    setToasts((currentToasts) => [...currentToasts, { id, ...toast }]);
    return id;
  }, []);

  return { toasts, push, dismiss };
}

/* Build the spoken announcement from a toast's own data, in title → message → meta
   order. Only string/number (and arrays of them) are read; React nodes / objects
   are skipped so the live region never receives "[object Object]". Empty parts are
   dropped, so there is never a double space or stray punctuation. */
function toAnnounceText(value) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (Array.isArray(value)) return value.map(toAnnounceText).filter(Boolean).join('');
  return '';
}
function announcementFor(toast) {
  return [toast.title, toast.message, toast.meta]
    .map(toAnnounceText)
    .map((part) => part.trim())
    .filter(Boolean)
    .join('. ');
}

/* Visually-hidden recipe — no repo-wide .sr-only utility exists, so it lives here.
   Stays in the accessibility tree (no display/visibility/hidden/aria-hidden), is
   out of flow (no layout shift), clips to 1px (no scrollbar), and takes no pointer. */
const ANNOUNCER_STYLE = {
  position: 'absolute',
  width: '1px', height: '1px',
  margin: '-1px', padding: 0, border: 0,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
};

/* Duration contract: null/undefined → 4500 ms default; Infinity → never auto-dismiss;
   finite ≥ 0 → that many ms of *active* (un-paused) time; negative / NaN → safe 0. */
function normalizeDuration(value) {
  if (value == null) return 4500;
  if (value === Infinity) return null;
  const ms = Number(value);
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return ms;
}

/* Is `el` a safe place to send focus back to? No throw, no body, no global fallback. */
function isUsableTarget(el) {
  if (!(el instanceof HTMLElement) || !el.isConnected) return false;
  if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return false;
  if (el.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
  if (el.getClientRects().length === 0) return false;
  return true;
}

/* Restore focus only when it is "loose" (body / documentElement / disconnected) — i.e.
   the dismissed toast was holding it. Never steal from a live dialog/menu/consumer. */
function restoreFocus(target) {
  if (!isUsableTarget(target)) return;
  const active = document.activeElement;
  const loose = !active || active === document.body || active === document.documentElement || !active.isConnected;
  if (!loose) return;
  try { target.focus({ preventScroll: true }); }
  catch (e) { try { target.focus(); } catch (e2) { /* give up silently */ } }
}

/* Internal, non-exported lifecycle owner — renders <Toast> directly (no extra DOM box,
   so .toast stays the direct flex child). Owns this toast's single auto-dismiss timer,
   hover + focus-within pause, the once-only dismiss guard, and focus return on removal.
   Everything is per-instance: no module-global timer map, no global active-toast. */
function ManagedToast({ toast, onDismiss }) {
  const rootRef = useRef(null);
  const timerRef = useRef(null);
  const durationRef = useRef(null);     // normalized total; null = no auto-dismiss
  const remainingRef = useRef(null);    // ms of active time left
  const startedAtRef = useRef(0);       // performance.now() when the current run began
  const pauseHoverRef = useRef(false);
  const pauseFocusRef = useRef(false);
  const dismissedRef = useRef(false);
  const focusInsideRef = useRef(false);
  const returnTargetRef = useRef(null);
  const dismissCbRef = useRef(null);

  // Keep the dismiss callback fresh without ever rescheduling the timer (§22).
  useEffect(() => { dismissCbRef.current = () => onDismiss(toast.id); });

  const clearTimer = () => {
    if (timerRef.current != null) { clearTimeout(timerRef.current); timerRef.current = null; }
  };

  const requestDismiss = () => {           // the single dismiss path (auto + close)
    if (dismissedRef.current) return;      // exactly once per mounted instance
    dismissedRef.current = true;
    clearTimer();
    dismissCbRef.current();                // never runs the action callback
  };

  const onElapsed = () => {
    timerRef.current = null;
    if (pauseHoverRef.current || pauseFocusRef.current) { remainingRef.current = 0; return; } // race: stay paused
    requestDismiss();
  };

  const startTimer = () => {
    if (dismissedRef.current || durationRef.current == null) return;
    if (timerRef.current != null) return;  // already running — never double up
    if (pauseHoverRef.current || pauseFocusRef.current) return;
    startedAtRef.current = performance.now();
    timerRef.current = setTimeout(onElapsed, Math.max(0, remainingRef.current));
  };

  const pauseTimer = () => {
    if (timerRef.current == null) return;
    clearTimeout(timerRef.current); timerRef.current = null;
    remainingRef.current = Math.max(0, remainingRef.current - (performance.now() - startedAtRef.current));
  };

  const handleMouseEnter = () => { pauseHoverRef.current = true; pauseTimer(); };
  const handleMouseLeave = () => { pauseHoverRef.current = false; if (!pauseFocusRef.current) startTimer(); };

  const handleFocus = (event) => {
    if (!focusInsideRef.current) {                     // entering from outside — capture return target
      const prev = event.relatedTarget;
      if (prev instanceof HTMLElement && prev.isConnected
          && prev !== document.body && prev !== document.documentElement
          && rootRef.current && !rootRef.current.contains(prev)) {
        returnTargetRef.current = prev;
      }
    }
    focusInsideRef.current = true;
    pauseFocusRef.current = true;
    pauseTimer();
  };

  const handleBlur = (event) => {
    const next = event.relatedTarget;
    if (next && rootRef.current && rootRef.current.contains(next)) return; // internal action↔close move
    focusInsideRef.current = false;
    pauseFocusRef.current = false;
    if (!pauseHoverRef.current) startTimer();
  };

  useEffect(() => {
    durationRef.current = normalizeDuration(toast.duration);
    remainingRef.current = durationRef.current;
    startTimer();
    const root = rootRef.current;
    return () => {
      clearTimer();
      const target = returnTargetRef.current;
      if (!focusInsideRef.current || !target) return;  // focus wasn't in the toast → nothing to restore
      requestAnimationFrame(() => {
        if (root && root.isConnected) return;          // still connected → Strict Mode replay, not a real removal
        restoreFocus(target);
      });
    };
  }, []);

  return (
    <Toast
      ref={rootRef}
      variant={toast.variant}
      title={toast.title}
      message={toast.message}
      meta={toast.meta}
      action={toast.action}
      onClose={requestDismiss}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
    />
  );
}

function ToastViewport({ toasts, onDismiss, position = 'br' }) {
  const positionClass = { br: '', bl: 'toast-viewport--bl', tr: 'toast-viewport--tr', tl: 'toast-viewport--tl', tc: 'toast-viewport--tc', bc: 'toast-viewport--bc' }[position] || '';

  /* One persistent polite live region per viewport, separate from the visible
     toasts, announces only *new* toasts. All state is per-instance (no module
     global): which ids were already announced, a pending queue, and the single
     in-flight frame handle. */
  const [liveText, setLiveText] = useState('');
  const seenIdsRef = useRef(new Set());
  const queueRef = useRef([]);
  const rafRef = useRef(null);

  useEffect(() => {
    const seen = seenIdsRef.current;
    const currentIds = new Set();
    const fresh = [];
    for (const toast of toasts) {
      currentIds.add(toast.id);
      if (!seen.has(toast.id)) fresh.push(toast);     // dedup by stable id, not text
    }
    seenIdsRef.current = currentIds;                  // prune dismissed ids (never reused)
    for (const toast of fresh) {                      // input order preserved
      const text = announcementFor(toast);
      if (text) queueRef.current.push(text);
    }

    // Drain the queue one message per frame. Clearing to '' before each message
    // lets two identical strings re-announce; the queue survives across renders,
    // so dismiss/reorder never drops a pending message.
    const flush = () => {
      rafRef.current = null;
      if (queueRef.current.length === 0) return;
      setLiveText('');
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        setLiveText(queueRef.current.shift());
        if (queueRef.current.length > 0) rafRef.current = requestAnimationFrame(flush);
      });
    };
    if (rafRef.current == null && queueRef.current.length > 0) rafRef.current = requestAnimationFrame(flush);

    return () => {
      if (rafRef.current != null) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    };
  }, [toasts]);

  return (
    <div className={`toast-viewport ${positionClass}`}>
      <div role="status" aria-live="polite" aria-atomic="true" aria-relevant="additions text" style={ANNOUNCER_STYLE}>
        {liveText}
      </div>
      {toasts.map((toast) => (
        <ManagedToast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

Object.assign(window, { Toast, ToastViewport, useToasts });
