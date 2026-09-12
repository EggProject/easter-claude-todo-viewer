/* global React */
(function () {
'use strict';
const { useRef, useEffect } = React;

// Per-instance id seed. Lives in the IIFE so it never touches window and
// stays unique across every mounted Slider (useId is avoided — not
// guaranteed on this vendored React build).
let sliderSeq = 0;

/* ============ Slider ============
   Single-thumb range input. The fill color tracks the value via a
   CSS custom property `--val` on the <input>.

   Accessibility: the native input[type=range] carries the slider role,
   keyboard model and value semantics. The `label` prop is bound to the
   input programmatically via aria-labelledby (falling back to a safe
   aria-label). A consumer-supplied aria-label / aria-labelledby /
   aria-valuetext / id (via ...rest) always wins.

   Props:
     - label:    string      — visible label, also the accessible name
     - value:    number
     - min, max, step
     - format:   (value) => string  — for the right-side readout + aria-valuetext
     - ticks:    string[]       — optional tick labels under track
     - onChange: (n) => void
     - dark:     boolean — render for dark surfaces
============================================ */
function Slider({
  label, value = 0,
  min = 0, max = 100, step = 1,
  format = (value) => value,
  ticks,
  onChange,
  dark, disabled,
  className = '', ...rest
}) {
  const inputRef = useRef(null);
  // stable, unique per-instance seed for id wiring
  const seedRef = useRef(null);
  if (seedRef.current === null) seedRef.current = ++sliderSeq;
  const uid = seedRef.current;

  // keep --val in sync (percent 0..100)
  useEffect(() => {
    if (!inputRef.current) return;
    const percent = ((value - min) / (max - min)) * 100;
    inputRef.current.style.setProperty('--val', percent);
  }, [value, min, max]);

  const showLabel = label != null && label !== '';
  const labelId = `slider-label-${uid}`;
  const inputId = rest.id != null ? rest.id : `slider-${uid}`;

  // Accessible name: respect a consumer-supplied aria-* name; otherwise bind
  // the visible label; otherwise fall back to a safe generic name.
  const hasConsumerName = rest['aria-label'] != null || rest['aria-labelledby'] != null;
  const autoLabelledBy = !hasConsumerName && showLabel ? labelId : undefined;
  const autoAriaLabel = !hasConsumerName && !showLabel ? 'Slider' : undefined;

  // Mirror the formatted readout to assistive tech, but only when it differs
  // from the raw value (native aria-valuenow already conveys the number) and
  // the consumer did not set an explicit aria-valuetext.
  const readout = value != null ? String(format(value)) : undefined;
  const autoValueText = rest['aria-valuetext'] != null ? undefined
    : (readout != null && readout !== String(value) ? readout : undefined);

  return (
    <div className={`slider ${dark ? 'slider--dark' : ''} ${className}`}>
      {(showLabel || value != null) && (
        <div className="slider__header">
          {showLabel && <span className="slider__label" id={labelId}>{label}</span>}
          {value != null && <span className="slider__value">{readout}</span>}
        </div>
      )}
      <input
        ref={inputRef}
        type="range"
        className="slider__track"
        id={inputId}
        min={min} max={max} step={step}
        value={value}
        disabled={disabled}
        aria-labelledby={autoLabelledBy}
        aria-label={autoAriaLabel}
        aria-valuetext={autoValueText}
        onChange={(event) => onChange?.(Number(event.target.value))}
        {...rest}
      />
      {ticks && (
        <div className="slider__ticks">
          {ticks.map((tick, index) => <span key={index} className="slider__tick">{tick}</span>)}
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Slider });
})();
