import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  CheckSquare,
  BarChart3,
  Flame,
  Settings,
  Plus,
  Calendar,
  X,
  Search,
  CheckCircle2,
  Edit,
  ArrowRight,
  Zap,
  Sparkles,
  User,
  BookOpen,
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { formatLocalDate } from '../../lib/dateUtils';
import type { TabType } from '../../lib/types';

export const CommandPalette: React.FC = () => {
  const isOpen = useHabitStore((s) => s.commandPaletteOpen);
  const setIsOpen = useHabitStore((s) => s.setCommandPaletteOpen);
  const setTab = useHabitStore((s) => s.setTab);
  const openHabitModal = useHabitStore((s) => s.openHabitModal);
  const jumpToToday = useHabitStore((s) => s.jumpToToday);
  const toggleCheckin = useHabitStore((s) => s.toggleCheckin);
  const habits = useHabitStore((s) => s.habits);
  const checkins = useHabitStore((s) => s.checkins);
  const currentDate = useHabitStore((s) => s.currentDate);

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'habits' | 'navigation' | 'actions'>('all');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const todayStr = formatLocalDate(currentDate);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  interface CommandItem {
    id: string;
    label: string;
    description?: string;
    category: 'actions' | 'navigation' | 'habits';
    icon: React.ComponentType<{ size?: number; className?: string; color?: string }>;
    accentColor?: string;
    shortcut?: string;
    action: () => void;
  }

  const baseCommands: CommandItem[] = [
    {
      id: 'cmd-add-habit',
      label: 'Create New Habit',
      description: 'Add a new habit with goal and schedule',
      category: 'actions',
      icon: Plus,
      accentColor: '#6366f1',
      shortcut: 'N',
      action: () => openHabitModal(),
    },
    {
      id: 'cmd-jump-today',
      label: 'Jump to Today',
      description: 'Reset date view to current day',
      category: 'navigation',
      icon: Calendar,
      accentColor: '#10b981',
      shortcut: 'T',
      action: () => jumpToToday(),
    },
    {
      id: 'cmd-nav-dashboard',
      label: 'Go to Dashboard',
      description: 'View activity rings and overview',
      category: 'navigation',
      icon: LayoutDashboard,
      accentColor: '#6366f1',
      shortcut: 'Ctrl+1',
      action: () => setTab('dashboard'),
    },
    {
      id: 'cmd-nav-habits',
      label: 'Daily Habits Grid',
      description: 'Open full monthly habit table',
      category: 'navigation',
      icon: CheckSquare,
      accentColor: '#6366f1',
      shortcut: 'Ctrl+2',
      action: () => setTab('habits'),
    },
    {
      id: 'cmd-nav-analytics',
      label: 'View Analytics',
      description: 'Inspect heatmaps and trend lines',
      category: 'navigation',
      icon: BarChart3,
      accentColor: '#06b6d4',
      shortcut: 'Ctrl+3',
      action: () => setTab('analytics'),
    },
    {
      id: 'cmd-nav-streaks',
      label: 'Streaks & Achievements',
      description: 'View consistency medals and milestones',
      category: 'navigation',
      icon: Flame,
      accentColor: '#f59e0b',
      shortcut: 'Ctrl+4',
      action: () => setTab('streaks'),
    },
    {
      id: 'cmd-nav-profile',
      label: 'User Profile & Identity',
      description: 'View your profile stats, bio, and account settings',
      category: 'navigation',
      icon: User,
      accentColor: '#8b5cf6',
      shortcut: 'Ctrl+5',
      action: () => setTab('profile'),
    },
    {
      id: 'cmd-nav-guide',
      label: 'User Guide & Instructions',
      description: 'Comprehensive manual on how to use every feature in Zion',
      category: 'navigation',
      icon: BookOpen,
      accentColor: '#10b981',
      shortcut: 'Ctrl+6',
      action: () => setTab('guide'),
    },
    {
      id: 'cmd-nav-settings',
      label: 'Settings & Preferences',
      description: 'Configure rules, backup, and notifications',
      category: 'navigation',
      icon: Settings,
      shortcut: 'Ctrl+,',
      action: () => setTab('settings'),
    },
  ];

  // Dynamically add habits actions
  const habitCommands: CommandItem[] = [];
  habits.filter((h) => !h.archived).forEach((h) => {
    const isChecked = Boolean(checkins[`${h.id}_${todayStr}`]?.completed);
    
    // Quick toggle today
    habitCommands.push({
      id: `cmd-toggle-${h.id}`,
      label: `${isChecked ? 'Uncheck' : 'Check'} Today: ${h.name}`,
      description: isChecked ? 'Mark incomplete for today' : 'Mark completed for today',
      category: 'habits',
      icon: CheckCircle2,
      accentColor: h.color,
      action: () => toggleCheckin(h.id, todayStr),
    });

    // Quick edit
    habitCommands.push({
      id: `cmd-edit-${h.id}`,
      label: `Edit Habit: ${h.name}`,
      description: `Monthly target: ${h.monthly_goal} days`,
      category: 'habits',
      icon: Edit,
      accentColor: h.color,
      action: () => openHabitModal(h),
    });
  });

  const allCommands = [...baseCommands, ...habitCommands];

  const filtered = allCommands.filter((c) => {
    const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
    const matchesQuery =
      c.label.toLowerCase().includes(query.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(query.toLowerCase()));
    return matchesCategory && matchesQuery;
  });

  // Handle keyboard arrow navigation & enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
    }
  };

  return (
    <div
      onClick={() => setIsOpen(false)}
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/65 backdrop-blur-[8px] animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--shadow-dropdown)',
        }}
        className="border w-full max-w-xl rounded-[18px] overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
      >
        {/* Search Input Bar */}
        <div
          style={{ borderColor: 'var(--border-subtle)' }}
          className="flex items-center px-4 py-3 border-b"
        >
          <Zap size={18} style={{ color: 'var(--accent-primary)' }} className="mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command, habit name, or action..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            style={{ color: 'var(--text-primary)' }}
            className="w-full bg-transparent text-[15px] outline-none font-medium placeholder-[var(--text-dim)]"
          />
          <button
            onClick={() => setIsOpen(false)}
            style={{ color: 'var(--text-muted)' }}
            className="hover:text-[var(--text-primary)] p-1 rounded-lg transition-colors ml-2 cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Filter Category Tabs */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
          className="flex items-center gap-1.5 px-3 py-2 border-b"
        >
          {(['all', 'habits', 'actions', 'navigation'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setSelectedIndex(0);
              }}
              style={{
                backgroundColor: selectedCategory === cat ? 'var(--bg-surface-elevated)' : 'transparent',
                borderColor: selectedCategory === cat ? 'var(--border-subtle)' : 'transparent',
                color: selectedCategory === cat ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              className="px-2.5 py-1 rounded-[6px] text-[11px] font-bold uppercase tracking-wider transition-colors border cursor-pointer hover:text-[var(--text-primary)]"
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="max-h-[360px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filtered.length === 0 ? (
            <div style={{ color: 'var(--text-muted)' }} className="text-center py-10 text-[13px]">
              No matching actions or habits found
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const Icon = cmd.icon;
              const isSelected = idx === selectedIndex;

              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    backgroundColor: isSelected ? 'var(--bg-surface-hover)' : 'transparent',
                    borderColor: isSelected ? 'var(--border-subtle)' : 'transparent',
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-[10px] text-left transition-all border cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div
                      style={{
                        backgroundColor: cmd.accentColor ? `${cmd.accentColor}20` : 'var(--bg-surface-hover)',
                      }}
                      className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0"
                    >
                      <Icon
                        size={16}
                        color={cmd.accentColor || 'var(--text-muted)'}
                      />
                    </div>

                    <div className="min-w-0">
                      <div
                        style={{ color: 'var(--text-primary)' }}
                        className="text-[13.5px] font-semibold truncate"
                      >
                        {cmd.label}
                      </div>
                      {cmd.description && (
                        <div style={{ color: 'var(--text-secondary)' }} className="text-[11px] truncate mt-0.5">
                          {cmd.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {cmd.shortcut && (
                      <kbd
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-muted)',
                        }}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold border"
                      >
                        {cmd.shortcut}
                      </kbd>
                    )}
                    <span
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-muted)',
                      }}
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                    >
                      {cmd.category}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Professional Raycast-style Footer */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
          className="px-4 py-2 border-t flex items-center justify-between text-[11px] font-medium"
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
                className="font-mono px-1 py-0.2 rounded text-[10px] border"
              >
                ↑↓
              </kbd>{' '}
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
                className="font-mono px-1 py-0.2 rounded text-[10px] border"
              >
                ↵
              </kbd>{' '}
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
                className="font-mono px-1 py-0.2 rounded text-[10px] border"
              >
                Esc
              </kbd>{' '}
              Close
            </span>
          </div>

          <div style={{ color: 'var(--text-secondary)' }} className="flex items-center gap-1">
            <Sparkles size={12} style={{ color: 'var(--accent-primary)' }} />
            <span>Quick Omnibar</span>
          </div>
        </div>
      </div>
    </div>
  );
};
