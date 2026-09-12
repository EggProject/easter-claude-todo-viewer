/* global React */
/* ============ Dot — standalone status atom ============
   Props:
     - tone:     'neutral' | 'info' | 'success' | 'warning' | 'danger' | 'yolk' | 'ink' | 'muted'
     - size:     'xs' | 'sm' | 'md' | 'lg' | 'xl'   (default 'md' = 8px)
     - halo:     boolean — soft same-color ring
     - ring:     boolean — hard ring outline (good on dense bg)
     - pulse:    boolean — animated ripple (use for "live"/"connecting")
     - blink:    boolean — slow opacity blink (use for "stale")
     - hollow:   boolean — outline only (use for "off"/"disconnected")
     - title:    string — accessible label (renders <span role="img" aria-label>)
============================================ */
function Dot({
  tone = 'info',
  size = 'md',
  halo = false,
  ring = false,
  pulse = false,
  blink = false,
  hollow = false,
  title,
  className = '',
  ...rest
}) {
  const classNames = [
    'ep-dot',
    `ep-dot--${tone}`,
    `ep-dot--${size}`,
    halo   && 'ep-dot--halo',
    ring   && 'ep-dot--ring',
    pulse  && 'ep-dot--pulse',
    blink  && 'ep-dot--blink',
    hollow && 'ep-dot--hollow',
    className,
  ].filter(Boolean).join(' ');
  const a11y = title ? { role: 'img', 'aria-label': title } : { 'aria-hidden': true };
  return <span className={classNames} {...a11y} {...rest} />;
}

Object.assign(window, { Dot });
