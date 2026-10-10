import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Check, Search, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useHabitStore } from '../../store/useHabitStore';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  const currentDate = useHabitStore((s) => s.currentDate);
  const selectedYear = useHabitStore((s) => s.selectedYear);
  const selectedMonth = useHabitStore((s) => s.selectedMonth);
  const prevMonth = useHabitStore((s) => s.prevMonth);
  const nextMonth = useHabitStore((s) => s.nextMonth);
  const setMonth = useHabitStore((s) => s.setMonth);
  const setYear = useHabitStore((s) => s.setYear);
  const jumpToToday = useHabitStore((s) => s.jumpToToday);
  const setCommandPaletteOpen = useHabitStore((s) => s.setCommandPaletteOpen);
  const openHabitModal = useHabitStore((s) => s.openHabitModal);

  const [monthMenuOpen, setMonthMenuOpen] = useState(false);
  const [yearMenuOpen, setYearMenuOpen] = useState(false);
  const selectorRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(e.target as Node)) {
        setMonthMenuOpen(false);
        setYearMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMonthMenuOpen(false);
        setYearMenuOpen(false);
      }
    };

    if (monthMenuOpen || yearMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [monthMenuOpen, yearMenuOpen]);

  const isCurrentMonthView =
    currentDate.getFullYear() === selectedYear &&
    currentDate.getMonth() === selectedMonth;

  const currentYear = currentDate.getFullYear();
  const yearOptions = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 select-none">
      {/* Title & Subtitle */}
      <div>
        <h1
          style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}
          className="text-[22px] font-bold leading-tight"
        >
          {title}
        </h1>
        <p
          style={{ color: 'var(--text-secondary)' }}
          className="text-[12px] font-medium mt-0.2"
        >
          {format(currentDate, 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Controls & + Add Habit */}
      <div className="flex items-center flex-wrap gap-2">
        {/* + Add Habit button in Header */}
        <button
          onClick={() => openHabitModal()}
          style={{
            backgroundColor: 'var(--btn-primary-bg)',
            color: 'var(--btn-primary-text)',
            boxShadow: 'var(--btn-primary-shadow)',
          }}
          className="mobile-hide h-8 px-3.5 hover:opacity-90 rounded-[5px] flex items-center gap-1.5 text-[12.5px] font-bold transition-all active:scale-[0.98] cursor-pointer"
          title="Add Habit (N)"
        >
          <Plus size={15} strokeWidth={2.4} />
          <span>Add Habit</span>
        </button>

        {/* Quick search shortcut */}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
          className="mobile-hide h-8 px-2.5 hover:text-[var(--text-primary)] rounded-[5px] flex items-center gap-1.5 text-[12px] font-medium transition-colors border cursor-pointer"
          title="Command Palette (Ctrl+K)"
        >
          <Search size={14} />
          <kbd
            style={{
              backgroundColor: 'var(--bg-surface-hover)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
            className="text-[10px] px-1 py-0.2 rounded font-mono border"
          >
            Ctrl+K
          </kbd>
        </button>

        {/* Studio Themed Month & Year Selectors & Chevrons */}
        <div
          ref={selectorRef}
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
          className="relative flex items-center p-0.5 rounded-[5px] border"
        >
          {/* Previous Month Chevron */}
          <button
            onClick={prevMonth}
            style={{ color: 'var(--text-secondary)' }}
            className="w-7 h-7 flex items-center justify-center hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] rounded-[4px] transition-colors cursor-pointer"
            title="Previous month"
            aria-label="Previous month"
          >
            <ChevronLeft size={14} />
          </button>

          {/* Custom Studio Month Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setMonthMenuOpen((prev) => !prev);
                setYearMenuOpen(false);
              }}
              style={{
                backgroundColor: monthMenuOpen ? 'var(--bg-surface-hover)' : 'transparent',
                color: 'var(--text-primary)',
              }}
              className="flex items-center gap-1 text-[13px] font-semibold px-2 py-1 rounded-[4px] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
              title="Select Month"
            >
              <span>{MONTH_NAMES[selectedMonth]}</span>
              <ChevronDown
                size={11}
                className={`text-[var(--text-muted)] transition-transform duration-150 ${
                  monthMenuOpen ? 'rotate-180 text-[var(--accent-primary)]' : ''
                }`}
              />
            </button>

            {/* Studio Month Menu */}
            {monthMenuOpen && (
              <div
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-medium)',
                  boxShadow: 'var(--shadow-dropdown)',
                  top: 'calc(100% + 6px)',
                }}
                className="absolute left-0 w-[155px] max-h-[300px] overflow-y-auto rounded-[6px] border p-1 z-50 flex flex-col gap-0.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
              >
                {MONTH_NAMES.map((name, idx) => {
                  const isSelected = idx === selectedMonth;
                  return (
                    <button
                      key={name}
                      onClick={() => {
                        setMonth(idx);
                        setMonthMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[4px] text-[12px] font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--bg-surface-hover)] text-[var(--accent-primary)] font-bold'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                      }`}
                    >
                      <span>{name}</span>
                      {isSelected && <Check size={13} className="text-[var(--accent-primary)]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Custom Studio Year Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setYearMenuOpen((prev) => !prev);
                setMonthMenuOpen(false);
              }}
              style={{
                backgroundColor: yearMenuOpen ? 'var(--bg-surface-hover)' : 'transparent',
                color: 'var(--text-secondary)',
              }}
              className="flex items-center gap-1 text-[13px] font-medium font-num px-2 py-1 rounded-[4px] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
              title="Select Year"
            >
              <span>{selectedYear}</span>
              <ChevronDown
                size={11}
                className={`text-[var(--text-muted)] transition-transform duration-150 ${
                  yearMenuOpen ? 'rotate-180 text-[var(--accent-primary)]' : ''
                }`}
              />
            </button>

            {/* Studio Year Menu */}
            {yearMenuOpen && (
              <div
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-medium)',
                  boxShadow: 'var(--shadow-dropdown)',
                  top: 'calc(100% + 6px)',
                }}
                className="absolute left-0 w-[105px] max-h-[240px] overflow-y-auto rounded-[6px] border p-1 z-50 flex flex-col gap-0.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 font-num"
              >
                {yearOptions.map((y) => {
                  const isSelected = y === selectedYear;
                  return (
                    <button
                      key={y}
                      onClick={() => {
                        setYear(y);
                        setYearMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-[4px] text-[12px] font-medium transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[var(--bg-surface-hover)] text-[var(--accent-primary)] font-bold'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)]'
                      }`}
                    >
                      <span>{y}</span>
                      {isSelected && <Check size={13} className="text-[var(--accent-primary)]" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Next Month Chevron */}
          <button
            onClick={nextMonth}
            style={{ color: 'var(--text-secondary)' }}
            className="w-7 h-7 flex items-center justify-center hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] rounded-[4px] transition-colors cursor-pointer"
            title="Next month"
            aria-label="Next month"
          >
            <ChevronRight size={14} />
          </button>
        </div>

        {/* Jump to Today Button */}
        <button
          onClick={jumpToToday}
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: isCurrentMonthView ? 'var(--border-subtle)' : 'var(--accent-primary)',
            color: isCurrentMonthView ? 'var(--text-secondary)' : 'var(--text-primary)',
          }}
          className="h-8 px-3 rounded-[5px] text-[12px] font-semibold flex items-center gap-1.5 transition-all border cursor-pointer hover:bg-[var(--bg-surface-hover)]"
          title="Jump to Today (T)"
        >
          <span
            style={{
              backgroundColor: isCurrentMonthView ? 'var(--status-success)' : 'var(--accent-primary)',
            }}
            className={`w-1.5 h-1.5 rounded-full ${!isCurrentMonthView ? 'animate-pulse' : ''}`}
          />
          Today
        </button>
      </div>
    </header>
  );
};
