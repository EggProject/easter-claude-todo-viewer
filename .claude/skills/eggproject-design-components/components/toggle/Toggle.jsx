/* global React */
(function () {
'use strict';
const { useState } = React;

function Toggle({ children, defaultPressed = false, pressed: controlledPressed, onPressedChange, disabled, size, variant, className = '' }) {
  const [internalPressed, setInternalPressed] = useState(defaultPressed);
  const isControlled = controlledPressed !== undefined;
  const pressed = isControlled ? controlledPressed : internalPressed;

  const handleClick = () => {
    if (disabled) return;
    const nextPressed = !pressed;
    if (!isControlled) setInternalPressed(nextPressed);
    onPressedChange?.(nextPressed);
  };

  const toggleClassName = [
    'toggle',
    size ? `toggle--${size}` : '',
    variant ? `toggle--${variant}` : '',
    pressed ? 'is-on' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      type="button"
      className={toggleClassName}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}

/* Toggle Group: only one pressed at a time */
function ToggleGroup({ children, defaultValue, onValueChange, className = '' }) {
  const [value, setValue] = useState(defaultValue ?? null);

  const handleChange = (selectedValue) => {
    const nextValue = value === selectedValue ? null : selectedValue;
    setValue(nextValue);
    onValueChange?.(nextValue);
  };

  return (
    <div className={`button-group ${className}`} role="group">
      {React.Children.map(children, child =>
        React.cloneElement(child, {
          pressed: child.props.value === value,
          onPressedChange: () => handleChange(child.props.value),
        })
      )}
    </div>
  );
}

Toggle.Group = ToggleGroup;
Object.assign(window, { Toggle });
})();
