/* global React */
const { useState, useEffect, useMemo } = React;

/* ============================================================
   SplashScreen — full-bleed dark surface, infinite animations.
   ============================================================ */

const STATUSES = [
  'Initialising core systems',
  'Compiling design tokens',
  'Linking workspace',
  'Resolving dependencies',
  'Warming caches',
  'Establishing secure channel',
];

function useTypewriter(text, speed = 28) {
  const [outputText, setOutputText] = useState('');
  useEffect(() => {
    setOutputText('');
    let i = 0;
    const id = setInterval(() => {
      i++;
      setOutputText(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return outputText;
}

function StatusCycler() {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const intervalId = setInterval(() => setIndex(current => (current + 1) % STATUSES.length), 2400);
    return () => clearInterval(intervalId);
  }, []);
  const typed = useTypewriter(STATUSES[index]);
  return (
    <div className="splash-status">
      <span className="splash-status__bullet">›</span>
      <span className="splash-status__text">{typed}</span>
      <span className="splash-status__caret"/>
    </div>
  );
}

function Clock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const pad = n => String(n).padStart(2, '0');
  return (
    <span className="splash-mono">{pad(now.getHours())}:{pad(now.getMinutes())}:{pad(now.getSeconds())}</span>
  );
}

/* Floating particles — deterministic positions so re-renders don't reshuffle */
function Particles({ count = 28 }) {
  const dots = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      // Pseudo-random but stable
      const r = (n) => ((Math.sin(i * (n + 1) * 9.27) + 1) / 2);
      return {
        left: r(1) * 100,
        top:  r(2) * 100,
        size: 1 + r(3) * 2.5,
        delay: -r(4) * 12,
        duration: 10 + r(5) * 14,
        hue: r(6) > 0.78 ? 'yolk' : 'blue',
        opacity: 0.2 + r(7) * 0.5,
      };
    });
  }, [count]);
  return (
    <div className="splash-particles" aria-hidden="true">
      {dots.map((d, i) => (
        <span
          key={i}
          className={`splash-particle splash-particle--${d.hue}`}
          style={{
            left: `${d.left}%`,
            top: `${d.top}%`,
            width: d.size, height: d.size,
            opacity: d.opacity,
            animationDelay:    `${d.delay}s`,
            animationDuration: `${d.duration}s`,
          }}
        />
      ))}
    </div>
  );
}

function SpinningMark() {
  return (
    <div className="splash-mark">
      {/* Outer halo rings */}
      <div className="splash-mark__halo splash-mark__halo--1"/>
      <div className="splash-mark__halo splash-mark__halo--2"/>
      <div className="splash-mark__halo splash-mark__halo--3"/>

      {/* The aperture mark itself — large */}
      <svg viewBox="-12 -12 88 88" fill="none" className="splash-mark__svg" width="275" height="275">
        <defs>
          <radialGradient id="sp-core" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0"    stopColor="#FBF9F4" stopOpacity="1"/>
            <stop offset="0.40" stopColor="#D4AC5E" stopOpacity="0.8"/>
            <stop offset="1"    stopColor="#D4AC5E" stopOpacity="0"/>
          </radialGradient>
        </defs>

        {/* Yolk chromatic ghost layer */}
        <g className="splash-mark__ghost" opacity="0.55">
          <g fill="none" stroke="#D4AC5E" strokeWidth="0.6" strokeLinejoin="round">
            <rect className="splash-ring r0" x="4"  y="4"  width="56" height="56"/>
            <rect className="splash-ring r2" x="9"  y="9"  width="46" height="46"/>
            <rect className="splash-ring r4" x="14" y="14" width="36" height="36"/>
            <rect className="splash-ring r6" x="19" y="19" width="26" height="26"/>
            <rect className="splash-ring r8" x="24" y="24" width="16" height="16"/>
          </g>
        </g>

        {/* Main aperture — sapphire on dark, slightly brighter for contrast */}
        <g fill="none" stroke="#7E9EF5" strokeLinejoin="round">
          <rect className="splash-ring r0" x="4"    y="4"    width="56" height="56" strokeWidth="0.9" opacity="0.30"/>
          <rect className="splash-ring r1" x="6.5"  y="6.5"  width="51" height="51" strokeWidth="1.0" opacity="0.45"/>
          <rect className="splash-ring r2" x="9"    y="9"    width="46" height="46" strokeWidth="1.1" opacity="0.60"/>
          <rect className="splash-ring r3" x="11.5" y="11.5" width="41" height="41" strokeWidth="1.2" opacity="0.75"/>
          <rect className="splash-ring r4" x="14"   y="14"   width="36" height="36" strokeWidth="1.3" opacity="0.90"/>
          <rect className="splash-ring r5" x="16.5" y="16.5" width="31" height="31" strokeWidth="1.4"/>
          <rect className="splash-ring r6" x="19"   y="19"   width="26" height="26" strokeWidth="1.4"/>
          <rect className="splash-ring r7" x="21.5" y="21.5" width="21" height="21" strokeWidth="1.3"/>
          <rect className="splash-ring r8" x="24"   y="24"   width="16" height="16" strokeWidth="1.2"/>
        </g>

        <circle className="splash-mark__glow" cx="32" cy="32" r="7" fill="url(#sp-core)"/>
        <circle className="splash-mark__pin"  cx="32" cy="32" r="1.6" fill="#FBF9F4"/>
      </svg>
    </div>
  );
}

function ProgressBar() {
  return (
    <div className="splash-progress">
      <div className="splash-progress__track">
        <div className="splash-progress__header"/>
      </div>
    </div>
  );
}

function Splash() {
  return (
    <div className="splash-stage" data-screen-label="EggProject Splash">
      {/* Aurora background — three slow-drifting blurred blobs */}
      <div className="splash-aurora" aria-hidden="true">
        <div className="splash-aurora__blob splash-aurora__blob--1"/>
        <div className="splash-aurora__blob splash-aurora__blob--2"/>
        <div className="splash-aurora__blob splash-aurora__blob--3"/>
      </div>

      {/* Grid scaffold — subtle */}
      <div className="splash-grid" aria-hidden="true"/>

      {/* Floating particles */}
      <Particles count={32}/>

      {/* Corner chrome */}
      <header className="splash-header">
        <div className="splash-header__brand">
          <span className="splash-header__dot"/>
          <span>EggProject</span>
        </div>
        <div className="splash-header__right">
          <span className="splash-mono">v 4.2.0-rc.1</span>
          <span className="splash-divider"/>
          <Clock/>
        </div>
      </header>

      <footer className="splash-footer">
        <div className="splash-footer__left">
          <span className="splash-overline">Build</span>
          <span className="splash-mono">a3f4d12 · main</span>
        </div>
        <div className="splash-footer__right">
          <span className="splash-overline">Region</span>
          <span className="splash-mono">eu-central-1 · BUD</span>
        </div>
      </footer>

      {/* Center content */}
      <main className="splash-center">
        <SpinningMark/>

        <div className="splash-title">
          <span className="splash-eyebrow">
            <span className="splash-eyebrow__pulse"/>
            <span>Connecting</span>
          </span>
          <h1 className="splash-heading">
            Crafting<br/>
            <em>something good.</em>
          </h1>
        </div>

        <ProgressBar/>
        <StatusCycler/>
      </main>

      {/* Scan line that travels top->bottom infinitely */}
      <div className="splash-scan" aria-hidden="true"/>
    </div>
  );
}

Object.assign(window, { Splash });
