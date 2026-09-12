/* global React */
const { useState, useEffect } = React;

/* ============ Shared active-value contract ============
   One internal (non-exported) hook for all three exports. It cleanly separates the
   controlled branch (active != null → the prop owns the value) from the uncontrolled
   branch (internal state owns it), with a deterministic first-item fallback when the
   requested id is missing or was removed. No DOM, no browser API, no ARIA, no new
   public prop. A user activation calls onChange(id) at most once; an automatic
   fallback never calls onChange.
======================================================== */
const getUnderlineTabId = (item) => item?.id;
const getChoiceId = (item) => item?.id ?? item;

function useActiveItem({ items, getItemId, active, onChange }) {
  // Nullish contract: active={0} / active="" are controlled; active={null} or omitted is uncontrolled.
  const isControlled = active != null;
  const ids = items.map(getItemId);
  const firstId = ids.length > 0 ? ids[0] : undefined;

  const [internalActive, setInternalActive] = useState(() => firstId);

  // Single effective id: the requested id if it still exists, else the first item, else undefined.
  const requestedId = isControlled ? active : internalActive;
  const currentId = ids.includes(requestedId) ? requestedId : firstId;

  // Uncontrolled only: persist the fallback so a removed-then-readded item never resurrects
  // a stale internal id. Writes only when the stored id differs from the effective one; never
  // runs in controlled mode and never calls onChange. Idempotent under Strict Mode.
  useEffect(() => {
    if (isControlled) return;
    if (internalActive !== currentId) setInternalActive(currentId);
  }, [isControlled, internalActive, currentId]);

  const selectItem = (nextId) => {
    if (!isControlled) setInternalActive(nextId);
    onChange?.(nextId);
  };

  return { currentId, selectItem };
}

/* ============ Roving radio-group behaviour ============
   Shared, non-exported helper for the single-select radiogroup exports (Segmented, Pills):
   a per-instance id → button ref map, Arrow/Home/End movement (looping) with
   selection-follows-focus, and a guarded select that makes re-activating the checked radio a
   no-op. No CSS, no markup, no window export, no component-specific structure — the root class
   and rendered label stay in each component. .focus() runs only as the direct result of a
   handled key (no effect, timer, rAF or DOM query). */
function useRovingRadios({ items, getItemId, currentId, selectItem }) {
  // Per-instance id → radio button map for keyboard focus movement (no DOM queries, no index identity).
  const radioRefs = React.useRef(new Map());

  const setRef = (id) => (el) => {
    if (el) radioRefs.current.set(id, el);
    else radioRefs.current.delete(id);
  };

  // Guarded select: re-activating the already-checked radio does nothing (no state write, no callback).
  const select = (nextId) => {
    if (nextId !== currentId) selectItem(nextId);
  };

  const onKeyDown = (event, id) => {
    const ids = items.map(getItemId);
    const i = ids.indexOf(id);
    if (i === -1) return;
    let target;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown': target = (i + 1) % ids.length; break;
      case 'ArrowLeft':
      case 'ArrowUp': target = (i - 1 + ids.length) % ids.length; break;
      case 'Home': target = 0; break;
      case 'End': target = ids.length - 1; break;
      default: return;
    }
    event.preventDefault();
    const targetId = ids[target];
    select(targetId);
    const node = radioRefs.current.get(targetId);
    if (node) node.focus();
  };

  return { setRef, select, onKeyDown };
}

/* ============ Roving tab behaviour ============
   Shared structure with useRovingRadios, but tab-specific: only the horizontal axis
   (ArrowLeft / ArrowRight / Home / End — ArrowUp/Down are left to the browser), and Left/Right
   follow the live writing direction (RTL inverts them) read from the focused tab in the keydown
   handler only. Per-instance id → tab ref map, guarded select (re-activating the selected tab is
   a no-op), automatic activation. Not exported. .focus() runs only as the direct result of a
   handled key (no effect, timer, rAF, DOM query or getComputedStyle during render). */
function useRovingTabs({ items, getItemId, currentId, selectItem }) {
  const tabRefs = React.useRef(new Map());

  const setRef = (id) => (el) => {
    if (el) tabRefs.current.set(id, el);
    else tabRefs.current.delete(id);
  };

  const select = (nextId) => {
    if (nextId !== currentId) selectItem(nextId);
  };

  const onKeyDown = (event, id) => {
    const ids = items.map(getItemId);
    const i = ids.indexOf(id);
    if (i === -1) return;
    // Read the live direction from the focused tab (browser API, keydown-time only — never render).
    const isRtl = getComputedStyle(event.currentTarget).direction === 'rtl';
    const forward = isRtl ? -1 : 1;
    let target;
    switch (event.key) {
      case 'ArrowRight': target = (i + forward + ids.length) % ids.length; break;
      case 'ArrowLeft': target = (i - forward + ids.length) % ids.length; break;
      case 'Home': target = 0; break;
      case 'End': target = ids.length - 1; break;
      default: return;
    }
    event.preventDefault();
    const targetId = ids[target];
    select(targetId);
    const node = tabRefs.current.get(targetId);
    if (node) node.focus();
  };

  return { setRef, select, onKeyDown };
}

/* ============ UnderlineTabs ============ — in-page content tabs (horizontal, automatic activation).
   role="tablist" + role="tab" triggers + role="tabpanel" panels the component renders itself,
   with stable useId-based tab ↔ panel id pairs, roving tabindex, ArrowLeft/Right + Home/End
   (RTL-aware, looping). Every panel stays mounted; inactive panels are hidden by the native
   `hidden` attribute so child / uncontrolled-input state survives. The consumer supplies the
   tablist accessible name via aria-label / aria-labelledby (no name with neither — a documented
   consumer responsibility). Re-activating the selected tab is a no-op. The .tabs visual's static
   navigation use stays a separate consumer concern.

   Props:
     - items:    [{ id, label, count?, content? }]
     - active:   id of the active tab (optional, controlled)
     - onChange: (id) => void
============================================ */
function UnderlineTabs({ items, active, onChange, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby }) {
  const { currentId, selectItem } = useActiveItem({ items, getItemId: getUnderlineTabId, active, onChange });
  const { setRef, select, onKeyDown } = useRovingTabs({ items, getItemId: getUnderlineTabId, currentId, selectItem });
  const autoId = React.useId();
  return (
    <div className="tabs-root">
      <div className="tabs" role="tablist" aria-label={ariaLabel} aria-labelledby={ariaLabelledby}>
        {items.map((tab, index) => {
          const isCurrent = tab.id === currentId;
          const tabId = `${autoId}-tab-${index}`;
          const panelId = `${autoId}-panel-${index}`;
          return (
            <button type="button" key={tab.id} ref={setRef(tab.id)}
               role="tab" id={tabId} aria-selected={isCurrent} aria-controls={panelId}
               tabIndex={isCurrent ? 0 : -1}
               className={isCurrent ? 'is-on' : ''}
               onClick={() => select(tab.id)}
               onKeyDown={(event) => onKeyDown(event, tab.id)}>
              <span>{tab.label}</span>
              {tab.count != null && <span className="tabs__count">{tab.count}</span>}
            </button>
          );
        })}
      </div>
      <div className="tabs__panels">
        {items.map((tab, index) => {
          const isCurrent = tab.id === currentId;
          const tabId = `${autoId}-tab-${index}`;
          const panelId = `${autoId}-panel-${index}`;
          return (
            <div key={tab.id} className="tabs__panel" role="tabpanel" id={panelId}
               aria-labelledby={tabId} hidden={!isCurrent}>
              {tab.content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============ Segmented ============ — single-select horizontal radiogroup, 2–5 options.
   role="radiogroup" wrapper + role="radio" items, roving tabindex, Arrow/Home/End (looping) with
   selection-follows-focus (shared via useRovingRadios). The consumer supplies the group accessible
   name via aria-label / aria-labelledby; with neither, the group has no accessible name (a
   documented consumer responsibility). Re-activating the checked radio is a no-op. */
function Segmented({ items, active, onChange, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby }) {
  const { currentId, selectItem } = useActiveItem({ items, getItemId: getChoiceId, active, onChange });
  const { setRef, select, onKeyDown } = useRovingRadios({ items, getItemId: getChoiceId, currentId, selectItem });
  return (
    <div className="seg" role="radiogroup" aria-label={ariaLabel} aria-labelledby={ariaLabelledby}>
      {items.map(tab => {
        const id = getChoiceId(tab);
        const label = tab.label ?? tab;
        const isCurrent = id === currentId;
        return (
          <button type="button" key={id} ref={setRef(id)}
             role="radio" aria-checked={isCurrent} tabIndex={isCurrent ? 0 : -1}
             className={isCurrent ? 'is-on' : ''}
             onClick={() => select(id)}
             onKeyDown={(event) => onKeyDown(event, id)}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

/* ============ Pills ============ — compact single-select horizontal radiogroup (filter pills).
   Same radiogroup contract as Segmented, shared via useRovingRadios: role="radiogroup" +
   role="radio" items, roving tabindex, Arrow/Home/End looping, selection-follows-focus,
   re-activation no-op, optional aria-label / aria-labelledby group name. Scalar single-select —
   not a multi-select / aria-pressed toggle group. */
function Pills({ items, active, onChange, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledby }) {
  const { currentId, selectItem } = useActiveItem({ items, getItemId: getChoiceId, active, onChange });
  const { setRef, select, onKeyDown } = useRovingRadios({ items, getItemId: getChoiceId, currentId, selectItem });
  return (
    <div className="pills" role="radiogroup" aria-label={ariaLabel} aria-labelledby={ariaLabelledby}>
      {items.map(tab => {
        const id = getChoiceId(tab);
        const label = tab.label ?? tab;
        const isCurrent = id === currentId;
        return (
          <button type="button" key={id} ref={setRef(id)}
             role="radio" aria-checked={isCurrent} tabIndex={isCurrent ? 0 : -1}
             className={isCurrent ? 'is-on' : ''}
             onClick={() => select(id)}
             onKeyDown={(event) => onKeyDown(event, id)}>
            {label}
          </button>
        );
      })}
    </div>
  );
}

Object.assign(window, { UnderlineTabs, Segmented, Pills });
