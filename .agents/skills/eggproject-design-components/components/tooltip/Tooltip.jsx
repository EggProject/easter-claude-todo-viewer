/* global React */
const { useState, useRef, useEffect } = React;

/* ============ Tooltip primitive ============
   Pure CSS positioning + arrow. Hover or keyboard-focus the target to show.
   Props:
     - content: string | ReactNode
     - placement: 'top' | 'bottom' | 'left' | 'right'
     - variant:   'dark' (default) | 'light' | 'rich'
     - shortcut:  optional ⌘K-style hint shown on the right
     - delay:     ms before showing on hover (default 200; focus shows immediately)

   A11y contract: the tooltip is a short, non-interactive description — not a popover or
   dialog. It links the focusable child to the panel via aria-describedby while open,
   leaves the accessibility tree entirely when closed (hidden), opens on pointer hover and
   on keyboard focus, and dismisses on Escape without moving focus. Keyboard/SR reach
   requires a natively focusable child (button, link, input…); making a non-focusable child
   focusable stays the consumer's responsibility. No focus trap, no DOM focus into the tip.
============================================= */
function Tooltip({ children, content, placement = 'top', variant = 'dark', shortcut, delay = 200 }) {
  // Hover and focus are tracked independently so neither closes the tip while the other holds it
  // open (leave keeps it open if still focused; blur keeps it open if still hovered).
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const openTimerRef = useRef(null);

  // One top-level, unconditional id per instance → stable, collision-free, SSR/hydration-safe.
  const tooltipId = `${React.useId()}-tooltip`;
  const hasContent = content != null && content !== '';
  const open = (hovered || focused) && hasContent;

  const cancelHoverOpen = () => clearTimeout(openTimerRef.current);

  // Pointer hover opens after `delay`; leaving cancels a pending open and clears the hover state.
  const handleMouseEnter = () => {
    cancelHoverOpen();
    openTimerRef.current = setTimeout(() => setHovered(true), delay);
  };
  const handleMouseLeave = () => { cancelHoverOpen(); setHovered(false); };
  // Keyboard/programmatic focus opens immediately — a focus user must not out-run the description.
  const handleFocus = () => { cancelHoverOpen(); setFocused(true); };
  const handleBlur = () => { cancelHoverOpen(); setFocused(false); };
  // Escape dismisses the open tip and leaves focus on the trigger; consumed (stopPropagation) so it
  // doesn't also close a surrounding overlay. Re-opening needs a fresh hover/focus (APG behaviour).
  // Lives on the wrapper, which catches the bubbled keydown from the focused child — no global listener.
  const handleKeyDown = (event) => {
    if (event.key === 'Escape' && open) {
      cancelHoverOpen();
      setHovered(false);
      setFocused(false);
      event.stopPropagation();
    }
  };

  // Clear any pending hover-open timer on unmount (and between Strict Mode effect runs) so the
  // timer callback never runs after unmount. The timer is per-instance (ref), never module-global.
  useEffect(() => () => clearTimeout(openTimerRef.current), []);

  // Describe the actual focusable child — not the non-focusable positioning wrapper. Compose with any
  // consumer aria-describedby, de-duplicate, add the tip's id only while open, and remove only that id
  // on close so the consumer's original description survives. Non-element children render untouched.
  let trigger = children;
  if (React.isValidElement(children)) {
    const existing = children.props['aria-describedby'];
    const ids = new Set((existing ? String(existing).split(/\s+/) : []).filter(Boolean));
    if (open) ids.add(tooltipId);
    trigger = React.cloneElement(children, {
      'aria-describedby': ids.size ? Array.from(ids).join(' ') : undefined,
    });
  }

  return (
    <span
      className="tooltip-anchor"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      {trigger}
      {hasContent && (
        <span
          id={tooltipId}
          role="tooltip"
          hidden={!open}
          className={`tooltip tooltip--${placement} tooltip--${variant} ${open ? 'is-open' : ''}`}
        >
          <span className="tooltip__body">
            {variant === 'rich' ? content : <span className="tooltip__text">{content}</span>}
            {shortcut && <kbd className="tooltip__shortcut">{shortcut}</kbd>}
          </span>
          <span className="tooltip__arrow" aria-hidden="true"/>
        </span>
      )}
    </span>
  );
}

/* ============ Demo page ============ */
function Demo() {
  return (
    <div className="demo">
      <header className="demo__header">
        <span className="demo__eyebrow">Components · Tooltip</span>
        <h1>Tooltip</h1>
        <p>Hover or keyboard-focus any trigger to reveal its tooltip, then press Escape to dismiss it. Four placements, three variants, an optional keyboard hint.</p>
      </header>

      {/* Keyboard & pointer usage */}
      <section className="demo__section">
        <h2>Keyboard & pointer</h2>
        <p className="demo__lead">Every trigger on this page works with both pointer and keyboard. The component owns hover, focus and Escape — this page only supplies the triggers and their content.</p>
        <ul className="demo__keys">
          <li><kbd>Hover</kbd> a trigger and the tooltip appears after its <code>delay</code> (default 200 ms).</li>
          <li><kbd>Tab</kbd> / <kbd>Shift</kbd> + <kbd>Tab</kbd> onto a trigger and focus shows the tooltip immediately.</li>
          <li><kbd>Esc</kbd> dismisses an open tooltip and leaves focus on the trigger.</li>
          <li>Moving the pointer away or blurring closes it — unless the other of focus / hover still holds it open.</li>
        </ul>
        <p className="demo__note">Native <code>&lt;button&gt;</code> and <code>&lt;a&gt;</code> triggers are keyboard-reachable on their own. For a static inline child the consumer makes the trigger focusable with <code>{'tabIndex={0}'}</code>; the Tooltip never adds <code>tabIndex</code> to an arbitrary child.</p>
        <div className="demo__delay">
          <Tooltip content="Opens after a longer 600 ms hover; keyboard focus still shows it at once" delay={600}>
            <button type="button" className="btn btn--secondary" aria-describedby="tt-delay-note">Slow hover (600 ms)</button>
          </Tooltip>
          <span id="tt-delay-note" className="demo__hint">This button already has a description; the tooltip id is appended only while it is open.</span>
        </div>
      </section>

      {/* Placements */}
      <section className="demo__section">
        <h2>Placements</h2>
        <p className="demo__lead">Default placement is <code>top</code>. The arrow follows automatically.</p>
        <div className="demo__grid demo__grid--placements">
          <Tooltip content="Pinned to the top of the anchor" placement="top">
            <button type="button" className="btn btn--ghost">Top ↑</button>
          </Tooltip>
          <Tooltip content="Appears below the anchor" placement="bottom">
            <button type="button" className="btn btn--ghost">Bottom ↓</button>
          </Tooltip>
          <Tooltip content="Slides in from the left" placement="left">
            <button type="button" className="btn btn--ghost">Left ←</button>
          </Tooltip>
          <Tooltip content="Slides in from the right" placement="right">
            <button type="button" className="btn btn--ghost">Right →</button>
          </Tooltip>
        </div>
      </section>

      {/* Variants */}
      <section className="demo__section">
        <h2>Variants</h2>
        <p className="demo__lead">Dark for UI chrome, light for content overlays, rich for explanations with structure.</p>
        <div className="demo__row">
          <Tooltip content="Default — sits on ink-900" variant="dark">
            <button type="button" className="btn btn--primary">Dark</button>
          </Tooltip>
          <Tooltip content="Subtle, on a paper card" variant="light">
            <button type="button" className="btn btn--secondary">Light</button>
          </Tooltip>
          <Tooltip
            variant="rich"
            content={
              <div className="rich">
                <strong className="rich__title">Sapphire 600</strong>
                <span className="rich__meta">#2E5BE0 · var(--ep-blue-600)</span>
                <p className="rich__body">Primary brand color. Use for primary actions, accents and the brand flourish.</p>
                <div className="rich__row">
                  <span className="rich__sw" style={{ background: '#2E5BE0' }}/>
                  <span>4.6 : 1 contrast on paper-50</span>
                </div>
              </div>
            }
          >
            <button type="button" className="btn btn--secondary">Rich content</button>
          </Tooltip>
        </div>
      </section>

      {/* With shortcut */}
      <section className="demo__section">
        <h2>With keyboard hint</h2>
        <p className="demo__lead">Pair a tooltip with a shortcut to teach affordances in toolbars.</p>
        <div className="toolbar">
          <Tooltip content="Search" shortcut="⌘ K">
            <button type="button" className="icon-btn" aria-label="Search">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><circle cx="9" cy="9" r="6"/><path d="m14 14 4 4"/></svg>
            </button>
          </Tooltip>
          <Tooltip content="New project" shortcut="⌘ N">
            <button type="button" className="icon-btn" aria-label="New project">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"><path d="M10 4v12M4 10h12"/></svg>
            </button>
          </Tooltip>
          <Tooltip content="Comment" shortcut="C">
            <button type="button" className="icon-btn" aria-label="Comment">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H8l-4 3z"/></svg>
            </button>
          </Tooltip>
          <Tooltip content="Share" shortcut="⌘ ⇧ S">
            <button type="button" className="icon-btn" aria-label="Share">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="10" r="2"/><circle cx="15" cy="5" r="2"/><circle cx="15" cy="15" r="2"/><path d="m8 9 5-3M8 11l5 3"/></svg>
            </button>
          </Tooltip>
          <div className="toolbar__divider"/>
          <Tooltip content="Settings" placement="bottom">
            <button type="button" className="icon-btn" aria-label="Settings"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="10" cy="10" r="2.5"/><path d="M16.5 12a1.4 1.4 0 0 0 .3 1.5l.05.05a1.7 1.7 0 1 1-2.4 2.4l-.05-.05a1.4 1.4 0 0 0-1.5-.3 1.4 1.4 0 0 0-.85 1.3V17a1.7 1.7 0 1 1-3.4 0v-.08a1.4 1.4 0 0 0-.9-1.27 1.4 1.4 0 0 0-1.5.3l-.05.05a1.7 1.7 0 1 1-2.4-2.4l.05-.05a1.4 1.4 0 0 0 .3-1.5 1.4 1.4 0 0 0-1.3-.85H3a1.7 1.7 0 1 1 0-3.4h.08a1.4 1.4 0 0 0 1.27-.9 1.4 1.4 0 0 0-.3-1.5l-.05-.05a1.7 1.7 0 1 1 2.4-2.4l.05.05a1.4 1.4 0 0 0 1.5.3 1.4 1.4 0 0 0 .85-1.3V3a1.7 1.7 0 1 1 3.4 0v.08a1.4 1.4 0 0 0 .9 1.27 1.4 1.4 0 0 0 1.5-.3l.05-.05a1.7 1.7 0 1 1 2.4 2.4l-.05.05a1.4 1.4 0 0 0-.3 1.5 1.4 1.4 0 0 0 1.3.85H17a1.7 1.7 0 1 1 0 3.4h-.08a1.4 1.4 0 0 0-1.27.9z"/></svg></button>
          </Tooltip>
        </div>
      </section>

      {/* Inline */}
      <section className="demo__section">
        <h2>Inline & on text</h2>
        <p className="demo__lead demo__lead--inline">
          The system is built around{' '}
          <Tooltip content="Sapphire 600 — the brand primary"><span className="inline-anchor" tabIndex={0}>a single brand color</span></Tooltip>
          {' '}and a{' '}
          <Tooltip content="Roboto · bold sapphire" placement="bottom"><span className="inline-anchor" tabIndex={0}>bold display flourish</span></Tooltip>
          . Hours billed last quarter:{' '}
          <Tooltip
            variant="rich"
            content={
              <div className="rich">
                <strong className="rich__title">2,062 hours · Q1 26</strong>
                <span className="rich__meta">+11.0% vs. prev. quarter</span>
                <div className="rich__row">
                  <span className="rich__sw" style={{ background: '#2E5BE0' }}/><span>Product engineering · 820 h</span>
                </div>
                <div className="rich__row">
                  <span className="rich__sw" style={{ background: '#D4AC5E' }}/><span>MVP sprints · 520 h</span>
                </div>
              </div>
            }
          >
            <span className="inline-anchor inline-anchor--metric" tabIndex={0}>2,062 h</span>
          </Tooltip>
          {' '}across all engagements.
        </p>
      </section>
    </div>
  );
}

Object.assign(window, { Tooltip, Demo });
