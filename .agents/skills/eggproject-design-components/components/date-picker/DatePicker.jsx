/* global React */
const { useState, useMemo } = React;

/* ============ DatePicker ============
   Basic month-grid calendar (no popover wrapper — pair with <Popover>).

   Props:
     - value:     Date  (single) | undefined
     - onChange:  (Date) => void
     - month:     Date  — initial month (defaults to today or value)
     - minDate, maxDate: Date
     - showFooter: boolean — adds Today shortcut

   Display only — handles single-date select; range can be layered later.
============================================ */
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function isSameDay(dateA, dateB) {
  return dateA && dateB && dateA.getFullYear() === dateB.getFullYear() && dateA.getMonth() === dateB.getMonth() && dateA.getDate() === dateB.getDate();
}

// Full-date accessible name for a day cell (e.g. "Monday, March 9, 2026"),
// so a screen reader never announces a bare day number. Shared verbatim with
// Calendar.jsx to keep the two implementations' date-label contract aligned.
function formatDayLabel(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function DatePicker({ value, onChange, month: initialMonth, minDate, maxDate, showFooter = true, className = '' }) {
  const today = new Date();
  const [view, setView] = useState(() => initialMonth || value || today);

  const grid = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    // Week starts Monday (offset 0 = Monday)
    const weekday = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - weekday);
    const days = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  }, [view]);

  const go = (delta) => {
    const next = new Date(view); next.setMonth(view.getMonth() + delta);
    setView(next);
  };

  const monthName = MONTHS[view.getMonth()];
  const isDisabled = (day) => (minDate && day < minDate) || (maxDate && day > maxDate);

  return (
    <div className={`date-picker ${className}`}>
      <div className="date-picker__header">
        <button className="date-picker__navigation" onClick={() => go(-1)} aria-label="Previous month">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M10 4 6 8l4 4"/></svg>
        </button>
        <span className="date-picker__month">{monthName.split(' ')[0]} <em>{view.getFullYear()}</em></span>
        <button className="date-picker__navigation" onClick={() => go(1)} aria-label="Next month">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m6 4 4 4-4 4"/></svg>
        </button>
      </div>
      <div className="date-picker__grid">
        {WEEKDAYS.map((weekday) => <span key={weekday} className="date-picker__weekday">{weekday.slice(0, 2)}</span>)}
        {grid.map((day, i) => {
          const muted = day.getMonth() !== view.getMonth();
          const isSelected = value && isSameDay(day, value);
          const isToday = isSameDay(day, today);
          const classNames = [
            'date-picker__day',
            muted && 'date-picker__day--muted',
            isSelected && 'date-picker__day--selected',
            !isSelected && isToday && 'date-picker__day--today',
          ].filter(Boolean).join(' ');
          return (
            <button
              key={i}
              className={classNames}
              disabled={isDisabled(day)}
              aria-label={formatDayLabel(day)}
              aria-pressed={isSelected ? 'true' : undefined}
              aria-current={isToday ? 'date' : undefined}
              onClick={() => onChange?.(day)}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
      {showFooter && (
        <div className="date-picker__footer">
          <span>Today · {today.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
          <div className="date-picker__quick">
            <button onClick={() => onChange?.(today)}>Today</button>
            <button onClick={() => { const day = new Date(today); day.setDate(day.getDate() + 7); onChange?.(day); }}>+7 days</button>
          </div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { DatePicker });
