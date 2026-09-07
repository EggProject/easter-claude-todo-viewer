/* global React */
const { useState, useRef, useEffect, useMemo } = React;

/* ============ Select ============
   Props:
     - options:  Array<{value, label, icon?, meta?, disabled?}>
     - value:    current value
     - onChange: (value) => void
     - placeholder: string
     - size:     'sm' | 'md' (default)
     - icon:     leading icon
     - align:    'left' (default) | 'right'
============================================ */
function Select({ options = [], value, onChange, placeholder = 'Select…', size = 'md', icon, align = 'left', className = '', id, ...rest }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);

  // Stable ids for the listbox panel + options (consumer id wins, else useId).
  // useId() runs unconditionally at top level — the `||` only picks the value, it never gates the Hook.
  const autoId = React.useId();
  const baseId = id || autoId;
  const panelId = `${baseId}-listbox`;
  const optionId = (index) => `${baseId}-option-${index}`;

  // Outside-click close only — keyboard lives on the trigger (focus stays there via aria-activedescendant).
  useEffect(() => {
    if (!open) return;
    const onDown = (event) => { if (ref.current && !ref.current.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  // Scroll the active option into view without moving DOM focus (it stays on the trigger). Instant —
  // no `behavior: 'smooth'`, so reduced-motion is irrelevant; no-op when closed, when there is no
  // active option, or when the ref is missing (e.g. empty list).
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const current = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const triggerCls = ['select', size === 'sm' && 'select--sm', open && 'select--open', className].filter(Boolean).join(' ');

  const firstEnabled = () => options.findIndex((option) => !option.disabled);
  const lastEnabled = () => {
    for (let i = options.length - 1; i >= 0; i--) if (!options[i].disabled) return i;
    return -1;
  };
  // Open onto the selected option when it's enabled, otherwise the supplied edge.
  const enabledSelectedOr = (edge) =>
    selectedIndex >= 0 && !options[selectedIndex].disabled ? selectedIndex : edge();

  const openWith = (index) => { setActiveIndex(index); setOpen(true); };
  const closeTo = (refocus) => {
    setOpen(false);
    setActiveIndex(-1);
    if (refocus) triggerRef.current?.focus();
  };
  const selectAt = (index) => {
    if (index < 0 || index >= options.length || options[index].disabled) return;
    onChange?.(options[index].value);
    closeTo(true);
  };
  // Circular move to the next enabled option; bounded loop so an all-disabled list can't spin.
  const moveActive = (dir) => {
    if (!options.length) return;
    let i = activeIndex < 0 ? (dir > 0 ? -1 : 0) : activeIndex;
    for (let n = 0; n < options.length; n++) {
      i = (i + dir + options.length) % options.length;
      if (!options[i].disabled) { setActiveIndex(i); return; }
    }
  };

  const onKeyDown = (event) => {
    if (!open) {
      switch (event.key) {
        case 'ArrowDown': event.preventDefault(); openWith(enabledSelectedOr(firstEnabled)); break;
        case 'ArrowUp': event.preventDefault(); openWith(enabledSelectedOr(lastEnabled)); break;
        case 'Enter': event.preventDefault(); openWith(enabledSelectedOr(firstEnabled)); break;
        case ' ': event.preventDefault(); openWith(enabledSelectedOr(firstEnabled)); break;
        default: break; // Escape (closed) and printable keys: no side effect, no preventDefault
      }
      return;
    }
    switch (event.key) {
      case 'ArrowDown': event.preventDefault(); moveActive(1); break;
      case 'ArrowUp': event.preventDefault(); moveActive(-1); break;
      case 'Home': event.preventDefault(); setActiveIndex(firstEnabled()); break;
      case 'End': event.preventDefault(); setActiveIndex(lastEnabled()); break;
      case 'Enter': event.preventDefault(); selectAt(activeIndex); break;
      case ' ': event.preventDefault(); selectAt(activeIndex); break;
      case 'Escape': event.preventDefault(); closeTo(true); break;
      case 'Tab': closeTo(false); break; // close but let Tab move focus normally (no preventDefault)
      default: break;
    }
  };

  return (
    <span ref={ref} className={`menu-anchor ${align === 'right' ? 'menu-anchor--right' : ''} ${open ? 'is-open' : ''}`} style={{ display: 'inline-block', width: '100%' }}>
      <button
        type="button"
        ref={triggerRef}
        className={triggerCls}
        {...rest}
        id={id}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={panelId}
        aria-activedescendant={open && activeIndex >= 0 ? optionId(activeIndex) : undefined}
        onClick={(event) => { if (event.detail === 0) return; open ? closeTo(false) : openWith(enabledSelectedOr(firstEnabled)); }}
        onKeyDown={onKeyDown}
      >
        {icon && <span className="select__icon">{icon}</span>}
        <span className={`select__value ${!current ? 'select__value--placeholder' : ''}`}>
          {current ? current.label : placeholder}
        </span>
        <svg className="select__caret" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="m4 6 4 4 4-4"/>
        </svg>
      </button>
      <div className="menu select__panel" role="listbox" id={panelId} hidden={!open}>
        {options.map((option, index) => {
          const isSelected = option.value === value;
          const isActive = index === activeIndex;
          const isDisabled = !!option.disabled;
          return (
            <div
              key={option.value}
              ref={(el) => { optionRefs.current[index] = el; }}
              id={optionId(index)}
              role="option"
              aria-selected={isSelected}
              aria-disabled={isDisabled || undefined}
              className={['menu__item', isActive && 'is-active', isDisabled && 'is-disabled'].filter(Boolean).join(' ')}
              onClick={() => selectAt(index)}
              onMouseMove={() => { if (!isDisabled && index !== activeIndex) setActiveIndex(index); }}
            >
              <span className="menu__check">{isSelected && (
                <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3.5 8 3 3 6-6.5"/></svg>
              )}</span>
              {option.icon && <span className="menu__icon">{option.icon}</span>}
              <span className="menu__text">{option.label}</span>
              {option.meta && <span className="menu__shortcut">{option.meta}</span>}
            </div>
          );
        })}
      </div>
    </span>
  );
}

/* ============ Combobox — typeahead filter ============ */
function Combobox({ options = [], value, onChange, placeholder = 'Search…', className = '', disabled = false, name, id, 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, 'aria-describedby': ariaDescribedBy }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef(null);
  const inputRef = useRef(null);
  const optionRefs = useRef([]);

  // Component-level disabled gates every "open" signal in the SAME render (no reliance on a
  // post-render effect): panel, aria-expanded, aria-activedescendant and the displayed value all read this.
  const effectiveOpen = open && !disabled;

  // Stable ids: a consumer-supplied id becomes the real input id and the base for panel/option ids,
  // otherwise useId(). useId() runs unconditionally at top level — `||` only picks the value, never gates the Hook.
  const autoId = React.useId();
  const resolvedInputId = id || `${autoId}-input`;
  const idBase = id || autoId;
  const panelId = `${idBase}-listbox`;
  const optionId = (index) => `${idBase}-option-${index}`;

  // Outside-click close — DOM focus stays on the input (aria-activedescendant model), no keyboard listener here.
  // Gated on effectiveOpen so a disabled component never attaches the listener.
  useEffect(() => {
    if (!effectiveOpen) return;
    const onDown = (event) => { if (ref.current && !ref.current.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [effectiveOpen]);

  // Every close path (outside click, Escape, Tab, selection) clears the query and the active option,
  // so the next open starts fresh and the selected label shows again while closed.
  useEffect(() => { if (!open) { setQuery(''); setActiveIndex(-1); } }, [open]);

  // Runtime disable tears down any open/typing state. Never touches the controlled value, never calls onChange.
  useEffect(() => { if (disabled) { setOpen(false); setQuery(''); setActiveIndex(-1); } }, [disabled]);

  const current = options.find((option) => option.value === value);

  const filterOptions = (q) => {
    if (!q) return options;
    const queryLower = q.toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(queryLower));
  };
  const filtered = useMemo(() => filterOptions(query), [options, query]);

  // Enabled-aware navigation over the *current* filtered list (never mutates options/filtered).
  const isEnabled = (index) => index >= 0 && index < filtered.length && !filtered[index].disabled;
  const firstEnabledIndex = () => filtered.findIndex((option) => !option.disabled);
  const lastEnabledIndex = () => {
    for (let i = filtered.length - 1; i >= 0; i--) if (!filtered[i].disabled) return i;
    return -1;
  };
  // The selected option's index only when it's in the filtered list AND enabled (else −1).
  const selectedEnabledIndex = () => {
    const sel = filtered.findIndex((option) => option.value === value);
    return sel >= 0 && !filtered[sel].disabled ? sel : -1;
  };

  // Keep activeIndex on an enabled, in-range option as the filtered list / disabled flags change;
  // fall back to the first enabled match, or −1 when nothing is selectable.
  useEffect(() => {
    if (activeIndex >= 0 && !isEnabled(activeIndex)) setActiveIndex(firstEnabledIndex());
  }, [filtered]);

  // Scroll the active option into view without moving DOM focus (it stays on the input). Instant —
  // no `behavior: 'smooth'`, so reduced-motion is irrelevant; no-op when closed, when there is no
  // active option, or when the ref is missing (e.g. empty list / unmounted option / disabled option).
  useEffect(() => {
    if (!effectiveOpen || !isEnabled(activeIndex)) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [effectiveOpen, activeIndex]);

  // Open onto the selected enabled match, else the first enabled match (−1 when none selectable).
  const initialActive = () => {
    const sel = selectedEnabledIndex();
    return sel >= 0 ? sel : firstEnabledIndex();
  };
  // ArrowUp from a closed panel lands on the selected enabled match, else the last enabled match.
  const arrowUpActive = () => {
    const sel = selectedEnabledIndex();
    return sel >= 0 ? sel : lastEnabledIndex();
  };
  const openPanel = () => { if (disabled) return; setOpen(true); setActiveIndex(initialActive()); };
  // Circular move over the filtered list, skipping disabled options; from −1, Down → first, Up → last.
  // Bounded by the list length so an all-disabled list can't spin (activeIndex is left untouched then).
  const moveActive = (dir) => {
    if (!filtered.length) return;
    const n = filtered.length;
    let i = activeIndex < 0 ? (dir > 0 ? -1 : 0) : activeIndex;
    for (let step = 0; step < n; step++) {
      i = (i + dir + n) % n;
      if (!filtered[i].disabled) { setActiveIndex(i); return; }
    }
  };
  const selectIndex = (index) => {
    if (disabled || index < 0 || index >= filtered.length || filtered[index].disabled) return;
    onChange?.(filtered[index].value);
    setOpen(false);
    inputRef.current?.focus();
  };

  const onKeyDown = (event) => {
    if (disabled) return; // native disabled blocks most events; guard the shared helpers regardless (no preventDefault)
    // IME composition: let the input method own every key — no select, no close, no preventDefault.
    if (event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229) return;
    if (!open) {
      switch (event.key) {
        case 'ArrowDown': event.preventDefault(); setOpen(true); setActiveIndex(initialActive()); break;
        case 'ArrowUp': event.preventDefault(); setOpen(true); setActiveIndex(arrowUpActive()); break;
        default: break; // Escape, Enter, printable keys: native behaviour, no preventDefault
      }
      return;
    }
    switch (event.key) {
      case 'ArrowDown': event.preventDefault(); moveActive(1); break;
      case 'ArrowUp': event.preventDefault(); moveActive(-1); break;
      case 'Enter':
        // Only a real selection swallows Enter; with no active option it stays native (e.g. form submit).
        if (activeIndex >= 0 && activeIndex < filtered.length) { event.preventDefault(); selectIndex(activeIndex); }
        break;
      case 'Escape': event.preventDefault(); setOpen(false); break; // close, revert to the selected label
      case 'Tab': setOpen(false); break; // close but let Tab move focus normally (no preventDefault)
      default: break; // Home/End, Arrow Left/Right, Space, printable, Backspace/Delete: native caret/edit
    }
  };

  return (
    <span ref={ref} className={`combo ${className}`}>
      <input
        ref={inputRef}
        type="text"
        id={resolvedInputId}
        className="combo__input"
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={effectiveOpen}
        aria-controls={panelId}
        aria-activedescendant={effectiveOpen && isEnabled(activeIndex) ? optionId(activeIndex) : undefined}
        value={effectiveOpen ? query : (current?.label ?? '')}
        onFocus={openPanel}
        onClick={openPanel}
        onChange={(event) => {
          if (disabled) return;
          const q = event.target.value;
          setQuery(q);
          setOpen(true);
          const next = filterOptions(q);
          setActiveIndex(next.findIndex((option) => !option.disabled));
        }}
        onKeyDown={onKeyDown}
      />
      <svg className="combo__caret" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="m4 6 4 4 4-4"/>
      </svg>
      {/* Native form submission: a separate hidden input carries the controlled option.value as a string.
          Placed AFTER the caret so the `.combo__input + .combo__caret` adjacency (caret disabled-dim) is preserved.
          `readOnly` only silences React's controlled-without-onChange warning; `readonly` is inert on type=hidden,
          so this is NOT a component-level read-only mode. Disabled mirrors the component → excluded from FormData. */}
      {name && (
        <input type="hidden" name={name} value={value ?? ''} disabled={disabled} readOnly />
      )}
      {effectiveOpen && (
        <div className="menu combo__panel" id={panelId} role="listbox">
          {filtered.length === 0
            ? <div className="combo__empty">No matches</div>
            : filtered.map((option, index) => {
              const isDisabled = !!option.disabled;
              return (
              <div
                key={option.value}
                ref={(el) => { optionRefs.current[index] = el; }}
                id={optionId(index)}
                role="option"
                aria-selected={option.value === value}
                aria-disabled={isDisabled ? 'true' : undefined}
                className={['menu__item', index === activeIndex && 'is-active', isDisabled && 'is-disabled'].filter(Boolean).join(' ')}
                onMouseDown={(event) => { if (!disabled) event.preventDefault(); }}
                onClick={() => { if (!disabled && !isDisabled) selectIndex(index); }}
                onMouseMove={() => { if (!disabled && !isDisabled && index !== activeIndex) setActiveIndex(index); }}
              >
                {option.icon && <span className="menu__icon">{option.icon}</span>}
                <span className="menu__text">{option.label}</span>
                {option.meta && <span className="menu__shortcut">{option.meta}</span>}
              </div>
              );
            })
          }
        </div>
      )}
    </span>
  );
}

Object.assign(window, { Select, Combobox });
