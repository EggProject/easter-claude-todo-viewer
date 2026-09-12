/* global React */

/* ============ Stepper ============
   Props:
     - steps:       Array<{ label, sub? }>
     - current:     index of current step (0-based). Earlier = complete, later = pending.
     - orientation: 'horizontal' (default) | 'vertical'
     - variant:     'numbered' (default) | 'dots'
============================================ */
function Stepper({ steps = [], current = 0, orientation = 'horizontal', variant = 'numbered', className = '' }) {
  const classNames = [
    'stepper',
    orientation === 'vertical' && 'stepper--vertical',
    variant === 'dots' && 'stepper--dots',
    className,
  ].filter(Boolean).join(' ');
  const stateOf = (i) => i < current ? 'complete' : i === current ? 'current' : 'pending';

  return (
    <ol className={classNames} aria-label="Progress">
      {steps.map((step, i) => {
        const state = stateOf(i);
        const isLast = i === steps.length - 1;
        return (
          <li key={i} className={`stepper__step stepper__step--${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <div className="stepper__header">
              <span className="stepper__node">
                {state === 'complete'
                  ? <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m3.5 8 3 3 6-6.5"/></svg>
                  : (variant === 'dots' ? null : (i + 1))}
              </span>
              <div className="stepper__text">
                <span className="stepper__label">{step.label}</span>
                {step.sub && <span className="stepper__subtitle">{step.sub}</span>}
              </div>
            </div>
            {!isLast && <span className="stepper__line"/>}
          </li>
        );
      })}
    </ol>
  );
}

Object.assign(window, { Stepper });
