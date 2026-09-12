/* global React */
const { useState, useRef, useEffect } = React;

/* ============ Menu ============
   Composition:
     <Menu trigger={<button/>}>
       <MenuLabel>Sort by</MenuLabel>
       <MenuItem icon={...} shortcut="⌘ S" onSelect={...}>Save</MenuItem>
       <MenuItem danger>Delete</MenuItem>
       <MenuDivider/>
       <MenuItem checked>Show archived</MenuItem>
     </Menu>

   Props:
     - trigger:   ReactNode — element that opens the menu when clicked
     - align:     'left' (default) | 'right'
     - wide:      boolean
============================================ */
function Menu({ trigger, align = 'left', wide, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);          // .menu-anchor — outside-click containment root
  const panelRef = useRef(null);     // .menu panel (also the programmatic focus fallback)
  const triggerRef = useRef(null);   // the real trigger element (for focus restore)
  const activeRef = useRef(null);    // current roving menuitem (the tabIndex=0 owner)
  const intentRef = useRef('first'); // focus target on next open: 'first' | 'last'
  const tabRafRef = useRef(0);       // pending Tab-close frame (cancellable)
  const typeBufferRef = useRef('');  // character typeahead buffer (per instance)
  const typeTimerRef = useRef(0);    // typeahead expiry timer (cancellable)
  const typeScopeRef = useRef(null); // typeahead scope key (resets buffer on scope change)
  const autoId = React.useId();

  // Stable, instance-unique ids. Consumer trigger id wins; else generated.
  const isElement = React.isValidElement(trigger);
  const triggerId = (isElement && trigger.props.id) || `${autoId}-trigger`;
  const menuId = `${autoId}-menu`;
  // Action items can be plain or checkbox menuitems; queries must match both (radio reserved, not rendered).
  const MENU_ITEM_SELECTOR = '[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]';

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

  // Usable menuitems in DOM order. Descendant query, so it also finds items under
  // MenuGroup, fragments or any wrapper — not just direct React children.
  const getItems = () => {
    const panel = panelRef.current;
    if (!panel) return [];
    return Array.from(panel.querySelectorAll(MENU_ITEM_SELECTOR)).filter(isUsable);
  };

  // Make `target` the single roving tab stop among the usable items.
  const setActive = (target) => {
    const items = getItems();
    items.forEach((el) => { el.tabIndex = el === target ? 0 : -1; });
    activeRef.current = items.includes(target) ? target : null;
  };

  const focusPanel = () => focusEl(panelRef.current);
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

  // ---- close, with an explicit focus-restore intent ----
  const closeMenu = (restore) => {
    resetTypeahead();
    if (restore) {
      const t = triggerRef.current;
      if (t && t.isConnected && !t.disabled && typeof t.focus === 'function') focusEl(t);
    }
    setOpen(false);
  };
  // Item activation: restore to the trigger only if a menuitem actually held focus.
  const closeFromItem = () => {
    const a = document.activeElement;
    const onItem = !!(panelRef.current && a && panelRef.current.contains(a)
      && a.matches && a.matches(MENU_ITEM_SELECTOR));
    closeMenu(onItem);
  };

  // Will an outside-click target take focus itself? Then we must not steal it back.
  const willTakeFocus = (target) => {
    if (!(target instanceof Element)) return false;
    const el = target.closest('a[href],area[href],button,input,select,textarea,[tabindex],[contenteditable]');
    return !!el && !el.disabled;
  };

  // Outside-click (mousedown) + Escape — both guarded to this menu's focus owner.
  useEffect(() => {
    if (!open) return;
    const onDown = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        const a = document.activeElement;
        const focusInPanel = !!(panelRef.current && a && panelRef.current.contains(a));
        closeMenu(focusInPanel && !willTakeFocus(event.target));
      }
    };
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      const a = document.activeElement;
      const t = triggerRef.current;
      const owns = !!(panelRef.current && a && panelRef.current.contains(a))
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
      cancelAnimationFrame(tabRafRef.current);
    };
  }, [open]);

  // Initial focus, only after the panel is in the DOM and no longer hidden.
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      const panel = panelRef.current;
      if (!panel || panel.hidden) return;
      const items = getItems();
      if (!items.length) { activeRef.current = null; focusEl(panel); return; }
      const target = intentRef.current === 'last' ? items[items.length - 1] : items[0];
      setActive(target);
      focusEl(target);
    });
    return () => cancelAnimationFrame(raf);
  }, [open]);

  // Keep exactly one usable item as the tab stop across consumer re-renders, and
  // never leave a stale tabIndex=0 on an item that became disabled / hidden / removed.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const all = Array.from(panel.querySelectorAll(MENU_ITEM_SELECTOR));
    const usable = all.filter(isUsable);
    all.forEach((el) => { if (el.tabIndex === 0 && !usable.includes(el)) el.tabIndex = -1; });
    if (!usable.length) { activeRef.current = null; return; }
    const stop = (usable.includes(activeRef.current) && activeRef.current)
      || usable.find((el) => el.tabIndex === 0)
      || usable[0];
    usable.forEach((el) => { el.tabIndex = el === stop ? 0 : -1; });
    activeRef.current = stop;
  });

  // Clear any pending typeahead timer on unmount (no stale timer under Strict Mode).
  useEffect(() => () => { if (typeTimerRef.current) clearTimeout(typeTimerRef.current); }, []);

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

  // The real trigger element carries the interaction + ARIA. Consumer handlers run first;
  // we act only if not prevented and the trigger isn't disabled / aria-disabled.
  const onTriggerClick = (event) => {
    if (isElement) trigger.props.onClick?.(event);
    if (event.defaultPrevented) return;
    if (isTriggerDisabled()) return;
    if (open) closeMenu(false);
    else { intentRef.current = 'first'; setOpen(true); }
  };

  const onTriggerKeyDown = (event) => {
    if (isElement) trigger.props.onKeyDown?.(event);
    if (event.defaultPrevented) return;
    if (isTriggerDisabled()) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const intent = event.key === 'ArrowDown' ? 'first' : 'last';
      event.preventDefault();
      if (open) { if (intent === 'first') focusFirst(); else focusLast(); }
      else { intentRef.current = intent; setOpen(true); }
    }
  };

  const triggerProps = {
    ref: setTriggerRef,
    id: triggerId,
    'aria-haspopup': 'menu',
    'aria-expanded': open,
    'aria-controls': menuId,
    onClick: onTriggerClick,
    onKeyDown: onTriggerKeyDown,
  };
  // Clone the consumer element (preserving its props/children/ref) or fall back to a native button.
  const triggerEl = isElement
    ? React.cloneElement(trigger, triggerProps)
    : <button type="button" {...triggerProps}>{trigger}</button>;

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
  const matchFrom = (items, query, startIdx, getText) => {
    const n = items.length;
    const base = (((startIdx % n) + n) % n);
    for (let off = 0; off < n; off++) {
      const el = items[(base + off) % n];
      if (getText(el).startsWith(query)) return el;
    }
    return null;
  };
  // undefined = not a typeahead key; null = handled but no match; element = handled with a match.
  const computeTypeahead = (event, items, current, getText, scope) => {
    if (!isTypeaheadKey(event) || isEditableTarget(event.target)) return undefined;
    if (typeScopeRef.current !== scope) { typeBufferRef.current = ''; typeScopeRef.current = scope; }
    if (typeTimerRef.current) clearTimeout(typeTimerRef.current);
    typeBufferRef.current += event.key.toLocaleLowerCase();
    typeTimerRef.current = setTimeout(() => { typeTimerRef.current = 0; typeBufferRef.current = ''; }, TYPEAHEAD_MS);
    const buffer = typeBufferRef.current;
    if (!items.length) return null;
    const curIdx = current ? items.indexOf(current) : -1;
    const allSame = buffer.split('').every((c) => c === buffer[0]);    // repeated same char → cycle
    const query = allSame ? buffer[0] : buffer;
    const startIdx = allSame ? curIdx + 1 : Math.max(curIdx, 0);       // repeat: after current; prefix: keep current
    let match = matchFrom(items, query, startIdx, getText);
    if (!match && !allSame) {                                          // multi-char miss → retry last char as fresh buffer
      const last = buffer[buffer.length - 1];
      const alt = matchFrom(items, last, curIdx + 1, getText);
      if (alt) { typeBufferRef.current = last; match = alt; }
    }
    return match;
  };
  // Menu searchable text: the marked label node (excludes icon/check/shortcut), else the item's full text.
  const itemText = (el) => {
    const labelNode = el.querySelector('[data-menu-item-label]');
    return normalizeText(labelNode ? labelNode.textContent : el.textContent);
  };
  const handleTypeahead = (event) => {
    const match = computeTypeahead(event, getItems(), document.activeElement, itemText, 'menu');
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
    if (el && el.matches && el.matches(MENU_ITEM_SELECTOR) && isUsable(el)) setActive(el);
  };

  // Inject the internal close callback into every MenuItem, recursing ONLY through
  // MenuGroup and Fragment wrappers — so grouped / fragmented items close exactly like
  // direct children. Any other element passes through untouched (no descent, no _close);
  // the Menu's callback always wins over a consumer-supplied _close.
  const decorateItems = (nodes) => React.Children.map(nodes, (child) => {
    if (!React.isValidElement(child)) return child;
    if (child.type === MenuItem) return React.cloneElement(child, { _close: closeFromItem });
    if (child.type === MenuGroup || child.type === React.Fragment) {
      return React.cloneElement(child, null, decorateItems(child.props.children));
    }
    return child;
  });

  return (
    <span ref={ref} className={`menu-anchor ${align === 'right' ? 'menu-anchor--right' : ''} ${open ? 'is-open' : ''}`}>
      {triggerEl}
      <div
        ref={panelRef}
        id={menuId}
        className={`menu ${wide ? 'menu--wide' : ''}`}
        role="menu"
        aria-labelledby={triggerId}
        tabIndex={-1}
        hidden={!open}
        onKeyDown={onPanelKeyDown}
        onFocusCapture={onPanelFocusCapture}
      >
        {decorateItems(children)}
      </div>
    </span>
  );
}

function MenuLabel({ children, id }) {
  return <span className="menu__label" id={id}>{children}</span>;
}

function MenuItem({
  icon, shortcut, checked, danger, disabled,
  onSelect, _close,
  children, className = '',
}) {
  const classNames = ['menu__item', danger && 'menu__item--danger', disabled && 'is-disabled', className].filter(Boolean).join(' ');
  return (
    <button className={classNames} disabled={disabled}
      role={checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
      aria-checked={checked === undefined ? undefined : Boolean(checked)}
      tabIndex={-1}
      onClick={(event) => { if (disabled) return; onSelect?.(event); _close?.(); }}>
      {(checked !== undefined) && (
        <span className="menu__check" aria-hidden="true">{checked && (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3.5 8 3 3 6-6.5"/></svg>
        )}</span>
      )}
      {icon && <span className="menu__icon">{icon}</span>}
      <span className="menu__text" data-menu-item-label>{children}</span>
      {shortcut && <kbd className="menu__shortcut">{shortcut}</kbd>}
    </button>
  );
}

function MenuDivider() {
  return <div className="menu__divider"/>;
}

function MenuGroup({ children, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy }) {
  const autoId = React.useId();
  // Accessible name precedence: explicit aria-labelledby > explicit aria-label > first MenuLabel's id.
  // Auto-naming only runs when the author gave neither (never both author labelledby + auto id).
  const useAuto = !ariaLabelledBy && !ariaLabel;
  let autoLabelId;
  let decorated = children;
  if (useAuto) {
    let done = false;
    const tag = (label) => {
      const id = label.props.id || `${autoId}-label`; // consumer id wins; else stable generated id
      autoLabelId = id;
      done = true;
      return label.props.id ? label : React.cloneElement(label, { id });
    };
    // Only the first MenuLabel directly under the group or under a Fragment is named — never inside
    // a MenuItem, a nested MenuGroup, or an arbitrary component, and never reordered.
    decorated = React.Children.map(children, (child) => {
      if (done || !React.isValidElement(child)) return child;
      if (child.type === MenuLabel) return tag(child);
      if (child.type === React.Fragment) {
        return React.cloneElement(child, null, React.Children.map(child.props.children, (gc) =>
          (!done && React.isValidElement(gc) && gc.type === MenuLabel) ? tag(gc) : gc));
      }
      return child;
    });
  }
  return (
    <div
      className="menu__group"
      role="group"
      aria-labelledby={ariaLabelledBy || autoLabelId || undefined}
      aria-label={ariaLabel || undefined}
    >
      {decorated}
    </div>
  );
}

Object.assign(window, { Menu, MenuLabel, MenuItem, MenuDivider, MenuGroup });
