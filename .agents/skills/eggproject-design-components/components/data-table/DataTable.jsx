/* global React */
/*
 * EggProject · DataTable — the canonical TanStack Table (@tanstack/react-table v8)
 * showcase. TanStack is the MANDATORY table engine across this design system.
 *
 * Features demonstrated (all on EggProject tokens):
 *   sorting · global search · per-column filter row (text / select / numeric) ·
 *   row selection + bulk bar · column resizing · drag-to-reorder columns ·
 *   column visibility menu · column pinning (sticky left) · row pinning (pin to top) ·
 *   pagination · responsive full-width layout (a growing primary column + min-width
 *   scroll — see https://tanstack.com/table/latest/docs/framework/react/examples/full-width-resizable-table ).
 *
 * window.ReactTable (the UMD global) is loaded by the host HTML; read lazily inside
 * the component so the design-system bundle never touches it at module-eval time.
 */
const { useState, useMemo, useRef, useEffect } = React;

/* ============ Icons ============ */
const SortIcon = ({ direction }) => (
  <svg className="data-table-sort" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 5 L6 2 L9 5"   opacity={direction === 'asc'  ? 1 : 0.3}/>
    <path d="M3 7 L6 10 L9 7"  opacity={direction === 'desc' ? 1 : 0.3}/>
  </svg>
);
const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6 L4.5 8.5 L9 3"/></svg>
);
const DashIcon = () => (
  <svg width="11" height="3" viewBox="0 0 11 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 1.5 L9 1.5"/></svg>
);
const GripIcon = () => (
  <svg className="data-table-grip" width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true">
    <circle cx="3" cy="3" r="1.1"/><circle cx="7" cy="3" r="1.1"/><circle cx="3" cy="7" r="1.1"/><circle cx="7" cy="7" r="1.1"/><circle cx="3" cy="11" r="1.1"/><circle cx="7" cy="11" r="1.1"/>
  </svg>
);
const ColumnsIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2.5" width="12" height="11" rx="1.5"/><path d="M6.5 2.5v11M10 2.5v11"/></svg>
);
const FilterIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3.5h12l-4.5 5.5v3.5l-3 1.5V9L2 3.5Z"/></svg>
);
const PinIcon = ({ filled }) => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2.5 13.5 6.5 11 7 9 11 5 7l4-2 .5-2.5ZM5 11l-2.5 2.5"/>
  </svg>
);
const ChevronIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 5 3 3 3-3"/></svg>
);
const SearchIcon = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="7" r="4.5"/><path d="m14 14-3-3"/></svg>
);
const ClearIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 3 9 9M9 3 3 9"/></svg>
);
const PageIcon = ({ direction }) => (
  <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {direction === 'prev' ? <path d="M7.5 2.5 4 6l3.5 3.5"/> : <path d="M4.5 2.5 8 6l-3.5 3.5"/>}
  </svg>
);
const FilterResetIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3.2h8.5"/><path d="M2 8h5"/><path d="M2 12.8h3"/>
    <path d="M10.5 9.5 14.5 13.5M14.5 9.5 10.5 13.5"/>
  </svg>
);

/* ============ Tip — hover label that REUSES the design-system Tooltip component
   (components/tooltip · window.Tooltip, loaded by the host HTML). We adopt its full
   appearance (dark ink bubble + arrow + shadow); this thin adapter only maps the
   data-table's text / disabled / block props onto the DS component's content / placement
   API. Placement defaults to `bottom` so the bubble drops below toolbar + filter-row
   anchors instead of being clipped by the card's top edge. ============ */
function Tip({ text, disabled, block, placement = 'bottom', children }) {
  const DS = window.Tooltip;
  const wrapStyle = block ? { width: '100%' } : undefined;
  if (disabled || !text || !DS) {
    return <span className="data-table-tooltip-wrapper" style={wrapStyle}>{children}</span>;
  }
  return (
    <span className="data-table-tooltip-wrapper" style={wrapStyle}>
      <DS content={text} placement={placement}>{children}</DS>
    </span>
  );
}

/* ============ Sample data ============ */
const ROWS = [
  { id: 'AT-014', project: 'Atlas — Logistics platform',  owner: { initials: 'AK', name: 'Adam K.' },  status: 'progress', statusLabel: 'In progress', priority: 'High',   hours: 142, updated: '2 h ago' },
  { id: 'HX-007', project: 'Halifax Ops · Phase 2',        owner: { initials: 'JS', name: 'Júlia S.' }, status: 'review',   statusLabel: 'Review',      priority: 'Medium', hours: 96,  updated: '5 h ago' },
  { id: 'LW-021', project: 'Lumenwerk CRM',                owner: { initials: 'BT', name: 'Bence T.' }, status: 'hold',     statusLabel: 'On hold',     priority: 'Low',    hours: 38,  updated: 'Yesterday' },
  { id: 'MR-003', project: 'Méreg Labs — Marketing site',  owner: { initials: 'AK', name: 'Adam K.' },  status: 'shipped',  statusLabel: 'Shipped',     priority: 'Medium', hours: 184, updated: '3 d ago' },
  { id: 'NB-101', project: 'Northbeam — Onboarding',       owner: { initials: 'NK', name: 'Nóra K.' },  status: 'progress', statusLabel: 'In progress', priority: 'High',   hours: 64,  updated: '1 h ago' },
  { id: 'SK-009', project: 'Studio Kovács — Portfolio',    owner: { initials: 'BT', name: 'Bence T.' }, status: 'review',   statusLabel: 'Review',      priority: 'Low',    hours: 22,  updated: '8 h ago' },
  { id: 'AP-045', project: 'Aper — Identity refresh',      owner: { initials: 'PD', name: 'Petra D.' }, status: 'progress', statusLabel: 'In progress', priority: 'Medium', hours: 78,  updated: '2 d ago' },
  { id: 'PF-012', project: 'Polyfold — Pilot',             owner: { initials: 'NK', name: 'Nóra K.' },  status: 'hold',     statusLabel: 'On hold',     priority: 'Low',    hours: 14,  updated: '4 d ago' },
  { id: 'HC-088', project: 'Halifax & Co. — Migration',    owner: { initials: 'JS', name: 'Júlia S.' }, status: 'shipped',  statusLabel: 'Shipped',     priority: 'High',   hours: 220, updated: '6 d ago' },
  { id: 'LM-030', project: 'Lumenwerk — Portal v2',        owner: { initials: 'AK', name: 'Adam K.' },  status: 'progress', statusLabel: 'In progress', priority: 'High',   hours: 132, updated: '3 h ago' },
  { id: 'NB-104', project: 'Northbeam — Sales console',    owner: { initials: 'PD', name: 'Petra D.' }, status: 'review',   statusLabel: 'Review',      priority: 'Medium', hours: 58,  updated: '7 h ago' },
  { id: 'MR-017', project: 'Méreg Labs — App revamp',      owner: { initials: 'BT', name: 'Bence T.' }, status: 'progress', statusLabel: 'In progress', priority: 'Low',    hours: 41,  updated: 'Yesterday' },
  { id: 'AT-022', project: 'Atlas — Routing engine',       owner: { initials: 'NK', name: 'Nóra K.' },  status: 'hold',     statusLabel: 'On hold',     priority: 'Medium', hours: 90,  updated: '5 d ago' },
  { id: 'SK-014', project: 'Studio Kovács — Booking',      owner: { initials: 'JS', name: 'Júlia S.' }, status: 'shipped',  statusLabel: 'Shipped',     priority: 'Low',    hours: 36,  updated: '1 w ago' },
  { id: 'PF-019', project: 'Polyfold — Data sync',         owner: { initials: 'AK', name: 'Adam K.' },  status: 'progress', statusLabel: 'In progress', priority: 'High',   hours: 108, updated: '4 h ago' },
  { id: 'AP-051', project: 'Aper — Spark audit',           owner: { initials: 'PD', name: 'Petra D.' }, status: 'review',   statusLabel: 'Review',      priority: 'Medium', hours: 27,  updated: '9 h ago' },
  { id: 'HC-091', project: 'Halifax & Co. — Phase 4',      owner: { initials: 'BT', name: 'Bence T.' }, status: 'progress', statusLabel: 'In progress', priority: 'High',   hours: 156, updated: '2 h ago' },
  { id: 'LW-026', project: 'Lumenwerk — Reporting',        owner: { initials: 'NK', name: 'Nóra K.' },  status: 'hold',     statusLabel: 'On hold',     priority: 'Low',    hours: 19,  updated: '6 d ago' },
];

const PRIORITY_WEIGHT = { Low: 0, Medium: 1, High: 2 };
const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All' }, { value: 'progress', label: 'In progress' },
  { value: 'review', label: 'Review' }, { value: 'hold', label: 'On hold' }, { value: 'shipped', label: 'Shipped' },
];
const OWNER_OPTIONS = [...new Set(ROWS.map((row) => row.owner.name))].sort();

/* ---- Updated (“ago”) range helpers — the column stores strings, so derive hours ---- */
const UPDATED_MAX = 168; // hours (= 1 week), the oldest value present in the data
function agoToHours(text) {
  if (/yesterday/i.test(text)) return 24;
  const match = String(text).match(/(\d+)\s*([hdw])/i);
  if (!match) return 0;
  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  return unit === 'h' ? amount : unit === 'd' ? amount * 24 : amount * 168;
}
function formatAgo(hours) {
  if (hours <= 0) return 'now';
  if (hours >= 168 && hours % 168 === 0) return `${hours / 168}w`;
  if (hours >= 24 && hours % 24 === 0) return `${hours / 24}d`;
  return `${hours}h`;
}

/* ---- Hours (min / max / equals) helpers — value shape: {minOn,min,maxOn,max,eqOn,eq} ---- */
const isNumeric = (x) => x !== '' && x != null && !Number.isNaN(Number(x));
function hoursActive(value) { return !!(value && (value.minOn || value.maxOn || value.eqOn)); }
function hoursErrors(value) {
  const errorMessages = [];
  if (!value) return errorMessages;
  if (value.eqOn && (value.minOn || value.maxOn)) errorMessages.push('Use Equals on its own — not together with Min / Max.');
  if (value.minOn && value.maxOn && isNumeric(value.min) && isNumeric(value.max) && Number(value.min) > Number(value.max))
    errorMessages.push('Min cannot be greater than Max.');
  return errorMessages;
}
function hoursPass(hours, value) {
  if (!value || hoursErrors(value).length) return true;
  if (value.eqOn) return isNumeric(value.eq) ? hours === Number(value.eq) : true;
  let ok = true;
  if (value.minOn && isNumeric(value.min)) ok = ok && hours >= Number(value.min);
  if (value.maxOn && isNumeric(value.max)) ok = ok && hours <= Number(value.max);
  return ok;
}
function hoursLabel(value) {
  if (!hoursActive(value)) return 'Any hours';
  if (hoursErrors(value).length) return 'Check inputs';
  if (value.eqOn && isNumeric(value.eq)) return `= ${value.eq} h`;
  const lo = value.minOn && isNumeric(value.min), hi = value.maxOn && isNumeric(value.max);
  if (lo && hi) return `${value.min}–${value.max} h`;
  if (lo) return `≥ ${value.min} h`;
  if (hi) return `≤ ${value.max} h`;
  return 'Any hours';
}
function hoursTooltip(value) {
  if (!hoursActive(value)) return '';
  const errorMessages = hoursErrors(value);
  if (errorMessages.length) return errorMessages.join(' ');
  if (value.eqOn && isNumeric(value.eq)) return `= ${value.eq} h`;
  const lo = value.minOn && isNumeric(value.min), hi = value.maxOn && isNumeric(value.max);
  if (lo && hi) return `${value.min}–${value.max} h`;
  if (lo) return `≥ ${value.min} h`;
  if (hi) return `≤ ${value.max} h`;
  return '';
}

/* ============ Indeterminate checkbox ============ */
function Checkbox({ checked, indeterminate, onChange, label }) {
  const state = indeterminate ? 'partial' : checked ? 'on' : 'off';
  return (
    <button type="button" role="checkbox" aria-label={label}
      aria-checked={state === 'on' ? 'true' : state === 'partial' ? 'mixed' : 'false'}
      className={`data-table-checkbox data-table-checkbox--${state}`}
      onClick={(event) => { event.stopPropagation(); onChange(event); }}>
      {state === 'on' && <CheckIcon/>}{state === 'partial' && <DashIcon/>}
    </button>
  );
}

/* ============ Cell renderers ============ */
const renderMain = (row) => (
  <div className="data-table-main"><strong>{row.project}</strong><span>{row.id}</span></div>
);
const renderOwner = (row) => (
  <div className="data-table-owner"><div className="data-table-avatar">{row.owner.initials}</div><span>{row.owner.name}</span></div>
);
const renderStatus = (row) => (
  <span className={`data-table-status data-table-status--${row.status}`}><span className="data-table-status__dot"/>{row.statusLabel}</span>
);
const renderPrio = (value) => <span className={`data-table-priority data-table-priority--${value.toLowerCase()}`}>{value}</span>;

/* ============ Per-column filter controls ============
   Built from the design-system's OWN components — the .select trigger + .menu panel
   (components/select + components/menu) and the .input field (components/input).
   No bespoke filter inputs/selects. */
/* Clear-all-filters icon button. The entrance is driven via the Web Animations API rather
   than a CSS @keyframes — CSS animations/transitions can stick at their first frame in this
   preview, which would leave the button invisible (stuck at opacity:0/scale). */
function FilterResetButton({ onClick }) {
  const ref = useRef(null);
  useEffect(() => {
    const element = ref.current;
    if (element && element.animate) {
      // Animate transform only (never opacity) — if the preview's animation timeline is
      // frozen the element still rests fully visible, just un-scaled.
      element.animate(
        [{ transform: 'scale(0.8) translateX(-6px)' },
         { transform: 'scale(1.06)', offset: 0.6 },
         { transform: 'none' }],
        { duration: 280, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', fill: 'none' }
      );
    }
  }, []);
  return (
    <Tip text="Clear all filters">
      <button ref={ref} className="data-table-tool-button data-table-tool-button--icon data-table-filter-reset" onClick={onClick} aria-label="Clear all filters">
        <FilterResetIcon/>
      </button>
    </Tip>
  );
}

function FilterSelect({ column, options, multi, placeholder, name }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (event) => { if (ref.current && !ref.current.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const rawFilterValue = column.getFilterValue();
  const selected = multi ? (rawFilterValue || []) : (rawFilterValue ? [rawFilterValue] : []);
  const labelFor = (value) => (options.find((option) => option.value === value) || {}).label || value;
  const text = selected.length === 0 ? placeholder
    : multi ? (selected.length === 1 ? labelFor(selected[0]) : `${selected.length} selected`)
    : labelFor(selected[0]);
  const choose = (value) => {
    if (multi) {
      const nextSelected = selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value];
      column.setFilterValue(nextSelected.length ? nextSelected : undefined);
    } else {
      column.setFilterValue(value || undefined);
      setOpen(false);
    }
  };
  const openMenu = (event) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    setPosition({ left: rect.left, top: rect.bottom + 6, width: rect.width });
    setOpen((isOpen) => !isOpen);
  };
  const tipText = selected.length ? selected.map(labelFor).join(', ') : '';
  return (
    <div ref={ref} style={{ width: '100%' }}>
      {/* design-system Select trigger (.select) */}
      <Tip text={tipText} disabled={open} block>
        <button type="button" className={`select select--sm ${open ? 'select--open' : ''}`} onClick={openMenu}>
          <span className={`select__value ${selected.length === 0 ? 'select__value--placeholder' : ''}`}>{text}</span>
          <svg className="select__caret" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 5 3 3 3-3"/></svg>
        </button>
      </Tip>
      {/* design-system Menu panel (.menu) — fixed so it escapes the table's scroll clip */}
      {open && position && (
        <div className="menu data-table-filter-popover" style={{ position: 'fixed', left: position.left, top: position.top, minWidth: Math.max(position.width, 168) }} onClick={(event) => event.stopPropagation()}>
          {!multi && (
            <div className="menu__item" role="option" onClick={() => choose('')}>
              <Checkbox checked={selected.length === 0} indeterminate={false} onChange={() => choose('')} label={`${name} filter: ${placeholder}`}/>
              <span className="menu__text">{placeholder}</span>
            </div>
          )}
          {options.map((option) => (
            <div className="menu__item" role="option" key={option.value} onClick={() => choose(option.value)}>
              <Checkbox checked={selected.includes(option.value)} indeterminate={false} onChange={() => choose(option.value)} label={`Filter ${name} ${option.label}`}/>
              <span className="menu__text">{option.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* A popover that reuses the design-system .select trigger + .menu panel (fixed, so it
   escapes the table's scroll clip). Used by the owner / hours / updated filters. */
function FilterPopover({ label, active, width = 252, title, children }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = (event) => { if (ref.current && !ref.current.contains(event.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);
  const openMenu = (event) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - width - 12));
    setPosition({ left, top: rect.bottom + 6 });
    setOpen((isOpen) => !isOpen);
  };
  return (
    <div ref={ref} style={{ width: '100%' }}>
      <Tip text={active && title ? title : ''} disabled={open} block>
        <button type="button" className={`select select--sm ${open ? 'select--open' : ''}`} onClick={openMenu}>
          <span className={`select__value ${!active ? 'select__value--placeholder' : ''}`}>{label}</span>
          <svg className="select__caret" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 5 3 3 3-3"/></svg>
        </button>
      </Tip>
      {open && position && (
        <div className="menu data-table-filter-popover" style={{ position: 'fixed', left: position.left, top: position.top, width }} onClick={(event) => event.stopPropagation()}>
          {children}
        </div>
      )}
    </div>
  );
}

/* Owner — multiselect autocomplete (type to filter, check to add) */
function OwnerFilter({ column }) {
  const [query, setQuery] = useState('');
  const selected = column.getFilterValue() || [];
  const normalize = (text) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const matches = OWNER_OPTIONS.filter((name) => normalize(name).includes(normalize(query.trim())));
  const toggle = (name) => {
    const nextSelected = selected.includes(name) ? selected.filter((item) => item !== name) : [...selected, name];
    column.setFilterValue(nextSelected.length ? nextSelected : undefined);
  };
  const label = selected.length === 0 ? 'All owners'
    : selected.length === 1 ? selected[0] : `${selected.length} selected`;
  return (
    <FilterPopover label={label} active={selected.length > 0} title={selected.join(', ')} width={240}>
      <div className="data-table-filter-popover__search">
        <SearchIcon/>
        <input className="input input--sm" autoFocus value={query} placeholder="Search owners…"
          onClick={(event) => event.stopPropagation()} onChange={(event) => setQuery(event.target.value)}/>
      </div>
      {selected.length > 0 && (
        <div className="data-table-chips">
          {selected.map((name) => (
            <button type="button" key={name} className="data-table-chip" onClick={() => toggle(name)}>
              {name}<span className="data-table-chip__remove">×</span>
            </button>
          ))}
        </div>
      )}
      <div className="data-table-filter-popover__list">
        {matches.length === 0 && <div className="data-table-filter-popover__empty">No owners match</div>}
        {matches.map((name) => (
          <div className="menu__item" role="option" key={name} onClick={() => toggle(name)}>
            <Checkbox checked={selected.includes(name)} indeterminate={false} onChange={() => toggle(name)} label={`Filter owner ${name}`}/>
            <span className="menu__text">{name}</span>
          </div>
        ))}
      </div>
      {selected.length > 0 && (
        <button type="button" className="data-table-filter-popover__clear" onClick={() => { column.setFilterValue(undefined); setQuery(''); }}>Clear all</button>
      )}
    </FilterPopover>
  );
}

/* Hours — Min / Max / Equals, each gated by its own checkbox (fields never auto-disabled;
   conflicts are validated and surfaced as inline errors instead). */
function HoursFilter({ column }) {
  const value = column.getFilterValue() || {};
  const set = (patch) => {
    const nextValue = { ...value, ...patch };
    const empty = !nextValue.minOn && !nextValue.maxOn && !nextValue.eqOn
      && !isNumeric(nextValue.min) && !isNumeric(nextValue.max) && !isNumeric(nextValue.eq);
    column.setFilterValue(empty ? undefined : nextValue);
  };
  const errorMessages = hoursErrors(value);
  const row = (fieldKey, toggleKey, labelText, placeholder) => (
    <div className={`data-table-number-row ${value[toggleKey] ? 'is-on' : ''}`}>
      {/* data-table Checkbox (.dt-cb) — same component the row-selection + columns menu use */}
      <div className="data-table-number-row__checkbox" onClick={(event) => { event.stopPropagation(); set({ [toggleKey]: !value[toggleKey] }); }}>
        <Checkbox checked={!!value[toggleKey]} indeterminate={false} onChange={() => set({ [toggleKey]: !value[toggleKey] })} label={`${labelText} hours filter`}/>
        <span className="data-table-number-row__label">{labelText}</span>
      </div>
      <input className="input input--sm" type="number" value={value[fieldKey] ?? ''} placeholder={placeholder}
        onClick={(event) => event.stopPropagation()} onChange={(event) => set({ [fieldKey]: event.target.value })}/>
    </div>
  );
  return (
    <FilterPopover label={hoursLabel(value)} active={hoursActive(value)} title={hoursTooltip(value)} width={256}>
      {row('min', 'minOn', 'Min', '0')}
      {row('max', 'maxOn', 'Max', '∞')}
      {row('eq', 'eqOn', 'Equals', '—')}
      {errorMessages.map((errorMessage, i) => <div key={i} className="data-table-filter-popover__error">{errorMessage}</div>)}
      {hoursActive(value) && (
        <button type="button" className="data-table-filter-popover__clear" onClick={() => column.setFilterValue(undefined)}>Clear</button>
      )}
    </FilterPopover>
  );
}

/* Updated — dual-thumb range slider over the derived “hours ago” value */
function UpdatedFilter({ column }) {
  const value = column.getFilterValue() || [0, UPDATED_MAX];
  const [from, to] = value;
  const setRange = (lo, hi) => {
    lo = Math.max(0, Math.min(lo, hi));
    hi = Math.min(UPDATED_MAX, Math.max(hi, lo));
    column.setFilterValue(lo <= 0 && hi >= UPDATED_MAX ? undefined : [lo, hi]);
  };
  const active = !(from <= 0 && to >= UPDATED_MAX);
  const label = active ? `${formatAgo(from)} – ${formatAgo(to)} ago` : 'Any time';
  return (
    <FilterPopover label={label} active={active} title={`${formatAgo(from)} – ${formatAgo(to)} ago`} width={262}>
      <div className="data-table-range">
        <div className="data-table-range__header">
          <span>{formatAgo(from)}</span><span className="data-table-range__mid">ago</span><span>{formatAgo(to)}</span>
        </div>
        <div className="data-table-range__track">
          <div className="data-table-range__fill" style={{ left: `${from / UPDATED_MAX * 100}%`, right: `${100 - to / UPDATED_MAX * 100}%` }}/>
          <input type="range" min="0" max={UPDATED_MAX} value={from}
            onClick={(event) => event.stopPropagation()} onChange={(event) => setRange(Number(event.target.value), to)}/>
          <input type="range" min="0" max={UPDATED_MAX} value={to}
            onClick={(event) => event.stopPropagation()} onChange={(event) => setRange(from, Number(event.target.value))}/>
        </div>
        <div className="data-table-range__scale"><span>now</span><span>1w</span></div>
      </div>
      {active && (
        <button type="button" className="data-table-filter-popover__clear" onClick={() => column.setFilterValue(undefined)}>Clear</button>
      )}
    </FilterPopover>
  );
}

function ColumnFilter({ column }) {
  if (!column.getCanFilter()) return <div className="data-table-filter-cell"/>;
  const kind = (column.columnDef.meta && column.columnDef.meta.filter) || 'text';
  const label = typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id;
  if (kind === 'priority') {
    return (
      <div className="data-table-filter-cell">
        <FilterSelect column={column} multi placeholder="All" name="Priority"
          options={[{ value: 'High', label: 'High' }, { value: 'Medium', label: 'Medium' }, { value: 'Low', label: 'Low' }]}/>
      </div>
    );
  }
  if (kind === 'select') {
    return (
      <div className="data-table-filter-cell">
        <FilterSelect column={column} placeholder="All status" name="Status" options={STATUS_FILTER_OPTIONS.filter((option) => option.value)}/>
      </div>
    );
  }
  if (kind === 'owner')   return <div className="data-table-filter-cell"><OwnerFilter column={column}/></div>;
  if (kind === 'hours')   return <div className="data-table-filter-cell"><HoursFilter column={column}/></div>;
  if (kind === 'updated') return <div className="data-table-filter-cell"><UpdatedFilter column={column}/></div>;
  const value = column.getFilterValue() ?? '';
  return (
    <div className="data-table-filter-cell">
      {/* design-system Input field (.input) */}
      <input className="input input--sm" type="text"
        value={value} placeholder={label}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => column.setFilterValue(event.target.value || undefined)}/>
    </div>
  );
}

/* ============ DataTable ============ */
function DataTable() {
  const ReactTableLibrary = window.ReactTable;
  const {
    useReactTable, getCoreRowModel, getSortedRowModel,
    getFilteredRowModel, getPaginationRowModel, flexRender,
  } = ReactTableLibrary;

  const [sorting, setSorting] = useState([{ id: 'hours', desc: true }]);
  const [rowSelection, setRowSelection] = useState({ 'HX-007': true });
  const [globalFilter, setGlobalFilter] = useState('');
  const [columnFilters, setColumnFilters] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState({});
  const [columnOrder, setColumnOrder] = useState([]);
  const [columnPinning, setColumnPinning] = useState({ left: [], right: [] });
  const [rowPinning, setRowPinning] = useState({ top: ['NB-101'], bottom: [] });
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 7 });
  const [showFilters, setShowFilters] = useState(false);
  const [active, setActive] = useState(null);

  const columns = useMemo(() => [
    {
      id: 'select', size: 44, enableSorting: false, enableResizing: false, enableHiding: false, enableColumnFilter: false,
      meta: { align: 'center', fixed: true },
      header: ({ table }) => (
        <Checkbox checked={table.getIsAllRowsSelected()} indeterminate={table.getIsSomeRowsSelected()} onChange={table.getToggleAllRowsSelectedHandler()} label="Select all projects" />
      ),
      cell: ({ row }) => (
        <Checkbox checked={row.getIsSelected()} indeterminate={false} onChange={row.getToggleSelectedHandler()} label={`Select project ${row.original.id} ${row.original.project}`} />
      ),
    },
    { accessorKey: 'id', header: 'ID', size: 92, minSize: 72, meta: { align: 'left', type: 'mono', filter: 'text' } },
    { accessorKey: 'project', id: 'project', header: 'Project', size: 300, minSize: 180,
      meta: { align: 'left', type: 'main', grow: true, filter: 'text' }, cell: ({ row }) => renderMain(row.original) },
    { id: 'owner', accessorFn: (row) => row.owner.name, header: 'Owner', size: 170, minSize: 130,
      filterFn: (row, id, value) => (!value || value.length === 0) ? true : value.includes(row.getValue(id)),
      meta: { align: 'left', type: 'owner', filter: 'owner' }, cell: ({ row }) => renderOwner(row.original) },
    { accessorKey: 'status', header: 'Status', size: 140, minSize: 110, filterFn: 'equals',
      meta: { align: 'left', type: 'status', filter: 'select' }, cell: ({ row }) => renderStatus(row.original) },
    { accessorKey: 'priority', header: 'Priority', size: 130, minSize: 104,
      filterFn: (row, id, value) => (!value || value.length === 0) ? true : value.includes(row.getValue(id)),
      sortingFn: (rowA, rowB) => PRIORITY_WEIGHT[rowA.original.priority] - PRIORITY_WEIGHT[rowB.original.priority],
      meta: { align: 'left', type: 'priority', filter: 'priority' }, cell: ({ getValue }) => renderPrio(getValue()) },
    { accessorKey: 'hours', header: 'Hours', size: 96, minSize: 76,
      filterFn: (row, id, value) => hoursPass(Number(row.getValue(id)), value),
      meta: { align: 'right', type: 'mono', filter: 'hours' } },
    { accessorKey: 'updated', header: 'Updated', size: 132, minSize: 110, enableSorting: false,
      filterFn: (row, id, value) => { if (!value) return true; const hours = agoToHours(row.original.updated); return hours >= value[0] && hours <= value[1]; },
      meta: { align: 'right', type: 'mono', filter: 'updated' } },
    {
      id: 'actions', size: 52, enableSorting: false, enableResizing: false, enableHiding: false, enableColumnFilter: false,
      meta: { align: 'center', fixed: true, actions: true },
      header: () => null,
      cell: ({ row }) => {
        const pinned = row.getIsPinned() === 'top';
        return (
          <button className={`data-table-pin ${pinned ? 'is-on' : ''}`} title={pinned ? 'Unpin row' : 'Pin row to top'}
            onClick={(event) => { event.stopPropagation(); row.pin(pinned ? false : 'top'); }}>
            <PinIcon filled={pinned}/>
          </button>
        );
      },
    },
  ], []);

  const table = useReactTable({
    data: ROWS, columns,
    state: { sorting, rowSelection, globalFilter, columnFilters, columnVisibility, columnOrder, columnPinning, rowPinning, pagination },
    getRowId: (row) => row.id,
    columnResizeMode: 'onChange',
    enableColumnResizing: true,
    enableColumnPinning: true,
    enableRowPinning: true,
    keepPinnedRows: true,
    globalFilterFn: 'includesString',
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onColumnOrderChange: setColumnOrder,
    onColumnPinningChange: setColumnPinning,
    onRowPinningChange: setRowPinning,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  /* Column reordering — native drag (pinned/select columns are not draggable) */
  const [draggingColumnId, setDraggingColumnId] = useState(null);
  const [dragOverColumnId, setDragOverColumnId] = useState(null);
  const reorder = (from, to) => {
    if (from === 'select' || to === 'select' || from === 'actions' || to === 'actions' || from === to) return;
    const order = table.getAllLeafColumns().map((column) => column.id);
    order.splice(order.indexOf(from), 1);
    order.splice(order.indexOf(to), 0, from);
    setColumnOrder(order);
  };

  /* Columns / pinning menu */
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const columnMenuRef = useRef(null);
  useEffect(() => {
    if (!columnMenuOpen) return;
    const handleDocumentMouseDown = (event) => { if (columnMenuRef.current && !columnMenuRef.current.contains(event.target)) setColumnMenuOpen(false); };
    document.addEventListener('mousedown', handleDocumentMouseDown);
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown);
  }, [columnMenuOpen]);

  const selectedCount = table.getSelectedRowModel().rows.length;
  const topRows = table.getTopRows();
  const centerRows = table.getCenterRows();
  const filteredCount = table.getFilteredRowModel().rows.length;
  const pageStart = filteredCount === 0 ? 0 : pagination.pageIndex * pagination.pageSize + 1;
  const pageEnd = Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredCount);
  const activeFilters = columnFilters.length + (globalFilter ? 1 : 0);
  const columnsChanged = Object.values(columnVisibility).some((isVisible) => isVisible === false)
    || columnOrder.length > 0
    || (columnPinning.left || []).length > 0
    || (columnPinning.right || []).length > 0;
  const resetColumns = () => { setColumnVisibility({}); setColumnOrder([]); setColumnPinning({ left: [], right: [] }); };
  const resetAllFilters = () => { table.resetColumnFilters(); table.setGlobalFilter(''); };

  /* Pinned-column sticky style + classes */
  const pinClass = (column) => {
    const pin = column.getIsPinned();
    if (!pin) return '';
    const isLast = pin === 'left' && column.getIsLastColumn('left');
    const isFirstRight = pin === 'right' && column.getIsFirstColumn('right');
    return `dt__cell--pinned dt__cell--pinned-${pin} ${isLast ? 'dt__cell--pinned-edge' : ''} ${isFirstRight ? 'dt__cell--pinned-edge-r' : ''}`;
  };
  const pinStyle = (column) => {
    const pin = column.getIsPinned();
    if (!pin) return {};
    return pin === 'left'
      ? { position: 'sticky', left: column.getStart('left'), zIndex: 3 }
      : { position: 'sticky', right: column.getAfter('right'), zIndex: 3 };
  };

  const renderRow = (row, pinned) => {
    const isActive = active === row.id;
    return (
      <div key={row.id} role="row"
        className={`data-table__row ${row.getIsSelected() ? 'is-selected' : ''} ${isActive ? 'is-active' : ''} ${pinned ? 'data-table__row--pinned' : ''}`}
        onClick={() => setActive(row.id)}>
        {row.getVisibleCells().map((cell) => {
          const meta = cell.column.columnDef.meta || {};
          return (
            <div key={cell.id} role="cell"
              className={`data-table__cell data-table__cell--${meta.align || 'left'} ${meta.type ? `data-table__cell--${meta.type}` : ''} ${pinClass(cell.column)}`}
              style={{ width: cell.column.getSize(), flex: meta.grow ? '1 1 auto' : '0 0 auto', ...pinStyle(cell.column) }}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="data-table-wrapper">
      {/* Toolbar */}
      <div className="data-table-toolbar">
        <div className="data-table-toolbar__title">
          <h2>Projects</h2>
          <span className="data-table-toolbar__count">{filteredCount} of {ROWS.length}</span>
          <span className="data-table-toolbar__engine">TanStack Table</span>
        </div>
        <div className="data-table-toolbar__tools">
          {/* design-system Input field with leading icon (.input-with-icon + .input) */}
          <div className="input-with-icon data-table-toolbar__search">
            <SearchIcon/>
            <input className={`input input--sm ${globalFilter ? 'is-filled' : ''}`} value={globalFilter} onChange={(event) => table.setGlobalFilter(event.target.value)} placeholder="Search projects…"/>
            {globalFilter && (
              <button type="button" className="data-table-search-clear" aria-label="Clear search" onClick={() => table.setGlobalFilter('')}>
                <ClearIcon/>
              </button>
            )}
          </div>
          {/* Columns (moved before Filters) */}
          <div className="data-table-column-menu" ref={columnMenuRef}>
            <button className={`data-table-tool-button ${columnMenuOpen ? 'is-on' : ''} ${columnsChanged ? 'is-changed' : ''}`} onClick={() => setColumnMenuOpen((isOpen) => !isOpen)}>
              <ColumnsIcon/> Columns
            </button>
            {columnMenuOpen && (
              <div className="data-table-column-menu__popover">
                <div className="data-table-column-menu__header">
                  <span className="data-table-column-menu__title">Columns · visibility &amp; pin</span>
                  {columnsChanged && (
                    <button type="button" className="data-table-column-menu__reset" onClick={resetColumns}>Reset</button>
                  )}
                </div>
                {table.getAllLeafColumns().filter((column) => column.id !== 'select' && column.id !== 'actions').map((column) => {
                  const pinned = column.getIsPinned() === 'left';
                  return (
                    <div key={column.id} className="data-table-column-menu__row">
                      <label className="data-table-column-menu__visibility">
                        <Checkbox checked={column.getIsVisible()} indeterminate={false} onChange={column.getCanHide() ? column.getToggleVisibilityHandler() : () => {}} label={`Toggle column ${typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}`} />
                        <span>{typeof column.columnDef.header === 'string' ? column.columnDef.header : column.id}</span>
                      </label>
                      <button className={`data-table-column-menu__pin ${pinned ? 'is-on' : ''}`} title={pinned ? 'Unpin column' : 'Pin column left'}
                        onClick={() => column.pin(pinned ? false : 'left')}>
                        <PinIcon filled={pinned}/>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          {/* Filters */}
          <button className={`data-table-tool-button ${showFilters ? 'is-on' : ''} ${activeFilters > 0 ? 'is-changed' : ''}`} onClick={() => setShowFilters((isShown) => !isShown)}>
            <FilterIcon/> Filters{activeFilters > 0 && <span className="data-table-tool-button__badge">{activeFilters}</span>}
          </button>
          {/* Animated clear-all-filters icon — appears only while filters are active */}
          {activeFilters > 0 && <FilterResetButton onClick={resetAllFilters}/>}
        </div>
      </div>

      {/* Bulk action bar */}
      <div className={`data-table-bulk ${selectedCount > 0 ? 'is-on' : ''}`}>
        <span className="data-table-bulk__count"><strong>{selectedCount}</strong> selected</span>
        <button className="data-table-bulk__button">Assign</button>
        <button className="data-table-bulk__button">Archive</button>
        <button className="data-table-bulk__button data-table-bulk__button--danger">Delete</button>
        <button className="data-table-bulk__clear" onClick={() => table.resetRowSelection()}>Clear</button>
      </div>

      {/* Table */}
      <div className="data-table-scroll">
        <div className="data-table" role="table" aria-label="Projects" style={{ width: '100%', minWidth: table.getTotalSize() }}>
          <div role="rowgroup" className="data-table__header-group">
          {table.getHeaderGroups().map((headerGroup) => (
            <div className="data-table__header" role="row" key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                const column = header.column;
                const meta = column.columnDef.meta || {};
                const sorted = column.getIsSorted();
                const isFixed = meta.fixed || column.getIsPinned();
                const canSort = column.getCanSort();
                const toggleSorting = column.getToggleSortingHandler();
                const handleSortKeyDown = (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toggleSorting?.(event);
                  }
                };
                return (
                  <div key={header.id} role="columnheader"
                    aria-sort={canSort ? (sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : 'none') : undefined}
                    tabIndex={canSort ? 0 : undefined}
                    onKeyDown={canSort ? handleSortKeyDown : undefined}
                    className={[
                      'data-table__cell', 'data-table__cell--header', `data-table__cell--${meta.align || 'left'}`,
                      canSort ? 'is-sortable' : '',
                      sorted ? 'is-sorted' : '',
                      !isFixed ? 'is-draggable' : '',
                      dragOverColumnId === column.id && draggingColumnId && draggingColumnId !== column.id ? 'is-dragover' : '',
                      draggingColumnId === column.id ? 'is-dragging' : '',
                      pinClass(column),
                    ].join(' ')}
                    style={{ width: header.getSize(), flex: meta.grow ? '1 1 auto' : '0 0 auto', ...pinStyle(column) }}
                    draggable={!isFixed}
                    onDragStart={() => !isFixed && setDraggingColumnId(column.id)}
                    onDragEnter={() => !isFixed && setDragOverColumnId(column.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => { if (draggingColumnId) reorder(draggingColumnId, column.id); setDraggingColumnId(null); setDragOverColumnId(null); }}
                    onDragEnd={() => { setDraggingColumnId(null); setDragOverColumnId(null); }}
                    onClick={toggleSorting}>
                    <span className="data-table__label">{flexRender(column.columnDef.header, header.getContext())}</span>
                    {canSort && <SortIcon direction={sorted || null}/>}
                    {!isFixed && <GripIcon/>}
                    {column.getCanResize() && (
                      <span className={`data-table__resizer ${column.getIsResizing() ? 'is-resizing' : ''}`}
                        onMouseDown={header.getResizeHandler()} onTouchStart={header.getResizeHandler()} onClick={(event) => event.stopPropagation()}/>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          </div>

          {/* Per-column filter row */}
          {showFilters && table.getHeaderGroups().map((headerGroup) => (
            <div className="data-table__filter-row" role="row" key={`f-${headerGroup.id}`}>
              {headerGroup.headers.map((header) => {
                const column = header.column;
                const meta = column.columnDef.meta || {};
                return (
                  <div key={header.id}
                    className={`data-table__cell data-table__cell--filter ${pinClass(column)}`}
                    style={{ width: header.getSize(), flex: meta.grow ? '1 1 auto' : '0 0 auto', ...pinStyle(column) }}>
                    {column.id !== 'select' ? <ColumnFilter column={column}/> : <div className="data-table-filter-cell"/>}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Pinned rows — sticky below the header (and the filter row when shown) */}
          {topRows.length > 0 && (
            <div className="data-table__body data-table__body--pinned" role="rowgroup" style={{ top: showFilters ? 90 : 40 }}>
              {topRows.map((row) => renderRow(row, true))}
            </div>
          )}

          {/* Center rows */}
          <div className="data-table__body" role="rowgroup">
            {centerRows.length === 0 && <div className="data-table__empty">No projects match your filters.</div>}
            {centerRows.map((row) => renderRow(row, false))}
          </div>
        </div>
      </div>

      {/* Footer / pagination */}
      <div className="data-table-footer">
        <span className="data-table-footer__message">
          {active
            ? <>Row open: <code>{active}</code> · {ROWS.find((row) => row.id === active)?.project}</>
            : <>Pin rows &amp; columns · drag headers to reorder · drag edges to resize · search, filter &amp; sort run through TanStack</>}
        </span>
        <div className="data-table-pager">
          {/*
            ROW HEIGHT / PAGE SIZE — IMPORTANT:
            Always ASK THE USER how many rows they want to see at once, then size the
            scroll viewport (`--dt-max-h` in datatable.css) to that count
            (≈ 40px header + ~50px filter row + rows × 56px). The body scrolls past the
            cap, so growing the page size NEVER makes the card height jump. The options
            below and the default page size should be set from the user's answer.
          */}
          <div className="data-table-pager__size">
            <span>Rows</span>
            <div className="data-table-select data-table-select--small">
              <select value={pagination.pageSize} onChange={(event) => table.setPageSize(Number(event.target.value))}>
                {[5, 7, 12, 20].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
              <ChevronIcon/>
            </div>
          </div>
          <span className="data-table-pager__range">{pageStart}–{pageEnd} of {filteredCount}</span>
          <div className="data-table-pager__navigation">
            <button className="data-table-pager__button" disabled={!table.getCanPreviousPage()} onClick={() => table.previousPage()}><PageIcon direction="prev"/></button>
            <span className="data-table-pager__page">{pagination.pageIndex + 1} / {table.getPageCount() || 1}</span>
            <button className="data-table-pager__button" disabled={!table.getCanNextPage()} onClick={() => table.nextPage()}><PageIcon direction="next"/></button>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DataTable });
