import React, { useState, useEffect, useRef } from 'react';
import {
  Minus,
  Square,
  Copy,
  X,
  Search,
  Sun,
  Moon,
  ChevronDown,
  Download,
  Database,
  Table,
  FileText,
  Flame,
  Check,
  LayoutGrid,
  BookOpen,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { formatLocalDate } from '../../lib/dateUtils';
import { isHabitScheduledOnDay, computeStreakStats } from '../../lib/statsUtils';
import {
  exportJSONBackup,
  exportCSVHistory,
  exportCSVMatrix,
  exportMarkdownSummary,
} from '../../lib/exportUtils';
import appLogo from '../../assets/icon.png';

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportToast, setExportToast] = useState<string | null>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  const setCommandPaletteOpen = useHabitStore((s) => s.setCommandPaletteOpen);
  const jumpToToday = useHabitStore((s) => s.jumpToToday);
  const theme = useHabitStore((s) => s.settings.theme || 'dark');
  const toggleTheme = useHabitStore((s) => s.toggleTheme);
  const authScreen = useHabitStore((s) => s.authScreen);
  const currentUser = useHabitStore((s) => s.currentUser);
  const setTab = useHabitStore((s) => s.setTab);
  const activeTab = useHabitStore((s) => s.activeTab);

  const habits = useHabitStore((s) => s.habits);
  const checkins = useHabitStore((s) => s.checkins);
  const allCheckinsList = useHabitStore((s) => s.allCheckinsList);
  const settings = useHabitStore((s) => s.settings);
  const currentDate = useHabitStore((s) => s.currentDate);

  const todayStr = formatLocalDate(currentDate);
  const todayWday = currentDate.getDay();
  const activeHabits = habits.filter((h) => !h.archived);
  const scheduledToday = activeHabits.filter((h) => isHabitScheduledOnDay(h, todayWday));
  const doneToday = scheduledToday.filter((h) => checkins[`${h.id}_${todayStr}`]?.completed).length;
  const streakStats = computeStreakStats(habits, allCheckinsList, settings.streak_threshold, currentDate);

  useEffect(() => {
    const updateMaxState = () => {
      if (window.api) {
        window.api.window.isMaximized().then(setIsMaximized).catch(() => {});
      }
    };
    updateMaxState();
    window.addEventListener('resize', updateMaxState);
    return () => window.removeEventListener('resize', updateMaxState);
  }, []);

  // Close export menu when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setExportMenuOpen(false);
      }
    };
    if (exportMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [exportMenuOpen]);

  const triggerToast = (msg: string) => {
    setExportToast(msg);
    if (window.api) {
      window.api.notify('Zion Studio', msg).catch(() => {});
    }
    setTimeout(() => {
      setExportToast(null);
    }, 3000);
  };

  const handleMinimize = () => {
    window.api?.window.minimize();
  };

  const handleMaximize = async () => {
    if (window.api) {
      const state = await window.api.window.maximize();
      setIsMaximized(state);
    }
  };

  const handleClose = () => {
    window.api?.window.close();
  };

  const handleExportJSON = () => {
    exportJSONBackup(habits, checkins, allCheckinsList, settings, currentDate);
    setExportMenuOpen(false);
    triggerToast('JSON backup exported successfully');
  };

  const handleExportCSV = () => {
    exportCSVHistory(habits, checkins, allCheckinsList, settings, currentDate);
    setExportMenuOpen(false);
    triggerToast('Activity Ledger (.csv) exported successfully');
  };

  const handleExportMatrix = () => {
    exportCSVMatrix(habits, checkins, allCheckinsList, settings, currentDate);
    setExportMenuOpen(false);
    triggerToast('Habit Matrix (.csv) exported successfully');
  };

  const handleExportMarkdown = () => {
    exportMarkdownSummary(habits, checkins, allCheckinsList, settings, currentDate);
    setExportMenuOpen(false);
    triggerToast('Activity Report (.md) exported successfully');
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
      className="desktop-titlebar h-[38px] w-full flex items-center justify-between select-none titlebar-drag border-b z-50 flex-shrink-0 relative transition-colors duration-150 pl-2.5 pr-0"
    >
      {/* Left: Professional Brand Emblem & Progress Chip */}
      <div className="flex items-center gap-2.5 titlebar-nodrag pl-0.5 flex-shrink-0">
        <div className="flex items-center gap-2">
          <img
            src={appLogo}
            alt="Zion"
            className="w-5 h-5 rounded-[5px] object-contain flex-shrink-0 shadow-sm"
          />
          <span className="text-[12.5px] font-bold tracking-tight text-[var(--text-primary)] select-none">
            Zion
          </span>
        </div>

        {/* Quick Today Progress Chip beside Zion name */}
        {authScreen === 'app' && activeHabits.length > 0 && (
          <button
            onClick={jumpToToday}
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
            }}
            className="flex items-center gap-2 px-2 py-0.5 rounded-[5px] border text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-medium)] transition-all cursor-pointer flex-shrink-0"
            title="Today's progress · Click to jump to Today"
          >
            <div className="flex items-center gap-1.5 font-num text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
              <span>{doneToday}/{scheduledToday.length} done</span>
            </div>
            {streakStats.currentStreak > 0 && (
              <>
                <span className="text-[var(--border-medium)] font-light">|</span>
                <div className="flex items-center gap-1 text-amber-400 font-num text-[11px] font-semibold">
                  <Flame size={11} className="fill-amber-400" />
                  <span>{streakStats.currentStreak}d</span>
                </div>
              </>
            )}
          </button>
        )}
      </div>

      {/* Center: Clean Omnibar - Perfectly Centered in TopBar */}
      {authScreen === 'app' && (
        <div className="absolute left-1/2 -translate-x-1/2 titlebar-nodrag flex items-center justify-center pointer-events-none z-10">
          <button
            onClick={() => setCommandPaletteOpen(true)}
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
            }}
            className="h-[27px] w-[200px] sm:w-[230px] md:w-[260px] px-2.5 rounded-[5px] border hover:border-[var(--border-medium)] flex items-center justify-between text-[11px] font-medium text-[var(--text-muted)] transition-all group cursor-pointer shadow-sm hover:shadow pointer-events-auto"
            title="Command Palette & Quick Search (Ctrl+K)"
          >
            <div className="flex items-center gap-2 truncate min-w-0">
              <Search
                size={12}
                className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors flex-shrink-0"
              />
              <span className="truncate group-hover:text-[var(--text-primary)] transition-colors text-[11px]">
                Search habits, run actions...
              </span>
            </div>

            <kbd
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderColor: 'var(--border-subtle)',
              }}
              className="flex-shrink-0 text-[9px] font-mono border px-1.5 py-0.5 rounded-[3px] text-[var(--text-muted)] font-semibold ml-1.5 group-hover:text-[var(--text-primary)]"
            >
              Ctrl+K
            </kbd>
          </button>
        </div>
      )}

      {/* Right: User Profile, Export Dropdown, Theme & Window Controls */}
      <div className="flex items-center h-full titlebar-nodrag gap-1.5 flex-shrink-0 relative z-20">
        {authScreen === 'app' && (
          <>

            {/* User Profile Pill button - Always visible & prominent */}
            {currentUser && (
              <button
                onClick={() => setTab('profile')}
                style={{
                  backgroundColor:
                    activeTab === 'profile'
                      ? 'var(--bg-surface-subtle)'
                      : 'var(--bg-surface-elevated)',
                  borderColor:
                    activeTab === 'profile'
                      ? 'var(--border-strong)'
                      : 'var(--border-subtle)',
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] border text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-medium)] transition-all cursor-pointer flex-shrink-0 ${
                  activeTab === 'profile'
                    ? 'text-[var(--text-primary)] font-semibold shadow-sm'
                    : ''
                }`}
                title={`Profile: ${currentUser.name} (@${currentUser.username})`}
              >
                <div
                  style={{
                    backgroundColor: currentUser.avatarColor || '#ffffff',
                    color:
                      currentUser.avatarColor?.toLowerCase() === '#ffffff' ||
                      currentUser.avatarColor?.toLowerCase() === '#fff' ||
                      currentUser.avatarColor === 'white'
                        ? '#09090b'
                        : '#ffffff',
                  }}
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black border border-white/15 flex-shrink-0 shadow-sm"
                >
                  {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
                </div>
                <span className="text-[11px] font-semibold truncate max-w-[65px] hidden lg:inline">
                  {currentUser.name.split(' ')[0]}
                </span>
              </button>
            )}

            {/* Export Dropdown Container with 5px radius button */}
            <div ref={exportMenuRef} className="relative hidden sm:block">
              <button
                onClick={() => setExportMenuOpen((prev) => !prev)}
                style={{
                  backgroundColor: exportMenuOpen
                    ? 'var(--bg-surface-subtle)'
                    : 'var(--bg-surface-elevated)',
                  borderColor: exportMenuOpen
                    ? 'var(--border-medium)'
                    : 'var(--border-subtle)',
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-[5px] border text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--border-medium)] transition-colors cursor-pointer"
                title="Export Habit Data"
              >
                <Download size={12} className="text-[var(--text-secondary)]" />
                <span className="text-[11px]">Export</span>
                <ChevronDown
                  size={11}
                  className={`text-[var(--text-muted)] transition-transform duration-150 ${
                    exportMenuOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

          {/* Export Dropdown Menu */}
          {exportMenuOpen && (
            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-medium)',
                boxShadow: 'var(--shadow-dropdown)',
                top: 'calc(100% + 16px)',
              }}
              className="absolute right-0 w-[305px] rounded-[6px] border p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-1 titlebar-nodrag shadow-2xl backdrop-blur-md"
            >
              <div className="px-2 pt-1 pb-0.5 text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
                Export Options
              </div>

              {/* 1. JSON Backup */}
              <button
                onClick={handleExportJSON}
                className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-[5px] hover:bg-[var(--bg-surface-hover)] transition-all text-left group cursor-pointer active:scale-[0.98]"
              >
                <div className="w-7 h-7 rounded-[4px] bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                  <Database size={13} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-white transition-colors flex items-center justify-between">
                    <span>Full JSON Backup</span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded-[3px] bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)] group-hover:text-[var(--text-secondary)]">
                      .json
                    </span>
                  </div>
                  <div className="text-[10.5px] text-[var(--text-muted)] leading-normal mt-0.5">
                    Complete restore backup of habits & check-ins
                  </div>
                </div>
              </button>

              {/* 2. CSV Spreadsheets */}
              <button
                onClick={handleExportCSV}
                className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-[5px] hover:bg-[var(--bg-surface-hover)] transition-all text-left group cursor-pointer active:scale-[0.98]"
              >
                <div className="w-7 h-7 rounded-[4px] bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                  <Table size={13} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-white transition-colors flex items-center justify-between">
                    <span>Spreadsheet Ledger</span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded-[3px] bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)] group-hover:text-[var(--text-secondary)]">
                      .csv
                    </span>
                  </div>
                  <div className="text-[10.5px] text-[var(--text-muted)] leading-normal mt-0.5">
                    Detailed daily activity ledger for Excel & Sheets
                  </div>
                </div>
              </button>

              {/* 2b. CSV Habit Matrix */}
              <button
                onClick={handleExportMatrix}
                className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-[5px] hover:bg-[var(--bg-surface-hover)] transition-all text-left group cursor-pointer active:scale-[0.98]"
              >
                <div className="w-7 h-7 rounded-[4px] bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-teal-400 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                  <LayoutGrid size={13} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-white transition-colors flex items-center justify-between">
                    <span>Habit Matrix Grid</span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded-[3px] bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)] group-hover:text-[var(--text-secondary)]">
                      .csv
                    </span>
                  </div>
                  <div className="text-[10.5px] text-[var(--text-muted)] leading-normal mt-0.5">
                    Pivot grid with each habit in separate columns
                  </div>
                </div>
              </button>

              {/* 3. Markdown Summary */}
              <button
                onClick={handleExportMarkdown}
                className="w-full flex items-start gap-2.5 px-2.5 py-2 rounded-[5px] hover:bg-[var(--bg-surface-hover)] transition-all text-left group cursor-pointer active:scale-[0.98]"
              >
                <div className="w-7 h-7 rounded-[4px] bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                  <FileText size={13} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[var(--text-primary)] group-hover:text-white transition-colors flex items-center justify-between">
                    <span>Activity Report</span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded-[3px] bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)] group-hover:text-[var(--text-secondary)]">
                      .md
                    </span>
                  </div>
                  <div className="text-[10.5px] text-[var(--text-muted)] leading-normal mt-0.5">
                    Formatted document of active habits & goals
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
          </>
        )}

        {/* Export Toast Notification */}
        {exportToast && (
          <div className="fixed top-12 right-6 z-50 flex items-center gap-2.5 px-3.5 py-2 rounded-[6px] bg-[var(--bg-surface-elevated)] border border-emerald-500/40 text-emerald-400 text-xs font-semibold shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150 titlebar-nodrag pointer-events-none">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
            <span className="text-[var(--text-primary)]">{exportToast}</span>
          </div>
        )}

        {/* Sound FX Toggle */}
        <button
          onClick={() => useHabitStore.getState().toggleSound()}
          style={{ color: settings.sound_enabled !== false ? 'var(--text-primary)' : 'var(--text-muted)' }}
          className="w-7.5 h-7 rounded-[5px] flex items-center justify-center hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
          title={settings.sound_enabled !== false ? 'Sound effects enabled' : 'Sound effects muted'}
          aria-label="Toggle sound effects"
        >
          {settings.sound_enabled !== false ? <Volume2 size={13} className="text-emerald-400" /> : <VolumeX size={13} />}
        </button>

        {/* User Guide Button */}
        {authScreen === 'app' && (
          <button
            onClick={() => setTab('guide')}
            style={{ color: activeTab === 'guide' ? 'var(--text-primary)' : 'var(--text-muted)' }}
            className={`w-7.5 h-7 rounded-[5px] flex items-center justify-center hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer ${
              activeTab === 'guide' ? 'bg-[var(--bg-surface-hover)]' : ''
            }`}
            title="User Guide & App Instructions (Ctrl+6)"
            aria-label="User Guide"
          >
            <BookOpen size={13} />
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{ color: 'var(--text-muted)' }}
          className="w-7.5 h-7 rounded-[5px] flex items-center justify-center hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
        </button>

        {/* Standard Windows 11 Controls - Normal rectangular edge-to-edge buttons */}
        <div className="flex items-center h-full ml-1">
          <button
            onClick={handleMinimize}
            style={{ color: 'var(--text-muted)' }}
            className="w-11 h-full flex items-center justify-center hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] rounded-none transition-colors cursor-pointer"
            title="Minimize"
            aria-label="Minimize window"
          >
            <Minus size={13} />
          </button>
          <button
            onClick={handleMaximize}
            style={{ color: 'var(--text-muted)' }}
            className="w-11 h-full flex items-center justify-center hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] rounded-none transition-colors cursor-pointer"
            title={isMaximized ? 'Restore' : 'Maximize'}
            aria-label="Maximize window"
          >
            {isMaximized ? <Copy size={11} /> : <Square size={11} />}
          </button>
          <button
            onClick={handleClose}
            style={{ color: 'var(--text-muted)' }}
            className="w-12 h-full flex items-center justify-center hover:text-white hover:bg-[#e81123] rounded-none transition-colors cursor-pointer"
            title="Close"
            aria-label="Close window"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
