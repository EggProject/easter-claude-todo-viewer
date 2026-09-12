/* global React */
(function () {
'use strict';
const { useState, useRef, useEffect, useId } = React;

function InputOTP({ length = 6, separator = false, separatorAt = 3, onComplete, status }) {
  const [values, setValues] = useState(Array(length).fill(''));
  const [focused, setFocused] = useState(null);
  const inputsRef = useRef([]);
  const hasError = status === 'error';
  const errorId = `${useId()}-otp-error`;

  const focusSlot = (i) => {
    if (inputsRef.current[i]) inputsRef.current[i].focus();
  };

  const commit = (nextValues, nextFocusIndex) => {
    setValues(nextValues);
    focusSlot(nextFocusIndex);
    if (nextValues.every(value => value !== '')) onComplete?.(nextValues.join(''));
  };

  // Bulk fill — paste and OS one-time-code autofill. Always starts at slot 0 and
  // starts from a blank array, so a short code can never leave stale digits
  // behind in the trailing slots and report a false-complete value.
  const applyBulk = (digits) => {
    const characters = digits.split('').slice(0, length);
    const nextValues = Array(length).fill('');
    characters.forEach((character, index) => { nextValues[index] = character; });
    const firstEmpty = nextValues.indexOf('');
    commit(nextValues, firstEmpty === -1 ? length - 1 : firstEmpty);
  };

  const handleKeyDown = (event, i) => {
    const key = event.key;
    if (key === 'Backspace') {
      event.preventDefault();
      if (values[i]) {
        const nextValues = [...values];
        nextValues[i] = '';
        setValues(nextValues);
      } else if (i > 0) {
        const nextValues = [...values];
        nextValues[i - 1] = '';
        setValues(nextValues);
        focusSlot(i - 1);
      }
    } else if (key === 'ArrowLeft' && i > 0) {
      event.preventDefault(); focusSlot(i - 1);
    } else if (key === 'ArrowRight' && i < length - 1) {
      event.preventDefault(); focusSlot(i + 1);
    }
  };

  const handleInput = (event, i) => {
    const digitsOnly = event.target.value.replace(/\D/g, '');
    if (!digitsOnly) return;
    // A multi-digit value in a maxLength=1 slot only comes from autofill — treat
    // it as a whole code (aligned to slot 0) instead of writing it offset from i.
    if (digitsOnly.length > 1) { applyBulk(digitsOnly); return; }
    const nextValues = [...values];
    nextValues[i] = digitsOnly;
    commit(nextValues, Math.min(i + 1, length - 1));
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    applyBulk(pasted);
  };

  const statusClass = status === 'error' ? 'is-error' : status === 'success' ? 'is-success' : '';

  return (
    <div className={`input-otp ${statusClass}`} role="group" aria-label="One-time password input">
      {Array.from({ length }).map((_, i) => (
        <React.Fragment key={i}>
          {separator && i === separatorAt && <span className="input-otp__separator" aria-hidden="true" />}
          <div
            className={`input-otp__slot ${focused === i ? 'is-focused' : ''} ${focused === i && !values[i] ? 'is-caret' : ''} ${values[i] ? 'is-filled' : ''}`}
            onClick={() => focusSlot(i)}
          >
            <input
              ref={element => inputsRef.current[i] = element}
              className="input-otp__input"
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={values[i]}
              onChange={event => handleInput(event, i)}
              onKeyDown={event => handleKeyDown(event, i)}
              onPaste={handlePaste}
              onFocus={() => setFocused(i)}
              onBlur={() => setFocused(null)}
              aria-label={`Digit ${i + 1}`}
              aria-invalid={hasError ? 'true' : undefined}
              aria-describedby={hasError ? errorId : undefined}
            />
            <span aria-hidden="true">{values[i]}</span>
          </div>
        </React.Fragment>
      ))}
      {hasError && (
        <span className="input-otp__sr-only" id={errorId}>The verification code is invalid.</span>
      )}
    </div>
  );
}

Object.assign(window, { InputOTP });
})();
