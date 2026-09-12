/* global React */

/* ============ EmptyState ============
   Props:
     - icon:       ReactNode — defaults to a generic glyph
     - artVariant: 'paper' (default) | 'ink' | 'blue' | 'success' | 'warning' | 'square'
     - eyebrow:    string
     - title:      string | ReactNode
     - message:    string | ReactNode
     - actions:    ReactNode  (buttons)
     - tone:       'plain' (default) | 'card'
     - inline:     boolean — horizontal compact layout
============================================ */
function EmptyState({
  icon, artVariant = 'paper',
  eyebrow, title, message, actions,
  tone = 'plain', inline,
  className = '',
}) {
  const classNames = ['empty', tone === 'card' && 'empty--card', inline && 'empty--inline', className].filter(Boolean).join(' ');
  const artClassNames = ['empty__art', artVariant && artVariant !== 'paper' && `empty__art--${artVariant}`].filter(Boolean).join(' ');
  const Body = inline ? 'div' : React.Fragment;
  const bodyProps = inline ? { className: 'empty__body' } : {};
  return (
    <div className={classNames}>
      {icon && <span className={artClassNames} aria-hidden="true">{icon}</span>}
      <Body {...bodyProps}>
        {eyebrow && <span className="empty__eyebrow">{eyebrow}</span>}
        {title && <h3 className="empty__title">{title}</h3>}
        {message && <p className="empty__message">{message}</p>}
      </Body>
      {actions && <div className="empty__actions">{actions}</div>}
    </div>
  );
}

Object.assign(window, { EmptyState });
