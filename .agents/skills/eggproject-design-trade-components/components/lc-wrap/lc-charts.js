/* ============================================================
   lc-charts.js — EggProject · LcWrap renderer
   ------------------------------------------------------------
   Mounts REAL TradingView Lightweight Charts™ into any
   `.line-chart-wrapper__body` (or any element carrying a [data-lc] attr).
   lightweight-charts is the ONE renderer the design system ships
   for LcWrap — no faux candles, no SVG mocks.

   Targets lightweight-charts v5 (addSeries(Ctor, opts) +
   createSeriesMarkers); falls back to the v4 API if an older
   build is loaded. Pinned build:
     <script src="../../assets/vendor/lightweight-charts.standalone.production.js"></script>
     <script src=".../components/lc-wrap/lc-charts.js"></script>

   Declarative use — drop a mount node inside .line-chart-wrapper__body:
     <div class="line-chart-plot"
          data-lc="candles"        kind: candles | area | line | sparkline
          data-lc-seed="7"         deterministic data seed
          data-lc-base="68200"     starting price
          data-lc-vol="120"        per-step volatility
          data-lc-drift="6"        per-step drift (trend)
          data-lc-count="90"       number of points
          data-lc-color="#2E5BE0"  line/area stroke (line/area/sparkline)
          data-lc-markers='[{"i":24,"position":"belowBar","text":"Entry"}]'>
     </div>
   The surface theme (paper vs ink) is read from the closest
   `.line-chart-wrapper--ink` ancestor, so charts match the chrome automatically.

   Timeframe tabs: any `.line-chart-wrapper__range-button` inside the
   same `.line-chart-wrapper` is wired automatically — clicking re-renders
   the chart at that timeframe (1m · 5m · 15m · 1H · 4H · 1D).

   Imperative use:
     LcCharts.mount(el, { kind:'candles', seed:7, base:68200 });
   ============================================================ */
(function (global) {
  'use strict';

  var LWC = global.LightweightCharts;

  /* ---- seeded PRNG (mulberry32) — stable across reloads ---- */
  function createSeededRandom(seed) {
    var seedState = (seed >>> 0) || 1;
    return function () {
      seedState += 0x6d2b79f5;
      var randomValue = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
      randomValue ^= randomValue + Math.imul(randomValue ^ (randomValue >>> 7), 61 | randomValue);
      return ((randomValue ^ (randomValue >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---- resolve a CSS var to a REAL rgb() color -------------
     Custom props can hold color-mix()/var() expressions that
     lightweight-charts can't parse, and getPropertyValue returns
     the raw text. Setting `color: var(--x, fb)` on a probe inside
     `el` and reading back the computed color resolves everything
     (color-mix, var chains) for the element's current theme. */
  var colorProbe = null;
  function resolveCssColor(element, propertyName, fallback) {
    if (!colorProbe) {
      colorProbe = document.createElement('span');
      colorProbe.style.cssText =
        'position:absolute;width:0;height:0;visibility:hidden;pointer-events:none;';
    }
    element.appendChild(colorProbe);
    colorProbe.style.color = 'var(' + propertyName + ', ' + fallback + ')';
    var computedColor = getComputedStyle(colorProbe).color;
    element.removeChild(colorProbe);
    return computedColor || fallback;
  }

  /* turn any color (hex or rgb/rgba) into rgba with the given alpha */
  function toRgba(color, alpha) {
    if (!color) return 'rgba(46,91,224,' + alpha + ')';
    if (color[0] === '#') {
      var rgbParts = hexToRgb(color);
      return rgbParts ? 'rgba(' + rgbParts + ',' + alpha + ')' : color;
    }
    var match = color.match(/rgba?\(([^)]+)\)/);
    if (match) {
      var parts = match[1].split(',').slice(0, 3).map(function (part) { return part.trim(); }).join(',');
      return 'rgba(' + parts + ',' + alpha + ')';
    }
    return color;
  }

  /* ---- theme tokens pulled from the live CSS variables -----
     Read every value resolved for the element's CURRENT theme so
     paper charts follow light/dark. Ink charts are always dark. */
  function readTheme(element) {
    var ink = !!(element.closest && element.closest('.line-chart-wrapper--ink'));
    if (ink) {
      return {
        ink: true,
        bg: '#0A1230',
        text: 'rgba(233,237,247,0.46)',
        grid: 'rgba(255,255,255,0.05)',
        border: 'rgba(255,255,255,0.10)',
        up: '#4EE39C',
        down: '#FF6E81',
        line: '#7E9EF5',
        marker: '#E6C886'
      };
    }
    return {
      ink: false,
      bg: resolveCssColor(element, '--ep-bg-elevated', '#FFFFFF'),
      text: resolveCssColor(element, '--ep-fg-subtle', '#8893A8'),
      grid: resolveCssColor(element, '--ep-divider', 'rgba(10,18,48,0.07)'),
      border: resolveCssColor(element, '--ep-divider', 'rgba(10,18,48,0.12)'),
      up: resolveCssColor(element, '--ep-success', '#2F9C6A'),
      down: resolveCssColor(element, '--ep-danger', '#C7384E'),
      line: resolveCssColor(element, '--ep-accent', '#2E5BE0'),
      marker: resolveCssColor(element, '--ep-accent-warm', '#D4AC5E')
    };
  }

  var MONO = "'Roboto Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

  /* ---- live theme switching --------------------------------
     Every mounted chart registers here; one observer watches the
     <html> data-theme/class and re-themes them all when it flips. */
  var instances = [];
  var themeObserver = null;
  function rethemeAll() {
    instances.forEach(function (instance) {
      try { instance.retheme(); } catch (error) { /* chart may be disposed */ }
    });
  }
  function ensureThemeObserver() {
    if (themeObserver || !global.MutationObserver) return;
    themeObserver = new MutationObserver(function () {
      // CSS vars update synchronously on the attribute change; re-theme
      // immediately (rAF can be throttled/frozen in background/capture).
      rethemeAll();
      setTimeout(rethemeAll, 0);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class', 'style']
    });
  }

  /* ---- timeframe presets — drive the range tabs ------------ */
  var RANGES = {
    '1m':  { index: 0, step: 60,    volatilityMultiplier: 0.40, count: 110 },
    '5m':  { index: 1, step: 300,   volatilityMultiplier: 1.00, count: 96  },
    '15m': { index: 2, step: 900,   volatilityMultiplier: 1.70, count: 90  },
    '1h':  { index: 3, step: 3600,  volatilityMultiplier: 3.00, count: 84  },
    '4h':  { index: 4, step: 14400, volatilityMultiplier: 5.00, count: 80  },
    '1d':  { index: 5, step: 86400, volatilityMultiplier: 8.00, count: 70  }
  };
  var START = Math.floor(Date.UTC(2024, 5, 3, 0, 0, 0) / 1000);

  /* ---- data generators -------------------------------------- */
  function generateCandles(settings) {
    var random = createSeededRandom(settings.seed);
    var count = settings.count, base = settings.base, volatility = settings.volatility, drift = settings.drift, step = settings.step;
    var price = base, candles = [];
    for (var i = 0; i < count; i++) {
      var open = price;
      var localDrift = drift * Math.sin((i / count) * Math.PI * 1.5);
      var close = Math.max(0.01, open + (random() - 0.5) * volatility + localDrift);
      var high = Math.max(open, close) + random() * volatility * 0.55;
      var low = Math.min(open, close) - random() * volatility * 0.55;
      candles.push({ time: START + i * step, open: open, high: high, low: low, close: close });
      price = close;
    }
    return candles;
  }

  function candlesToValues(candles) {
    return candles.map(function (candle) { return { time: candle.time, value: candle.close }; });
  }

  /* ---- version-agnostic series + marker helpers ------------- */
  function addSeries(chart, seriesType, seriesOptions) {
    // v5: chart.addSeries(LWC.CandlestickSeries, seriesOptions)
    if (typeof chart.addSeries === 'function' && LWC[seriesType]) {
      return chart.addSeries(LWC[seriesType], seriesOptions);
    }
    // v4 fallback
    var seriesMethodMap = {
      CandlestickSeries: 'addCandlestickSeries',
      AreaSeries: 'addAreaSeries',
      LineSeries: 'addLineSeries'
    };
    return chart[seriesMethodMap[seriesType]](seriesOptions);
  }

  function hexToRgb(hex) {
    if (!hex || hex[0] !== '#') return null;
    var hexDigits = hex.slice(1);
    if (hexDigits.length === 3) hexDigits = hexDigits[0] + hexDigits[0] + hexDigits[1] + hexDigits[1] + hexDigits[2] + hexDigits[2];
    if (hexDigits.length !== 6) return null;
    var intValue = parseInt(hexDigits, 16);
    return [(intValue >> 16) & 255, (intValue >> 8) & 255, intValue & 255].join(',');
  }

  /* ---- core mount ------------------------------------------- */
  function mount(element, options) {
    if (!LWC) {
      console.warn('[lc-charts] LightweightCharts global not found — load the standalone build before lc-charts.js');
      element.setAttribute('data-lc-error', 'lib-missing');
      return null;
    }
    options = options || {};
    var kind = options.kind || 'candles';
    var isSparkline = kind === 'sparkline';
    var theme = readTheme(element);

    var defaultSettings = { seed: 7, count: isSparkline ? 36 : 96, base: 100, volatility: isSparkline ? 3 : 1.2, drift: 0, step: 300 };
    // Merge opts but never let an absent (undefined/null) attr clobber a
    // default — otherwise a missing data-lc-vol would yield NaN data.
    var config = Object.assign({}, defaultSettings);
    Object.keys(options).forEach(function (optionKey) {
      // 'vol' is the public data-lc-vol option name; map it onto config.volatility.
      var targetKey = optionKey === 'vol' ? 'volatility' : optionKey;
      if (options[optionKey] !== undefined && options[optionKey] !== null) config[targetKey] = options[optionKey];
    });

    var chart = LWC.createChart(element, {
      layout: {
        background: { type: 'solid', color: isSparkline ? 'transparent' : theme.bg },
        textColor: theme.text,
        fontFamily: MONO,
        fontSize: 10,
        attributionLogo: false
      },
      grid: isSparkline
        ? { vertLines: { visible: false }, horzLines: { visible: false } }
        : { vertLines: { color: theme.grid }, horzLines: { color: theme.grid } },
      crosshair: { mode: isSparkline ? 0 : (LWC.CrosshairMode ? LWC.CrosshairMode.Normal : 1) },
      rightPriceScale: {
        visible: !isSparkline,
        borderColor: theme.border,
        scaleMargins: { top: 0.12, bottom: isSparkline ? 0.04 : 0.12 }
      },
      timeScale: {
        visible: !isSparkline,
        borderColor: theme.border,
        timeVisible: true,
        secondsVisible: false,
        rightOffset: isSparkline ? 0 : 4,
        barSpacing: isSparkline ? 4 : 7
      },
      handleScroll: !isSparkline,
      handleScale: !isSparkline,
      kineticScroll: { mouse: false, touch: false },
      localization: { locale: 'en-US' }
    });

    var series, markersApi = null;

    if (kind === 'candles') {
      series = addSeries(chart, 'CandlestickSeries', {
        upColor: theme.up,
        downColor: theme.down,
        wickUpColor: theme.up,
        wickDownColor: theme.down,
        borderVisible: false,
        priceLineVisible: false,
        lastValueVisible: !isSparkline
      });
    } else if (kind === 'area' || kind === 'sparkline') {
      var stroke = config.color || theme.line;
      series = addSeries(chart, 'AreaSeries', {
        lineColor: stroke,
        lineWidth: isSparkline ? 1.5 : 2,
        topColor: toRgba(stroke, isSparkline ? 0.22 : 0.18),
        bottomColor: toRgba(stroke, 0),
        priceLineVisible: false,
        lastValueVisible: !isSparkline,
        crosshairMarkerVisible: !isSparkline
      });
    } else {
      series = addSeries(chart, 'LineSeries', {
        color: config.color || theme.line,
        lineWidth: isSparkline ? 1.5 : 2,
        priceLineVisible: false,
        lastValueVisible: !isSparkline,
        crosshairMarkerVisible: !isSparkline
      });
    }

    var markerConfig = options.markers;
    if (typeof markerConfig === 'string') {
      try { markerConfig = JSON.parse(markerConfig); } catch (error) { markerConfig = null; }
    }

    var seriesState = {
      seed: config.seed, base: config.base, volatility: config.volatility,
      drift: config.drift, count: config.count, step: config.step
    };

    function render() {
      var candles = generateCandles(seriesState);
      var data = (kind === 'candles') ? candles : candlesToValues(candles);
      series.setData(data);

      if (markerConfig && markerConfig.length) {
        var markers = markerConfig.map(function (marker) {
          var markerIndex = Math.max(0, Math.min(data.length - 1, marker.i || 0));
          return {
            time: data[markerIndex].time,
            position: marker.position || 'aboveBar',
            color: marker.color || theme.marker,
            shape: marker.shape || 'circle',
            text: marker.text || ''
          };
        });
        if (typeof LWC.createSeriesMarkers === 'function') {
          // v5: marker plugin
          if (!markersApi) markersApi = LWC.createSeriesMarkers(series, markers);
          else markersApi.setMarkers(markers);
        } else if (typeof series.setMarkers === 'function') {
          // v4
          series.setMarkers(markers);
        }
      }
      chart.timeScale().fitContent();
      element.__lcData = data;
      if (typeof sizeNow === 'function') sizeNow(); // force repaint (v5)
    }

    render();

    /* Explicit sizing — autoSize can measure 0 on first paint in a
       grid/absolute cell and never repaint; resize now + on change. */
    function sizeNow() {
      var width = element.clientWidth, height = element.clientHeight;
      if (width > 0 && height > 0) chart.resize(width, height, true); // forceRepaint
    }
    sizeNow();
    requestAnimationFrame(function () { sizeNow(); chart.timeScale().fitContent(); });
    // a second deferred pass covers the case where layout isn't flushed yet
    setTimeout(function () { sizeNow(); chart.timeScale().fitContent(); }, 60);
    if (global.ResizeObserver) {
      var resizeObserver = new ResizeObserver(function () { sizeNow(); });
      resizeObserver.observe(element);
    }

    element.__lcChart = chart;

    /* Re-apply theme colors when the page flips light/dark. Paper
       charts follow the page; ink charts stay dark (readTheme keeps
       the ink palette). Keeps current data — only recolors + repaints. */
    function retheme() {
      theme = readTheme(element);
      chart.applyOptions({
        layout: { background: { type: 'solid', color: isSparkline ? 'transparent' : theme.bg }, textColor: theme.text },
        grid: isSparkline
          ? { vertLines: { visible: false }, horzLines: { visible: false } }
          : { vertLines: { color: theme.grid }, horzLines: { color: theme.grid } },
        rightPriceScale: { borderColor: theme.border },
        timeScale: { borderColor: theme.border }
      });
      if (kind === 'candles') {
        series.applyOptions({
          upColor: theme.up, downColor: theme.down,
          wickUpColor: theme.up, wickDownColor: theme.down
        });
      } else if (kind === 'area' || kind === 'sparkline') {
        var stroke = config.color || theme.line;
        series.applyOptions({
          lineColor: stroke,
          topColor: toRgba(stroke, isSparkline ? 0.22 : 0.18),
          bottomColor: toRgba(stroke, 0)
        });
      } else {
        series.applyOptions({ color: config.color || theme.line });
      }
      sizeNow();
    }

    element.__lc = {
      chart: chart,
      series: series,
      retheme: retheme,
      setRange: function (label) {
        var preset = RANGES[String(label).trim().toLowerCase()];
        if (!preset) return;
        seriesState.step = preset.step;
        seriesState.count = preset.count;
        seriesState.volatility = config.volatility * preset.volatilityMultiplier;
        seriesState.seed = (config.seed + preset.index * 101) >>> 0;
        render();
      }
    };
    instances.push(element.__lc);
    ensureThemeObserver();
    element.setAttribute('data-lc-ready', '1');
    return element.__lc;
  }

  /* ---- wire timeframe tabs ---------------------------------- */
  function bindRanges(root) {
    root.querySelectorAll('.line-chart-wrapper').forEach(function (wrapper) {
      if (wrapper.__lcRangesBound) return;
      var mountElement = wrapper.querySelector('.line-chart-plot[data-lc]');
      if (!mountElement || !mountElement.__lc) return;
      var buttons = wrapper.querySelectorAll('.line-chart-wrapper__range-button');
      if (!buttons.length) return;
      wrapper.__lcRangesBound = true;
      var radios = Array.prototype.slice.call(buttons);

      // Normalize the roving Tab stop against the checked radio — never changes
      // the selected timeframe and never re-renders the chart on its own.
      var checkedIndex = radios.findIndex(function (radio) { return radio.getAttribute('aria-checked') === 'true'; });
      if (checkedIndex < 0) checkedIndex = 0;
      radios.forEach(function (radio, i) { radio.setAttribute('tabindex', i === checkedIndex ? '0' : '-1'); });

      // One selection path shared by pointer + keyboard: exactly one setRange,
      // one aria-checked, one roving tabindex 0. Other wrappers are untouched.
      function select(radio) {
        radios.forEach(function (other) {
          other.setAttribute('aria-checked', 'false');
          other.setAttribute('tabindex', '-1');
        });
        radio.setAttribute('aria-checked', 'true');
        radio.setAttribute('tabindex', '0');
        mountElement.__lc.setRange(radio.textContent);
      }

      radios.forEach(function (radio, index) {
        radio.addEventListener('click', function () { select(radio); });
        radio.addEventListener('keydown', function (event) {
          var targetIndex = null;
          switch (event.key) {
            case 'ArrowLeft':
            case 'ArrowUp':   targetIndex = (index - 1 + radios.length) % radios.length; break;
            case 'ArrowRight':
            case 'ArrowDown': targetIndex = (index + 1) % radios.length; break;
            case 'Home':      targetIndex = 0; break;
            case 'End':       targetIndex = radios.length - 1; break;
            default: return;
          }
          event.preventDefault();
          var targetRadio = radios[targetIndex];
          targetRadio.focus();
          select(targetRadio);
        });
      });
    });
  }

  /* ---- declarative scan ------------------------------------- */
  function readNumberAttribute(element, attributeName, fallback) {
    var rawValue = element.getAttribute(attributeName);
    return rawValue == null || rawValue === '' ? fallback : parseFloat(rawValue);
  }

  function init(root) {
    root = root || document;
    var mountNodes = root.querySelectorAll('[data-lc]:not([data-lc-ready])');
    mountNodes.forEach(function (element) {
      mount(element, {
        kind: element.getAttribute('data-lc') || 'candles',
        seed: readNumberAttribute(element, 'data-lc-seed', 7),
        base: readNumberAttribute(element, 'data-lc-base', 100),
        vol: readNumberAttribute(element, 'data-lc-vol', undefined),
        drift: readNumberAttribute(element, 'data-lc-drift', 0),
        count: readNumberAttribute(element, 'data-lc-count', undefined),
        step: readNumberAttribute(element, 'data-lc-step', undefined),
        color: element.getAttribute('data-lc-color') || undefined,
        markers: element.getAttribute('data-lc-markers') || undefined
      });
    });
    bindRanges(root);
    // safety pass — covers theme/vars settling right around mount
    setTimeout(rethemeAll, 0);
  }

  global.LcCharts = { mount: mount, init: init, bindRanges: bindRanges, readTheme: readTheme, rethemeAll: rethemeAll };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(); });
  } else {
    init();
  }
})(window);
