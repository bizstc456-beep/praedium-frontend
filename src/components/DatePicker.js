import React, { useState, useRef, useEffect } from 'react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function pad(n) {
  return String(n).padStart(2, '0');
}

function toDateInputValue(y, m, d) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function parseValue(value) {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return { year: y, month: m - 1, day: d };
}

function formatDisplay(value) {
  const parsed = parseValue(value);
  if (!parsed) return '';
  const date = new Date(parsed.year, parsed.month, parsed.day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// A calendar date picker: year navigation on top, a scrollable month list
// down the left side, and a day grid on the right. The selected day gets
// a gold ring so it's unmistakable which date is picked.
export default function DatePicker({ value, onChange, placeholder = 'Select date' }) {
  const today = new Date();
  const parsed = parseValue(value);
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed ? parsed.year : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.month : today.getMonth());
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      const p = parseValue(value);
      setViewYear(p ? p.year : today.getFullYear());
      setViewMonth(p ? p.month : today.getMonth());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectDay = (day) => {
    onChange(toDateInputValue(viewYear, viewMonth, day));
    setOpen(false);
  };

  const isSelected = (day) =>
    parsed && parsed.year === viewYear && parsed.month === viewMonth && parsed.day === day;

  const isToday = (day) =>
    today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;

  return (
    <div className="pd-datepicker" ref={ref}>
      <button
        type="button"
        className="pd-input pd-datepicker-trigger"
        onClick={() => setOpen((v) => !v)}
      >
        {value ? formatDisplay(value) : <span className="pd-datepicker-placeholder">{placeholder}</span>}
      </button>

      {open && (
        <div className="pd-datepicker-popover">
          <div className="pd-datepicker-year-nav">
            <button type="button" onClick={() => setViewYear((y) => y - 1)} aria-label="Previous year">&lsaquo;</button>
            <span>{viewYear}</span>
            <button type="button" onClick={() => setViewYear((y) => y + 1)} aria-label="Next year">&rsaquo;</button>
          </div>

          <div className="pd-datepicker-body">
            <div className="pd-datepicker-months">
              {MONTHS.map((m, i) => (
                <button
                  type="button"
                  key={m}
                  className={`pd-datepicker-month-item${i === viewMonth ? ' active' : ''}`}
                  onClick={() => setViewMonth(i)}
                >
                  {m.slice(0, 3)}
                </button>
              ))}
            </div>

            <div className="pd-datepicker-calendar">
              <div className="pd-datepicker-weekdays">
                {WEEKDAYS.map((w) => (
                  <span key={w}>{w}</span>
                ))}
              </div>
              <div className="pd-datepicker-days">
                {cells.map((day, idx) =>
                  day === null ? (
                    <span key={`empty-${idx}`} className="pd-datepicker-day empty" />
                  ) : (
                    <button
                      type="button"
                      key={day}
                      className={`pd-datepicker-day${isSelected(day) ? ' selected' : ''}${isToday(day) && !isSelected(day) ? ' today' : ''}`}
                      onClick={() => selectDay(day)}
                    >
                      {day}
                    </button>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}