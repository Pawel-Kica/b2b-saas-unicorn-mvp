"use client";

import React, { useState, useRef, useEffect } from "react";

const DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function startDayOfWeek(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1; // Monday = 0
}

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function toDateStr(y: number, m: number, d: number) {
  return `${y}-${pad(m + 1)}-${pad(d)}`;
}

function parseDate(s: string) {
  const datePart = s.slice(0, 10);
  const [y, m, d] = datePart.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

function parseTime(s: string): { hour: number; minute: number } {
  // Supports "YYYY-MM-DDTHH:MM" or "YYYY-MM-DD HH:MM" or just "YYYY-MM-DD"
  const match = s.match(/[T ](\d{2}):(\d{2})/);
  if (match) return { hour: Number(match[1]), minute: Number(match[2]) };
  return { hour: 0, minute: 0 };
}

function formatDisplay(value: string, showTime: boolean): string {
  if (!value) return showTime ? "Pick date & time" : "Pick date";
  const datePart = value.slice(0, 10);
  if (!showTime) return datePart;
  const { hour, minute } = parseTime(value);
  return `${datePart} ${pad(hour)}:${pad(minute)}`;
}

interface DatePickerProps {
  value: string; // "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM"
  onChange: (value: string) => void;
  showTime?: boolean;
  className?: string;
}

export default function DatePicker({ value, onChange, showTime, className }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const parsed = value ? parseDate(value) : null;
  const time = value && showTime ? parseTime(value) : { hour: 0, minute: 0 };
  const [viewYear, setViewYear] = useState(parsed?.year ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? new Date().getMonth());
  const ref = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Reset view when opening
  useEffect(() => {
    if (open && parsed) {
      setViewYear(parsed.year);
      setViewMonth(parsed.month);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Position popover above if it would overflow viewport
  useEffect(() => {
    if (!open || !popoverRef.current || !ref.current) return;
    const popover = popoverRef.current;
    const trigger = ref.current;
    const triggerRect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    if (spaceBelow < 360) {
      popover.style.bottom = "100%";
      popover.style.top = "auto";
      popover.style.marginBottom = "4px";
    } else {
      popover.style.top = "100%";
      popover.style.bottom = "auto";
      popover.style.marginTop = "4px";
    }
  }, [open]);

  function buildValue(dateStr: string, h: number, m: number) {
    if (!showTime) return dateStr;
    return `${dateStr}T${pad(h)}:${pad(m)}`;
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function selectDay(day: number) {
    const dateStr = toDateStr(viewYear, viewMonth, day);
    onChange(buildValue(dateStr, time.hour, time.minute));
    if (!showTime) setOpen(false);
  }

  function handleTimeChange(h: number, m: number) {
    const datePart = value ? value.slice(0, 10) : toDateStr(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    onChange(buildValue(datePart, h, m));
  }

  function handleNow() {
    const now = new Date();
    const dateStr = toDateStr(now.getFullYear(), now.getMonth(), now.getDate());
    onChange(buildValue(dateStr, now.getHours(), now.getMinutes()));
    setOpen(false);
  }

  const days = daysInMonth(viewYear, viewMonth);
  const startDay = startDayOfWeek(viewYear, viewMonth);
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const selectedDateStr = value ? value.slice(0, 10) : "";
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <div ref={ref} className={`relative inline-block ${className ?? ""}`}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface h-[22px] px-2 text-xs font-medium text-foreground tabular-nums leading-none focus:outline-none focus:ring-2 focus:ring-accent/50 transition-colors hover:bg-surface-hover cursor-pointer"
      >
        {formatDisplay(value, !!showTime)}
        <svg className="h-3 w-3 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute left-0 z-50 w-64 rounded-xl border border-border bg-surface shadow-xl shadow-black/40 p-3"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <span className="text-sm font-medium text-foreground">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="flex h-7 w-7 items-center justify-center rounded-md text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-muted py-1">
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              if (day === null) return <div key={`e${i}`} />;
              const dateStr = toDateStr(viewYear, viewMonth, day);
              const isSelected = dateStr === selectedDateStr;
              const isToday = dateStr === todayStr;
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => selectDay(day)}
                  className={`h-8 w-full rounded-md text-xs font-medium transition-colors
                    ${isSelected
                      ? "bg-accent text-white"
                      : isToday
                        ? "bg-accent/15 text-accent hover:bg-accent/25"
                        : "text-foreground hover:bg-surface-hover"
                    }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Time picker */}
          {showTime && (
            <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
              <svg className="h-3.5 w-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <input
                type="number"
                min={0}
                max={23}
                value={pad(time.hour)}
                onChange={(e) => handleTimeChange(Math.min(23, Math.max(0, Number(e.target.value))), time.minute)}
                className="w-10 rounded-md border border-border bg-background px-1.5 py-1 text-center text-xs text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
              <span className="text-xs text-muted font-bold">:</span>
              <input
                type="number"
                min={0}
                max={59}
                value={pad(time.minute)}
                onChange={(e) => handleTimeChange(time.hour, Math.min(59, Math.max(0, Number(e.target.value))))}
                className="w-10 rounded-md border border-border bg-background px-1.5 py-1 text-center text-xs text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
          )}

          {/* Today / Now shortcut */}
          <button
            type="button"
            onClick={showTime ? handleNow : () => { onChange(todayStr); setOpen(false); }}
            className="mt-2 w-full rounded-md py-1 text-xs font-medium text-accent hover:bg-accent/10 transition-colors"
          >
            {showTime ? "Now" : "Today"}
          </button>
        </div>
      )}
    </div>
  );
}
