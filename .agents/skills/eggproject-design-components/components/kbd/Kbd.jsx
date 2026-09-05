/* global React */

/* ============ Kbd ============
   <Kbd>⌘</Kbd>
   <Kbd combo separator="+">⌘</Kbd><Kbd>⇧</Kbd><Kbd>K</Kbd>

   Or pass an array as `keys` for a one-shot combo:
   <KbdCombo keys={['⌘', '⇧', 'K']} />

   Props:
     - size:  'sm' | 'md' (default) | 'lg'
     - ink:   boolean (dark surfaces)
============================================ */
function Kbd({ size = 'md', ink, children, className = '', ...rest }) {
  const classNames = ['kbd', size !== 'md' && `kbd--${size}`, ink && 'kbd--ink', className].filter(Boolean).join(' ');
  return <kbd className={classNames} {...rest}>{children}</kbd>;
}

function KbdCombo({ keys = [], separator = '', size, ink, className = '' }) {
  return (
    <span className={`kbd-combo ${className}`}>
      {keys.map((k, i) => (
        <React.Fragment key={i}>
          {i > 0 && separator && <span className="kbd-combo__sep">{separator}</span>}
          <Kbd size={size} ink={ink}>{k}</Kbd>
        </React.Fragment>
      ))}
    </span>
  );
}

Object.assign(window, { Kbd, KbdCombo });
