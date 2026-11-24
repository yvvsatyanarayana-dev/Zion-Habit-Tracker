import React from 'react';
import { CalendarClock, Play, ArrowRight, Radio } from 'lucide-react';
import { useLiveTimetable } from '../../hooks/useLiveTimetable';
import { useHabitStore } from '../../store/useHabitStore';
import { formatLocalDate } from '../../lib/dateUtils';
import { formatTimeRange12h } from '../../lib/timetableParser';
import { TimetableIcon } from '../timetable/TimetableIcon';
import { CircleCheckbox } from '../ui/CircleCheckbox';

export const LiveTimetableCard: React.FC = React.memo(() => {
  const setTab = useHabitStore((s) => s.setTab);
  const startBlockTimer = useHabitStore((s) => s.startTimetableBlockTimer);
  const toggleExecution = useHabitStore((s) => s.toggleTimetableExecution);
  const executions = useHabitStore((s) => s.timetableExecutions);
  const currentDate = useHabitStore((s) => s.currentDate);
  const setZenStudioOpen = useHabitStore((s) => s.setZenStudioModalOpen);

  const { activeStatus, nextBlock, nextStartsInMinutes, scheduleBlocks } = useLiveTimetable();
  const todayStr = formatLocalDate(currentDate);

  if (scheduleBlocks.length === 0) return null;

  const isDone = activeStatus ? Boolean(executions[`${todayStr}_${activeStatus.block.id}`]) : false;

  return (
    <div
      style={{
        borderColor: 'var(--border-subtle)',
        backgroundColor: 'var(--bg-surface)',
        boxShadow: 'var(--shadow-card)',
      }}
      className="p-3.5 sm:p-4 rounded-2xl border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-sm transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          style={{
            backgroundColor: activeStatus ? `${activeStatus.block.color}18` : 'var(--bg-surface-subtle)',
            borderColor: activeStatus ? `${activeStatus.block.color}38` : 'var(--border-subtle)',
            color: activeStatus ? activeStatus.block.color : 'var(--accent-primary)',
          }}
          className="p-2.5 rounded-xl border shrink-0 flex items-center justify-center w-11 h-11"
        >
          {activeStatus ? (
            <TimetableIcon
              icon={activeStatus.block.icon || activeStatus.block.emoji}
              category={activeStatus.block.category}
              color={activeStatus.block.color}
              size={20}
            />
          ) : (
            <CalendarClock size={20} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {activeStatus ? 'SCHEDULED NOW' : 'UP NEXT IN SCHEDULE'}
            </span>
            {activeStatus && (
              <span style={{ color: 'var(--text-muted)' }} className="text-[10px] font-mono">
                • {activeStatus.remainingFormatted} left ({activeStatus.progressPct}%)
              </span>
            )}
          </div>
          <h3 style={{ color: 'var(--text-primary)' }} className="text-sm font-bold tracking-tight truncate">
            {activeStatus
              ? activeStatus.block.title
              : nextBlock
              ? `${nextBlock.title} (in ${nextStartsInMinutes}m)`
              : 'All daily blocks completed!'}
          </h3>
          <div style={{ color: 'var(--text-secondary)' }} className="text-xs font-mono mt-0.5">
            {activeStatus
              ? formatTimeRange12h(activeStatus.block.startTime, activeStatus.block.endTime)
              : nextBlock
              ? formatTimeRange12h(nextBlock.startTime, nextBlock.endTime)
              : 'Relax and recharge'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
        {activeStatus && (
          <>
            <button
              onClick={() => startBlockTimer(activeStatus.block)}
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: '#ffffff',
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition-all active:scale-95 cursor-pointer hover:opacity-90"
            >
              <Play size={12} fill="currentColor" />
              <span>Start Focus</span>
            </button>
            <CircleCheckbox
              checked={isDone}
              color={activeStatus.block.color}
              size={28}
              shape="rounded"
              ariaLabel={`Complete ${activeStatus.block.title}`}
              onClick={() => void toggleExecution(todayStr, activeStatus.block.id)}
            />
          </>
        )}
        <button
          onClick={() => setZenStudioOpen(true)}
          style={{
            backgroundColor: 'rgba(99, 102, 241, 0.12)',
            color: 'var(--accent-primary)',
            borderColor: 'rgba(99, 102, 241, 0.25)',
          }}
          className="p-1.5 rounded-xl border flex items-center justify-center cursor-pointer transition-colors hover:bg-indigo-500 hover:text-white"
          title="Open Fullscreen Zen Focus Studio"
        >
          <Radio size={14} className="animate-pulse" />
        </button>
        <button
          onClick={() => setTab('timetable')}
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            color: 'var(--text-secondary)',
            borderColor: 'var(--border-subtle)',
          }}
          className="px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors hover:text-[var(--text-primary)]"
        >
          <span>View Timetable</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
});
LiveTimetableCard.displayName = 'LiveTimetableCard';
