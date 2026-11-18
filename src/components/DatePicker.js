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

// A calendar date picker: a header with year navigation arrows and a
// month dropdown sitting right next to the year (click the month name to
// pick any of the 12 from a menu, instead of scrolling a sidebar list),
// then a day grid below. The selected day gets a gold ring so it's
// unmistakable which date is picked.
export default function DatePicker({ id, value, onChange, placeholder = 'Select date' }) {
  const today = new Date();
  const parsed = parseValue(value);
  const [open, setOpen] = useState(false);
  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const [viewYear, setViewYear] = useState(parsed ? parsed.year : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.month : today.getMonth());
  const ref = useRef(null);
  const monthSelectRef = useRef(null);

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
    } else {
      setMonthMenuOpen(false);
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
        id={id}
        className="pd-input pd-datepicker-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {value ? formatDisplay(value) : <span className="pd-datepicker-placeholder">{placeholder}</span>}
      </button>

      {open && (
        <div
          className="pd-datepicker-popover"
          onClick={(e) => {
            // Any click inside the popover that isn't on the month dropdown
            // itself (another day, the year arrows, etc.) closes the month
            // menu if it happens to be open, the same way clicking outside
            // a normal dropdown would.
            if (monthMenuOpen && monthSelectRef.current && !monthSelectRef.current.contains(e.target)) {
              setMonthMenuOpen(false);
            }
          }}
        >
          <div className="pd-datepicker-year-nav">
            <button type="button" onClick={() => setViewYear((y) => y - 1)} aria-label="Previous year">&lsaquo;</button>

            <div className="pd-datepicker-month-select" ref={monthSelectRef}>
              <button
                type="button"
                className="pd-datepicker-month-trigger"
                aria-haspopup="listbox"
                aria-expanded={monthMenuOpen}
                onClick={() => setMonthMenuOpen((v) => !v)}
              >
                {MONTHS[viewMonth]}
                <span className="pd-datepicker-chevron" aria-hidden="true">&#9662;</span>
              </button>
              {monthMenuOpen && (
                <div className="pd-datepicker-month-menu" role="listbox">
                  {MONTHS.map((m, i) => (
                    <button
                      type="button"
                      key={m}
                      role="option"
                      aria-selected={i === viewMonth}
                      className={`pd-datepicker-month-menu-item${i === viewMonth ? ' active' : ''}`}
                      onClick={() => {
                        setViewMonth(i);
                        setMonthMenuOpen(false);
                      }}
                    >
                      {m.slice(0, 3)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="pd-datepicker-year">{viewYear}</span>
            <button type="button" onClick={() => setViewYear((y) => y + 1)} aria-label="Next year">&rsaquo;</button>
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
      )}
    </div>
  );
}