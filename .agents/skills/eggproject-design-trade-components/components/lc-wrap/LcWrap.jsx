/* global React, FeedIndicator */
/* ============ LcWrap — Live Chart Wrapper ============
   Chrome around a TradingView Lightweight Charts™ instance —
   the one chart renderer the system ships. Owns title, price
   readout, range tabs, feed indicator, legend, and footer;
   the consumer mounts lightweight-charts into the body via
   children or `bodyRef` (see components/lc-wrap/lc-charts.js).

   Props:
     - title:     string — left-side title (e.g. "Equity curve")
     - symbol:    string — mono-set instrument ticker ("BTCUSDT")
     - meta:      string — small mono trailing meta ("1m · binance")
     - price:     string|number — large mono price readout
     - delta:     string — delta label ("+2.34%" / "-0.12")
     - deltaDir:  'up' | 'down' | 'flat'
     - ranges:    array of { id, label } — segmented range tabs
     - activeRange: id of the active range
     - onRangeChange: (id) => void
     - feedState: any FEED_STATES key — renders <FeedIndicator state>
     - feedMeta:  string — latency / age tail for the indicator
     - actions:   React node — icon-btn slot (right of feed)
     - legend:    array of { label, color, kind?: 'dot'|'bar'|'candle-up'|'candle-down' }
     - footer:    React node — small mono footer slot
     - surface:   'paper' | 'ink'
     - density:   'normal' | 'compact'
     - height:    'sm' | 'md' | 'lg' | number (px) — convenience
     - placeholder: boolean — show design-time grid in body
     - bodyRef:   ref handed to .line-chart-wrapper__body (for renderer mount)
     - children:  body contents (alternative to bodyRef)
============================================ */

function LcWrap({
  title,
  symbol,
  meta,
  price,
  delta,
  deltaDir = 'flat',
  ranges,
  activeRange,
  onRangeChange,
  feedState,
  feedMeta,
  actions,
  legend,
  footer,
  surface = 'paper',
  density = 'normal',
  height,
  placeholder = false,
  bodyRef,
  children,
  className = '',
  style,
  ...rest
}) {
  const heightClassName =
    typeof height === 'string' ? `line-chart-wrapper--h-${height}` : '';
  const heightStyle =
    typeof height === 'number' ? { height } : null;

  const classNames = [
    'line-chart-wrapper',
    surface === 'ink' && 'line-chart-wrapper--ink',
    density === 'compact' && 'line-chart-wrapper--compact',
    heightClassName,
    className,
  ].filter(Boolean).join(' ');

  // Timeframe radiogroup — roving tabindex + selection-follows-focus keyboard.
  const rangeRefs = React.useRef([]);
  const rangeCount = Array.isArray(ranges) ? ranges.length : 0;
  const activeRangeIndex = Array.isArray(ranges) ? ranges.findIndex(range => range.id === activeRange) : -1;
  const rovingRangeIndex = activeRangeIndex === -1 ? 0 : activeRangeIndex;

  const handleRangeKeyDown = (event, index) => {
    let targetIndex = null;
    switch (event.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        targetIndex = (index - 1 + rangeCount) % rangeCount;
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        targetIndex = (index + 1) % rangeCount;
        break;
      case 'Home':
        targetIndex = 0;
        break;
      case 'End':
        targetIndex = rangeCount - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    const targetButton = rangeRefs.current[targetIndex];
    if (targetButton) targetButton.focus();
    if (onRangeChange) onRangeChange(ranges[targetIndex].id);
  };

  const showHeader = title || symbol || price || ranges || feedState || actions;

  return (
    <section className={classNames} style={{ ...heightStyle, ...style }} {...rest}>
      {showHeader && (
        <header className="line-chart-wrapper__header">
          <div className="line-chart-wrapper__title-group">
            {symbol && <span className="line-chart-wrapper__symbol">{symbol}</span>}
            {title  && <span className="line-chart-wrapper__title">{title}</span>}
            {meta   && <span className="line-chart-wrapper__meta">{meta}</span>}
            {price !== undefined && price !== null && (
              <span className="line-chart-wrapper__price">
                {price}
                {delta && (
                  <span className={`line-chart-wrapper__delta line-chart-wrapper__delta--${deltaDir}`}>{delta}</span>
                )}
              </span>
            )}
          </div>
          <div className="line-chart-wrapper__actions">
            {Array.isArray(ranges) && (
              <div className="line-chart-wrapper__ranges" role="radiogroup" aria-label="Time range">
                {ranges.map((range, rangeIndex) => (
                  <button
                    key={range.id}
                    ref={element => { rangeRefs.current[rangeIndex] = element; }}
                    type="button"
                    role="radio"
                    aria-checked={activeRange === range.id}
                    tabIndex={rangeIndex === rovingRangeIndex ? 0 : -1}
                    className="line-chart-wrapper__range-button"
                    onClick={() => onRangeChange && onRangeChange(range.id)}
                    onKeyDown={event => handleRangeKeyDown(event, rangeIndex)}
                  >{range.label}</button>
                ))}
              </div>
            )}
            {feedState && (
              <FeedIndicator state={feedState} meta={feedMeta} variant="soft" />
            )}
            {actions}
          </div>
        </header>
      )}

      <div className="line-chart-wrapper__body" ref={bodyRef}>
        {placeholder && <div className="line-chart-wrapper__placeholder" />}
        {children}
      </div>

      {legend && legend.length > 0 && (
        <div className="line-chart-wrapper__legend">
          {legend.map((legendItem, index) => {
            const kind = legendItem.kind || 'dot';
            const swatchClassName = [
              'line-chart-wrapper__legend-swatch',
              kind === 'bar' && 'line-chart-wrapper__legend-swatch--bar',
              kind === 'candle-up'   && 'line-chart-wrapper__legend-swatch--candle-up',
              kind === 'candle-down' && 'line-chart-wrapper__legend-swatch--candle-down',
            ].filter(Boolean).join(' ');
            return (
              <span className="line-chart-wrapper__legend-item" key={index}>
                <span className={swatchClassName} style={legendItem.color ? { background: legendItem.color } : null} />
                {legendItem.label}
              </span>
            );
          })}
        </div>
      )}

      {footer && (
        <div className="line-chart-wrapper__footer">{footer}</div>
      )}
    </section>
  );
}

/* Convenience icon-button helper — consumers can drop these into `actions` */
function LcWrapIconButton({ label, children, ...rest }) {
  return (
    <button
      type="button"
      className="line-chart-wrapper__icon-button"
      aria-label={label}
      title={label}
      {...rest}
    >{children}</button>
  );
}

Object.assign(window, { LcWrap, LcWrapIconButton });
