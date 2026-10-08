import React, { useState } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  BarChart3,
  Flame,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Check,
  Clock,
  Search,
  Plus,
  Zap,
  Target,
  X,
  User,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { formatLocalDate } from '../../lib/dateUtils';
import { isHabitScheduledOnDay, computeStreakStats } from '../../lib/statsUtils';
import { useLiveClock } from '../../hooks/useLiveClock';
import { HabitIconView } from '../../lib/habitIcons';
import { format } from 'date-fns';
import type { TabType } from '../../lib/types';

interface NavItem {
  id: TabType;
  label: string;
  icon: LucideIcon;
  shortcut?: string;
}

const mainNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, shortcut: 'Ctrl+1' },
  { id: 'habits', label: 'Daily Habits', icon: CheckSquare, shortcut: 'Ctrl+2' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, shortcut: 'Ctrl+3' },
  { id: 'streaks', label: 'Streaks & Medals', icon: Flame, shortcut: 'Ctrl+4' },
  { id: 'profile', label: 'User Profile', icon: User, shortcut: 'Ctrl+5' },
  { id: 'guide', label: 'User Guide', icon: BookOpen, shortcut: 'Ctrl+6' },
];

export const Sidebar: React.FC = () => {
  const activeTab = useHabitStore((s) => s.activeTab);
  const setTab = useHabitStore((s) => s.setTab);
  const currentUser = useHabitStore((s) => s.currentUser);
  const sidebarCollapsed = useHabitStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useHabitStore((s) => s.toggleSidebar);
  const openHabitModal = useHabitStore((s) => s.openHabitModal);
  const toggleCheckin = useHabitStore((s) => s.toggleCheckin);
  const jumpToToday = useHabitStore((s) => s.jumpToToday);
  
  const habits = useHabitStore((s) => s.habits);
  const checkins = useHabitStore((s) => s.checkins);
  const allCheckinsList = useHabitStore((s) => s.allCheckinsList);
  const currentDate = useHabitStore((s) => s.currentDate);
  const clockFormat = useHabitStore((s) => s.settings.clock_format);
  const streakThreshold = useHabitStore((s) => s.settings.streak_threshold);

  const searchQuery = useHabitStore((s) => s.searchQuery);
  const setSearchQuery = useHabitStore((s) => s.setSearchQuery);
  const { clockDate } = useLiveClock();

  const activeHabits = habits.filter((h) => !h.archived);
  const todayStr = formatLocalDate(currentDate);
  const todayWday = currentDate.getDay();

  const scheduledToday = activeHabits.filter((h) => isHabitScheduledOnDay(h, todayWday));
  const doneToday = scheduledToday.filter((h) => checkins[`${h.id}_${todayStr}`]?.completed).length;

  const streakStats = computeStreakStats(habits, allCheckinsList, streakThreshold, currentDate);

  const formattedTimeStr = clockFormat === '24h'
    ? format(clockDate, 'HH:mm:ss')
    : format(clockDate, 'hh:mm:ss a');
  const shortTimeStr = clockFormat === '24h'
    ? format(clockDate, 'HH:mm')
    : format(clockDate, 'hh:mm');
  const formattedDateStr = format(clockDate, 'EEE, MMM d');

  // Filter habits for sidebar search (searches all habits when query present, else scheduled today)
  const isSearching = searchQuery.trim().length > 0;
  const displayedSidebarHabits = isSearching
    ? activeHabits.filter((h) => h.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : scheduledToday;

  return (
    <aside
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
      className={`h-full border-r flex flex-col justify-between transition-all duration-200 flex-shrink-0 select-none z-20 ${
        sidebarCollapsed ? 'w-[58px]' : 'w-[260px]'
      }`}
    >
      {/* TOP & MIDDLE SECTION (No outer scrollbar) */}
      <div className={`flex flex-col gap-2.5 min-h-0 flex-1 overflow-y-auto scrollbar-none ${sidebarCollapsed ? 'p-2' : 'p-3'}`}>
        {!sidebarCollapsed && (
          <>
            {/* 1. Top Search Bar */}
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search habits & routines..."
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
                className="w-full h-8 pl-8 pr-7 rounded-lg border text-xs placeholder-[var(--text-muted)] outline-none focus:border-[var(--accent-primary)] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer p-0.5"
                  title="Clear search"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* 2. Dual Tactile Action Buttons (clean + Habit without double plus) */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => openHabitModal()}
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
                className="h-7.5 px-2.5 rounded-lg border flex items-center justify-center gap-1.5 text-xs font-semibold hover:border-[var(--border-medium)] hover:bg-[var(--bg-surface-subtle)] transition-all cursor-pointer"
                title="Create a new habit"
              >
                <Plus size={13} className="text-[var(--accent-primary)]" />
                <span>Habit</span>
              </button>

              <button
                onClick={jumpToToday}
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
                className="h-7.5 px-2.5 rounded-lg border flex items-center justify-center gap-1.5 text-xs font-semibold hover:border-[var(--border-medium)] hover:bg-[var(--bg-surface-subtle)] transition-all cursor-pointer"
                title="Jump directly to Today"
              >
                <Zap size={13} className="text-amber-400" />
                <span>Today</span>
              </button>
            </div>

            {/* 3. Routine Workspace Card (with Lucide Target icon, full title, no truncation) */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
              }}
              className="border rounded-xl p-2.5 space-y-2 shadow-sm"
            >
              {/* Header row */}
              <div className="flex items-center justify-between gap-1">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className="w-6 h-6 rounded-md bg-[var(--bg-surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] flex items-center justify-center flex-shrink-0">
                    <Target size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-[var(--text-primary)] whitespace-nowrap">
                        Daily Routine
                      </span>
                      <span className="studio-badge-current flex-shrink-0">
                        CURRENT
                      </span>
                    </div>
                    <div className="text-[10px] text-[var(--text-muted)] font-num truncate">
                      {activeHabits.length} {activeHabits.length === 1 ? 'habit' : 'habits'} · {doneToday} of {scheduledToday.length} done
                    </div>
                  </div>
                </div>
              </div>

              {/* Inset Box: HABITS List */}
              <div
                style={{
                  backgroundColor: 'var(--bg-surface-card)',
                  borderColor: 'var(--border-subtle)',
                }}
                className="border rounded-lg p-1.5 space-y-1"
              >
                <div className="px-1 text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-wider">
                  <span>{isSearching ? `RESULTS (${displayedSidebarHabits.length})` : `HABITS (${scheduledToday.length})`}</span>
                </div>

                {displayedSidebarHabits.length === 0 ? (
                  <div className="text-[11px] text-[var(--text-muted)] py-2 text-center">
                    {isSearching ? `No habits match "${searchQuery}"` : 'No habits scheduled today'}
                  </div>
                ) : (
                  <div className="space-y-0.5 max-h-[105px] overflow-y-auto pr-1 routine-habits-scrollbar">
                    {displayedSidebarHabits.map((habit, idx) => {
                      const isChecked = Boolean(checkins[`${habit.id}_${todayStr}`]?.completed);
                      const isFirst = idx === 0;

                      return (
                        <div
                          key={habit.id}
                          className={`flex items-center justify-between px-2 py-1.5 rounded-md text-xs group transition-all border ${
                            isFirst && !isChecked
                              ? 'bg-[var(--bg-surface-subtle)] border-[var(--border-medium)] text-[var(--text-primary)]'
                              : 'border-transparent hover:bg-[var(--bg-surface-hover)] text-[var(--text-secondary)]'
                          }`}
                        >
                          <div
                            onClick={() => openHabitModal(habit)}
                            className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer"
                          >
                            <HabitIconView
                              iconId={habit.emoji}
                              color={habit.color}
                              size={13}
                            />
                            <span className="truncate font-medium group-hover:text-[var(--text-primary)] transition-colors">
                              {habit.name}
                            </span>
                            {isFirst && !isChecked && (
                              <span className="studio-badge-active ml-1">
                                ACTIVE
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => toggleCheckin(habit.id, todayStr)}
                            style={{
                              backgroundColor: isChecked ? 'var(--status-success)' : 'transparent',
                              borderColor: isChecked ? 'var(--status-success)' : 'var(--border-medium)',
                            }}
                            className="w-4 h-4 rounded-full flex items-center justify-center border transition-all cursor-pointer ml-1.5 flex-shrink-0"
                            title={isChecked ? 'Mark incomplete' : 'Mark complete'}
                          >
                            {isChecked && <Check size={10} strokeWidth={3.5} color="#ffffff" />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  onClick={() => openHabitModal()}
                  style={{ borderColor: 'var(--border-subtle)' }}
                  className="w-full py-1 mt-0.5 border border-dashed rounded text-[11px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[var(--border-medium)] transition-colors text-center cursor-pointer block"
                >
                  + Add Habit to Routine
                </button>
              </div>
            </div>
          </>
        )}

        {sidebarCollapsed && (
          <div className="flex flex-col items-center gap-1.5 pb-1">
            <button
              onClick={() => openHabitModal()}
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
              }}
              className="w-10 h-10 rounded-lg border flex items-center justify-center text-[var(--accent-primary)] hover:border-[var(--border-medium)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
              title="Create a new habit"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={jumpToToday}
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
              }}
              className="w-10 h-10 rounded-lg border flex items-center justify-center text-amber-400 hover:border-[var(--border-medium)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
              title="Jump to Today (T)"
            >
              <Zap size={16} />
            </button>
          </div>
        )}

        {/* 4. MAIN VIEWS NAVIGATION */}
        <div className="space-y-0.5 mt-1">
          {!sidebarCollapsed && (
            <div
              style={{ color: 'var(--text-dim)' }}
              className="px-2 pt-1 pb-1 text-[10px] font-bold uppercase tracking-wider"
            >
              Views
            </div>
          )}

          <nav className="space-y-0.5" aria-label="Main Navigation">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  style={{
                    backgroundColor: isActive ? 'var(--bg-surface-elevated)' : 'transparent',
                    color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                    borderColor: isActive ? 'var(--border-subtle)' : 'transparent',
                  }}
                  className={`flex items-center transition-all group relative border cursor-pointer ${
                    sidebarCollapsed
                      ? 'w-10 h-10 mx-auto justify-center rounded-lg'
                      : 'w-full gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium'
                  } hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]`}
                  title={sidebarCollapsed ? item.label : undefined}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {/* Subtle active left bar indicator */}
                  {isActive && !sidebarCollapsed && (
                    <div
                      style={{
                        backgroundColor: 'var(--accent-primary)',
                        boxShadow: '0 0 8px var(--accent-glow)',
                      }}
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-3.5 rounded-r-full"
                    />
                  )}

                  <Icon
                    size={16}
                    className="flex-shrink-0 transition-colors"
                    style={{
                      color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)',
                    }}
                  />

                  {!sidebarCollapsed && (
                    <>
                      <span className="truncate flex-1 text-left">{item.label}</span>

                      {/* Dynamic badge indicators */}
                      {item.id === 'habits' && activeHabits.length > 0 && (
                        <span
                          style={{
                            backgroundColor: 'var(--bg-surface-hover)',
                            color: 'var(--text-muted)',
                            borderColor: 'var(--border-subtle)',
                          }}
                          className="text-[10px] font-num font-bold px-1.5 py-0.2 rounded border"
                        >
                          {activeHabits.length}
                        </span>
                      )}

                      {item.id === 'streaks' && streakStats.currentStreak > 0 && (
                        <span
                          style={{
                            backgroundColor: 'rgba(245, 158, 11, 0.12)',
                            color: '#f59e0b',
                            borderColor: 'rgba(245, 158, 11, 0.25)',
                          }}
                          className="text-[10px] font-num font-bold px-1.5 py-0.2 rounded border"
                        >
                          {streakStats.currentStreak}d
                        </span>
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* BOTTOM SECTION: LIVE CLOCK & SLEEK FOOTER */}
      <div
        style={{ borderColor: 'var(--border-subtle)' }}
        className={`border-t ${sidebarCollapsed ? 'p-2 space-y-1.5' : 'p-2.5 space-y-2'}`}
      >
        {/* Live Date & Time in Sidebar */}
        {!sidebarCollapsed ? (
          <div
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
            }}
            className="border rounded-xl p-2.5 space-y-1 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span
                style={{ color: 'var(--text-muted)' }}
                className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5"
              >
                <span
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    boxShadow: '0 0 8px var(--accent-glow)',
                  }}
                  className="w-1.5 h-1.5 rounded-full animate-pulse"
                />
                Live Clock
              </span>
              <Clock size={12} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div
              style={{ color: 'var(--text-primary)' }}
              className="font-num text-[16px] font-bold tracking-tight leading-tight"
            >
              {formattedTimeStr}
            </div>
            <div
              style={{ color: 'var(--text-secondary)' }}
              className="text-[11px] font-medium truncate"
            >
              {formattedDateStr}
            </div>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
            }}
            className="w-10 h-10 mx-auto rounded-lg border flex flex-col items-center justify-center transition-colors group cursor-default"
            title={`${formattedTimeStr} • ${formattedDateStr}`}
          >
            <span
              style={{ color: 'var(--text-primary)' }}
              className="font-num text-[10px] font-bold leading-none"
            >
              {shortTimeStr}
            </span>
            <span
              style={{ color: 'var(--accent-primary)' }}
              className="text-[8px] font-bold leading-none mt-0.5"
            >
              LIVE
            </span>
          </div>
        )}

        {/* Settings Navigation Item */}
        <button
          onClick={() => setTab('settings')}
          style={{
            backgroundColor: activeTab === 'settings' ? 'var(--bg-surface-elevated)' : 'transparent',
            color: activeTab === 'settings' ? 'var(--text-primary)' : 'var(--text-secondary)',
            borderColor: activeTab === 'settings' ? 'var(--border-subtle)' : 'transparent',
          }}
          className={`flex items-center transition-all group border cursor-pointer ${
            sidebarCollapsed
              ? 'w-10 h-10 mx-auto justify-center rounded-lg'
              : 'w-full gap-2.5 px-2.5 py-1.5 rounded-lg text-[13px] font-medium'
          } hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)]`}
          title="Settings"
          aria-current={activeTab === 'settings' ? 'page' : undefined}
        >
          <Settings
            size={16}
            className="flex-shrink-0 transition-colors"
            style={{
              color: activeTab === 'settings' ? 'var(--accent-primary)' : 'var(--text-muted)',
            }}
          />
          {!sidebarCollapsed && (
            <span className="truncate flex-1 text-left">Settings</span>
          )}
        </button>

        {/* Clean Collapse / Expand Control */}
        <div className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-start'}`}>
          <button
            onClick={toggleSidebar}
            style={{ color: 'var(--text-muted)' }}
            className={`flex items-center justify-center hover:text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer ${
              sidebarCollapsed ? 'w-10 h-8' : 'w-full gap-2 px-2 py-1.5 justify-start text-[11.5px] font-medium'
            }`}
            title={sidebarCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
          >
            {sidebarCollapsed ? (
              <PanelLeft size={16} />
            ) : (
              <>
                <PanelLeftClose size={15} />
                <span>Collapse Sidebar</span>
              </>
            )}
          </button>
        </div>

      </div>
    </aside>
  );
};
