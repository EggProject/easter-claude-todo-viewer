/* global React */
(function () {
'use strict';
const { useState, useRef, useEffect, useId } = React;

/* ============ Sample data ============ */
const LC_SERIES = [
  {
    key: 'revenue',
    label: 'Revenue',
    color: '#2E5BE0',
    data: [42, 48, 52, 49, 58, 63, 68, 71, 79, 85, 92, 98],
  },
  {
    key: 'gross',
    label: 'Gross profit',
    color: '#D4AC5E',
    data: [18, 22, 25, 24, 31, 35, 38, 42, 48, 52, 58, 64],
  },
  {
    key: 'net',
    label: 'Net income',
    color: '#0A1230',
    data: [6, 9, 11, 8, 14, 16, 19, 22, 26, 30, 35, 38],
  },
];

const LC_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ============ Geometry helpers ============ */
const LC_W = 880;
const LC_H = 360;
const LC_PAD = { top: 24, right: 24, bottom: 36, left: 52 };
const LC_innerW = LC_W - LC_PAD.left - LC_PAD.right;
const LC_innerH = LC_H - LC_PAD.top - LC_PAD.bottom;

const lcAllValues = LC_SERIES.flatMap(series => series.data);
const LC_yMax = Math.ceil(Math.max(...lcAllValues) / 20) * 20;
const LC_yMin = 0;

const lcXAt = (i, n) => LC_PAD.left + (i / (n - 1)) * LC_innerW;
const lcYAt = (value) => LC_PAD.top + (1 - (value - LC_yMin) / (LC_yMax - LC_yMin)) * LC_innerH;

/* Catmull-Rom -> cubic Bezier for smooth curve */
function smoothPath(points) {
  if (points.length < 2) return '';
  const pathSegments = [`M ${points[0].x} ${points[0].y}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const t = 0.18;
    const c1x = p1.x + (p2.x - p0.x) * t;
    const c1y = p1.y + (p2.y - p0.y) * t;
    const c2x = p2.x - (p3.x - p1.x) * t;
    const c2y = p2.y - (p3.y - p1.y) * t;
    pathSegments.push(`C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x} ${p2.y}`);
  }
  return pathSegments.join(' ');
}

const lcFormatDollars = (n) => '$' + n.toLocaleString('en-US') + 'k';

/* ============ Chart ============ */
function LineChart() {
  const [hoverIndex, setHoverIndex] = useState(null);
  const [hiddenKeys, setHiddenKeys] = useState(new Set());
  const [mounted, setMounted] = useState(false);
  const svgRef = useRef(null);
  // Instance-unique ids for the SVG's programmatic name/description (role="img"
  // + aria-labelledby). Not public API — generated per instance so multiple
  // charts on one page never collide.
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const visibleSeries = LC_SERIES.filter(series => !hiddenKeys.has(series.key));

  const onMove = (event) => {
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * LC_W;
    if (x < LC_PAD.left - 8 || x > LC_W - LC_PAD.right + 8) { setHoverIndex(null); return; }
    const t = (x - LC_PAD.left) / LC_innerW;
    const index = Math.round(t * (LC_MONTHS.length - 1));
    setHoverIndex(Math.max(0, Math.min(LC_MONTHS.length - 1, index)));
  };
  const onLeave = () => setHoverIndex(null);

  const toggleSeries = (key) => {
    setHiddenKeys(previous => {
      const next = new Set(previous);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  /* Y-axis ticks */
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(LC_yMin + t * (LC_yMax - LC_yMin)));

  /* Active series stats */
  const primary = visibleSeries[0] || LC_SERIES[0];
  const lastValue = primary.data[primary.data.length - 1];
  const firstValue = primary.data[0];
  const percent = ((lastValue - firstValue) / firstValue) * 100;

  /* Non-visual text alternative (role="img" description), derived from the
     source data so it always matches what is drawn and updates with the legend. */
  const lcTitle = 'Revenue and profit trend, trailing 12 months';
  const lcDesc =
    `Line chart of ${visibleSeries.length} data series over 12 months, ` +
    `${LC_MONTHS[0]} to ${LC_MONTHS[LC_MONTHS.length - 1]} 2026. ` +
    visibleSeries.map(series => {
      const first = series.data[0];
      const last = series.data[series.data.length - 1];
      const change = ((last - first) / first) * 100;
      return `${series.label}: ${lcFormatDollars(first)} rising to ${lcFormatDollars(last)} ` +
        `(${change >= 0 ? '+' : ''}${change.toFixed(0)}%), ` +
        `range ${lcFormatDollars(Math.min(...series.data))} to ${lcFormatDollars(Math.max(...series.data))}.`;
    }).join(' ') +
    (hiddenKeys.size ? ' Some series are currently hidden using the legend.' : ' Use the legend to toggle series on or off.');

  return (
    <div className="line-chart-wrapper">
      {/* Header */}
      <div className="line-chart-header">
        <div className="line-chart-header__left">
          <span className="line-chart-header__eyebrow">Revenue · trailing 12 months</span>
          <div className="line-chart-header__title">
            <span className="line-chart-header__value">{lcFormatDollars(lastValue)}</span>
            <span className={`line-chart-header__delta ${percent >= 0 ? 'is-pos' : 'is-neg'}`}>
              <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor">
                {percent >= 0 ? <path d="M4.5 1 L8 6 L1 6 Z"/> : <path d="M4.5 8 L1 3 L8 3 Z"/>}
              </svg>
              {percent >= 0 ? '+' : ''}{percent.toFixed(1)}%
            </span>
          </div>
          <span className="line-chart-header__subtitle">vs. {lcFormatDollars(firstValue)} same month last year</span>
        </div>
        <div className="line-chart-legend">
          {LC_SERIES.map(series => {
            const isOff = hiddenKeys.has(series.key);
            return (
              <button
                key={series.key}
                className={`line-chart-legend-item ${isOff ? 'is-off' : ''}`}
                onClick={() => toggleSeries(series.key)}
              >
                <span className="line-chart-legend-item__dot" style={{ background: series.color }}/>
                <span>{series.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${LC_W} ${LC_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="line-chart-svg"
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        <title id={titleId}>{lcTitle}</title>
        <desc id={descId}>{lcDesc}</desc>
        <defs>
          {LC_SERIES.map(series => (
            <linearGradient key={series.key} id={`lc-fill-${series.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={series.color} stopOpacity="0.22"/>
              <stop offset="100%" stopColor={series.color} stopOpacity="0"/>
            </linearGradient>
          ))}
        </defs>

        {/* Y-axis grid */}
        {yTicks.map((value, i) => (
          <g key={value}>
            <line
              x1={LC_PAD.left} x2={LC_W - LC_PAD.right}
              y1={lcYAt(value)}   y2={lcYAt(value)}
              stroke="#0A1230" strokeOpacity={i === 0 ? 0.12 : 0.06}
              strokeDasharray={i === 0 ? '0' : '2 4'}
            />
            <text
              x={LC_PAD.left - 12} y={lcYAt(value) + 4}
              textAnchor="end"
              fontFamily="JetBrains Mono, monospace"
              fontSize="11" fill="#5C6981"
            >
              ${value}k
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {LC_MONTHS.map((month, i) => (
          <text
            key={month}
            x={lcXAt(i, LC_MONTHS.length)} y={LC_H - LC_PAD.bottom + 22}
            textAnchor="middle"
            fontFamily="Roboto, system-ui, sans-serif"
            fontSize="11" fontWeight="500"
            fill={hoverIndex === i ? '#0A1230' : '#5C6981'}
            style={{ transition: 'fill 140ms ease-out' }}
          >
            {month}
          </text>
        ))}

        {/* Hover crosshair */}
        {hoverIndex != null && (
          <line
            x1={lcXAt(hoverIndex, LC_MONTHS.length)} x2={lcXAt(hoverIndex, LC_MONTHS.length)}
            y1={LC_PAD.top - 4} y2={LC_H - LC_PAD.bottom}
            stroke="#0A1230" strokeOpacity="0.18" strokeDasharray="2 3"
          />
        )}

        {/* Series */}
        {visibleSeries.map((series, seriesIndex) => {
          const points = series.data.map((value, i) => ({ x: lcXAt(i, series.data.length), y: lcYAt(value) }));
          const linePath = smoothPath(points);
          const areaPath = linePath + ` L ${points[points.length - 1].x} ${LC_H - LC_PAD.bottom} L ${points[0].x} ${LC_H - LC_PAD.bottom} Z`;
          return (
            <g key={series.key} className={`line-chart-series line-chart-series--${seriesIndex} ${mounted ? 'is-mounted' : ''}`} style={{ animationDelay: `${seriesIndex * 120}ms` }}>
              {seriesIndex === 0 && <path d={areaPath} fill={`url(#lc-fill-${series.key})`} />}
              <path
                d={linePath}
                fill="none"
                stroke={series.color}
                strokeWidth={seriesIndex === 0 ? 2.4 : 1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="line-chart-line"
              />
            </g>
          );
        })}

        {/* Hover dots */}
        {hoverIndex != null && visibleSeries.map(series => (
          <circle
            key={series.key}
            cx={lcXAt(hoverIndex, series.data.length)}
            cy={lcYAt(series.data[hoverIndex])}
            r="5"
            fill="#FBF9F4"
            stroke={series.color}
            strokeWidth="2.4"
          />
        ))}
      </svg>

      {/* Tooltip */}
      {hoverIndex != null && (
        <LcTooltip index={hoverIndex} visibleSeries={visibleSeries} />
      )}
    </div>
  );
}

function LcTooltip({ index, visibleSeries }) {
  const xPercent = ((lcXAt(index, LC_MONTHS.length)) / LC_W) * 100;
  return (
    <div className="line-chart-tooltip" style={{ left: `${xPercent}%` }}>
      <div className="line-chart-tooltip__header">{LC_MONTHS[index]} 2026</div>
      {visibleSeries.map(series => (
        <div key={series.key} className="line-chart-tooltip__row">
          <span className="line-chart-tooltip__dot" style={{ background: series.color }}/>
          <span className="line-chart-tooltip__label">{series.label}</span>
          <span className="line-chart-tooltip__value">{lcFormatDollars(series.data[index])}</span>
        </div>
      ))}
    </div>
  );
}

Object.assign(window, { LineChart });
})();
