/* global React */
(function () {
'use strict';
const { useState, useEffect, useRef } = React;

function ContextMenu({ children, items }) {
  const [position, setPosition] = useState(null);   // raw open anchor (viewport coords); truthy ⇒ menu open
  const [coords, setCoords] = useState(null);        // applied, viewport-clamped coords used by the inline style
  const menuRef = useRef(null);        // .context-menu panel (also the programmatic focus fallback)
  const targetRef = useRef(null);      // wrapper = context target + focus-restore destination
  const activeRef = useRef(null);      // current roving menuitem (the tabIndex=0 owner)
  const openSourceRef = useRef('pointer'); // last open path: 'pointer' | 'keyboard' (intent is always first)
  const cycleRef = useRef(0);          // open-cycle token guarding async focus across re-opens
  const focusRafRef = useRef(0);       // pending initial-focus frame (cancellable)
  const tabRafRef = useRef(0);         // pending Tab-close frame (cancellable)
  const measureRafRef = useRef(0);     // pending measure/clamp frame (cancellable)
  const typeBufferRef = useRef('');    // character typeahead buffer (per instance)
  const typeTimerRef = useRef(0);      // typeahead expiry timer (cancellable)
  const typeScopeRef = useRef(null);   // typeahead scope key (resets buffer on scope change)
  const autoId = React.useId();

  const targetId = `${autoId}-target`;
  const menuId = `${autoId}-menu`;

  // ---- focus + roving helpers (run only in client effects / event handlers) ----
  const focusEl = (el) => {
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (_) { el.focus(); }
  };

  // Is this menuitem currently usable (enabled, visible, in the a11y tree)?
  const isUsable = (el) => {
    if (!el || !el.isConnected) return false;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return false;
    if (el.closest('[hidden],[inert],[aria-hidden="true"]')) return false;
    const cs = window.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return false;
    if (!el.getClientRects().length) return false;
    return true;
  };

  // Usable action items in DOM order (labels / separators have no role="menuitem").
  const getItems = () => {
    const panel = menuRef.current;
    if (!panel) return [];
    return Array.from(panel.querySelectorAll('[role="menuitem"]')).filter(isUsable);
  };

  // Make `target` the single roving tab stop among the usable items.
  const setActive = (target) => {
    const items = getItems();
    items.forEach((el) => { el.tabIndex = el === target ? 0 : -1; });
    activeRef.current = items.includes(target) ? target : null;
  };

  const focusPanel = () => focusEl(menuRef.current);
  const moveTo = (target) => { if (target) { setActive(target); focusEl(target); } };
  const focusFirst = () => { const i = getItems(); if (i.length) moveTo(i[0]); else focusPanel(); };
  const focusLast  = () => { const i = getItems(); if (i.length) moveTo(i[i.length - 1]); else focusPanel(); };
  const focusStep = (dir) => {
    const items = getItems();
    if (!items.length) return; // nothing to move to; the caller already stopped page scroll
    const cur = items.indexOf(document.activeElement);
    const idx = cur === -1 ? (dir > 0 ? 0 : items.length - 1)
                           : (cur + dir + items.length) % items.length;
    moveTo(items[idx]);
  };

  // Restore focus to the context target, only when it is safely focusable.
  const focusTarget = () => {
    const t = targetRef.current;
    if (!t || !t.isConnected || t.disabled || typeof t.focus !== 'function') return;
    if (t.closest('[inert],[aria-hidden="true"]')) return;
    focusEl(t);
  };

  // ---- single close helper, with an explicit focus-restore intent ----
  const closeMenu = (restore) => {
    resetTypeahead();
    cancelAnimationFrame(focusRafRef.current);
    cancelAnimationFrame(tabRafRef.current);
    cancelAnimationFrame(measureRafRef.current);
    if (restore) focusTarget();
    activeRef.current = null;
    cycleRef.current += 1; // invalidate any in-flight open cycle
    setPosition(null);
  };
  // Item activation: restore to the target only if an action item actually held focus.
  const closeFromItem = () => {
    const a = document.activeElement;
    const onItem = !!(menuRef.current && a && menuRef.current.contains(a)
      && a.getAttribute && a.getAttribute('role') === 'menuitem');
    closeMenu(onItem);
  };

  // Will an outside-click target take focus itself? Then we must not steal it back.
  const willTakeFocus = (target) => {
    if (!(target instanceof Element)) return false;
    const el = target.closest('a[href],area[href],button,input,select,textarea,[tabindex],[contenteditable]');
    return !!el && !el.disabled;
  };

  // Keyboard-open anchor: the wrapper rect, or the focused descendant's rect if valid.
  const pickRectEl = (wrapper) => {
    const active = document.activeElement;
    if (active && active !== wrapper && wrapper.contains(active) && active.isConnected) {
      const r = active.getBoundingClientRect();
      if (r.width || r.height) return active;
    }
    return wrapper;
  };

  // ---- viewport clamp: keep the raw anchor separate from the rendered-and-measured final coord ----
  const VIEWPORT_MARGIN = 8; // px breathing room from each viewport edge (positioning-internal; not a token/prop)
  // Clamp one axis: prefer the anchor, keep the near edge ≥ margin and the far edge ≤ viewport − margin.
  // Degrades safely when the panel is larger than the gap, or size/viewport is not a finite positive number.
  const clampAxis = (anchor, size, viewport) => {
    const min = VIEWPORT_MARGIN;
    let pos = Number.isFinite(anchor) ? Math.max(anchor, min) : min;
    if (Number.isFinite(size) && size > 0 && Number.isFinite(viewport)) {
      const max = viewport - size - min;
      pos = max >= min ? Math.min(pos, max) : min; // panel bigger than the gap → pin to the near margin (never negative)
    }
    return Math.round(pos); // integer px keeps the equality check below stable against sub-pixel jitter
  };
  // Measure the rendered panel (fixed → viewport coords) and write back the clamped coord, only if it changed.
  // offsetWidth/offsetHeight are the layout border-box size — unaffected by the CSS scale() entrance animation;
  // getBoundingClientRect() returns the transformed (momentarily smaller) box mid-animation, so use it only as a
  // fallback when the layout size is not a usable positive number. clampAxis still guards any remaining bad value.
  const measureAndClamp = () => {
    if (typeof window === 'undefined') return;           // SSR / no DOM: keep the anchor, never throw
    const panel = menuRef.current;
    if (!panel || !panel.isConnected || !position) return;
    const rect = panel.getBoundingClientRect();          // fallback size only (transform-affected)
    const ow = panel.offsetWidth, oh = panel.offsetHeight; // layout border-box, transform-independent
    const width  = Number.isFinite(ow) && ow > 0 ? ow : rect.width;
    const height = Number.isFinite(oh) && oh > 0 ? oh : rect.height;
    const next = {
      x: clampAxis(position.x, width, window.innerWidth),
      y: clampAxis(position.y, height, window.innerHeight),
    };
    setCoords((prev) => (prev && prev.x === next.x && prev.y === next.y ? prev : next)); // numeric diff → no rerender loop
  };
  // One pending frame at a time; the cycle token drops a frame that a newer open/close has superseded.
  const scheduleMeasure = () => {
    if (typeof window === 'undefined') return;
    cancelAnimationFrame(measureRafRef.current);
    const cycle = cycleRef.current;
    measureRafRef.current = requestAnimationFrame(() => {
      measureRafRef.current = 0;
      if (cycle !== cycleRef.current) return;
      measureAndClamp();
    });
  };

  // ---- pointer + keyboard open on the context target wrapper ----
  const handleContextMenu = (event) => {
    event.preventDefault();
    resetTypeahead(); // fresh buffer at the start of each open / reposition cycle
    openSourceRef.current = 'pointer';
    cycleRef.current += 1;
    const anchor = { x: event.clientX, y: event.clientY }; // pointer anchor stays a viewport coord
    setPosition(anchor);                                   // never toggles; re-open just repositions
    setCoords(anchor);                                     // start at the anchor; post-render measure clamps it
  };
  const handleTargetKeyDown = (event) => {
    // No public consumer wrapper-event callback exists, so there is nothing to compose first.
    const isShiftF10 = event.key === 'F10' && event.shiftKey;
    const isMenuKey = event.key === 'ContextMenu' || event.key === 'Apps';
    if (!isShiftF10 && !isMenuKey) return;
    event.preventDefault(); // suppress the native context menu; don't activate wrapper children
    resetTypeahead(); // fresh buffer at the start of a keyboard open cycle
    openSourceRef.current = 'keyboard';
    cycleRef.current += 1;
    const rect = pickRectEl(event.currentTarget).getBoundingClientRect();
    const anchor = { x: rect.left, y: rect.bottom }; // bottom-left; fixed → viewport coords
    setPosition(anchor);
    setCoords(anchor);                               // start at the anchor; post-render measure clamps it
  };

  // ---- outside-click (mousedown) + Escape, both guarded to this menu's focus owner ----
  useEffect(() => {
    if (!position) return;
    const onDown = (event) => {
      const panel = menuRef.current;
      if (!panel || panel.contains(event.target)) return;
      // A secondary-button press on our own target is a reposition, not an outside close.
      const t = targetRef.current;
      if (event.button === 2 && t && t.contains(event.target)) return;
      const a = document.activeElement;
      const focusInPanel = !!(a && panel.contains(a));
      closeMenu(focusInPanel && !willTakeFocus(event.target));
    };
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      const a = document.activeElement;
      const panel = menuRef.current;
      const t = targetRef.current;
      const owns = !!(panel && a && panel.contains(a))
        || !!(t && a && (a === t || (t.contains && t.contains(a))));
      if (!owns) return;
      event.preventDefault();
      closeMenu(true);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [position]);

  // ---- initial focus after the panel mounts (first usable item, else the panel) ----
  useEffect(() => {
    if (!position) return;
    const cycle = cycleRef.current;
    const raf = requestAnimationFrame(() => {
      if (cycle !== cycleRef.current) return;
      const panel = menuRef.current;
      if (!panel || !panel.isConnected) return;
      const items = getItems();
      if (items.length) { setActive(items[0]); focusEl(items[0]); }
      else { activeRef.current = null; focusEl(panel); }
    });
    focusRafRef.current = raf;
    return () => cancelAnimationFrame(raf);
  }, [position]);

  // ---- keep exactly one usable item as the tab stop across consumer re-renders ----
  useEffect(() => {
    if (!position) return;
    const panel = menuRef.current;
    if (!panel) return;
    const all = Array.from(panel.querySelectorAll('[role="menuitem"]'));
    const usable = all.filter(isUsable);
    all.forEach((el) => { if (el.tabIndex === 0 && !usable.includes(el)) el.tabIndex = -1; });
    if (!usable.length) { activeRef.current = null; return; }
    const stop = (usable.includes(activeRef.current) && activeRef.current)
      || usable.find((el) => el.tabIndex === 0)
      || usable[0];
    usable.forEach((el) => { el.tabIndex = el === stop ? 0 : -1; });
    activeRef.current = stop;
  });

  // ---- measure the panel after it renders and clamp it into the viewport ----
  // Runs on each open AND when `items` change the panel's size; the measure bails when the coord is unchanged.
  useEffect(() => {
    if (!position) return;
    scheduleMeasure();
    return () => cancelAnimationFrame(measureRafRef.current);
  }, [position, items]);

  // ---- while open: re-clamp on resize; close on scroll (a scrolled anchor would detach the menu) ----
  useEffect(() => {
    if (!position || typeof window === 'undefined') return;
    const onResize = () => scheduleMeasure();             // remeasure + reclamp only; no focus move, no new open cycle
    const onScroll = () => {
      const panel = menuRef.current;
      const a = document.activeElement;
      if (panel && a && panel.contains(a)) focusTarget();  // move focus off the panel BEFORE it unmounts (only if it was on it)
      closeMenu(false);                                    // close without auto-restoring focus (don't steal external focus)
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, true);     // capture: also catch nested scroll containers
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [position]);

  // Clear any pending typeahead timer on unmount (no stale timer under Strict Mode).
  useEffect(() => () => { if (typeTimerRef.current) clearTimeout(typeTimerRef.current); }, []);

  // ---- character typeahead (small local helpers; no shared global manager) ----
  const TYPEAHEAD_MS = 500;
  const isEditableTarget = (el) =>
    !!(el && el.closest && el.closest('input,textarea,select,[contenteditable=""],[contenteditable="true"]'));
  const isTypeaheadKey = (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return false;
    if (event.isComposing || event.keyCode === 229) return false;       // ignore IME composition
    const k = event.key;
    return !!k && k.length === 1 && k !== ' ';                          // single printable char, not Space
  };
  const normalizeText = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toLocaleLowerCase();
  const resetTypeahead = () => {
    if (typeTimerRef.current) { clearTimeout(typeTimerRef.current); typeTimerRef.current = 0; }
    typeBufferRef.current = '';
  };
  const matchFrom = (els, query, startIdx, getText) => {
    const n = els.length;
    const base = (((startIdx % n) + n) % n);
    for (let off = 0; off < n; off++) {
      const el = els[(base + off) % n];
      if (getText(el).startsWith(query)) return el;
    }
    return null;
  };
  // undefined = not a typeahead key; null = handled but no match; element = handled with a match.
  const computeTypeahead = (event, els, current, getText, scope) => {
    if (!isTypeaheadKey(event) || isEditableTarget(event.target)) return undefined;
    if (typeScopeRef.current !== scope) { typeBufferRef.current = ''; typeScopeRef.current = scope; }
    if (typeTimerRef.current) clearTimeout(typeTimerRef.current);
    typeBufferRef.current += event.key.toLocaleLowerCase();
    typeTimerRef.current = setTimeout(() => { typeTimerRef.current = 0; typeBufferRef.current = ''; }, TYPEAHEAD_MS);
    const buffer = typeBufferRef.current;
    if (!els.length) return null;
    const curIdx = current ? els.indexOf(current) : -1;
    const allSame = buffer.split('').every((c) => c === buffer[0]);    // repeated same char → cycle
    const query = allSame ? buffer[0] : buffer;
    const startIdx = allSame ? curIdx + 1 : Math.max(curIdx, 0);       // repeat: after current; prefix: keep current
    let match = matchFrom(els, query, startIdx, getText);
    if (!match && !allSame) {                                          // multi-char miss → retry last char as fresh buffer
      const last = buffer[buffer.length - 1];
      const alt = matchFrom(els, last, curIdx + 1, getText);
      if (alt) { typeBufferRef.current = last; match = alt; }
    }
    return match;
  };
  // ContextMenu searchable text: the per-button data-text-value (the label, no icon/shortcut).
  const itemText = (el) => normalizeText(el.getAttribute('data-text-value') != null ? el.getAttribute('data-text-value') : el.textContent);
  const handleTypeahead = (event) => {
    const match = computeTypeahead(event, getItems(), document.activeElement, itemText, 'ctx');
    if (match === undefined) return;          // not a typeahead char → leave the event alone
    event.preventDefault();
    if (match) { setActive(match); focusEl(match); }   // no activation, no close — just roving focus
  };

  // ---- panel keyboard map + focus-driven roving sync ----
  const onPanelKeyDown = (event) => {
    switch (event.key) {
      case 'ArrowDown': event.preventDefault(); focusStep(1); break;
      case 'ArrowUp':   event.preventDefault(); focusStep(-1); break;
      case 'Home':      event.preventDefault(); focusFirst(); break;
      case 'End':       event.preventDefault(); focusLast(); break;
      case 'Tab':
        // Don't trap: let native focus move, then close after it without stealing focus back.
        cancelAnimationFrame(tabRafRef.current);
        tabRafRef.current = requestAnimationFrame(() => closeMenu(false));
        break;
      default: handleTypeahead(event); break;
    }
  };
  const onPanelFocusCapture = (event) => {
    const el = event.target;
    if (el && el.getAttribute && el.getAttribute('role') === 'menuitem' && isUsable(el)) setActive(el);
  };

  return (
    <>
      <div
        className="context-menu__target"
        ref={targetRef}
        id={targetId}
        aria-haspopup="menu"
        aria-expanded={Boolean(position)}
        aria-controls={menuId}
        tabIndex={0}
        onContextMenu={handleContextMenu}
        onKeyDown={handleTargetKeyDown}
        style={{ userSelect: 'none' }}
      >
        {children}
      </div>
      {position && (
        <div
          ref={menuRef}
          id={menuId}
          className="context-menu"
          role="menu"
          aria-labelledby={targetId}
          tabIndex={-1}
          onKeyDown={onPanelKeyDown}
          onFocusCapture={onPanelFocusCapture}
          style={{ top: (coords || position).y, left: (coords || position).x }}
        >
          {items.map((item, i) => {
            if (item.type === 'separator') return <div key={i} className="context-menu__separator" role="separator" />;
            if (item.type === 'label') return <div key={i} className="context-menu__label">{item.label}</div>;
            return (
              <button
                key={i}
                className={`context-menu__item ${item.danger ? 'is-danger' : ''} ${item.disabled ? 'is-disabled' : ''}`}
                role="menuitem"
                tabIndex={-1}
                data-text-value={normalizeText(item.label)}
                onClick={() => { if (item.disabled) return; item.onSelect?.(); closeFromItem(); }}
                disabled={item.disabled}
              >
                {item.icon && item.icon}
                <span>{item.label}</span>
                {item.kbd && <span className="context-menu__shortcut">{item.kbd}</span>}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}

Object.assign(window, { ContextMenu });
})();
