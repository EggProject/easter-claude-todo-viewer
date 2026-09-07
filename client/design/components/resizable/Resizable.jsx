/* global React */
(function () {
'use strict';
const { useState, useRef, useCallback, useEffect, Children } = React;

// Instance-unique id seed so panel ids never collide across multiple
// <Resizable> instances on one page (no useId — browser Babel safety).
let instanceCount = 0;

// Shared clamp: move the boundary between panel[i] and panel[i+1] by
// deltaPercent, keeping their pair-sum exact and each panel within [5, 95].
// Used by both the pointer drag and the keyboard path so the two can never
// diverge. Returns the original array unchanged when the move isn't possible.
function resizeAt(sizes, handleIndex, deltaPercent) {
  const a = sizes[handleIndex];
  const b = sizes[handleIndex + 1];
  if (!Number.isFinite(a) || !Number.isFinite(b)) return sizes;
  const pairTotal = a + b;
  const minA = 5;
  const maxA = Math.min(95, pairTotal - 5);
  const newA = Math.max(minA, Math.min(maxA, a + deltaPercent));
  const next = sizes.slice();
  next[handleIndex] = newA;
  next[handleIndex + 1] = pairTotal - newA;
  return next;
}

function Resizable({ children, direction = 'horizontal', defaultSizes }) {
  const panels = Children.toArray(children);
  const count = panels.length;
  const [sizes, setSizes] = useState(() => defaultSizes || Array(count).fill(100 / count));
  const [activeHandle, setActiveHandle] = useState(-1);
  const dragging = useRef(null);
  const containerRef = useRef(null);

  // Stable per-instance id base (assigned once on first render).
  const idBase = useRef(null);
  if (idBase.current === null) idBase.current = `resizable-${++instanceCount}`;
  const panelId = (i) => `${idBase.current}-panel-${i}`;

  const isVertical = direction === 'vertical';

  const handlePointerMove = useCallback((event) => {
    const d = dragging.current;
    if (!d || !containerRef.current) return;
    const pos = d.vertical ? event.clientY : event.clientX;
    const deltaPercent = ((pos - d.start) / d.totalSize) * 100;
    setSizes(resizeAt(d.startSizes, d.handleIndex, deltaPercent));
  }, []);

  const handlePointerUp = useCallback(() => {
    dragging.current = null;
    setActiveHandle(-1);
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  }, [handlePointerMove]);

  // Pointer path covers mouse, pen and touch in one listener set.
  const handlePointerDown = useCallback((handleIndex, event) => {
    if (!containerRef.current) return;
    event.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    dragging.current = {
      handleIndex,
      vertical: isVertical,
      start: isVertical ? event.clientY : event.clientX,
      totalSize: isVertical ? rect.height : rect.width,
      startSizes: sizes.slice(),
    };
    setActiveHandle(handleIndex);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [sizes, isVertical, handlePointerMove, handlePointerUp]);

  // Keyboard path: arrows resize by 5pp (10pp with Shift); Home/End clamp
  // the leading panel to its min/max. Arrows perpendicular to the layout
  // are a no-op. aria-valuenow re-derives from sizes on the next render.
  const handleKeyDown = useCallback((handleIndex, event) => {
    const step = event.shiftKey ? 10 : 5;
    let delta = 0;
    switch (event.key) {
      case 'ArrowLeft':  if (!isVertical) delta = -step; break;
      case 'ArrowRight': if (!isVertical) delta = step; break;
      case 'ArrowUp':    if (isVertical) delta = -step; break;
      case 'ArrowDown':  if (isVertical) delta = step; break;
      case 'Home': event.preventDefault(); setSizes((prev) => resizeAt(prev, handleIndex, -100)); return;
      case 'End':  event.preventDefault(); setSizes((prev) => resizeAt(prev, handleIndex, 100)); return;
      default: return;
    }
    if (delta === 0) return;
    event.preventDefault();
    setSizes((prev) => resizeAt(prev, handleIndex, delta));
  }, [isVertical]);

  // Drop any in-flight window listeners if we unmount mid-drag.
  useEffect(() => () => {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);
  }, [handlePointerMove, handlePointerUp]);

  return (
    <div
      ref={containerRef}
      className={`resizable-group ${isVertical ? 'resizable-group--vertical' : ''}`}
      style={{ display: 'flex', flexDirection: isVertical ? 'column' : 'row' }}
    >
      {panels.map((panel, i) => (
        <React.Fragment key={i}>
          <div
            className="resizable-panel"
            id={panelId(i)}
            style={{ flexBasis: `${sizes[i]}%`, flexGrow: 0, flexShrink: 0 }}
          >
            {panel}
          </div>
          {i < count - 1 && (
            <div
              className={`resizable-handle${activeHandle === i ? ' is-dragging' : ''}`}
              role="separator"
              aria-orientation={isVertical ? 'horizontal' : 'vertical'}
              aria-label={`Resize panels ${i + 1} and ${i + 2}`}
              aria-controls={`${panelId(i)} ${panelId(i + 1)}`}
              aria-valuemin={5}
              aria-valuemax={95}
              aria-valuenow={Number.isFinite(sizes[i]) ? Math.round(sizes[i]) : undefined}
              tabIndex={0}
              onPointerDown={(event) => handlePointerDown(i, event)}
              onKeyDown={(event) => handleKeyDown(i, event)}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

Object.assign(window, { Resizable });
})();
