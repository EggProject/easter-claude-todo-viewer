/* global React */
const { useState, useMemo, useEffect, useRef } = React;

/* ============ CommandPalette ============
   Props:
     - open:      boolean
     - onClose:   () => void
     - groups:    Array<{
         label: string,
         items: Array<{ id, label, icon?, meta?, shortcut?: string[], onSelect: () => void, keywords?: string }>
       }>
     - placeholder: string

   Open with ⌘K / Ctrl+K by adding an external listener — this component
   is purely the surface. Use the global hook if you want auto-binding.

   Modality: the palette is a real modal dialog. It reuses the same shared
   runtime dialog manager as Modal / Drawer / AlertDialog (one window
   singleton) for stack registration, background inert/aria-hidden isolation,
   ref-counted body scroll lock, topmost Escape/Tab and focus restore.
============================================ */
function CommandPalette({ open, onClose, groups = [], placeholder = 'Type a command or search…' }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const overlayRef = useRef(null);
  const panelRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  const autoId = React.useId();
  const entryId = autoId;
  const inputId = `${autoId}-input`;
  const listboxId = `${autoId}-listbox`;

  // flat filtered list for keyboard nav
  const filteredGroups = useMemo(() => {
    if (!query) return groups;
    const searchTerm = query.toLowerCase();
    return groups
      .map((group) => ({ ...group, items: group.items.filter((item) => (item.label + ' ' + (item.keywords || '')).toLowerCase().includes(searchTerm)) }))
      .filter((group) => group.items.length);
  }, [groups, query]);

  const flatItems = useMemo(() => filteredGroups.flatMap((group) => group.items), [filteredGroups]);

  // Single derived active index that every ARIA/visual read uses. -1 when there are no
  // results; otherwise the stored state clamped into range so it can never reference a
  // removed option (no dangling aria-activedescendant after the list shrinks).
  const optionCount = flatItems.length;
  const safeActiveIndex = optionCount === 0
    ? -1
    : (!Number.isFinite(active) || active < 0 ? 0 : Math.min(active, optionCount - 1));

  // Reset to the first result whenever the query or open state changes (unchanged behaviour).
  useEffect(() => { setActive(0); }, [query, open]);

  // Idempotently reconcile the stored index toward the in-range value (e.g. when the `groups`
  // prop shrinks without a query change). Functional bail prevents any render loop.
  useEffect(() => {
    const target = safeActiveIndex < 0 ? 0 : safeActiveIndex;
    setActive((current) => (current === target ? current : target));
  }, [safeActiveIndex]);

  // Shared runtime modality manager — one window singleton across all dialog types.
  // The first dialog to mount creates it; the rest reuse it. No new module / load order.
  const getDialogManager = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return null;
    const KEY = Symbol.for('ep.dialog-manager');
    if (window[KEY]) return window[KEY];
    const stack = [];
    const isolated = [];
    let savedScroll = null;
    const lockScroll = () => {
      const b = document.body;
      savedScroll = { overflow: b.style.overflow, paddingRight: b.style.paddingRight };
      const gap = window.innerWidth - document.documentElement.clientWidth;
      b.style.overflow = 'hidden';
      if (gap > 0) {
        const cur = parseFloat(window.getComputedStyle(b).paddingRight) || 0;
        b.style.paddingRight = `${cur + gap}px`;
      }
    };
    const unlockScroll = () => {
      if (!savedScroll) return;
      document.body.style.overflow = savedScroll.overflow;
      document.body.style.paddingRight = savedScroll.paddingRight;
      savedScroll = null;
    };
    const clearIsolation = () => {
      for (let i = isolated.length - 1; i >= 0; i--) {
        const r = isolated[i];
        if (!r.prevInert) { try { r.el.inert = false; } catch (e) {} }
        if (r.hadAria) r.el.setAttribute('aria-hidden', r.prevAria);
        else r.el.removeAttribute('aria-hidden');
      }
      isolated.length = 0;
    };
    const applyIsolation = (roots) => {
      const live = roots.filter((el) => el && el.isConnected);
      if (!live.length) return;
      const keep = new Set();
      for (const r of live) for (let n = r; n && n !== document.documentElement; n = n.parentElement) keep.add(n);
      const targets = new Set();
      for (const r of live) {
        let parent = r.parentElement;
        while (parent && parent !== document.documentElement) {
          for (const sib of parent.children) {
            if (sib === document.body || keep.has(sib)) continue;
            targets.add(sib);
          }
          parent = parent.parentElement;
        }
      }
      for (const el of targets) {
        isolated.push({ el, prevInert: !!el.inert, hadAria: el.hasAttribute('aria-hidden'), prevAria: el.getAttribute('aria-hidden') });
        try { el.inert = true; } catch (e) {}
        el.setAttribute('aria-hidden', 'true');
      }
    };
    // Capture a root's manager-independent base z-index BEFORE any override, plus its
    // original inline value, so the visual layer can be restored exactly on unregister.
    const captureLayer = (root) => {
      const el = root.element;
      if (!el) { root.hadInline = false; root.prevInline = ''; root.baseZIndex = 0; return; }
      root.hadInline = el.style.zIndex !== '';
      root.prevInline = el.style.zIndex;
      const n = parseInt(window.getComputedStyle(el).zIndex, 10);
      root.baseZIndex = Number.isFinite(n) ? n : 0;
    };
    // Restore each of an entry's roots to its pre-manager inline z-index (or remove it).
    const restoreLayers = (entry) => {
      for (const root of entry.roots) {
        if (!root.element) continue;
        if (root.hadInline) root.element.style.zIndex = root.prevInline;
        else root.element.style.zIndex = '';
      }
    };
    // Lay out the whole stack bottom→top. Baseline is the largest captured base z-index
    // among current roots (never the manager's own inline), so reopening never inflates it.
    // Each entry gets a 2-wide band; a root sits at entryBase + its own layerOffset.
    const applyLayers = () => {
      if (!stack.length) return;
      let baseline = 0;
      for (const entry of stack)
        for (const root of entry.roots)
          if (root.baseZIndex > baseline) baseline = root.baseZIndex;
      stack.forEach((entry, i) => {
        const entryBase = baseline + i * 2;
        for (const root of entry.roots) {
          if (root.element && root.element.isConnected) {
            root.element.style.zIndex = String(entryBase + root.layerOffset);
          }
        }
      });
    };
    const refresh = () => {
      clearIsolation();
      if (!stack.length) { unlockScroll(); return; }
      applyLayers();
      applyIsolation(stack[stack.length - 1].roots.map((root) => root.element));
    };
    const manager = {
      register(entry) {
        if (stack.some((e) => e.id === entry.id)) return;
        for (const root of entry.roots) captureLayer(root);
        if (!stack.length) lockScroll();
        stack.push(entry);
        refresh();
      },
      unregister(id) {
        const i = stack.findIndex((e) => e.id === id);
        if (i === -1) return;
        const [removed] = stack.splice(i, 1);
        restoreLayers(removed);
        refresh();
      },
      isTopMost(id) { return stack.length > 0 && stack[stack.length - 1].id === id; },
      isActiveTarget(el) {
        if (!stack.length) return true;
        return stack[stack.length - 1].roots.some((root) => root.element && root.element.contains && root.element.contains(el));
      },
    };
    window[KEY] = manager;
    return manager;
  };

  // Escape: only the topmost dialog in the shared stack requests close (exactly one onClose).
  // Lives in its own effect so the list-navigation handler never double-handles Escape.
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      const manager = getDialogManager();
      if (manager && !manager.isTopMost(entryId)) return;   // only the topmost dialog closes
      event.preventDefault();
      onClose?.();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Focus lifecycle: capture the opener, move focus to the input, trap Tab, restore on close.
  // Keyed on `open` only — a changing onClose reference must not restart the cycle.
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const manager = getDialogManager();
    const isVisible = (el) => {
      if (!el || el.hidden) return false;
      for (let n = el; n; n = n.parentElement) {
        if (n.inert) return false;
        if (n.getAttribute && n.getAttribute('aria-hidden') === 'true') return false;
      }
      const s = window.getComputedStyle(el);
      if (s.display === 'none' || s.visibility === 'hidden' || s.visibility === 'collapse') return false;
      return el.getClientRects().length > 0;
    };
    const isTabbable = (el) => {
      if (el.disabled) return false;
      const ti = el.getAttribute('tabindex');
      if (ti !== null && parseInt(ti, 10) < 0) return false;
      return isVisible(el);
    };
    const getTabbables = () => {
      const all = Array.prototype.filter.call(
        panel.querySelectorAll('button, a[href], input:not([type="hidden"]), select, textarea, [tabindex], [contenteditable="true"]'),
        (el) => el !== panel && isTabbable(el)
      );
      const skip = new Set();
      for (const el of all) {
        if (el.tagName === 'INPUT' && el.type === 'radio' && el.name && !skip.has(el)) {
          const group = all.filter((r) => r.tagName === 'INPUT' && r.type === 'radio' && r.name === el.name && r.form === el.form);
          const keep = group.find((r) => r.checked) || group[0];
          group.forEach((r) => { if (r !== keep) skip.add(r); });
        }
      }
      return all.filter((el) => !skip.has(el));
    };
    const focusEl = (el) => { if (!el) return; try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } };

    // Capture the element focused before opening (once per open cycle).
    const activeElement = document.activeElement;
    previouslyFocusedRef.current =
      activeElement instanceof HTMLElement && activeElement !== document.body && activeElement !== document.documentElement && !panel.contains(activeElement)
        ? activeElement : null;

    // Register as the top of the shared modality stack (isolates the background, ref-counts the
    // scroll lock, syncs the visual layer). Single root: backdrop + panel share .command-palette-overlay.
    if (manager) manager.register({ id: entryId, roots: [{ element: overlayRef.current, layerOffset: 0 }] });

    // Initial focus, after the panel is laid out: the search input → first tabbable → panel.
    const raf = requestAnimationFrame(() => {
      if (!panelRef.current) return;
      if (manager && !manager.isTopMost(entryId)) return;   // a dialog opened on top owns focus
      const input = inputRef.current;
      if (input && panel.contains(input) && isTabbable(input)) { focusEl(input); return; }
      const tabbables = getTabbables();
      focusEl(tabbables.length ? tabbables[0] : panel);
    });

    // Tab focus trap (Tab only; Escape stays in its own listener).
    const onKeyDown = (e) => {
      if (e.key !== 'Tab') return;
      if (manager && !manager.isTopMost(entryId)) return;   // only the topmost dialog traps Tab
      const tabbables = getTabbables();
      if (tabbables.length === 0) { e.preventDefault(); focusEl(panel); return; }
      const first = tabbables[0];
      const last = tabbables[tabbables.length - 1];
      const cur = document.activeElement;
      if (cur === panel || !panel.contains(cur)) { e.preventDefault(); focusEl(e.shiftKey ? last : first); return; }
      if (e.shiftKey && cur === first) { e.preventDefault(); focusEl(last); }
      else if (!e.shiftKey && cur === last) { e.preventDefault(); focusEl(first); }
    };
    document.addEventListener('keydown', onKeyDown);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKeyDown);
      // Order: unregister first (recomputes background isolation + scroll lock), then restore focus.
      if (manager) manager.unregister(entryId);
      const target = previouslyFocusedRef.current;
      previouslyFocusedRef.current = null;
      if (target) requestAnimationFrame(() => {
        if (!target.isConnected || target.disabled || typeof target.focus !== 'function' || !isVisible(target)) return;
        if (manager && !manager.isActiveTarget(target)) return;   // don't steal focus from a dialog now on top
        focusEl(target);
      });
    };
  }, [open]);

  // Keep the active option scrolled into the listbox viewport on keyboard moves. rAF so the
  // DOM reflects the latest render; never moves DOM focus; minimal (block: 'nearest') scroll.
  useEffect(() => {
    if (!open || safeActiveIndex < 0 || typeof document === 'undefined') return;
    const optionId = `${autoId}-option-${safeActiveIndex}`;
    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(optionId);
      if (el && el.isConnected && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' });
    });
    return () => cancelAnimationFrame(raf);
  }, [safeActiveIndex, open, autoId]);

  if (!open) return null;

  // List navigation lives on the combobox input so DOM focus never leaves it. Suppressed when
  // another dialog is stacked on top; Escape and Tab stay with the modal lifecycle handlers.
  const handleInputKeyDown = (event) => {
    const manager = getDialogManager();
    if (manager && !manager.isTopMost(entryId)) return;   // only the topmost palette navigates
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (optionCount) setActive(safeActiveIndex >= optionCount - 1 ? 0 : safeActiveIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (optionCount) setActive(safeActiveIndex <= 0 ? optionCount - 1 : safeActiveIndex - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      if (optionCount) setActive(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      if (optionCount) setActive(optionCount - 1);
    } else if (event.key === 'Enter') {
      // Ignore Enter while an IME composition is in flight (composing flag / legacy keyCode 229).
      if (event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229) return;
      event.preventDefault();
      const item = flatItems[safeActiveIndex];
      if (item) { item.onSelect?.(); onClose?.(); }
    }
  };

  // Build an item-index map across groups so highlight tracks correctly
  let globalIndex = -1;

  return (
    <div ref={overlayRef} className="command-palette-overlay" onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const manager = getDialogManager();
        if (manager && !manager.isTopMost(entryId)) return;   // only the topmost backdrop closes
        onClose?.();
      }}>
      <div ref={panelRef} tabIndex={-1} className="command-palette" role="dialog" aria-modal="true" aria-label="Command palette">
        <div className="command-palette__header">
          <svg className="command-palette__search" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="6"/><path d="m14 14 4 4"/></svg>
          <input
            ref={inputRef}
            id={inputId}
            className="command-palette__input"
            role="combobox"
            aria-label="Search commands"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded={true}
            aria-controls={listboxId}
            aria-activedescendant={safeActiveIndex >= 0 ? `${autoId}-option-${safeActiveIndex}` : undefined}
            placeholder={placeholder}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleInputKeyDown}
          />
          <span className="command-palette__escape">esc</span>
        </div>

        <div id={listboxId} className="command-palette__list" role="listbox" aria-label="Commands">
          {flatItems.length === 0
            ? <div className="command-palette__empty">No commands match <strong>"{query}"</strong></div>
            : filteredGroups.map((group, groupIndex) => (
              <div key={group.label} className="command-palette__group" role="group" aria-labelledby={`${autoId}-group-${groupIndex}`}>
                <span className="command-palette__label" id={`${autoId}-group-${groupIndex}`}>{group.label}</span>
                {group.items.map((item) => {
                  globalIndex++;
                  const isActive = globalIndex === safeActiveIndex;
                  return (
                    <button
                      key={item.id}
                      id={`${autoId}-option-${globalIndex}`}
                      role="option"
                      aria-selected={isActive}
                      tabIndex={-1}
                      className={`command-palette__item ${isActive ? 'is-active' : ''}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => setActive(globalIndex)}
                      onClick={() => { item.onSelect?.(); onClose?.(); }}
                    >
                      {item.icon && <span className="command-palette__icon">{item.icon}</span>}
                      <span className="command-palette__text">{item.label}</span>
                      {item.meta && <span className="command-palette__meta">{item.meta}</span>}
                      {item.shortcut && (
                        <span className="command-palette__shortcut">
                          {item.shortcut.map((keyLabel, i) => <kbd key={i}>{keyLabel}</kbd>)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          }
        </div>

        <div className="command-palette__footer">
          <span className="command-palette__footer-pair"><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span className="command-palette__footer-pair"><kbd>↵</kbd> select</span>
          <span className="command-palette__footer-pair"><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CommandPalette });
