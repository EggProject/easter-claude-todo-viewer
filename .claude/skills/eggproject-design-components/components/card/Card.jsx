/* global React */
/* ============ Card ============
   Props:
     - feature: boolean — dark/inverted variant
     - title:   string  — heading text (h3)
     - icon:    string | ReactNode — small mark in the header (single letter or SVG)
     - meta:    [left, right] tuple for the bottom meta row
     - children: body copy
============================================ */
function Card({ feature, title, icon, meta, children, className = '', ...rest }) {
  const classNames = ['card', feature && 'card--feature', className].filter(Boolean).join(' ');
  return (
    <div className={classNames} {...rest}>
      {(icon || title) && (
        <div className="card__header">
          {icon && <div className="card__icn" aria-hidden="true">{icon}</div>}
          {title && <h3>{title}</h3>}
        </div>
      )}
      {children && <p>{children}</p>}
      {meta && (
        <div className="card__meta">
          <span>{meta[0]}</span>
          <span>{meta[1]}</span>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Card });
