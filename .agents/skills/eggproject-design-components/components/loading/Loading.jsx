/* global React */
const { useState, useEffect, useRef, useId } = React;

/* ============================================================
   PROGRESS BAR — determinate (percent)
   ============================================================ */
function ProgressBar({ value = 0, size = 'md', showLabel = true, label, ariaLabel }) {
  // Clamp 0–100; non-finite (NaN/Infinity) normalises to a safe 0.
  const percent = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const text = label || 'Uploading';
  const labelId = useId();
  // role="progressbar" takes its name from the author, not from content. Point
  // aria-labelledby at the visible label when it renders (stays in sync, no
  // drift); fall back to aria-label when hidden. Explicit ariaLabel always wins.
  const nameProps = ariaLabel
    ? { 'aria-label': ariaLabel }
    : showLabel
      ? { 'aria-labelledby': labelId }
      : { 'aria-label': text };
  return (
    <div className={`progress-bar progress-bar--${size}`} role="progressbar" aria-valuenow={percent} aria-valuemin="0" aria-valuemax="100" {...nameProps}>
      {showLabel && (
        <div className="progress-bar__header">
          <span className="progress-bar__label" id={labelId}>{text}</span>
          <span className="progress-bar__value">{percent.toFixed(0)}%</span>
        </div>
      )}
      <div className="progress-bar__track">
        <div className="progress-bar__fill" style={{ width: `${percent}%` }}>
          <span className="progress-bar__shimmer"/>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   PROGRESS BAR — indeterminate (infinite)
   ============================================================ */
function ProgressIndeterminate({ size = 'md', label, ariaLabel }) {
  const labelId = useId();
  // Never nameless: label the visible copy when present, else a safe default.
  // No aria-valuenow — the state is genuinely indeterminate (aria-busy only).
  const nameProps = ariaLabel
    ? { 'aria-label': ariaLabel }
    : label
      ? { 'aria-labelledby': labelId }
      : { 'aria-label': 'Loading' };
  return (
    <div className={`progress-bar progress-bar--${size} progress-bar--indeterminate`} role="progressbar" aria-busy="true" {...nameProps}>
      {label && (
        <div className="progress-bar__header">
          <span className="progress-bar__label" id={labelId}>{label}</span>
          <span className="progress-bar__value progress-bar__value--dots">
            <span/><span/><span/>
          </span>
        </div>
      )}
      <div className="progress-bar__track">
        <div className="progress-bar__indeterminate"/>
      </div>
    </div>
  );
}

/* ============================================================
   LOGO SPINNER — uses the brand mark, animates rotation
   The mark = 9 nested squares + ghost layer + center glow.
   Sizes: sm (24) · md (48) · lg (96)
   ============================================================ */
function LogoSpinner({ size = 'md', label }) {
  const pixelSize = size === 'sm' ? 40 : size === 'lg' ? 132 : 68;
  return (
    <div className={`spin spin--${size}`}>
      <div className="spin__stage" style={{ width: pixelSize, height: pixelSize }}>
        <svg viewBox="-12 -12 88 88" fill="none" className="spin__svg" width={pixelSize} height={pixelSize}>
          <defs>
            <radialGradient id={`spin-core-${size}`} cx="0.5" cy="0.5" r="0.5">
              <stop offset="0"    stopColor="#FBF9F4" stopOpacity="1"/>
              <stop offset="0.45" stopColor="#D4AC5E" stopOpacity="0.75"/>
              <stop offset="1"    stopColor="#D4AC5E" stopOpacity="0"/>
            </radialGradient>
          </defs>

          {/* Chromatic ghost layer (yolk) — drifts */}
          <g className="spin__ghost" opacity="0.5">
            <g fill="none" stroke="#D4AC5E" strokeWidth="0.7" strokeLinejoin="round">
              <rect className="spin__r r0" x="4"  y="4"  width="56" height="56"/>
              <rect className="spin__r r2" x="9"  y="9"  width="46" height="46"/>
              <rect className="spin__r r4" x="14" y="14" width="36" height="36"/>
              <rect className="spin__r r6" x="19" y="19" width="26" height="26"/>
              <rect className="spin__r r8" x="24" y="24" width="16" height="16"/>
            </g>
          </g>

          {/* Main sapphire aperture — alternating CW/CCW */}
          <g fill="none" stroke="#2E5BE0" strokeLinejoin="round">
            <rect className="spin__r r0" x="4"    y="4"    width="56" height="56" strokeWidth="1"   opacity="0.30"/>
            <rect className="spin__r r1" x="6.5"  y="6.5"  width="51" height="51" strokeWidth="1.1" opacity="0.45"/>
            <rect className="spin__r r2" x="9"    y="9"    width="46" height="46" strokeWidth="1.2" opacity="0.60"/>
            <rect className="spin__r r3" x="11.5" y="11.5" width="41" height="41" strokeWidth="1.3" opacity="0.75"/>
            <rect className="spin__r r4" x="14"   y="14"   width="36" height="36" strokeWidth="1.4" opacity="0.90"/>
            <rect className="spin__r r5" x="16.5" y="16.5" width="31" height="31" strokeWidth="1.5"/>
            <rect className="spin__r r6" x="19"   y="19"   width="26" height="26" strokeWidth="1.5"/>
            <rect className="spin__r r7" x="21.5" y="21.5" width="21" height="21" strokeWidth="1.4"/>
            <rect className="spin__r r8" x="24"   y="24"   width="16" height="16" strokeWidth="1.3"/>
          </g>

          {/* Center glow + pin */}
          <circle className="spin__glow" cx="32" cy="32" r="7" fill={`url(#spin-core-${size})`}/>
          <circle className="spin__pin"  cx="32" cy="32" r="1.6" fill="#FBF9F4"/>
        </svg>
      </div>
      {label && <span className="spin__label">{label}</span>}
    </div>
  );
}

/* ============================================================
   DEMO PAGE
   ============================================================ */
function Demo() {
  /* Auto-incrementing progress for the demo */
  const [percent, setPercent] = useState(28);
  useEffect(() => {
    const intervalId = setInterval(() => {
      setPercent(previous => (previous >= 100 ? 0 : previous + 1));
    }, 60);
    return () => clearInterval(intervalId);
  }, []);

  /* Multi-file upload demo */
  const files = [
    { name: 'atlas-design-system.zip',     size: '24.6 MB', value: 100, state: 'done' },
    { name: 'halifax-brand-guidelines.pdf', size: '8.2 MB',  value: 72,  state: 'in-progress' },
    { name: 'meeting-recording.mp4',       size: '184 MB',  value: 24,  state: 'in-progress' },
    { name: 'lumenwerk-prototype.figma',   size: '—',       value: 0,   state: 'queued' },
  ];

  return (
    <div className="demo">
      <header className="demo__header">
        <span className="demo__eyebrow">Components · Loading</span>
        <h1>Loading states</h1>
        <p>Progress bars (determinate &amp; indeterminate) and the EggProject brand spinner — derived from the logo aperture.</p>
      </header>

      {/* ===== Spinners ===== */}
      <section className="demo__section">
        <h2>Brand spinner</h2>
        <p className="demo__lead">The mark's nine nested squares counter-rotate at staggered speeds. The center glow breathes. Three sizes.</p>

        <div className="demo__row demo__row--spinners">
          <div className="demo__spin-cell">
            <LogoSpinner size="sm"/>
            <span className="demo__caption">24 px</span>
          </div>
          <div className="demo__spin-cell">
            <LogoSpinner size="md"/>
            <span className="demo__caption">48 px</span>
          </div>
          <div className="demo__spin-cell">
            <LogoSpinner size="lg"/>
            <span className="demo__caption">96 px · hero</span>
          </div>
        </div>

        <div className="demo__row demo__row--inline">
          <div className="demo__inline-spin">
            <LogoSpinner size="sm"/>
            <div className="demo__inline-text">
              <strong>Compiling design tokens</strong>
              <span>148 of 312 · this usually takes 8 seconds</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Progress — determinate ===== */}
      <section className="demo__section">
        <h2>Progress · percent</h2>
        <p className="demo__lead">Live-incrementing demo. The fill carries a subtle moving shimmer to signal activity, even at 100%.</p>

        <div className="demo__stack">
          <ProgressBar value={percent} label="Uploading project assets"/>
          <ProgressBar value={percent * 0.7} size="sm" label="Optimising images"/>
          <ProgressBar value={Math.min(100, percent * 1.4)} size="lg" label="Building production bundle"/>
        </div>
      </section>

      {/* ===== Progress — indeterminate ===== */}
      <section className="demo__section">
        <h2>Progress · infinite</h2>
        <p className="demo__lead">When duration is unknown. A sapphire wave traverses the track on a sine path.</p>

        <div className="demo__stack">
          <ProgressIndeterminate label="Connecting to staging"/>
          <ProgressIndeterminate size="sm" label="Searching"/>
          <ProgressIndeterminate size="lg" label="Generating preview"/>
        </div>
      </section>

      {/* ===== In-context example: file upload list ===== */}
      <section className="demo__section">
        <h2>In context · file upload</h2>
        <p className="demo__lead">Mixed states — completed, in progress, queued.</p>

        <div className="files">
          {files.map(file => (
            <div key={file.name} className={`file file--${file.state}`}>
              <div className="file__header">
                <div className="file__icon">
                  {file.state === 'done' ? (
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8l3 3 7-7"/></svg>
                  ) : file.state === 'queued' ? (
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/></svg>
                  ) : (
                    <LogoSpinner size="sm"/>
                  )}
                </div>
                <div className="file__name">
                  <strong>{file.name}</strong>
                  <span>{file.size}</span>
                </div>
                <span className={`file__state file__state--${file.state}`}>
                  {file.state === 'done' ? 'Uploaded' : file.state === 'queued' ? 'Queued' : `${file.value}%`}
                </span>
              </div>
              {file.state === 'in-progress' && <ProgressBar value={file.value} showLabel={false} size="sm"/>}
              {file.state === 'queued'      && <div className="file__queued-track"><div/></div>}
              {file.state === 'done'        && <div className="file__queued-track file__queued-track--done"><div/></div>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

Object.assign(window, { ProgressBar, ProgressIndeterminate, LogoSpinner, Demo });
