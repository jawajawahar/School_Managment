import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronDown, Check, X } from 'lucide-react';
import { cn } from '../../lib/cn';

export interface DatePickerProps {
  value?: string; // YYYY-MM-DD format
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  required?: boolean;
  id?: string;
  name?: string;
  minDate?: string;
  maxDate?: string;
  align?: 'left' | 'right' | 'auto';
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

const CURRENT_YEAR = new Date().getFullYear();
// Generate year list from CURRENT_YEAR + 6 down to 1945 for effortless DOB / past / future date selection
const YEARS = Array.from({ length: CURRENT_YEAR - 1945 + 7 }, (_, i) => CURRENT_YEAR + 6 - i);

// Helper for timezone-safe YYYY-MM-DD parsing (0-indexed month)
function parseYYYYMMDD(str?: string): { year: number; month: number; day: number } | null {
  if (!str) return null;
  const trimmed = str.trim();
  const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // 0-indexed
  const day = parseInt(match[3], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  return { year, month, day };
}

function formatYYYYMMDD(year: number, month: number, day: number): string {
  const mStr = String(month + 1).padStart(2, '0');
  const dStr = String(day).padStart(2, '0');
  return `${year}-${mStr}-${dStr}`;
}

function formatDisplayDate(dateStr?: string): string {
  const parsed = parseYYYYMMDD(dateStr);
  if (!parsed) return '';
  const d = new Date(Date.UTC(parsed.year, parsed.month, parsed.day));
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value = '',
  onChange,
  placeholder = 'Select date',
  className,
  disabled = false,
  required = false,
  id,
  name,
  minDate,
  maxDate,
  align = 'auto',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [effectiveAlign, setEffectiveAlign] = useState<'left' | 'right'>(align === 'right' ? 'right' : 'left');

  // Custom modern dropdown states
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [isYearOpen, setIsYearOpen] = useState(false);
  const yearListRef = useRef<HTMLDivElement>(null);

  // Parse current value
  const parsed = parseYYYYMMDD(value);
  const today = new Date();

  const [viewYear, setViewYear] = useState<number>(parsed ? parsed.year : today.getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(parsed ? parsed.month : today.getMonth());
  const [inputValue, setInputValue] = useState<string>('');

  useEffect(() => {
    if (align === 'right' || align === 'left') {
      setEffectiveAlign(align);
      return;
    }
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.left + 315 > window.innerWidth - 30 || rect.right > window.innerWidth * 0.7) {
        setEffectiveAlign('right');
      } else {
        setEffectiveAlign('left');
      }
    }
  }, [isOpen, align]);

  // Auto-scroll selected year into view when year dropdown opens
  useEffect(() => {
    if (isYearOpen && yearListRef.current) {
      setTimeout(() => {
        const activeEl = yearListRef.current?.querySelector(`#year-item-${viewYear}`) as HTMLElement;
        if (activeEl) {
          activeEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      }, 40);
    }
  }, [isYearOpen, viewYear]);

  // Sync view & input text when value prop changes
  useEffect(() => {
    const p = parseYYYYMMDD(value);
    if (p) {
      setViewYear(p.year);
      setViewMonth(p.month);
      setInputValue(formatDisplayDate(value));
    } else {
      setInputValue(value || '');
    }
  }, [value]);

  // Handle outside clicks to close popover
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsMonthOpen(false);
        setIsYearOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Auto-apply Year & Month changes to current value so input field updates live
  const updateDateForYearMonth = (newYear: number, newMonth: number) => {
    setViewYear(newYear);
    setViewMonth(newMonth);

    const currentParsed = parseYYYYMMDD(value);
    const dayToUse = currentParsed ? currentParsed.day : 1;
    const maxDaysInNewMonth = new Date(newYear, newMonth + 1, 0).getDate();
    const clampedDay = Math.min(dayToUse, maxDaysInNewMonth);
    const newDateStr = formatYYYYMMDD(newYear, newMonth, clampedDay);
    onChange(newDateStr);
  };

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMonthOpen(false);
    setIsYearOpen(false);
    let nY = viewYear;
    let nM = viewMonth - 1;
    if (nM < 0) {
      nM = 11;
      nY -= 1;
    }
    updateDateForYearMonth(nY, nM);
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMonthOpen(false);
    setIsYearOpen(false);
    let nY = viewYear;
    let nM = viewMonth + 1;
    if (nM > 11) {
      nM = 0;
      nY += 1;
    }
    updateDateForYearMonth(nY, nM);
  };

  const handlePrevYear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMonthOpen(false);
    setIsYearOpen(false);
    updateDateForYearMonth(viewYear - 1, viewMonth);
  };

  const handleNextYear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsMonthOpen(false);
    setIsYearOpen(false);
    updateDateForYearMonth(viewYear + 1, viewMonth);
  };

  const handleSelectDay = (day: number) => {
    const dateString = formatYYYYMMDD(viewYear, viewMonth, day);
    onChange(dateString);
    setIsOpen(false);
    setIsMonthOpen(false);
    setIsYearOpen(false);
  };

  const handleSelectToday = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const todayObj = new Date();
    const dateString = formatYYYYMMDD(todayObj.getFullYear(), todayObj.getMonth(), todayObj.getDate());
    setViewYear(todayObj.getFullYear());
    setViewMonth(todayObj.getMonth());
    onChange(dateString);
    setIsOpen(false);
    setIsMonthOpen(false);
    setIsYearOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange('');
    setInputValue('');
  };

  // Support typing in input directly
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputValue(text);

    // Try parsing YYYY-MM-DD
    let p = parseYYYYMMDD(text);

    // Try parsing DD/MM/YYYY or DD-MM-YYYY or YYYY/MM/DD
    if (!p) {
      const parts = text.split(/[/.-]/);
      if (parts.length === 3) {
        const p1 = parseInt(parts[0], 10);
        const p2 = parseInt(parts[1], 10);
        const p3 = parseInt(parts[2], 10);
        if (p3 > 1900 && p2 >= 1 && p2 <= 12 && p1 >= 1 && p1 <= 31) {
          p = { year: p3, month: p2 - 1, day: p1 };
        } else if (p1 > 1900 && p2 >= 1 && p2 <= 12 && p3 >= 1 && p3 <= 31) {
          p = { year: p1, month: p2 - 1, day: p3 };
        }
      }
    }

    if (p) {
      const dateStr = formatYYYYMMDD(p.year, p.month, p.day);
      setViewYear(p.year);
      setViewMonth(p.month);
      onChange(dateStr);
    } else if (text === '') {
      onChange('');
    }
  };

  // Calendar math
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayIndex = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7; // Monday = 0

  const todayObj = new Date();
  const todayY = todayObj.getFullYear();
  const todayM = todayObj.getMonth();
  const todayD = todayObj.getDate();

  const formattedDisplay = formatDisplayDate(value);

  return (
    <div ref={containerRef} className={cn('relative inline-block w-full', className)}>
      {/* Input Field with Calendar Trigger */}
      <div className="relative flex items-center w-full">
        <input
          type="text"
          id={id}
          name={name}
          disabled={disabled}
          required={required}
          value={isOpen ? inputValue : formattedDisplay || value}
          onChange={handleInputChange}
          onFocus={() => {
            setIsOpen(true);
            setInputValue(formattedDisplay || value);
          }}
          placeholder={placeholder}
          className={cn(
            'w-full pl-9 pr-9 py-2.5 bg-surface border border-border rounded-xl text-sm font-medium text-ink transition-all shadow-xs focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand',
            disabled && 'opacity-50 cursor-not-allowed bg-surface-muted',
            isOpen && 'border-brand ring-2 ring-brand/20'
          )}
        />
        <CalendarIcon
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className="w-4 h-4 text-brand absolute left-3.5 pointer-events-auto cursor-pointer"
        />
        {value && !disabled ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 p-1 rounded-full hover:bg-surface-muted text-ink-faint hover:text-ink transition-colors cursor-pointer"
            title="Clear date"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span
            onClick={() => !disabled && setIsOpen((prev) => !prev)}
            className="absolute right-3.5 text-ink-faint text-xs font-mono-data cursor-pointer"
          >
            ▾
          </span>
        )}
      </div>

      {/* Popover Calendar Panel */}
      {isOpen && (
        <div
          className={cn(
            'absolute top-full mt-2 z-50 bg-surface border border-border rounded-2xl shadow-xl p-3.5 w-[310px] animate-fade-in',
            effectiveAlign === 'right' ? 'right-0' : 'left-0 sm:right-auto'
          )}
        >
          {/* Header Controls with Custom Month & Year Buttons */}
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-border gap-1">
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handlePrevYear}
                className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors cursor-pointer"
                title="Previous year (-1 yr)"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors cursor-pointer"
                title="Previous month (-1 mo)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Modern Custom Month & Year Dropdown Triggers */}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsMonthOpen((prev) => !prev);
                  setIsYearOpen(false);
                }}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer shadow-2xs',
                  isMonthOpen
                    ? 'bg-brand text-white border-brand shadow-xs'
                    : 'bg-surface border-border text-ink hover:border-brand/60 hover:bg-surface-muted'
                )}
                title="Select month"
              >
                <span>{MONTH_NAMES[viewMonth]}</span>
                <ChevronDown className={cn('w-3 h-3 transition-transform duration-200', isMonthOpen && 'rotate-180')} />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsYearOpen((prev) => !prev);
                  setIsMonthOpen(false);
                }}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 text-xs font-semibold font-mono-data rounded-lg border transition-all cursor-pointer shadow-2xs',
                  isYearOpen
                    ? 'bg-brand text-white border-brand shadow-xs'
                    : 'bg-surface border-border text-ink hover:border-brand/60 hover:bg-surface-muted'
                )}
                title="Select year"
              >
                <span>{viewYear}</span>
                <ChevronDown className={cn('w-3 h-3 transition-transform duration-200', isYearOpen && 'rotate-180')} />
              </button>
            </div>

            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors cursor-pointer"
                title="Next month (+1 mo)"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextYear}
                className="p-1 rounded-lg text-ink-muted hover:text-ink hover:bg-surface-muted transition-colors cursor-pointer"
                title="Next year (+1 yr)"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Custom Modern Month Dropdown Panel */}
          {isMonthOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute top-[52px] left-3 right-3 z-30 bg-surface/98 backdrop-blur-md border border-border rounded-xl shadow-2xl p-2.5 animate-scale-in"
            >
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                  Select Month
                </span>
                <button
                  type="button"
                  onClick={() => setIsMonthOpen(false)}
                  className="text-ink-faint hover:text-ink text-xs p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {MONTH_NAMES.map((name, idx) => {
                  const isSelected = viewMonth === idx;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => {
                        updateDateForYearMonth(viewYear, idx);
                        setIsMonthOpen(false);
                      }}
                      className={cn(
                        'py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-between',
                        isSelected
                          ? 'bg-brand text-white shadow-xs font-bold'
                          : 'text-ink hover:bg-brand-tint hover:text-brand bg-surface-muted/40'
                      )}
                    >
                      <span>{name.substring(0, 3)}</span>
                      {isSelected && <Check className="w-3 h-3 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Modern Year Dropdown Panel */}
          {isYearOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute top-[52px] left-3 right-3 z-30 bg-surface/98 backdrop-blur-md border border-border rounded-xl shadow-2xl p-2.5 animate-scale-in"
            >
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                  Select Year
                </span>
                <button
                  type="button"
                  onClick={() => setIsYearOpen(false)}
                  className="text-ink-faint hover:text-ink text-xs p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick Decade Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1.5 mb-2 border-b border-border/60">
                {[CURRENT_YEAR, 2020, 2015, 2010, 2005, 2000, 1995, 1990].map((y) => (
                  <button
                    key={y}
                    type="button"
                    onClick={() => {
                      updateDateForYearMonth(y, viewMonth);
                      setIsYearOpen(false);
                    }}
                    className={cn(
                      'px-2 py-0.5 rounded text-[11px] font-mono-data whitespace-nowrap transition-colors cursor-pointer shrink-0',
                      viewYear === y
                        ? 'bg-brand text-white font-bold shadow-xs'
                        : 'bg-surface-muted hover:bg-brand-tint hover:text-brand text-ink-muted'
                    )}
                  >
                    {y}
                  </button>
                ))}
              </div>

              {/* Scrollable modern Year list */}
              <div
                ref={yearListRef}
                className="max-h-48 overflow-y-auto pr-1 grid grid-cols-3 gap-1.5 custom-scrollbar"
              >
                {YEARS.map((y) => {
                  const isSelected = viewYear === y;
                  return (
                    <button
                      key={y}
                      id={`year-item-${y}`}
                      type="button"
                      onClick={() => {
                        updateDateForYearMonth(y, viewMonth);
                        setIsYearOpen(false);
                      }}
                      className={cn(
                        'py-1.5 px-2 rounded-lg text-xs font-mono-data font-semibold transition-all cursor-pointer flex items-center justify-between',
                        isSelected
                          ? 'bg-brand text-white shadow-xs font-bold ring-1.5 ring-brand/30'
                          : 'text-ink hover:bg-brand-tint hover:text-brand bg-surface-muted/40'
                      )}
                    >
                      <span>{y}</span>
                      {isSelected && <Check className="w-3 h-3 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {WEEKDAYS.map((wd) => (
              <div key={wd} className="text-xs font-semibold text-ink-faint uppercase py-1">
                {wd}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty slots for start offset */}
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`empty-${i}`} className="h-8 w-8" />
            ))}

            {/* Month Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = formatYYYYMMDD(viewYear, viewMonth, day);

              const isSelected = value === dateStr;
              const isToday = viewYear === todayY && viewMonth === todayM && day === todayD;

              let isDisabled = false;
              if (minDate && dateStr < minDate) isDisabled = true;
              if (maxDate && dateStr > maxDate) isDisabled = true;

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleSelectDay(day)}
                  className={cn(
                    'h-8 w-8 rounded-xl text-xs font-semibold flex items-center justify-center mx-auto transition-all duration-150 cursor-pointer',
                    isSelected
                      ? 'bg-brand text-white shadow-xs font-bold'
                      : isToday
                      ? 'ring-1.5 ring-brand text-brand font-bold bg-brand-tint/30'
                      : 'text-ink hover:bg-surface-muted hover:text-brand',
                    isDisabled && 'opacity-25 cursor-not-allowed hover:bg-transparent hover:text-ink'
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer Quick Actions & Decade Jumps */}
          <div className="flex flex-col gap-2 pt-2.5 mt-2.5 border-t border-border">
            {/* Quick Year Jumps */}
            <div className="flex items-center justify-between gap-1 text-[11px] text-ink-muted font-medium bg-surface-muted/60 p-1.5 rounded-lg">
              <span className="text-ink-faint shrink-0 font-semibold">Fast Jump:</span>
              <button
                type="button"
                onClick={() => updateDateForYearMonth(CURRENT_YEAR, viewMonth)}
                className="px-1.5 py-0.5 rounded hover:bg-surface text-ink transition-colors font-mono-data text-xs cursor-pointer"
                title="Current Year"
              >
                {CURRENT_YEAR}
              </button>
              <button
                type="button"
                onClick={() => updateDateForYearMonth(CURRENT_YEAR - 10, viewMonth)}
                className="px-1.5 py-0.5 rounded hover:bg-surface text-ink transition-colors font-mono-data text-xs cursor-pointer"
                title="Jump 10 years back (e.g. Student DOB)"
              >
                {CURRENT_YEAR - 10}
              </button>
              <button
                type="button"
                onClick={() => updateDateForYearMonth(CURRENT_YEAR - 15, viewMonth)}
                className="px-1.5 py-0.5 rounded hover:bg-surface text-ink transition-colors font-mono-data text-xs cursor-pointer"
                title="Jump 15 years back"
              >
                {CURRENT_YEAR - 15}
              </button>
              <button
                type="button"
                onClick={() => updateDateForYearMonth(2010, viewMonth)}
                className="px-1.5 py-0.5 rounded hover:bg-surface text-ink transition-colors font-mono-data text-xs cursor-pointer"
                title="Jump to 2010"
              >
                2010
              </button>
            </div>

            <div className="flex items-center justify-between text-xs font-semibold pt-0.5">
              <button
                type="button"
                onClick={handleSelectToday}
                className="text-brand hover:text-brand-hover transition-colors flex items-center gap-1 cursor-pointer"
              >
                Today ({todayD} {MONTH_NAMES[todayM].substring(0, 3)})
              </button>
              {value && !required && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-ink-faint hover:text-danger transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
