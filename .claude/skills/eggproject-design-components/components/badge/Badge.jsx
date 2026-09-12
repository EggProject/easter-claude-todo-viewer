/* global React */
/* ============ Badge ============
   Props:
     - variant: 'info' | 'success' | 'warning' | 'danger' | 'yolk' | 'ink' | 'outline'
     - dot:     boolean — show a leading status dot (defaults true for first 4 variants)
============================================ */
function Badge({ variant = 'info', dot, children, className = '', ...rest }) {
  const classNames = ['badge', `badge--${variant}`, className].filter(Boolean).join(' ');
  const showDot = dot ?? ['info', 'success', 'warning', 'danger'].includes(variant);
  return (
    <span className={classNames} {...rest}>
      {showDot && <span className="badge__dot"/>}
      {children}
    </span>
  );
}

/* ============ Chip — identity tag with a swatch on the left ============ */
function Chip({ avatarStyle, children, className = '', ...rest }) {
  const classNames = ['chip', className].filter(Boolean).join(' ');
  return (
    <span className={classNames} {...rest}>
      <span className="chip__avatar" style={avatarStyle}/>
      {children}
    </span>
  );
}

Object.assign(window, { Badge, Chip });
