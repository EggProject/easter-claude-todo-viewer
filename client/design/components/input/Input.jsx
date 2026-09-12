/* global React */
/* ============ Input ============
   A labelled text input with optional leading icon and error state.

   Props:
     - label:  string — label above the input
     - error:  string — error message (also sets error styling)
     - icon:   ReactNode — SVG / element rendered as leading icon
     - inputClassName: extra class on the <input>
   All other props are forwarded to <input>.
============================================ */
function Input({ label, error, icon, inputClassName = '', className = '', id, 'aria-describedby': describedBy, 'aria-invalid': ariaInvalid, ...rest }) {
  const autoId = React.useId();
  const resolvedId = id || autoId;
  const hasError = Boolean(error);
  const errorId = `${resolvedId}-error`;
  // Active component error always wins; otherwise the consumer's own aria-invalid passes through.
  const ariaInvalidValue = hasError ? 'true' : ariaInvalid;
  // Append the error id to any consumer aria-describedby; dedupe, no stray whitespace, undefined when empty.
  const describedByTokens = `${describedBy ?? ''} ${hasError ? errorId : ''}`.trim().split(/\s+/).filter(Boolean);
  const describedByValue = describedByTokens.length ? [...new Set(describedByTokens)].join(' ') : undefined;

  const inputClassNames = ['input', error && 'input--error', inputClassName].filter(Boolean).join(' ');
  const fieldClassNames = ['field', className].filter(Boolean).join(' ');
  const inputEl = (
    <input
      className={inputClassNames}
      {...rest}
      id={resolvedId}
      aria-invalid={ariaInvalidValue}
      aria-describedby={describedByValue}
    />
  );
  const innerField = icon
    ? <span className="input-with-icon">{icon}{inputEl}</span>
    : inputEl;
  return (
    <label className={fieldClassNames}>
      {label && <span className="field__label">{label}</span>}
      {innerField}
      {error && <span className="field__error" id={errorId}>{error}</span>}
    </label>
  );
}

Object.assign(window, { Input });
