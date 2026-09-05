/* global React */
(function () {
'use strict';
const { useState, useEffect, useCallback } = React;

function AlertDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'default', icon, initialFocusRef, returnFocusRef, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, 'aria-describedby': ariaDescribedBy }) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      const manager = getDialogManager();
      if (manager && !manager.isTopMost(entryId)) return;   // only the topmost dialog closes
      onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  const autoId = React.useId();
  const entryId = autoId;
  const titleId = `${autoId}-title`;
  const descId = `${autoId}-description`;
  // Consumer aria-labelledby wins; else the generated title id when a title renders.
  const labelledBy = ariaLabelledBy || (title ? titleId : undefined);
  // Append the description id to any consumer aria-describedby; dedupe, undefined when empty — no dangling ref without a description.
  const describedByTokens = `${ariaDescribedBy ?? ''} ${description ? descId : ''}`.trim().split(/\s+/).filter(Boolean);
  const describedBy = describedByTokens.length ? [...new Set(describedByTokens)].join(' ') : undefined;

  const panelRef = React.useRef(null);
  const overlayRef = React.useRef(null);
  const cancelRef = React.useRef(null);
  const previouslyFocusedRef = React.useRef(null);

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

  // Focus lifecycle: capture the opener, move focus in, trap Tab, restore on close.
  // Keyed on `open` only — a changing onClose reference must not restart the cycle.
  React.useEffect(() => {
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
    const active = document.activeElement;
    previouslyFocusedRef.current =
      active instanceof HTMLElement && active !== document.body && active !== document.documentElement && !panel.contains(active)
        ? active : null;

    // Register as the top of the shared modality stack (isolates the background, ref-counts the scroll
    // lock, syncs the visual layer). Single root: backdrop + panel share .alert-dialog-overlay (layerOffset 0).
    if (manager) manager.register({ id: entryId, roots: [{ element: overlayRef.current, layerOffset: 0 }] });

    // Initial focus: explicit ref → cancel (safe, non-destructive) → first tabbable → panel.
    const raf = requestAnimationFrame(() => {
      if (!panelRef.current) return;
      if (manager && !manager.isTopMost(entryId)) return;   // a dialog opened on top owns focus
      const explicit = initialFocusRef && initialFocusRef.current;
      if (explicit && explicit.isConnected && panel.contains(explicit) && isTabbable(explicit)) { focusEl(explicit); return; }
      const cancelBtn = cancelRef.current;
      if (cancelBtn && panel.contains(cancelBtn) && isTabbable(cancelBtn)) { focusEl(cancelBtn); return; }
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
      const target = (returnFocusRef && returnFocusRef.current) || previouslyFocusedRef.current;
      previouslyFocusedRef.current = null;
      if (target) requestAnimationFrame(() => {
        if (!target.isConnected || target.disabled || typeof target.focus !== 'function' || !isVisible(target)) return;
        if (manager && !manager.isActiveTarget(target)) return;   // don't steal focus from a dialog now on top
        focusEl(target);
      });
    };
  }, [open]);

  if (!open) return null;

  return (
    <div ref={overlayRef} className="alert-dialog-overlay" onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const manager = getDialogManager();
        if (manager && !manager.isTopMost(entryId)) return;   // only the topmost backdrop closes
        onClose();
      }}>
      <div ref={panelRef} tabIndex={-1} className={`alert-dialog alert-dialog--${variant}`} role="alertdialog" aria-modal="true" aria-labelledby={labelledBy} aria-label={ariaLabel} aria-describedby={describedBy}>
        {icon && <div className="alert-dialog__icon" aria-hidden="true">{icon}</div>}
        <h2 className="alert-dialog__title" id={titleId}>{title}</h2>
        {description && <p className="alert-dialog__description" id={descId}>{description}</p>}
        <div className="alert-dialog__footer">
          <button ref={cancelRef} className="btn btn--ghost" onClick={onClose}>{cancelLabel}</button>
          <button
            className={`btn btn--${variant === 'danger' ? 'danger' : variant === 'success' ? 'primary' : 'primary'}`}
            onClick={() => { onConfirm?.(); onClose(); }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AlertDialog });
})();
