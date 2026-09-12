/* global React */

/* ============ Pagination ============
   Props:
     - page:        current page (1-indexed)
     - pageCount:   total pages
     - total, pageSize: optional — show "Showing X-Y of Z" meta
     - siblings:    pages on each side of current (default 1)
     - onChange:    (page) => void
     - variant:     'plain' (default) | 'outlined'
============================================ */
function range(start, end) {
  const result = []; for (let i = start; i <= end; i++) result.push(i); return result;
}
function buildPages(page, total, siblings = 1) {
  const totalNumbers = siblings * 2 + 5; // first, last, current, 2*siblings, 2 ellipses
  if (total <= totalNumbers) return range(1, total);

  const leftSibling = Math.max(page - siblings, 1);
  const rightSibling = Math.min(page + siblings, total);
  const showLeftEllipsis = leftSibling > 2;
  const showRightEllipsis = rightSibling < total - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    return [...range(1, 3 + siblings * 2), 'ellipsis', total];
  }
  if (showLeftEllipsis && !showRightEllipsis) {
    return [1, 'ellipsis', ...range(total - (2 + siblings * 2), total)];
  }
  return [1, 'ellipsis', ...range(leftSibling, rightSibling), 'ellipsis', total];
}

function Pagination({
  page = 1, pageCount, total, pageSize,
  siblings = 1, onChange,
  variant = 'plain', className = '',
}) {
  const resolvedPageCount = pageCount ?? (total && pageSize ? Math.max(1, Math.ceil(total / pageSize)) : 1);
  const pages = buildPages(page, resolvedPageCount, siblings);
  const go = (targetPage) => onChange?.(Math.max(1, Math.min(resolvedPageCount, targetPage)));

  const meta = total && pageSize
    ? <span className="pagination__meta"><strong>{(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}</strong> of {total}</span>
    : <span className="pagination__meta">Page <strong>{page}</strong> of {resolvedPageCount}</span>;

  return (
    <nav className={`pagination ${variant === 'outlined' ? 'pagination--outlined' : ''} ${className}`} aria-label="Pagination">
      {meta}
      <div className="pagination__pages">
        <button className="pagination__page" onClick={() => go(page - 1)} disabled={page <= 1} aria-label="Previous">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10 4 6 8l4 4"/></svg>
        </button>
        {pages.map((pageNumber, i) =>
          pageNumber === 'ellipsis'
            ? <span key={`e${i}`} className="pagination__ellipsis">…</span>
            : <button
                key={pageNumber}
                className={`pagination__page ${pageNumber === page ? 'pagination__page--active' : ''}`}
                onClick={() => go(pageNumber)}
                aria-current={pageNumber === page ? 'page' : undefined}
              >{pageNumber}</button>
        )}
        <button className="pagination__page" onClick={() => go(page + 1)} disabled={page >= resolvedPageCount} aria-label="Next">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m6 4 4 4-4 4"/></svg>
        </button>
      </div>
    </nav>
  );
}

Object.assign(window, { Pagination });
