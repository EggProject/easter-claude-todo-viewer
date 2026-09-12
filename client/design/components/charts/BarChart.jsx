/* global React */
(function () {
'use strict';
const { useState, useEffect, useId } = React;

/* ============ Stacked bar data ============ */
const CATEGORIES = [
  { key: 'product',  label: 'Product engineering', color: '#2E5BE0' },
  { key: 'tooling',  label: 'Internal tooling',    color: '#7E9EF5' },
  { key: 'mvp',      label: 'MVP sprints',         color: '#D4AC5E' },
  { key: 'audit',    label: 'Design audits',       color: '#0A1230' },
];

/* Each column = a quarter. Each value = hours billed in that category. */
const COLUMNS_DATA = [
  { label: 'Q1 24', values: { product: 380, tooling: 220, mvp: 140, audit: 60  } },
  { label: 'Q2 24', values: { product: 420, tooling: 260, mvp: 180, audit: 90  } },
  { label: 'Q3 24', values: { product: 480, tooling: 240, mvp: 220, audit: 70  } },
  { label: 'Q4 24', values: { product: 540, tooling: 300, mvp: 280, audit: 120 } },
  { label: 'Q1 25', values: { product: 580, tooling: 340, mvp: 240, audit: 100 } },
  { label: 'Q2 25', values: { product: 620, tooling: 380, mvp: 320, audit: 140 } },
  { label: 'Q3 25', values: { product: 680, tooling: 360, mvp: 380, audit: 160 } },
  { label: 'Q4 25', values: { product: 740, tooling: 420, mvp: 440, audit: 180 } },
  { label: 'Q1 26', values: { product: 820, tooling: 480, mvp: 520, audit: 220 } },
];

/* ============ Geometry ============ */
const BC_W = 880;
const BC_H = 360;
const BC_PAD = { top: 24, right: 24, bottom: 36, left: 56 };
const BC_innerW = BC_W - BC_PAD.left - BC_PAD.right;
const BC_innerH = BC_H - BC_PAD.top - BC_PAD.bottom;

const totals = COLUMNS_DATA.map(column =>
  Object.values(column.values).reduce((sum, value) => sum + value, 0)
);
const BC_yMax = Math.ceil(Math.max(...totals) / 500) * 500;
const BC_yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(t * BC_yMax));

const columnCount = COLUMNS_DATA.length;
const columnGap = 18;
const columnWidth = (BC_innerW - columnGap * (columnCount - 1)) / columnCount;
const bcXAt = (i) => BC_PAD.left + i * (columnWidth + columnGap);
const bcYAt = (value) => BC_PAD.top + (1 - value / BC_yMax) * BC_innerH;

const formatHours = (n) => n.toLocaleString('en-US') + ' h';

/* ============ Chart ============ */
function BarChart() {
  const [hoverIndex, setHoverIndex] = useState(null);
  const [hiddenKeys, setHiddenKeys] = useState(new Set());
  const [mounted, setMounted] = useState(false);
  // Instance-unique ids for the SVG's programmatic name/description (role="img"
  // + aria-labelledby). Not public API — generated per instance so multiple
  // charts on one page never collide.
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const visibleCategories = CATEGORIES.filter(category => !hiddenKeys.has(category.key));

  const toggleCategory = (key) => {
    setHiddenKeys(previous => {
      const next = new Set(previous);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  /* Compute visible totals per column */
  const columnTotals = COLUMNS_DATA.map(column =>
    visibleCategories.reduce((sum, category) => sum + (column.values[category.key] || 0), 0)
  );

  const latestTotal = columnTotals[columnTotals.length - 1];
  const previousTotal   = columnTotals[columnTotals.length - 2] || latestTotal;
  const percent = ((latestTotal - previousTotal) / previousTotal) * 100;

  /* Non-visual text alternative (role="img" description), derived from the
     source data so it always matches what is drawn and updates with the legend. */
  const bcTitle = 'Quarterly hours billed, stacked by service';
  const bcLatest = COLUMNS_DATA[COLUMNS_DATA.length - 1];
  const bcDesc =
    `Stacked bar chart of hours billed across ${columnCount} quarters, ` +
    `${COLUMNS_DATA[0].label} to ${COLUMNS_DATA[columnCount - 1].label}, ` +
    `by ${visibleCategories.length} service ${visibleCategories.length === 1 ? 'category' : 'categories'}. ` +
    `Categories: ${visibleCategories.map(category => category.label).join(', ') || 'none'}. ` +
    `Latest quarter ${bcLatest.label}: ` +
    `${visibleCategories.map(category => `${category.label} ${(bcLatest.values[category.key] || 0).toLocaleString()} hours`).join(', ')}; ` +
    `total ${latestTotal.toLocaleString()} hours, ${percent >= 0 ? 'up' : 'down'} ${Math.abs(percent).toFixed(0)}% ` +
    `from ${previousTotal.toLocaleString()} hours the prior quarter. ` +
    `Quarter totals range ${Math.min(...columnTotals).toLocaleString()} to ${Math.max(...columnTotals).toLocaleString()} hours.` +
    (hiddenKeys.size ? ' Some categories are currently hidden using the legend.' : ' Use the legend to toggle categories on or off.');

  return (
    <div className="bar-chart-wrapper">
      {/* Header */}
      <div className="bar-chart-header">
        <div className="bar-chart-header__left">
          <span className="bar-chart-header__eyebrow">Hours billed · by service</span>
          <div className="bar-chart-header__title">
            <span className="bar-chart-header__value">{formatHours(latestTotal)}</span>
            <span className={`bar-chart-header__delta ${percent >= 0 ? 'is-pos' : 'is-neg'}`}>
              <svg width="9" height="9" viewBox="0 0 9 9" fill="currentColor">
                {percent >= 0 ? <path d="M4.5 1 L8 6 L1 6 Z"/> : <path d="M4.5 8 L1 3 L8 3 Z"/>}
              </svg>
              {percent >= 0 ? '+' : ''}{percent.toFixed(1)}%
            </span>
          </div>
          <span className="bar-chart-header__subtitle">vs. {formatHours(previousTotal)} previous quarter</span>
        </div>
        <div className="bar-chart-legend">
          {CATEGORIES.map(category => {
            const isOff = hiddenKeys.has(category.key);
            return (
              <button
                key={category.key}
                className={`bar-chart-legend-item ${isOff ? 'is-off' : ''}`}
                onClick={() => toggleCategory(category.key)}
              >
                <span className="bar-chart-legend-item__dot" style={{ background: category.color }}/>
                <span>{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG */}
      <svg
        viewBox={`0 0 ${BC_W} ${BC_H}`}
        preserveAspectRatio="xMidYMid meet"
        className={`bar-chart-svg ${mounted ? 'is-mounted' : ''}`}
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
      >
        <title id={titleId}>{bcTitle}</title>
        <desc id={descId}>{bcDesc}</desc>
        {/* Y-axis grid */}
        {BC_yTicks.map((value, i) => (
          <g key={value}>
            <line
              x1={BC_PAD.left} x2={BC_W - BC_PAD.right}
              y1={bcYAt(value)}   y2={bcYAt(value)}
              stroke="#0A1230" strokeOpacity={i === 0 ? 0.12 : 0.06}
              strokeDasharray={i === 0 ? '0' : '2 4'}
            />
            <text
              x={BC_PAD.left - 12} y={bcYAt(value) + 4}
              textAnchor="end"
              fontFamily="JetBrains Mono, monospace"
              fontSize="11" fill="#5C6981"
            >
              {value.toLocaleString()}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {COLUMNS_DATA.map((column, i) => (
          <text
            key={column.label}
            x={bcXAt(i) + columnWidth / 2} y={BC_H - BC_PAD.bottom + 22}
            textAnchor="middle"
            fontFamily="Roboto, system-ui, sans-serif"
            fontSize="11" fontWeight="500"
            fill={hoverIndex === i ? '#0A1230' : '#5C6981'}
            style={{ transition: 'fill 140ms ease-out' }}
          >
            {column.label}
          </text>
        ))}

        {/* Columns */}
        {COLUMNS_DATA.map((column, columnIndex) => {
          const isOther = hoverIndex != null && hoverIndex !== columnIndex;
          let runningBottom = bcYAt(0);
          const segments = [];
          let accumulatedValue = 0;
          for (let i = 0; i < visibleCategories.length; i++) {
            const category = visibleCategories[i];
            const value = column.values[category.key] || 0;
            if (value === 0) continue;
            accumulatedValue += value;
            const yTop = bcYAt(accumulatedValue);
            const yBot = runningBottom;
            const isTop = i === visibleCategories.length - 1;
            segments.push({
              key: category.key,
              color: category.color,
              x: bcXAt(columnIndex),
              y: yTop,
              w: columnWidth,
              h: yBot - yTop,
              isTop,
              delay: columnIndex * 60,
            });
            runningBottom = yTop;
          }
          return (
            <g
              key={column.label}
              className={`bar-chart-column ${isOther ? 'is-other' : ''}`}
              onMouseEnter={() => setHoverIndex(columnIndex)}
              onMouseLeave={() => setHoverIndex(null)}
            >
              <rect
                x={bcXAt(columnIndex) - columnGap / 2}
                y={BC_PAD.top}
                width={columnWidth + columnGap}
                height={BC_innerH}
                fill="transparent"
              />
              {segments.map((segment) => {
                const cornerRadius = 4;
                if (segment.isTop && segment.h >= cornerRadius) {
                  const pathData = `
                    M ${segment.x} ${segment.y + cornerRadius}
                    Q ${segment.x} ${segment.y}, ${segment.x + cornerRadius} ${segment.y}
                    L ${segment.x + segment.w - cornerRadius} ${segment.y}
                    Q ${segment.x + segment.w} ${segment.y}, ${segment.x + segment.w} ${segment.y + cornerRadius}
                    L ${segment.x + segment.w} ${segment.y + segment.h}
                    L ${segment.x} ${segment.y + segment.h}
                    Z
                  `;
                  return (
                    <path
                      key={segment.key}
                      d={pathData}
                      fill={segment.color}
                      className="bar-chart-segment"
                      style={{ animationDelay: `${segment.delay}ms` }}
                    />
                  );
                }
                return (
                  <rect
                    key={segment.key}
                    x={segment.x} y={segment.y} width={segment.w} height={segment.h}
                    fill={segment.color}
                    className="bar-chart-segment"
                    style={{ animationDelay: `${segment.delay}ms` }}
                  />
                );
              })}
              {hoverIndex === columnIndex && columnTotals[columnIndex] > 0 && (
                <text
                  x={bcXAt(columnIndex) + columnWidth / 2}
                  y={bcYAt(columnTotals[columnIndex]) - 10}
                  textAnchor="middle"
                  fontFamily="JetBrains Mono, monospace"
                  fontSize="11" fontWeight="600"
                  fill="#0A1230"
                >
                  {columnTotals[columnIndex].toLocaleString()}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoverIndex != null && (
        <BarTooltip
          column={COLUMNS_DATA[hoverIndex]}
          total={columnTotals[hoverIndex]}
          visibleCategories={visibleCategories}
          xPercent={((bcXAt(hoverIndex) + columnWidth / 2) / BC_W) * 100}
        />
      )}
    </div>
  );
}

function BarTooltip({ column, total, visibleCategories, xPercent }) {
  return (
    <div className="line-chart-tooltip" style={{ left: `${xPercent}%` }}>
      <div className="line-chart-tooltip__header">{column.label}</div>
      {visibleCategories.map(category => {
        const value = column.values[category.key] || 0;
        return (
          <div key={category.key} className="line-chart-tooltip__row">
            <span className="line-chart-tooltip__dot" style={{ background: category.color, borderRadius: 2 }}/>
            <span className="line-chart-tooltip__label">{category.label}</span>
            <span className="line-chart-tooltip__value">{value.toLocaleString()} h</span>
          </div>
        );
      })}
      <div className="bar-chart-tooltip__total">
        <span>Total</span>
        <strong>{total.toLocaleString()} h</strong>
      </div>
    </div>
  );
}

Object.assign(window, { BarChart });
})();
