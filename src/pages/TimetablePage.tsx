import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Plus,
  Upload,
  Download,
  Play,
  Trash2,
  Edit2,
  Clock,
  Sparkles,
  ArrowRight,
  LayoutList,
  Columns,
  Radio,
  Award,
  Moon,
  Coffee,
  Zap,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { useHabitStore } from '../store/useHabitStore';
import { useLiveTimetable } from '../hooks/useLiveTimetable';
import { TimetableTimelineView } from '../components/timetable/TimetableTimelineView';
import { formatLocalDate } from '../lib/dateUtils';
import {
  calculateBlockDurationMinutes,
  parseTimetableMarkdown,
  formatTimeTo12h,
  formatTimeRange12h,
} from '../lib/timetableParser';
import type { TimetableBlock } from '../lib/types';
import { TimetableIcon } from '../components/timetable/TimetableIcon';
import { CircleCheckbox } from '../components/ui/CircleCheckbox';

const DAYS_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const TimetablePage: React.FC = () => {
  const timetableSchedules = useHabitStore((s) => s.timetableSchedules);
  const activeScheduleId = useHabitStore((s) => s.activeScheduleId);
  const setActiveScheduleId = useHabitStore((s) => s.setActiveScheduleId);
  const deleteSchedule = useHabitStore((s) => s.deleteTimetableSchedule);
  const deleteBlock = useHabitStore((s) => s.deleteTimetableBlock);
  const toggleExecution = useHabitStore((s) => s.toggleTimetableExecution);
  const saveSchedule = useHabitStore((s) => s.saveTimetableSchedule);
  const clearAllTimetableSchedules = useHabitStore((s) => s.clearAllTimetableSchedules);
  const setImportModalOpen = useHabitStore((s) => s.setTimetableImportModalOpen);
  const setBlockModalOpen = useHabitStore((s) => s.setTimetableBlockModalOpen);
  const startBlockTimer = useHabitStore((s) => s.startTimetableBlockTimer);
  const executions = useHabitStore((s) => s.timetableExecutions);
  const currentDate = useHabitStore((s) => s.currentDate);
  const viewMode = useHabitStore((s) => s.timetableTimelineViewMode);
  const setViewMode = useHabitStore((s) => s.setTimetableTimelineViewMode);
  const setZenStudioOpen = useHabitStore((s) => s.setZenStudioModalOpen);
  const setRpgSkillTreeOpen = useHabitStore((s) => s.setRpgSkillTreeModalOpen);
  const setFocusShieldModalOpen = useHabitStore((s) => s.setFocusShieldModalOpen);
  const rpgProfile = useHabitStore((s) => s.rpgProfile);

  const [selectedDay, setSelectedDay] = useState<number>(currentDate.getDay());
  const [userManuallySelectedDay, setUserManuallySelectedDay] = useState(false);

  useEffect(() => {
    if (!userManuallySelectedDay) {
      setSelectedDay(currentDate.getDay());
    }
  }, [currentDate, userManuallySelectedDay]);

  const {
    now,
    activeSchedule,
    scheduleBlocks,
    activeStatus,
    nextBlock,
    nextStartsInMinutes,
    categoryStats,
  } = useLiveTimetable(selectedDay);

  const todayStr = formatLocalDate(currentDate);
  const isViewingToday = selectedDay === currentDate.getDay();

  const handleExportMarkdown = () => {
    if (!activeSchedule) return;
    let md = `# ${activeSchedule.title}\n\n`;
    if (activeSchedule.description) md += `${activeSchedule.description}\n\n`;
    md += `| Time | Activity |\n|---|---|\n`;
    for (const b of scheduleBlocks) {
      const desc = b.description ? ` (${b.description})` : '';
      md += `| ${formatTimeRange12h(b.startTime, b.endTime)} | **${b.title}**${desc} |\n`;
    }

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSchedule.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_timetable.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateNewSchedule = async () => {
    const newId = `sched_${Date.now()}`;
    const newSchedule = {
      id: newId,
      title: 'Daily Study & Routine',
      description: 'Custom 24-hour daily routine',
      daysOfWeek: [1, 2, 3, 4, 5, 6],
      isActive: true,
      blocks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveSchedule(newSchedule);
    setBlockModalOpen(true, null, newId);
  };

  const handleDeleteActiveSchedule = async () => {
    if (!activeSchedule) return;
    if (confirm(`Are you sure you want to delete "${activeSchedule.title}"?`)) {
      await deleteSchedule(activeSchedule.id);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Empty State: Zero Hardcoding, Clean Real-Time Prompt
  // ─────────────────────────────────────────────────────────────
  if (timetableSchedules.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in py-10 px-4">
        <div
          style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-card)',
          }}
          className="p-8 sm:p-12 rounded-3xl border text-center space-y-6"
        >
          <div
            style={{
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              borderColor: 'rgba(99, 102, 241, 0.25)',
              color: 'var(--accent-primary)',
            }}
            className="w-16 h-16 rounded-2xl border flex items-center justify-center mx-auto"
          >
            <CalendarClock size={32} />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h2 style={{ color: 'var(--text-primary)' }} className="text-xl sm:text-2xl font-bold tracking-tight">
              Real-Time Daily Timetable
            </h2>
            <p style={{ color: 'var(--text-muted)' }} className="text-xs sm:text-sm leading-relaxed">
              Create your dynamic routine schedule or import directly from Markdown or PDF. Live time tracking, transitions, and focus synchronization.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setImportModalOpen(true)}
              style={{
                backgroundColor: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-text)',
                boxShadow: 'var(--btn-primary-shadow)',
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer hover:opacity-90 active:scale-95"
            >
              <Upload size={14} />
              <span>Import Timetable (MD / PDF)</span>
            </button>

            <button
              onClick={handleCreateNewSchedule}
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                color: 'var(--text-primary)',
                borderColor: 'var(--border-subtle)',
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer hover:border-[var(--border-medium)] active:scale-95"
            >
              <Plus size={14} />
              <span>Create Schedule Manually</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-5 animate-fade-in pb-12">
      {/* Page Title & Main Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-3">
          <div
            style={{
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              borderColor: 'rgba(99, 102, 241, 0.25)',
              color: 'var(--accent-primary)',
            }}
            className="w-11 h-11 rounded-2xl border flex items-center justify-center shadow-inner shrink-0"
          >
            <CalendarClock size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 style={{ color: 'var(--text-primary)' }} className="text-xl sm:text-2xl font-black tracking-tight">
                Studio Timetable
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                REAL-TIME SYNC
              </span>
            </div>
            <p style={{ color: 'var(--text-muted)' }} className="text-xs">
              24-hour routine balance, live block countdowns & desktop focus synchronization
            </p>
          </div>
        </div>

        {/* Top Control Buttons: Sleek Unified Glass Toolbar */}
        <div className="flex items-center gap-2 flex-wrap justify-start lg:justify-end">
          {/* Primary Action: Add Block (Always prominent and never clipped) */}
          <button
            onClick={() => setBlockModalOpen(true, null, activeSchedule?.id)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white shadow-md shadow-indigo-500/20 shrink-0"
          >
            <Plus size={14} />
            <span>Add Block</span>
          </button>

          {/* Schedule Switcher Dropdown */}
          {timetableSchedules.length > 0 && (
            <select
              value={activeScheduleId || (activeSchedule ? activeSchedule.id : '')}
              onChange={(e) => setActiveScheduleId(e.target.value)}
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              className="px-3 py-1.5 rounded-xl border text-xs font-semibold focus:outline-none focus:border-indigo-500/60 cursor-pointer shadow-sm hover:border-[var(--border-medium)] transition-colors shrink-0"
            >
              {timetableSchedules.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          )}

          {/* Zen Focus Studio Modal Launcher */}
          <button
            onClick={() => setZenStudioOpen(true)}
            style={{
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              borderColor: 'rgba(99, 102, 241, 0.25)',
              color: 'var(--accent-primary)',
            }}
            className="px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer hover:bg-indigo-500 hover:text-white active:scale-95 shadow-sm shrink-0"
            title="Open Fullscreen Zen Focus Studio (Desk Companion)"
          >
            <Radio size={13} className="animate-pulse" />
            <span>Zen Studio</span>
          </button>

          {/* RPG Mastery & Skill Tree */}
          <button
            onClick={() => setRpgSkillTreeOpen(true)}
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              borderColor: 'rgba(245, 158, 11, 0.25)',
              color: '#f59e0b',
            }}
            className="px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer hover:bg-amber-500 hover:text-white active:scale-95 shadow-sm shrink-0"
            title="View RPG Mastery, XP & Skill Tree"
          >
            <Award size={13} />
            <span>Lvl {rpgProfile.overallLevel}</span>
          </button>

          {/* Floating Desktop Mini HUD Toggle */}
          <button
            onClick={() => void window.api?.os?.toggleTimerWidget?.()}
            style={{
              backgroundColor: 'rgba(99, 102, 241, 0.08)',
              borderColor: 'rgba(99, 102, 241, 0.2)',
              color: 'var(--text-secondary)',
            }}
            className="px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer hover:text-[var(--text-primary)] hover:border-indigo-500/40 active:scale-95 shadow-sm shrink-0"
            title="Toggle Always-On-Top Floating Desktop Mini HUD (Ctrl+Alt+T)"
          >
            <Layers size={13} className="text-indigo-400" />
            <span>Mini HUD</span>
          </button>

          {/* Focus Shield App Blocker & Firewall */}
          <button
            onClick={() => setFocusShieldModalOpen(true)}
            style={{
              backgroundColor: 'rgba(99, 102, 241, 0.08)',
              borderColor: 'rgba(99, 102, 241, 0.2)',
              color: 'var(--text-secondary)',
            }}
            className="px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer hover:text-[var(--text-primary)] hover:border-indigo-500/40 active:scale-95 shadow-sm shrink-0"
            title="Focus Shield: Distraction Blocker & App Firewall Settings"
          >
            <ShieldCheck size={13} className="text-indigo-400" />
            <span>Shield</span>
          </button>

          {/* Compact Unified Schedule Utilities Pill (Import, Export, Delete) */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
            className="flex items-center rounded-xl border shadow-sm divide-x divide-[var(--border-subtle)] shrink-0 overflow-hidden"
          >
            {/* Import Markdown / PDF Button */}
            <button
              onClick={() => setImportModalOpen(true)}
              style={{ color: 'var(--text-secondary)' }}
              className="px-2.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition-colors cursor-pointer"
              title="Import timetable from Markdown (.md) or PDF (.pdf)"
            >
              <Upload size={13} className="text-emerald-400" />
              <span>Import</span>
            </button>

            {/* Export Markdown */}
            <button
              onClick={handleExportMarkdown}
              style={{ color: 'var(--text-muted)' }}
              className="p-1.5 hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition-colors cursor-pointer"
              title="Export Timetable as Markdown"
            >
              <Download size={13} />
            </button>

            {/* Delete Active Schedule */}
            <button
              onClick={handleDeleteActiveSchedule}
              style={{ color: 'var(--text-muted)' }}
              className="p-1.5 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              title="Delete this schedule"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          HERO LIVE BANNER: Real-time Active Block + Up Next Preview
          ───────────────────────────────────────────────────────────── */}
      {isViewingToday && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left Hero Card: Currently Active Routine Block OR Buffer & Rest Mode */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: activeStatus ? activeStatus.block.color : 'rgba(99, 102, 241, 0.25)',
              boxShadow: activeStatus ? `0 12px 32px -8px ${activeStatus.block.color}25` : 'var(--shadow-card)',
            }}
            className="lg:col-span-2 p-5 rounded-2xl border transition-all relative overflow-hidden flex flex-col justify-between"
          >
            {/* Top Micro-Progress hairline */}
            {activeStatus && (
              <div
                style={{ backgroundColor: 'var(--border-subtle)' }}
                className="absolute top-0 left-0 right-0 h-[2.5px] overflow-hidden"
              >
                <div
                  className="h-full transition-all duration-1000 ease-linear"
                  style={{
                    width: `${activeStatus.progressPct}%`,
                    backgroundColor: activeStatus.block.color,
                  }}
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      activeStatus ? 'bg-emerald-400 animate-ping' : 'bg-indigo-400 animate-pulse'
                    }`}
                  />
                  <span
                    className={`text-[10px] font-mono font-black uppercase tracking-wider ${
                      activeStatus ? 'text-emerald-400' : 'text-indigo-400'
                    }`}
                  >
                    {activeStatus ? 'CURRENTLY SCHEDULED NOW' : 'REST & BUFFER FLOW'}
                  </span>
                </div>
                <div style={{ color: 'var(--text-muted)' }} className="text-[11px] font-mono">
                  {now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })}
                </div>
              </div>

              {activeStatus ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-1">
                  <div className="flex items-start gap-3.5">
                    <TimetableIcon
                      icon={activeStatus.block.icon || activeStatus.block.emoji}
                      category={activeStatus.block.category}
                      color={activeStatus.block.color}
                      size={24}
                      badge
                    />
                    <div>
                      <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-bold tracking-tight leading-tight">
                        {activeStatus.block.title}
                      </h2>
                      <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span style={{ color: 'var(--text-secondary)' }} className="font-mono font-semibold">
                          {formatTimeRange12h(activeStatus.block.startTime, activeStatus.block.endTime)}
                        </span>
                        <span>•</span>
                        <span>{activeStatus.totalDurationMinutes} mins block</span>
                        {activeStatus.block.description && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-xs">{activeStatus.block.description}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Start Focus & Mark Done */}
                  <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
                    <button
                      onClick={() => startBlockTimer(activeStatus.block)}
                      style={{
                        backgroundColor: 'var(--accent-primary)',
                        color: '#ffffff',
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer active:scale-95 hover:opacity-90"
                      title="Launch timer for this block"
                    >
                      <Play size={13} fill="currentColor" />
                      <span>Start Focus</span>
                    </button>
                    <CircleCheckbox
                      checked={Boolean(executions[`${todayStr}_${activeStatus.block.id}`])}
                      color={activeStatus.block.color}
                      size={32}
                      shape="rounded"
                      ariaLabel={`Check off ${activeStatus.block.title}`}
                      onClick={() => void toggleExecution(todayStr, activeStatus.block.id)}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
                  <div className="flex items-start gap-3.5">
                    <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0 text-indigo-400">
                      <Moon size={22} />
                    </div>
                    <div>
                      <h2 style={{ color: 'var(--text-primary)' }} className="text-base font-bold tracking-tight">
                        Free Time & Buffer Flow
                      </h2>
                      <p style={{ color: 'var(--text-muted)' }} className="text-xs mt-1 leading-relaxed max-w-md">
                        {nextBlock
                          ? `No active block right now. Next scheduled routine is "${nextBlock.title}" at ${formatTimeTo12h(nextBlock.startTime)}.`
                          : 'No more scheduled blocks for today. Great effort! Rest, recover, or dive into free focus.'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setZenStudioOpen(true)}
                    className="px-3.5 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-bold flex items-center gap-2 hover:bg-indigo-500 hover:text-white transition-all cursor-pointer shrink-0 self-start sm:self-center active:scale-95"
                    title="Launch Zen Companion & Ambient Audio"
                  >
                    <Radio size={13} className="animate-pulse" />
                    <span>Open Zen Studio</span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Progress Bar or Buffer Info Bar */}
            {activeStatus ? (
              <div
                style={{ borderColor: 'var(--border-subtle)' }}
                className="mt-4 pt-3 border-t flex items-center justify-between text-xs"
              >
                <div style={{ color: 'var(--text-secondary)' }} className="flex items-center gap-2 font-mono">
                  <span>{activeStatus.progressPct}% completed</span>
                  <span>·</span>
                  <span style={{ color: 'var(--text-primary)' }} className="font-bold">
                    {activeStatus.remainingFormatted} left
                  </span>
                </div>
                <div
                  style={{ backgroundColor: 'var(--bg-surface-subtle)' }}
                  className="w-40 h-2 rounded-full overflow-hidden"
                >
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${activeStatus.progressPct}%`,
                      backgroundColor: activeStatus.block.color,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div
                style={{ borderColor: 'var(--border-subtle)' }}
                className="mt-4 pt-3 border-t flex items-center justify-between text-xs"
              >
                <div style={{ color: 'var(--text-muted)' }} className="flex items-center gap-2 font-mono text-[11px]">
                  <Sparkles size={13} className="text-amber-400" />
                  <span>Downtime between blocks · recharge or prepare</span>
                </div>
                {nextStartsInMinutes !== null && (
                  <span className="font-mono text-xs text-indigo-400 font-semibold">
                    Starts in {nextStartsInMinutes > 60 ? `${Math.floor(nextStartsInMinutes / 60)}h ${nextStartsInMinutes % 60}m` : `${nextStartsInMinutes}m`}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right Card: Next Upcoming Block */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--shadow-card)',
            }}
            className="p-5 rounded-2xl border flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2 text-xs font-mono">
                <span style={{ color: 'var(--text-muted)' }} className="font-bold uppercase tracking-wider">
                  UP NEXT
                </span>
                {nextStartsInMinutes !== null && (
                  <span className="text-indigo-400 font-bold">
                    in {nextStartsInMinutes > 60 ? `${Math.floor(nextStartsInMinutes / 60)}h ${nextStartsInMinutes % 60}m` : `${nextStartsInMinutes}m`}
                  </span>
                )}
              </div>

              {nextBlock ? (
                <div className="mt-2 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <TimetableIcon
                      icon={nextBlock.icon || nextBlock.emoji}
                      category={nextBlock.category}
                      color={nextBlock.color}
                      size={18}
                      badge
                    />
                    <div className="min-w-0">
                      <h3 style={{ color: 'var(--text-primary)' }} className="text-sm font-bold truncate">
                        {nextBlock.title}
                      </h3>
                      <div style={{ color: 'var(--text-muted)' }} className="text-[11px] font-mono">
                        {formatTimeRange12h(nextBlock.startTime, nextBlock.endTime)} (
                        {calculateBlockDurationMinutes(nextBlock.startTime, nextBlock.endTime)}m)
                      </div>
                    </div>
                  </div>
                  {nextBlock.description && (
                    <p style={{ color: 'var(--text-secondary)' }} className="text-xs line-clamp-2 leading-relaxed">
                      {nextBlock.description}
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--text-muted)' }} className="py-4 text-xs">
                  Day complete! Good job!
                </div>
              )}
            </div>

            {nextBlock && (
              <div
                style={{ borderColor: 'var(--border-subtle)' }}
                className="pt-3 border-t flex items-center justify-between"
              >
                <span
                  style={{
                    backgroundColor: `${nextBlock.color}1c`,
                    borderColor: `${nextBlock.color}38`,
                    color: nextBlock.color,
                  }}
                  className="px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase"
                >
                  {nextBlock.category}
                </span>
                <button
                  onClick={() => startBlockTimer(nextBlock)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <span>Preview Focus</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          DAY SELECTOR & 24-HOUR BALANCE BAR
          ───────────────────────────────────────────────────────────── */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
        className="p-4 rounded-2xl border space-y-3.5 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Day Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
            {DAYS_SHORT.map((dayName, idx) => {
              const isToday = idx === currentDate.getDay();
              const isSelected = selectedDay === idx;
              return (
                <button
                  key={dayName}
                  onClick={() => {
                    setUserManuallySelectedDay(idx !== currentDate.getDay());
                    setSelectedDay(idx);
                  }}
                  style={
                    isSelected
                      ? {
                          backgroundColor: 'var(--accent-primary)',
                          color: '#ffffff',
                          boxShadow: '0 4px 12px -2px rgba(99, 102, 241, 0.4)',
                        }
                      : {
                          backgroundColor: 'var(--bg-surface-subtle)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-secondary)',
                        }
                  }
                  className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap hover:text-[var(--text-primary)] hover:border-[var(--border-medium)] active:scale-95"
                >
                  <span>{dayName}</span>
                  {isToday && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        isSelected ? 'bg-white' : 'bg-emerald-400'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Planned vs Free Buffer summary */}
          <div className="flex items-center gap-2 text-xs font-mono shrink-0">
            <span style={{ color: 'var(--text-primary)' }} className="font-bold">
              {(categoryStats.totalDayMinutes / 60).toFixed(1)}h planned
            </span>
            <span style={{ color: 'var(--text-muted)' }}>·</span>
            <span style={{ color: 'var(--text-secondary)' }}>
              {Math.max(0, (1440 - categoryStats.totalDayMinutes) / 60).toFixed(1)}h buffer & rest
            </span>
          </div>
        </div>

        {/* Visual 24h Multi-Segment Progress Gauge */}
        <div className="space-y-2">
          <div
            style={{ backgroundColor: 'var(--bg-surface-subtle)' }}
            className="w-full h-2 rounded-full overflow-hidden flex"
          >
            {categoryStats.totals.cs > 0 && (
              <div
                style={{ width: `${(categoryStats.totals.cs / 1440) * 100}%` }}
                className="h-full bg-indigo-500 hover:opacity-90 transition-all"
                title={`CS: ${(categoryStats.totals.cs / 60).toFixed(1)}h`}
              />
            )}
            {categoryStats.totals.english > 0 && (
              <div
                style={{ width: `${(categoryStats.totals.english / 1440) * 100}%` }}
                className="h-full bg-blue-500 hover:opacity-90 transition-all"
                title={`English: ${(categoryStats.totals.english / 60).toFixed(1)}h`}
              />
            )}
            {categoryStats.totals.health > 0 && (
              <div
                style={{ width: `${(categoryStats.totals.health / 1440) * 100}%` }}
                className="h-full bg-emerald-500 hover:opacity-90 transition-all"
                title={`Health: ${(categoryStats.totals.health / 60).toFixed(1)}h`}
              />
            )}
            {categoryStats.totals.sleep > 0 && (
              <div
                style={{ width: `${(categoryStats.totals.sleep / 1440) * 100}%` }}
                className="h-full bg-purple-500 hover:opacity-90 transition-all"
                title={`Sleep: ${(categoryStats.totals.sleep / 60).toFixed(1)}h`}
              />
            )}
            {(categoryStats.totals.break + categoryStats.totals.meal) > 0 && (
              <div
                style={{ width: `${((categoryStats.totals.break + categoryStats.totals.meal) / 1440) * 100}%` }}
                className="h-full bg-amber-500 hover:opacity-90 transition-all"
                title={`Breaks & Meals: ${((categoryStats.totals.break + categoryStats.totals.meal) / 60).toFixed(1)}h`}
              />
            )}
            {(categoryStats.totals.review + categoryStats.totals.general) > 0 && (
              <div
                style={{ width: `${((categoryStats.totals.review + categoryStats.totals.general) / 1440) * 100}%` }}
                className="h-full bg-cyan-500 hover:opacity-90 transition-all"
                title={`Review & Other: ${((categoryStats.totals.review + categoryStats.totals.general) / 60).toFixed(1)}h`}
              />
            )}
          </div>

          {/* Category Legend Tags */}
          <div className="flex items-center gap-3.5 text-[11px] font-mono flex-wrap" style={{ color: 'var(--text-secondary)' }}>
            {categoryStats.totals.cs > 0 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>CS {(categoryStats.totals.cs / 60).toFixed(1)}h</span>
              </div>
            )}
            {categoryStats.totals.english > 0 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span>English {(categoryStats.totals.english / 60).toFixed(1)}h</span>
              </div>
            )}
            {categoryStats.totals.health > 0 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Health {(categoryStats.totals.health / 60).toFixed(1)}h</span>
              </div>
            )}
            {categoryStats.totals.sleep > 0 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-purple-500" />
                <span>Sleep {(categoryStats.totals.sleep / 60).toFixed(1)}h</span>
              </div>
            )}
            {(categoryStats.totals.break + categoryStats.totals.meal) > 0 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Breaks {((categoryStats.totals.break + categoryStats.totals.meal) / 60).toFixed(1)}h</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 shrink-0 sm:ml-auto" style={{ color: 'var(--text-muted)' }}>
              <span className="w-2 h-2 rounded-full border border-dashed border-zinc-500" />
              <span>Buffer {Math.max(0, (1440 - categoryStats.totalDayMinutes) / 60).toFixed(1)}h</span>
            </div>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          24-HOUR CHRONOLOGICAL TIMELINE STREAM
          ───────────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1 flex-wrap gap-2">
          <h3 style={{ color: 'var(--text-primary)' }} className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <span>{DAYS_NAMES[selectedDay]}'s Schedule</span>
            <span style={{ color: 'var(--text-muted)' }} className="text-xs font-mono font-normal">
              ({scheduleBlocks.length} planned blocks)
            </span>
          </h3>

          <div className="flex items-center gap-2">
            {/* View Mode Switcher: List vs 24h Timeline */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
              className="p-1 rounded-xl border flex items-center gap-1"
            >
              <button
                type="button"
                onClick={() => setViewMode('list')}
                style={
                  viewMode === 'list'
                    ? { backgroundColor: 'var(--accent-primary)', color: '#ffffff' }
                    : { color: 'var(--text-secondary)' }
                }
                className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Chronological List View"
              >
                <LayoutList size={13} />
                <span>List</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                style={
                  viewMode === 'timeline'
                    ? { backgroundColor: 'var(--accent-primary)', color: '#ffffff' }
                    : { color: 'var(--text-secondary)' }
                }
                className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                title="Interactive 24-Hour Visual Timeline & Smart Shift"
              >
                <Columns size={13} />
                <span>24h Timeline</span>
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'timeline' && activeSchedule ? (
          <TimetableTimelineView schedule={activeSchedule} todayDateStr={todayStr} />
        ) : scheduleBlocks.length === 0 ? (
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
            className="p-12 rounded-2xl border border-dashed text-center space-y-3"
          >
            <div
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                color: 'var(--text-muted)',
              }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
            >
              <CalendarClock size={24} />
            </div>
            <h4 style={{ color: 'var(--text-primary)' }} className="text-sm font-bold">
              No timetable blocks for {DAYS_NAMES[selectedDay]}
            </h4>
            <p style={{ color: 'var(--text-muted)' }} className="text-xs max-w-sm mx-auto">
              You can import your schedule from Markdown or PDF, or manually add your study blocks.
            </p>
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setBlockModalOpen(true, null, activeSchedule?.id)}
                style={{
                  backgroundColor: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-text)',
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold cursor-pointer hover:opacity-90 transition-opacity"
              >
                Add Block
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {scheduleBlocks.map((block) => {
              const durMinutes = calculateBlockDurationMinutes(block.startTime, block.endTime);
              const isDone = Boolean(executions[`${todayStr}_${block.id}`]);
              const isCurrent = activeStatus?.block?.id === block.id && isViewingToday;

              return (
                <div
                  key={block.id}
                  style={{
                    backgroundColor: isCurrent ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                    borderColor: isCurrent ? block.color : isDone ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-subtle)',
                    boxShadow: isCurrent ? `0 8px 24px -6px ${block.color}25` : 'none',
                  }}
                  className={`p-3 sm:p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:border-[var(--border-medium)] hover:shadow-sm ${
                    isDone ? 'opacity-70' : ''
                  }`}
                >
                  {/* Left Column: Checkbox + Icon + Time Badge + Title */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Execution Squircle Checkbox */}
                    <CircleCheckbox
                      checked={isDone}
                      color={block.color}
                      size={24}
                      shape="rounded"
                      ariaLabel={`Mark ${block.title} as completed`}
                      onClick={() => void toggleExecution(todayStr, block.id)}
                    />

                    {/* Lucide Icon Tile (Clean 36x36 rounded-xl tile with category glow) */}
                    <div
                      style={{
                        backgroundColor: `${block.color}15`,
                        borderColor: `${block.color}30`,
                        color: block.color,
                      }}
                      className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-inner"
                    >
                      <TimetableIcon
                        icon={block.icon || block.emoji}
                        category={block.category}
                        color={block.color}
                        size={16}
                      />
                    </div>

                    {/* Time Column (Clean 12h tabular monospace, no clunky grey capsule) */}
                    <div className="flex flex-col shrink-0 min-w-[125px]">
                      <span style={{ color: 'var(--text-primary)' }} className="text-xs font-mono font-bold tracking-tight">
                        {formatTimeRange12h(block.startTime, block.endTime)}
                      </span>
                      <span style={{ color: 'var(--text-muted)' }} className="text-[10px] font-mono">
                        {durMinutes >= 60
                          ? `${(durMinutes / 60).toFixed(durMinutes % 60 === 0 ? 0 : 1)}h`
                          : `${durMinutes}m`}{' '}
                        block
                      </span>
                    </div>

                    {/* Block Title & Notes */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4
                          style={{ color: 'var(--text-primary)' }}
                          className={`text-sm font-semibold tracking-tight truncate ${
                            isDone ? 'line-through opacity-60' : ''
                          }`}
                        >
                          {block.title}
                        </h4>
                        {isCurrent && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            ACTIVE
                          </span>
                        )}
                      </div>
                      {block.description && (
                        <p style={{ color: 'var(--text-muted)' }} className="text-xs truncate max-w-md mt-0.5">
                          {block.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Duration + Category Pill + Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    <span
                      style={{
                        backgroundColor: `${block.color}15`,
                        borderColor: `${block.color}30`,
                        color: block.color,
                      }}
                      className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider hidden sm:inline-block"
                    >
                      {block.category}
                    </span>

                    {/* Start Focus Timer */}
                    <button
                      onClick={() => startBlockTimer(block)}
                      style={{
                        backgroundColor: 'var(--bg-surface-subtle)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-secondary)',
                      }}
                      className="px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 hover:text-indigo-400 hover:border-indigo-500/40 hover:bg-indigo-500/10 transition-all cursor-pointer active:scale-95 shadow-sm"
                      title="Launch timer for this routine block"
                    >
                      <Play size={11} fill="currentColor" />
                      <span>Focus</span>
                    </button>

                    {/* Edit Block */}
                    <button
                      onClick={() => setBlockModalOpen(true, block, activeSchedule?.id)}
                      style={{ color: 'var(--text-muted)' }}
                      className="p-1.5 rounded-lg hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition-colors cursor-pointer"
                      title="Edit block"
                    >
                      <Edit2 size={13} />
                    </button>

                    {/* Delete Block */}
                    <button
                      onClick={() => {
                        if (activeSchedule) void deleteBlock(activeSchedule.id, block.id);
                      }}
                      style={{ color: 'var(--text-muted)' }}
                      className="p-1.5 rounded-lg hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Delete block"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Clear All Schedules Footer Helper (if needed) */}
      <div className="pt-4 flex items-center justify-end">
        <button
          onClick={() => {
            if (confirm('Clear all timetable schedules and start completely clean?')) {
              void clearAllTimetableSchedules();
            }
          }}
          style={{ color: 'var(--text-muted)' }}
          className="text-xs hover:text-rose-400 transition-colors cursor-pointer flex items-center gap-1"
        >
          <Trash2 size={12} />
          <span>Clear All Schedules</span>
        </button>
      </div>
    </div>
  );
};
