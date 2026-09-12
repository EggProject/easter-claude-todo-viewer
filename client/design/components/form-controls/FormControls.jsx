/* global React */
const { useRef, useEffect } = React;

/* ============ Form controls — Checkbox · Radio · Switch ============
   Each renders a <label> wrapping a hidden <input> + styled visual.
   Forward arbitrary input props via ...rest.
============================================ */

/* Accessible name/description wiring shared by Checkbox · Radio · Switch.
   The hint lives inside the wrapping <label>, so on its own it would be concatenated into the
   implicit accessible name. Pointing the input's aria-labelledby at the main label span makes the
   name come ONLY from that span (aria-labelledby is the highest-priority name source), so the hint
   is excluded from the name and instead exposed as the description via aria-describedby.
   useId() runs unconditionally at top level — never gated, so the Hook order stays stable. */
function useControlAria({ label, hint, ariaLabelledBy, ariaDescribedBy }) {
  const autoId = React.useId();
  const labelId = `${autoId}-label`;
  const hintId = `${autoId}-hint`;
  // Consumer aria-labelledby wins; else the generated label id when the component renders a label.
  const labelledBy = ariaLabelledBy || (label ? labelId : undefined);
  // Append the hint id to any consumer aria-describedby; dedupe, no stray whitespace, undefined when empty.
  const describedByTokens = `${ariaDescribedBy ?? ''} ${hint ? hintId : ''}`.trim().split(/\s+/).filter(Boolean);
  const describedBy = describedByTokens.length ? [...new Set(describedByTokens)].join(' ') : undefined;
  return { labelId, hintId, labelledBy, describedBy };
}

function Checkbox({ label, hint, checked, indeterminate, disabled, onChange, className = '',
  'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, 'aria-describedby': ariaDescribedBy, ...rest }) {
  const inputRef = useRef(null);
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = !!indeterminate;
  }, [indeterminate]);
  const { labelId, hintId, labelledBy, describedBy } = useControlAria({ label, hint, ariaLabelledBy, ariaDescribedBy });
  const classNames = ['ctrl', disabled && 'is-disabled', className].filter(Boolean).join(' ');
  return (
    <label className={classNames}>
      <input ref={inputRef} {...rest} type="checkbox" className="ctrl__input" checked={!!checked} disabled={disabled} onChange={onChange}
        aria-label={ariaLabel} aria-labelledby={labelledBy} aria-describedby={describedBy}/>
      <span className="ctrl__box">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m3.5 8 3 3 6-6.5"/></svg>
      </span>
      {(label || hint) && (
        <span className="ctrl__text">
          {label && <span className="ctrl__label" id={labelId}>{label}</span>}
          {hint && <span className="ctrl__hint" id={hintId}>{hint}</span>}
        </span>
      )}
    </label>
  );
}

function Radio({ label, hint, name, value, checked, disabled, onChange, className = '',
  'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, 'aria-describedby': ariaDescribedBy, ...rest }) {
  const { labelId, hintId, labelledBy, describedBy } = useControlAria({ label, hint, ariaLabelledBy, ariaDescribedBy });
  const classNames = ['ctrl', disabled && 'is-disabled', className].filter(Boolean).join(' ');
  return (
    <label className={classNames}>
      <input {...rest} type="radio" className="ctrl__input" name={name} value={value} checked={checked} disabled={disabled} onChange={onChange}
        aria-label={ariaLabel} aria-labelledby={labelledBy} aria-describedby={describedBy}/>
      <span className="ctrl__radio"/>
      {(label || hint) && (
        <span className="ctrl__text">
          {label && <span className="ctrl__label" id={labelId}>{label}</span>}
          {hint && <span className="ctrl__hint" id={hintId}>{hint}</span>}
        </span>
      )}
    </label>
  );
}

function RadioGroup({ name, value, onChange, options = [], row, className = '',
  'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy }) {
  const classNames = ['radio-group', row && 'radio-group--row', className].filter(Boolean).join(' ');
  return (
    <div className={classNames} role="radiogroup" aria-label={ariaLabel} aria-labelledby={ariaLabelledBy}>
      {options.map((option) => (
        <Radio key={option.value} name={name} value={option.value} label={option.label} hint={option.hint}
          disabled={option.disabled}
          checked={value === option.value}
          onChange={() => onChange?.(option.value)}/>
      ))}
    </div>
  );
}

function Switch({ label, hint, checked, disabled, onChange, size = 'md', className = '',
  'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, 'aria-describedby': ariaDescribedBy, ...rest }) {
  const { labelId, hintId, labelledBy, describedBy } = useControlAria({ label, hint, ariaLabelledBy, ariaDescribedBy });
  const classNames = ['ctrl', disabled && 'is-disabled', className].filter(Boolean).join(' ');
  return (
    <label className={classNames}>
      <input {...rest} type="checkbox" role="switch" className="ctrl__input" checked={!!checked} disabled={disabled} onChange={onChange}
        aria-label={ariaLabel} aria-labelledby={labelledBy} aria-describedby={describedBy}/>
      <span className={`ctrl__switch ${size === 'sm' ? 'ctrl__switch--sm' : ''}`}/>
      {(label || hint) && (
        <span className="ctrl__text">
          {label && <span className="ctrl__label" id={labelId}>{label}</span>}
          {hint && <span className="ctrl__hint" id={hintId}>{hint}</span>}
        </span>
      )}
    </label>
  );
}

Object.assign(window, { Checkbox, Radio, RadioGroup, Switch });
