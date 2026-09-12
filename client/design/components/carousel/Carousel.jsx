/* global React */
(function () {
'use strict';
const { useState, useEffect, Children } = React;

/* ============ Carousel ============
   Slide deck with prev/next + dot navigation and optional auto-play.
   ARIA: carousel-region pattern (NOT tabs) — root role="region" +
   aria-roledescription="carousel"; slides are role="group" +
   aria-roledescription="slide"; dots are plain buttons using aria-current.
   Auto-play is user-stoppable (pause/play button + pause on hover/focus)
   and honours prefers-reduced-motion via carousel.css.

   Props:
     - children: slide content (one node per slide)
     - autoPlay: boolean — advance on a timer (default false)
     - interval: number  — ms between auto-advances (default 4000)
     - showDots: boolean — render dot navigation (default true)
     - label:    string  — accessible name for the carousel region
============================================ */
function Carousel({ children, autoPlay = false, interval = 4000, showDots = true, label = 'Carousel' }) {
  const slides = Children.toArray(children);
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [isPaused, setPaused] = useState(false);           // explicit pause (button)
  const [isInteracting, setInteracting] = useState(false); // transient hover / focus pause

  const goToSlide = (targetIndex) => { if (count) setIndex((targetIndex + count) % count); };

  const isAutoPlaying = autoPlay && !isPaused && !isInteracting && count > 1;
  useEffect(() => {
    if (!isAutoPlaying) return undefined;
    const id = setInterval(() => setIndex((current) => (current + 1) % count), interval);
    return () => clearInterval(id);
  }, [isAutoPlaying, interval, count]);

  // Pause handlers attach only when autoPlay is on, so a static carousel
  // keeps its original behaviour exactly (no hover/focus side effects).
  const pauseHandlers = autoPlay
    ? {
        onMouseEnter: () => setInteracting(true),
        onMouseLeave: () => setInteracting(false),
        onFocus: () => setInteracting(true),
        onBlur: (event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setInteracting(false);
        },
      }
    : {};

  const IconChevron = ({ dir }) => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={dir === 'left' ? 'm10 4-4 4 4 4' : 'm6 4 4 4-4 4'} />
    </svg>
  );
  const IconPause = () => (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="4.5" y="3" width="2.4" height="10" rx="0.6" />
      <rect x="9.1" y="3" width="2.4" height="10" rx="0.6" />
    </svg>
  );
  const IconPlay = () => (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M5 3.2 12.6 8 5 12.8z" />
    </svg>
  );

  return (
    <div
      className="carousel"
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      {...pauseHandlers}
    >
      <div className="carousel__viewport">
        <div className="carousel__track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {slides.map((slide, i) => (
            <div
              key={i}
              className="carousel__slide"
              role="group"
              aria-roledescription="slide"
              aria-label={`Slide ${i + 1} of ${count}`}
              aria-hidden={i === index ? undefined : true}
              inert={i === index ? undefined : ''}
            >
              {slide}
            </div>
          ))}
        </div>
      </div>

      {count > 1 && (
        <>
          <button className="carousel__previous" type="button" onClick={() => goToSlide(index - 1)} aria-label="Previous slide">
            <IconChevron dir="left" />
          </button>
          <button className="carousel__next" type="button" onClick={() => goToSlide(index + 1)} aria-label="Next slide">
            <IconChevron dir="right" />
          </button>

          {autoPlay && (
            <button
              className="carousel__pause"
              type="button"
              onClick={() => setPaused((paused) => !paused)}
              aria-label={isPaused ? 'Play carousel' : 'Pause carousel'}
            >
              {isPaused ? <IconPlay /> : <IconPause />}
            </button>
          )}

          {showDots && (
            <div className="carousel__dots">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  className={`carousel__dot ${i === index ? 'is-active' : ''}`}
                  onClick={() => setIndex(i)}
                  aria-label={`Go to slide ${i + 1} of ${count}`}
                  aria-current={i === index ? 'true' : undefined}
                />
              ))}
            </div>
          )}
        </>
      )}

      <div className="carousel__status" aria-live={isAutoPlaying ? 'off' : 'polite'} aria-atomic="true">
        {count ? `Slide ${index + 1} of ${count}` : ''}
      </div>
    </div>
  );
}

Object.assign(window, { Carousel });
})();
