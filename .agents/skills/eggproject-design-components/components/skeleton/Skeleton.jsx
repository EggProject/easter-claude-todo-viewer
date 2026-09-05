/* global React */

/* ============ Skeleton ============
   Props:
     - shape:  'block' (default) | 'text' | 'title' | 'circle' | 'btn' | 'card' | 'avatar' | 'avatar-lg'
     - w, h:   override width/height (string or number → px)
     - ink:    boolean — use on dark surfaces
     - lines:  for shape='text', render N lines (last line is shorter)
     - ariaHidden: decorative by default (true → aria-hidden="true"). Set false
                   only to expose the placeholder to assistive tech (rare).
============================================ */
function Skeleton({ shape = 'block', w, h, ink, lines, ariaHidden = true, className = '', style = {} }) {
  if (lines && shape === 'text') {
    return (
      <div className="skel-stack">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            shape="text"
            ink={ink}
            ariaHidden={ariaHidden}
            w={i === lines - 1 ? '60%' : '100%'}
          />
        ))}
      </div>
    );
  }
  const classNames = ['skel', shape !== 'block' && `skel--${shape}`, ink && 'skel--ink', className].filter(Boolean).join(' ');
  const styleObject = { ...style };
  if (w != null) styleObject.width = typeof w === 'number' ? `${w}px` : w;
  if (h != null) styleObject.height = typeof h === 'number' ? `${h}px` : h;
  return <span className={classNames} style={styleObject} aria-hidden={ariaHidden ? 'true' : undefined}/>;
}

/* ============ SkeletonList — preset row pattern ============ */
function SkeletonList({ rows = 4, withAvatar = true, ink }) {
  return (
    <div className="skel-list">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skel-list__row">
          {withAvatar && <Skeleton shape="avatar" ink={ink}/>}
          <div className="skel-list__main">
            <Skeleton shape="title" ink={ink} w="50%"/>
            <Skeleton shape="text" ink={ink} w="80%"/>
          </div>
          <Skeleton shape="text" ink={ink} w={60}/>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { Skeleton, SkeletonList });
