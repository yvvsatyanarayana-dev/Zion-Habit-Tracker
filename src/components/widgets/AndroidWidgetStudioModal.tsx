import React, { useState } from 'react';
import {
  Smartphone,
  CheckCircle2,
  Circle,
  Flame,
  Plus,
  Play,
  RotateCcw,
  Sparkles,
  Layers,
  ExternalLink,
  ChevronRight,
  Info,
  X,
  ShieldCheck,
  Timer,
  Check,
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { formatLocalDate } from '../../lib/dateUtils';
import { isHabitScheduledOnDay, computeStreakStats } from '../../lib/statsUtils';
import { syncAndroidWidget, pinAndroidWidget } from '../../lib/androidWidgetBridge';
import { isAndroidApp } from '../../lib/reminders';
import { sound } from '../../lib/audio';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidWidgetStudioModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const habits = useHabitStore((s) => s.habits);
  const checkins = useHabitStore((s) => s.checkins);
  const allCheckinsList = useHabitStore((s) => s.allCheckinsList);
  const streakThreshold = useHabitStore((s) => s.settings?.streak_threshold ?? 50);
  const currentDate = useHabitStore((s) => s.currentDate);
  const activeHabitTimer = useHabitStore((s) => s.activeHabitTimer);

  const [activeWidgetType, setActiveWidgetType] = useState<'habits' | 'timer'>('habits');
  const [widgetTheme, setWidgetTheme] = useState<'obsidian' | 'oled' | 'emerald'>('obsidian');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [pinResult, setPinResult] = useState<string | null>(null);

  if (!isOpen) return null;

  const todayStr = formatLocalDate(currentDate);
  const todayWday = currentDate.getDay();
  const activeHabits = habits.filter((h) => !h.archived);
  const scheduledToday = activeHabits.filter((h) => isHabitScheduledOnDay(h, todayWday));
  const displayedHabits = scheduledToday.length > 0 ? scheduledToday : activeHabits;

  const streakStats = computeStreakStats(habits, allCheckinsList, streakThreshold, currentDate);
  const doneCount = displayedHabits.filter((h) => checkins[`${h.id}_${todayStr}`]?.completed).length;
  const totalCount = displayedHabits.length;
  const completionPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

  const handleSyncNow = async () => {
    sound.playClick();
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      const activeTimerObj = activeHabitTimer
        ? {
            habitName: activeHabitTimer.habitName,
            remainingSeconds: Math.max(0, activeHabitTimer.targetSeconds - activeHabitTimer.accumulatedSeconds),
            isRunning: Boolean(activeHabitTimer.startedAtMs),
          }
        : null;

      const ok = await syncAndroidWidget({
        habits,
        checkins,
        streak: streakStats.currentStreak,
        currentDate,
        activeTimer: activeTimerObj,
      });

      setSyncStatus(ok ? 'Widgets synced successfully with Android home screen!' : 'Synced widget configuration.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus(null), 3500);
    }
  };

  const handlePinWidget = async (type: 'habits' | 'timer') => {
    sound.playClick();
    setPinResult(null);
    const res = await pinAndroidWidget(type);
    if (res.supported) {
      setPinResult('Android prompt opened: confirm on your device to pin the widget!');
    } else {
      setPinResult('To add manually: Long-press your Android Home Screen > Widgets > Zion.');
    }
    setTimeout(() => setPinResult(null), 5000);
  };

  const getThemeBg = () => {
    switch (widgetTheme) {
      case 'oled':
        return '#000000';
      case 'emerald':
        return '#061611';
      case 'obsidian':
      default:
        return '#0e0e11';
    }
  };

  const getThemeBorder = () => {
    switch (widgetTheme) {
      case 'oled':
        return '#27272a';
      case 'emerald':
        return '#065f46';
      case 'obsidian':
      default:
        return 'rgba(255, 255, 255, 0.12)';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--shadow-dropdown)',
        }}
        className="border max-w-xl w-full rounded-[24px] overflow-hidden flex flex-col max-h-[90vh] select-none text-[var(--text-primary)]"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 flex items-center justify-center">
              <Smartphone size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">Android Widgets Studio</h3>
                <span className="text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  ADVANCED
                </span>
              </div>
              <p className="text-[11.5px] text-[var(--text-muted)] mt-0.5">
                Interactive Home Screen widgets with 1-tap check-in & live focus timer HUD
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scroll Body */}
        <div className="p-5 overflow-y-auto custom-scrollbar space-y-5">
          {/* Widget Switcher Tabs */}
          <div className="flex items-center gap-2 p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <button
              onClick={() => setActiveWidgetType('habits')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeWidgetType === 'habits'
                  ? 'bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] shadow-sm border border-[var(--border-subtle)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>Daily Protocol (4x2)</span>
            </button>
            <button
              onClick={() => setActiveWidgetType('timer')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeWidgetType === 'timer'
                  ? 'bg-[var(--bg-surface-elevated)] text-[var(--text-primary)] shadow-sm border border-[var(--border-subtle)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Timer size={14} className="text-indigo-400" />
              <span>Focus Timer HUD (4x1)</span>
            </button>
          </div>

          {/* Realistic Android Home Screen Device Frame */}
          <div className="relative rounded-[22px] p-4 bg-zinc-950/70 border border-zinc-800 shadow-2xl flex flex-col items-center">
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <span>Android Home Screen Live Simulation</span>
            </div>

            {/* Widget 1: Daily Protocol Preview */}
            {activeWidgetType === 'habits' && (
              <div
                style={{
                  backgroundColor: getThemeBg(),
                  borderColor: getThemeBorder(),
                  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7)',
                }}
                className="w-full max-w-sm rounded-[20px] p-3.5 border transition-all"
              >
                {/* Header */}
                <div className="flex items-center justify-between pb-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-indigo-600 flex items-center justify-center text-[10px] font-black text-white">
                      Z
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white tracking-tight">ZION</div>
                      <div className="text-[9.5px] text-zinc-400">Today's Protocol</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9.5px] font-bold font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      🔥 {streakStats.currentStreak}d
                    </span>
                    <span className="text-[9.5px] font-bold font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {completionPct}%
                    </span>
                  </div>
                </div>

                {/* Habit Items Preview */}
                <div className="space-y-1.5">
                  {displayedHabits.slice(0, 4).map((h) => {
                    const isDone = Boolean(checkins[`${h.id}_${todayStr}`]?.completed);
                    return (
                      <div
                        key={h.id}
                        className="flex items-center justify-between px-2.5 py-1.5 rounded-lg border border-zinc-800/80 bg-zinc-900/60"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] transition-all ${
                              isDone ? 'bg-emerald-500 text-black' : 'border border-zinc-600'
                            }`}
                          >
                            {isDone && <Check size={10} strokeWidth={3} />}
                          </div>
                          <span
                            className={`text-[11.5px] font-semibold truncate ${
                              isDone ? 'line-through text-zinc-500' : 'text-zinc-200'
                            }`}
                          >
                            {h.name}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-zinc-500">
                          {isDone ? 'DONE' : 'PENDING'}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Action Pills */}
                <div className="mt-2.5 pt-2 flex items-center gap-1.5">
                  <div className="flex-1 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-center text-[10px] font-bold text-white">
                    Open Zion
                  </div>
                  <div className="flex-1 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-center text-[10px] font-bold text-indigo-300">
                    + Habit
                  </div>
                  <div className="flex-1 py-1 rounded-md bg-zinc-800 border border-zinc-700 text-center text-[10px] font-bold text-emerald-400">
                    ⚡ Focus
                  </div>
                </div>
              </div>
            )}

            {/* Widget 2: Focus Timer Preview */}
            {activeWidgetType === 'timer' && (
              <div
                style={{
                  backgroundColor: getThemeBg(),
                  borderColor: getThemeBorder(),
                  boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7)',
                }}
                className="w-full max-w-sm rounded-[20px] p-3.5 border transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Timer size={20} />
                  </div>
                  <div>
                    <div className="text-[9px] font-mono font-bold text-indigo-400 uppercase tracking-wider">
                      {activeHabitTimer ? 'ACTIVE FOCUS SESSION' : 'READY PROTOCOL'}
                    </div>
                    <div className="text-sm font-bold text-white truncate max-w-[150px]">
                      {activeHabitTimer?.habitName || 'Deep Work Protocol'}
                    </div>
                    <div className="text-lg font-mono font-black text-emerald-400 leading-tight">
                      {activeHabitTimer ? '24:18' : '25:00'}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="px-3 py-1 rounded-md bg-white text-black text-center text-[10.5px] font-bold">
                    Start
                  </div>
                  <div className="px-3 py-1 rounded-md bg-zinc-800 text-zinc-300 text-center text-[10.5px] font-bold">
                    Studio
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Theme Palette Switcher */}
          <div>
            <label className="text-[11.5px] font-bold uppercase tracking-wider text-[var(--text-secondary)] block mb-2">
              Widget Visual Aesthetic
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'obsidian', label: 'Obsidian Dark', color: '#0e0e11' },
                { id: 'oled', label: 'OLED Pitch Black', color: '#000000' },
                { id: 'emerald', label: 'Cyber Emerald', color: '#061611' },
              ].map((th) => (
                <button
                  key={th.id}
                  onClick={() => setWidgetTheme(th.id as any)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    widgetTheme === th.id
                      ? 'border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)] bg-[var(--bg-surface-elevated)]'
                      : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-medium)]'
                  }`}
                >
                  <div
                    className="w-4 h-4 rounded-full border border-white/20 mb-1.5"
                    style={{ backgroundColor: th.color }}
                  />
                  <span className="text-xs font-semibold block">{th.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sync & Pin Actions */}
          <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-bold block">1-Tap Pin to Android Home Screen</span>
                <span className="text-xs text-[var(--text-secondary)]">
                  Places the interactive widget on your device's desktop
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePinWidget('habits')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[var(--btn-primary-bg)] text-[var(--btn-primary-text)] hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Plus size={13} strokeWidth={2.4} />
                  <span>Pin Habits</span>
                </button>
                <button
                  onClick={() => handlePinWidget('timer')}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                >
                  <Timer size={13} strokeWidth={2.4} />
                  <span>Pin Timer</span>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                  Force manual sync between app database & Android widgets
                </span>
              </div>
              <button
                onClick={handleSyncNow}
                disabled={isSyncing}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-[var(--border-medium)] bg-[var(--bg-surface-elevated)] hover:border-white/40 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw size={12} className={isSyncing ? 'animate-spin' : ''} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Widgets Now'}</span>
              </button>
            </div>

            {syncStatus && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 size={14} />
                <span>{syncStatus}</span>
              </div>
            )}

            {pinResult && (
              <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-medium flex items-center gap-2 animate-in fade-in">
                <Info size={14} />
                <span>{pinResult}</span>
              </div>
            )}
          </div>

          {/* Quick Step Guide */}
          <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800 text-xs text-zinc-400 space-y-1.5">
            <span className="font-bold text-zinc-300 flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-400" />
              <span>Android Widget Quick Setup Guide:</span>
            </span>
            <p>1. Go to your Android Home Screen and long-press on an empty area.</p>
            <p>2. Select <strong>Widgets</strong> from the menu.</p>
            <p>3. Scroll to <strong>Zion</strong> and drag either the <em>Habits & Momentum</em> or <em>Focus Timer</em> widget onto your screen.</p>
            <p>4. Check off habits directly with 1 tap from your home screen anytime without opening the app!</p>
          </div>
        </div>
      </div>
    </div>
  );
};
