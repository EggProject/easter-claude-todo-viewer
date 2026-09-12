/* global React */

/* ============ Stat ============
   Props:
     - label:    string
     - value:    string | number | ReactNode (use <em> for italic emphasis)
     - unit:     string  (e.g. 'h', '%', 'EUR')
     - delta:    { value: string, direction: 'up'|'down'|'flat' }
     - sub:      string  — secondary line beneath
     - mono:     boolean — render sub in mono
     - variant:  'plain' (default) | 'card' | 'ink' | 'featured'
     - size:     'md' (default) | 'sm'
     - sparkPath: string — preformatted SVG path (M…L… or M…C…). Optional.
============================================ */
function Stat({
  label, value, unit, delta, sub, mono,
  variant = 'plain', size = 'md', sparkPath,
  className = '',
}) {
  const classNames = ['stat',
    variant !== 'plain' && `stat--${variant}`,
    size === 'sm' && 'stat--sm',
    className].filter(Boolean).join(' ');

  return (
    <div className={classNames}>
      {label && <span className="stat__label">{label}</span>}
      <div className="stat__value-row">
        <span className="stat__value">{value}</span>
        {unit && <span className="stat__unit">{unit}</span>}
        {delta && (
          <span className={`stat__delta stat__delta--${delta.direction}`}>
            {delta.direction === 'up' && <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8 6 3l4 5"/></svg>}
            {delta.direction === 'down' && <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 4 6 9l4-5"/></svg>}
            {delta.direction === 'flat' && <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 6h8"/></svg>}
            {delta.value}
          </span>
        )}
      </div>
      {sub && <span className={`stat__subtitle ${mono ? 'stat__subtitle--mono' : ''}`}>{sub}</span>}
      {sparkPath && (
        <svg className="stat__spark" viewBox="0 0 100 28" preserveAspectRatio="none">
          <path className="area" d={`${sparkPath} L 100 28 L 0 28 Z`}/>
          <path d={sparkPath}/>
        </svg>
      )}
    </div>
  );
}

Object.assign(window, { Stat });
