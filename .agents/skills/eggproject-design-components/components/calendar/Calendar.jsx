/* global React */
(function () {
'use strict';
const { useState } = React;

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Mo','Tu','We','Th','Fr','Sa','Su'];

function daysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function firstDayOfWeek(year, month) {
  const weekday = new Date(year, month, 1).getDay();
  return weekday === 0 ? 6 : weekday - 1; // Mon-first
}
function isSameDay(dateA, dateB) { return dateA && dateB && dateA.getFullYear() === dateB.getFullYear() && dateA.getMonth() === dateB.getMonth() && dateA.getDate() === dateB.getDate(); }
// Full-date accessible name for a day cell (e.g. "Monday, June 15, 2026") — same
// contract as DatePicker.jsx so the two implementations do not drift on naming.
function formatDayLabel(date) { return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }); }

function Calendar({ value, onChange, minDate, maxDate, mode = 'single' }) {
  const today = new Date();
  const initialDate = value instanceof Date ? value : (Array.isArray(value) && value[0] instanceof Date ? value[0] : today);
  const [year, setYear] = useState(initialDate.getFullYear());
  const [month, setMonth] = useState(initialDate.getMonth());
  const [rangeStart, setRangeStart] = useState(Array.isArray(value) ? value[0] : null);
  const [rangeEnd, setRangeEnd] = useState(Array.isArray(value) ? value[1] : null);
  const [selected, setSelected] = useState(mode === 'single' ? (value instanceof Date ? value : null) : null);

  const goToPreviousMonth = () => { if (month === 0) { setYear(currentYear => currentYear - 1); setMonth(11); } else setMonth(currentMonth => currentMonth - 1); };
  const goToNextMonth = () => { if (month === 11) { setYear(currentYear => currentYear + 1); setMonth(0); } else setMonth(currentMonth => currentMonth + 1); };

  const daysInCurrentMonth = daysInMonth(year, month);
  const offset = firstDayOfWeek(year, month);
  const daysInPreviousMonth = daysInMonth(year, month - 1);

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push({ day: daysInPreviousMonth - offset + i + 1, outside: true, date: new Date(year, month - 1, daysInPreviousMonth - offset + i + 1) });
  for (let i = 1; i <= daysInCurrentMonth; i++) cells.push({ day: i, outside: false, date: new Date(year, month, i) });
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) cells.push({ day: i, outside: true, date: new Date(year, month + 1, i) });

  const handleClick = (cell) => {
    if (cell.disabled) return;
    if (mode === 'range') {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        setRangeStart(cell.date); setRangeEnd(null);
        onChange?.([cell.date, null]);
      } else {
        const end = cell.date < rangeStart ? rangeStart : cell.date;
        const start = cell.date < rangeStart ? cell.date : rangeStart;
        setRangeEnd(end); setRangeStart(start);
        onChange?.([start, end]);
      }
    } else {
      setSelected(cell.date);
      onChange?.(cell.date);
    }
  };

  const ChevLeft = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m10 4-4 4 4 4"/></svg>;
  const ChevRight = () => <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m6 4 4 4-4 4"/></svg>;

  return (
    <div className="calendar">
      <div className="calendar__header">
        <button className="calendar__navigation" onClick={goToPreviousMonth} aria-label="Previous month"><ChevLeft /></button>
        <span className="calendar__month-label">{MONTHS[month]} {year}</span>
        <button className="calendar__navigation" onClick={goToNextMonth} aria-label="Next month"><ChevRight /></button>
      </div>
      <div className="calendar__grid">
        {DAYS.map(dayName => <span key={dayName} className="calendar__day-name">{dayName}</span>)}
        {cells.map((cell, index) => {
          const isToday = isSameDay(cell.date, today);
          const isSelected = mode === 'single' && isSameDay(cell.date, selected);
          const isDisabled = (minDate && cell.date < minDate) || (maxDate && cell.date > maxDate);
          const isRangeStart = mode === 'range' && isSameDay(cell.date, rangeStart);
          const isRangeEnd = mode === 'range' && isSameDay(cell.date, rangeEnd);
          const isInRange = mode === 'range' && rangeStart && rangeEnd && cell.date > rangeStart && cell.date < rangeEnd;

          const dayClassName = [
            'calendar__day',
            cell.outside ? 'is-outside' : '',
            isToday ? 'is-today' : '',
            isSelected || isRangeStart || isRangeEnd ? 'is-selected' : '',
            isInRange ? 'is-range' : '',
            isRangeStart && rangeEnd ? 'is-range-start' : '',
            isRangeEnd ? 'is-range-end' : '',
            isDisabled ? 'is-disabled' : '',
          ].filter(Boolean).join(' ');

          return (
            <button
              key={index}
              className={dayClassName}
              onClick={() => handleClick({ ...cell, disabled: isDisabled })}
              disabled={isDisabled}
              aria-label={formatDayLabel(cell.date)}
              aria-pressed={(isSelected || isRangeStart || isRangeEnd) ? 'true' : undefined}
              aria-current={isToday ? 'date' : undefined}
              tabIndex={cell.outside ? -1 : 0}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { Calendar });
})();
