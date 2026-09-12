/* global React */
(function () {
'use strict';
const { useState, useEffect, useRef } = React;

function Menubar({ menus, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy }) {
  const [openIndex, setOpenIndex] = useState(null);
  const rootRef = useRef(null);          // .menubar — containment root
  const activeTopRef = useRef(null);     // active top-level trigger element (roving owner)
  const activeItemRef = useRef(null);    // active panel action item (roving owner) of the open panel
  const intentRef = useRef('first');     // focus target on open: 'first' | 'last'
  const cycleRef = useRef(0);            // open/switch cycle token guarding async focus
  const focusRafRef = useRef(0);         // pending open-focus frame (cancellable)
  const tabRafRef = useRef(0);           // pending Tab-exit frame (cancellable)
  const suspendedRef = useRef(false);    // tab stops temporarily suspended for a native Tab exit
  const noFocusOnOpenRef = useRef(false);// switch the panel without stealing focus (outside-focus hover)
  const typeBufferRef = useRef('');      // character typeahead buffer (per instance)
  const typeTimerRef = useRef(0);        // typeahead expiry timer (cancellable)
  const typeScopeRef = useRef(null);     // typeahead scope: 'top' | 'p<i>' (resets buffer on context switch)
  const autoId = React.useId();

  const triggerId = (i) => `${autoId}-trigger-${i}`;
  const panelId = (i) => `${autoId}-menu-${i}`;
  // Panel action items can be plain or checkbox menuitems; queries must match both (radio reserved).
  const MENU_ITEM_SELECTOR = '[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]';

  // ---- DOM helpers (run only in client effects / event handlers) ----
  const focusEl = (el) => {
    if (!el) return;
    try { el.focus({ preventScroll: true }); } catch (_) { el.focus(); }
  };

  const isUsable = (el) => {
    if (!el || !el.isConnected) return false;
    if (el.disabled || el.getAttribute('aria-disabled') === 'true') return false;
    if (el.closest('[hidden],[inert],[aria-hidden="true"]')) return false;
    const cs = window.getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || cs.visibility === 'collapse') return false;
    if (!el.getClientRects().length) return false; // also excludes items inside a display:none (closed) panel
    return true;
  };

  const getAllTriggers = () => {
    const root = rootRef.current;
    return root ? Array.from(root.querySelectorAll('.menubar__trigger')) : [];
  };
  const getUsableTriggers = () => getAllTriggers().filter(isUsable);
  const getPanel = (index) => {
    const root = rootRef.current;
    if (!root || index == null) return null;
    return Array.from(root.querySelectorAll('.menubar__panel'))[index] || null;
  };
  const getItems = (panel) => panel
    ? Array.from(panel.querySelectorAll(MENU_ITEM_SELECTOR)).filter(isUsable) : [];

  // ---- roving setters (imperative; constant -1 props mean React won't fight them) ----
  const setActiveTop = (trigger) => {
    const triggers = getAllTriggers();
    if (!triggers.includes(trigger)) return;
    triggers.forEach((t) => { t.tabIndex = (t === trigger) ? 0 : -1; });
    activeTopRef.current = trigger;
  };
  const setActiveItemDirect = (panel, target) => {
    const items = getItems(panel);
    items.forEach((el) => { el.tabIndex = (el === target) ? 0 : -1; });
    activeItemRef.current = items.includes(target) ? target : null;
  };
  const setActiveItem = (item) => {
    const panel = item.closest('.menubar__panel');
    if (panel) setActiveItemDirect(panel, item);
  };

  const focusFirstItem = (i) => {
    const panel = getPanel(i); if (!panel) return;
    const items = getItems(panel);
    if (items.length) { setActiveItemDirect(panel, items[0]); focusEl(items[0]); } else focusEl(panel);
  };
  const focusLastItem = (i) => {
    const panel = getPanel(i); if (!panel) return;
    const items = getItems(panel);
    if (items.length) { setActiveItemDirect(panel, items[items.length - 1]); focusEl(items[items.length - 1]); } else focusEl(panel);
  };
  const stepItem = (i, dir) => {
    const panel = getPanel(i); if (!panel) return;
    const items = getItems(panel);
    if (!items.length) return; // caller already prevented scroll; focus stays on the panel
    const cur = items.indexOf(document.activeElement);
    const idx = cur === -1 ? (dir > 0 ? 0 : items.length - 1) : (cur + dir + items.length) % items.length;
    setActiveItemDirect(panel, items[idx]);
    focusEl(items[idx]);
  };

  // ---- open / switch / close ----
  const openMenu = (index, intent) => {
    intentRef.current = intent;
    cycleRef.current += 1;
    const t = getAllTriggers()[index];
    if (t) setActiveTop(t);
    noFocusOnOpenRef.current = false; // an explicit open always moves focus into the panel
    setOpenIndex(index);
  };
  const closeMenu = (restore) => {
    const idx = openIndex;
    resetTypeahead();
    cancelAnimationFrame(focusRafRef.current);
    const panel = getPanel(idx);
    if (panel) Array.from(panel.querySelectorAll(MENU_ITEM_SELECTOR)).forEach((it) => { it.tabIndex = -1; });
    if (restore && idx != null) {
      const t = getAllTriggers()[idx];
      if (t && t.isConnected && !t.disabled && typeof t.focus === 'function' && !t.closest('[inert],[aria-hidden="true"]')) {
        setActiveTop(t);
        focusEl(t);
      }
    }
    activeItemRef.current = null;
    cycleRef.current += 1;
    setOpenIndex(null);
  };
  const closeFromItem = () => {
    const a = document.activeElement;
    const panel = getPanel(openIndex);
    const onItem = !!(panel && a && panel.contains(a) && a.matches && a.matches(MENU_ITEM_SELECTOR));
    closeMenu(onItem);
  };

  const willTakeFocus = (target) => {
    if (!(target instanceof Element)) return false;
    const el = target.closest('a[href],area[href],button,input,select,textarea,[tabindex],[contenteditable]');
    return !!el && !el.disabled;
  };

  // ---- top-level navigation ----
  const moveTopLevel = (fromIndex, dir) => {
    const usable = getUsableTriggers();
    if (!usable.length) return;
    const all = getAllTriggers();
    let pos = usable.indexOf(all[fromIndex]);
    if (pos === -1) pos = dir > 0 ? -1 : 0;
    const nextEl = usable[(pos + dir + usable.length) % usable.length];
    const nextIndex = all.indexOf(nextEl);
    if (openIndex !== null) openMenu(nextIndex, 'first');      // panel open → switch + focus first item
    else { setActiveTop(nextEl); focusEl(nextEl); }            // closed → just move trigger focus
  };
  const moveTopLevelTo = (which) => {
    const usable = getUsableTriggers();
    if (!usable.length) return;
    const nextEl = which === 'first' ? usable[0] : usable[usable.length - 1];
    const nextIndex = getAllTriggers().indexOf(nextEl);
    if (openIndex !== null) openMenu(nextIndex, 'first');
    else { setActiveTop(nextEl); focusEl(nextEl); }
  };

  // Tab / Shift+Tab from an open menubar: suspend ALL tab stops so native focus leaves the
  // whole menubar in either direction, then re-arm one trigger stop next frame (for re-entry).
  const handleTabKey = () => {
    if (openIndex === null) return; // closed: the single roving trigger stop already lets Tab leave
    resetTypeahead();               // leaving the menubar → drop any pending typeahead buffer
    suspendedRef.current = true;
    getAllTriggers().forEach((t) => { t.tabIndex = -1; });
    const panel = getPanel(openIndex);
    if (panel) Array.from(panel.querySelectorAll(MENU_ITEM_SELECTOR)).forEach((it) => { it.tabIndex = -1; });
    cancelAnimationFrame(tabRafRef.current);
    tabRafRef.current = requestAnimationFrame(() => {
      suspendedRef.current = false;
      cycleRef.current += 1;
      setOpenIndex(null); // re-render re-arms one trigger stop via the top reconcile effect
    });
  };

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
    if (typeScopeRef.current !== scope) { typeBufferRef.current = ''; typeScopeRef.current = scope; } // context switch → fresh buffer
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
  // Menubar searchable text: the per-element data-text-value (the label, no icon/shortcut).
  const itemText = (el) => normalizeText(el.getAttribute('data-text-value') != null ? el.getAttribute('data-text-value') : el.textContent);
  // Top-level trigger typeahead (focus on a trigger).
  const handleTopTypeahead = (event) => {
    const match = computeTypeahead(event, getUsableTriggers(), document.activeElement, itemText, 'top');
    if (match === undefined) return;
    event.preventDefault();
    if (!match) return;
    if (openIndex === null) { setActiveTop(match); focusEl(match); }      // closed → just move trigger focus
    else openMenu(getAllTriggers().indexOf(match), 'first');             // open → switch panel + focus first item
  };
  // Panel item typeahead (focus inside the open panel i); searches only that panel.
  const handlePanelTypeahead = (event, i) => {
    const panel = getPanel(i);
    const match = computeTypeahead(event, getItems(panel), document.activeElement, itemText, 'p' + i);
    if (match === undefined) return;
    event.preventDefault();
    if (match) { setActiveItemDirect(panel, match); focusEl(match); }
  };

  // ---- event handlers ----
  const onTriggerClick = (i) => {
    if (openIndex === i) closeMenu(false); // toggle close; focus stays on the (clicked) trigger
    else openMenu(i, 'first');             // open or switch → first item after render
  };
  const handleTriggerHover = (i) => {
    if (openIndex === null || openIndex === i) return; // only switch when a different panel is open
    const a = document.activeElement;
    const root = rootRef.current;
    const focusInside = !!(root && a && root.contains(a));
    intentRef.current = 'first';
    cycleRef.current += 1;
    const t = getAllTriggers()[i];
    if (t) setActiveTop(t);
    noFocusOnOpenRef.current = !focusInside; // outside focus → switch panel but don't steal focus
    setOpenIndex(i);
  };
  const onTriggerKeyDown = (event, i) => {
    switch (event.key) {
      case 'ArrowRight': event.preventDefault(); moveTopLevel(i, 1); break;
      case 'ArrowLeft':  event.preventDefault(); moveTopLevel(i, -1); break;
      case 'Home':       event.preventDefault(); moveTopLevelTo('first'); break;
      case 'End':        event.preventDefault(); moveTopLevelTo('last'); break;
      case 'ArrowDown':  event.preventDefault(); if (openIndex === i) focusFirstItem(i); else openMenu(i, 'first'); break;
      case 'ArrowUp':    event.preventDefault(); if (openIndex === i) focusLastItem(i); else openMenu(i, 'last'); break;
      case 'Tab':        handleTabKey(); break; // no preventDefault — native Tab must run
      default: handleTopTypeahead(event); break; // printable char → top-level typeahead; Enter/Space → native click
    }
  };
  const onPanelKeyDown = (event, i) => {
    switch (event.key) {
      case 'ArrowDown':  event.preventDefault(); stepItem(i, 1); break;
      case 'ArrowUp':    event.preventDefault(); stepItem(i, -1); break;
      case 'Home':       event.preventDefault(); focusFirstItem(i); break;
      case 'End':        event.preventDefault(); focusLastItem(i); break;
      case 'ArrowRight': event.preventDefault(); moveTopLevel(i, 1); break;
      case 'ArrowLeft':  event.preventDefault(); moveTopLevel(i, -1); break;
      case 'Tab':        handleTabKey(); break;
      default: handlePanelTypeahead(event, i); break; // printable char → panel typeahead; Enter/Space → native button
    }
  };
  const onRootFocusCapture = (event) => {
    const el = event.target;
    if (!el || !el.classList) return;
    if (el.classList.contains('menubar__trigger') && isUsable(el)) setActiveTop(el);
    else if (el.classList.contains('menubar__menu-item') && el.matches(MENU_ITEM_SELECTOR) && isUsable(el)) setActiveItem(el);
  };

  // ---- outside-click (mousedown) + Escape, guarded to this menubar's focus owner ----
  useEffect(() => {
    if (openIndex === null) return;
    const onDown = (event) => {
      const root = rootRef.current;
      if (!root || root.contains(event.target)) return;
      const a = document.activeElement;
      const panel = getPanel(openIndex);
      const focusInPanel = !!(panel && a && panel.contains(a));
      closeMenu(focusInPanel && !willTakeFocus(event.target));
    };
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      const a = document.activeElement;
      const root = rootRef.current;
      if (!root || !a || !root.contains(a)) return; // only the menubar owning focus reacts
      event.preventDefault();
      closeMenu(true);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openIndex]);

  // ---- focus entry after a panel opens or the open panel switches ----
  useEffect(() => {
    if (openIndex === null) return;
    const cycle = cycleRef.current;
    const idx = openIndex;
    const shouldFocus = !noFocusOnOpenRef.current;
    noFocusOnOpenRef.current = false;
    const raf = requestAnimationFrame(() => {
      if (cycle !== cycleRef.current) return;
      const panel = getPanel(idx);
      if (!panel || !panel.isConnected) return;
      const items = getItems(panel);
      if (!items.length) { activeItemRef.current = null; if (shouldFocus) focusEl(panel); return; }
      const target = intentRef.current === 'last' ? items[items.length - 1] : items[0];
      setActiveItemDirect(panel, target);
      if (shouldFocus) focusEl(target);
    });
    focusRafRef.current = raf;
    return () => cancelAnimationFrame(raf);
  }, [openIndex]);

  // ---- keep exactly one usable top-level trigger as the tab stop, across re-renders / dynamic menus ----
  useEffect(() => {
    const root = rootRef.current;
    if (!root || suspendedRef.current) return;
    const triggers = getAllTriggers();
    const usable = triggers.filter(isUsable);
    triggers.forEach((t) => { if (t.tabIndex === 0 && !usable.includes(t)) t.tabIndex = -1; });
    if (!usable.length) { activeTopRef.current = null; triggers.forEach((t) => { t.tabIndex = -1; }); return; }
    const stop = (usable.includes(activeTopRef.current) && activeTopRef.current)
      || usable.find((t) => t.tabIndex === 0)
      || usable[0];
    triggers.forEach((t) => { t.tabIndex = (t === stop) ? 0 : -1; });
    activeTopRef.current = stop;
  });

  // ---- keep exactly one usable item as the open panel's tab stop, across re-renders ----
  useEffect(() => {
    if (openIndex === null || suspendedRef.current) return;
    const panel = getPanel(openIndex);
    if (!panel) return;
    const all = Array.from(panel.querySelectorAll(MENU_ITEM_SELECTOR));
    const usable = all.filter(isUsable);
    all.forEach((el) => { if (el.tabIndex === 0 && !usable.includes(el)) el.tabIndex = -1; });
    if (!usable.length) { activeItemRef.current = null; return; }
    const stop = (usable.includes(activeItemRef.current) && activeItemRef.current)
      || usable.find((el) => el.tabIndex === 0)
      || usable[0];
    usable.forEach((el) => { el.tabIndex = (el === stop) ? 0 : -1; });
    activeItemRef.current = stop;
  });

  // ---- close safely if the open top-level menu was removed (openIndex out of range) ----
  useEffect(() => {
    if (openIndex !== null && openIndex >= menus.length) {
      cancelAnimationFrame(focusRafRef.current);
      activeItemRef.current = null;
      cycleRef.current += 1;
      setOpenIndex(null);
    }
  }, [openIndex, menus]);

  // Clear any pending typeahead timer on unmount (no stale timer under Strict Mode).
  useEffect(() => () => { if (typeTimerRef.current) clearTimeout(typeTimerRef.current); }, []);

  return (
    <div
      className="menubar"
      ref={rootRef}
      role="menubar"
      aria-labelledby={ariaLabelledBy || undefined}
      aria-label={ariaLabelledBy ? undefined : (ariaLabel || 'Application menu')}
      onFocusCapture={onRootFocusCapture}
    >
      {menus.map((menu, i) => (
        <div
          key={menu.label}
          className={`menubar__item ${openIndex === i ? 'is-open' : ''}`}
        >
          <button
            className="menubar__trigger"
            role="menuitem"
            id={triggerId(i)}
            aria-haspopup="menu"
            aria-expanded={openIndex === i}
            aria-controls={panelId(i)}
            tabIndex={-1}
            data-text-value={normalizeText(menu.label)}
            onMouseEnter={() => handleTriggerHover(i)}
            onClick={() => onTriggerClick(i)}
            onKeyDown={(event) => onTriggerKeyDown(event, i)}
          >
            {menu.label}
          </button>
          <div
            className="menubar__panel"
            role="menu"
            id={panelId(i)}
            aria-labelledby={triggerId(i)}
            tabIndex={-1}
            onKeyDown={(event) => onPanelKeyDown(event, i)}
          >
            {menu.items.map((item, j) => {
              if (item.type === 'separator') return <div key={j} className="menubar__separator" role="separator" />;
              if (item.type === 'label') return <div key={j} className="menubar__label">{item.label}</div>;
              return (
                <button
                  key={j}
                  className={`menubar__menu-item ${item.danger ? 'is-danger' : ''} ${item.disabled ? 'is-disabled' : ''} ${item.checked ? 'is-checked' : ''}`}
                  role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
                  aria-checked={item.checked === undefined ? undefined : Boolean(item.checked)}
                  tabIndex={-1}
                  data-text-value={normalizeText(item.label)}
                  onClick={() => { if (item.disabled) return; item.onSelect?.(); closeFromItem(); }}
                  disabled={item.disabled}
                >
                  {item.icon && item.icon}
                  <span>{item.label}</span>
                  {item.kbd && <span className="menubar__shortcut">{item.kbd}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { Menubar });
})();
