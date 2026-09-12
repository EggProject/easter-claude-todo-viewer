/* global React */
/* ============ TopNav ============
   Marketing-style pill navigation with brand mark on the left, links in the middle,
   and CTA actions on the right. Collapses to a hamburger + dropdown sheet under
   720px (CSS-driven via the .is-open class on the root).

   Props:
     - brand:    { src, label } — logo and wordmark
     - links:    [{ id, label, href? }]
     - activeId: id of active link
     - onSelect: (id) => void
     - actions:  ReactNode — content for the right side (buttons etc.)
============================================ */
function TopNav({ brand, links = [], activeId, onSelect, actions }) {
  const [open, setOpen] = React.useState(false);
  const sheetId = React.useId();
  const toggleRef = React.useRef(null);

  const handleSelect = (id, hasHref, event) => {
    if (!hasHref) event.preventDefault();
    onSelect?.(id);
    setOpen(false);
  };

  // Disclosure nav (not an ARIA menu widget): Escape closes the open sheet and
  // returns focus to the toggle. Native Tab/Enter on the links is untouched.
  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      setOpen(false);
      toggleRef.current?.focus();
    }
  };

  return (
    <nav className={'topnav' + (open ? ' is-open' : '')} aria-label="Primary navigation" onKeyDown={handleKeyDown}>
      <div className="topnav__brand">
        {brand?.src && <img src={brand.src} alt=""/>}
        {brand?.label && <b>{brand.label}</b>}
      </div>

      <div className="topnav__links">
        {links.map(link => (
          <a key={link.id} href={link.href ?? '#'}
             className={link.id === activeId ? 'is-on' : ''}
             aria-current={link.id === activeId ? 'page' : undefined}
             onClick={(event) => handleSelect(link.id, !!link.href, event)}>
            {link.label}
          </a>
        ))}
      </div>

      <div className="topnav__actions">{actions}</div>

      <button
        ref={toggleRef}
        type="button"
        className="topnav__toggle"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls={sheetId}
        onClick={() => setOpen(previous => !previous)}
      >
        <svg className="icon-open"  width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <path d="M3 5h12M3 9h12M3 13h12"/>
        </svg>
        <svg className="icon-close" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
          <path d="M4 4l10 10M14 4L4 14"/>
        </svg>
      </button>

      <div className="topnav__sheet" id={sheetId}>
        {links.map(link => (
          <a key={link.id} href={link.href ?? '#'}
             className={link.id === activeId ? 'is-on' : ''}
             aria-current={link.id === activeId ? 'page' : undefined}
             onClick={(event) => handleSelect(link.id, !!link.href, event)}>
            {link.label}
          </a>
        ))}
        {actions && <hr />}
        {actions && <div className="topnav__sheet-actions">{actions}</div>}
      </div>
    </nav>
  );
}

Object.assign(window, { TopNav });
