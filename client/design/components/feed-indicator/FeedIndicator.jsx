/* global React, Dot */
/* ============ FeedIndicator — live-feed connection state ============
   Canonical taxonomy for any WebSocket / SSE / polling source.

   Props:
     - state:    'connecting' | 'streaming' | 'stale' | 'disconnected' | 'idle'
                 Optionally accept upstream RunStatus / WsState — map there.
     - label:    string — overrides default label for the state
     - meta:     string — mono-set tail ("12ms", "42s ago", "v1.2.0")
     - variant:  'plain' | 'soft' | 'outline'  (default 'plain')
     - size:     'sm' | 'md' | 'lg'
     - surface:  'paper' | 'ink'   (default 'paper'; 'ink' for dark chrome)
     - compact:  boolean — dot only, label moves to title attr
     - stack:    boolean — vertical: dot row + label below
     - dotProps: any extra props for the inner <Dot>
============================================ */

const FEED_STATES = {
  connecting:   { tone: 'info',    pulse: true,  blink: false, hollow: false, halo: true,  label: 'Connecting' },
  streaming:    { tone: 'success', pulse: true,  blink: false, hollow: false, halo: true,  label: 'Live' },
  stale:        { tone: 'warning', pulse: false, blink: true,  hollow: false, halo: true,  label: 'Stale' },
  disconnected: { tone: 'danger',  pulse: false, blink: false, hollow: true,  halo: false, label: 'Offline' },
  idle:         { tone: 'muted',   pulse: false, blink: false, hollow: true,  halo: false, label: 'Idle' },
};

function FeedIndicator({
  state = 'idle',
  label,
  meta,
  variant = 'plain',
  size = 'md',
  surface = 'paper',
  compact = false,
  stack = false,
  dotProps = {},
  className = '',
  ...rest
}) {
  const spec = FEED_STATES[state] || FEED_STATES.idle;
  const shownLabel = label ?? spec.label;

  const classNames = [
    'ep-feed',
    `ep-feed--${state}`,
    `ep-feed--${size}`,
    variant !== 'plain' && `ep-feed--${variant}`,
    surface === 'ink' && 'ep-feed--ink',
    compact && 'ep-feed--compact',
    stack && 'ep-feed--stack',
    className,
  ].filter(Boolean).join(' ');

  // Compact renders dot-only, so the reliable accessible name lives on the inner
  // Dot (its `title` prop makes it role="img" + aria-label) — never on the
  // role-less root span alone, whose aria-label is unreliable on a generic
  // element. The root keeps only a plain hover title (with meta) for sighted
  // users. Non-compact stays a role="status" live region whose visible label
  // renders in the DOM, so its Dot may stay decorative (title-less → aria-hidden).
  const a11y = compact
    ? { title: shownLabel + (meta ? ` · ${meta}` : '') }
    : { 'aria-label': `${shownLabel} feed`, role: 'status' };

  return (
    <span className={classNames} {...a11y} {...rest}>
      <Dot
        tone={spec.tone}
        size={size === 'lg' ? 'lg' : 'md'}
        halo={spec.halo}
        pulse={spec.pulse}
        blink={spec.blink}
        hollow={spec.hollow}
        title={compact ? shownLabel : undefined}
        {...dotProps}
      />
      {!compact && <span className="ep-feed__label">{shownLabel}</span>}
      {!compact && meta && <span className="ep-feed__meta">{meta}</span>}
    </span>
  );
}

FeedIndicator.STATES = FEED_STATES;
Object.assign(window, { FeedIndicator });
