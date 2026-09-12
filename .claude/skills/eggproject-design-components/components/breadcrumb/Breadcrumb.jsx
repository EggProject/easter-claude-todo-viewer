/* global React */

/* ============ Breadcrumb ============
   Props:
     - items: Array<{label, href?, icon?, onClick?}>
     - separator: 'slash' (default) | 'chevron' | 'dot'
     - maxItems: collapse middle items past this count (default 6)
============================================ */
function Breadcrumb({ items = [], separator = 'slash', maxItems = 6, className = '' }) {
  let display = items;
  if (items.length > maxItems) {
    display = [items[0], { _ellipsis: true }, ...items.slice(items.length - (maxItems - 2))];
  }

  const renderSeparator = () => {
    if (separator === 'chevron') return (
      <span className="breadcrumb__separator breadcrumb__separator--chevron" aria-hidden="true">
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" focusable="false"><path d="m6 4 4 4-4 4"/></svg>
      </span>
    );
    if (separator === 'dot') return <span className="breadcrumb__separator breadcrumb__separator--dot" aria-hidden="true"/>;
    return <span className="breadcrumb__separator" aria-hidden="true">/</span>;
  };

  return (
    <nav className={`breadcrumb ${className}`} aria-label="Breadcrumb">
      {display.map((item, i) => {
        const last = i === display.length - 1;
        const separatorNode = i > 0 ? renderSeparator() : null;
        if (item._ellipsis) return <React.Fragment key={`e${i}`}>{separatorNode}<span className="breadcrumb__more" aria-hidden="true">…</span></React.Fragment>;
        const classNames = `breadcrumb__item ${last ? 'breadcrumb__item--current' : ''}`;
        const content = (
          <>
            {item.icon && <span className="breadcrumb__icon">{item.icon}</span>}
            {item.label}
          </>
        );
        return (
          <React.Fragment key={i}>
            {separatorNode}
            {last
              ? <span className={classNames} aria-current="page">{content}</span>
              : <a className={classNames} href={item.href || '#'} onClick={item.onClick}>{content}</a>
            }
          </React.Fragment>
        );
      })}
    </nav>
  );
}

Object.assign(window, { Breadcrumb });
