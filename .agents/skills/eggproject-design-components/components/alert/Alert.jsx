/* global React */

/* ============ Alert / Banner ============
   Inline persistent status block.
   Props:
     - variant:  'info' | 'success' | 'warning' | 'danger' | 'ink'
     - tone:     'soft' (default) | 'subtle'
     - banner:   boolean — full-width style (use at top of a page/section)
     - title:    string
     - icon:     ReactNode  (omit to use default per variant)
     - onClose:  () => void — adds dismiss button
     - actions:  ReactNode
============================================ */
const DEFAULT_ICONS = {
  info:    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><circle cx="10" cy="10" r="7"/><path d="M10 9v5M10 6.5v.01"/></svg>,
  success: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="10" r="7"/><path d="m7 10 2.2 2.2L13.5 8"/></svg>,
  warning: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10 3 2.5 16h15z"/><path d="M10 8v4M10 14.5v.01"/></svg>,
  danger:  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><circle cx="10" cy="10" r="7"/><path d="M7 7l6 6M13 7l-6 6"/></svg>,
  ink:     <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><circle cx="10" cy="10" r="7"/><path d="M10 9v5M10 6.5v.01"/></svg>,
};

function Alert({
  variant = 'info', tone = 'soft', banner,
  title, icon, onClose, actions,
  children,
  className = '',
}) {
  const classNames = [
    'alert',
    `alert--${variant}`,
    tone === 'subtle' && 'alert--subtle',
    banner && 'alert--banner',
    className,
  ].filter(Boolean).join(' ');

  const iconNode = icon === null ? null : <span className="alert__icon" aria-hidden="true">{icon ?? DEFAULT_ICONS[variant]}</span>;

  return (
    <div className={classNames} role={variant === 'danger' ? 'alert' : 'status'}>
      {iconNode}
      <div className="alert__body">
        {title && <span className="alert__title">{title}</span>}
        {children && <span className="alert__message">{children}</span>}
        {actions && <div className="alert__actions">{actions}</div>}
      </div>
      {onClose && (
        <button className="alert__close" onClick={onClose} aria-label="Dismiss">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
            <path d="M4 4l8 8M12 4l-8 8"/>
          </svg>
        </button>
      )}
    </div>
  );
}

Object.assign(window, { Alert });
