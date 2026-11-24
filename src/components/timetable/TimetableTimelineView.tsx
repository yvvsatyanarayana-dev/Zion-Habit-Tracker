import React, { useState, useEffect } from 'react';
import {
  Clock,
  Play,
  CheckCircle2,
  FastForward,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Edit2,
  Calendar,
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import type { TimetableSchedule, TimetableBlock } from '../../lib/types';
import { formatTimeRange12h, calculateBlockDurationMinutes } from '../../lib/timetableParser';
import { parseTimeToMinutes, formatMinutesToHhMm } from '../../lib/scheduleCascade';
import { TimetableIcon } from './TimetableIcon';

interface TimetableTimelineViewProps {
  schedule: TimetableSchedule;
  todayDateStr: string;
}

export const TimetableTimelineView: React.FC<TimetableTimelineViewProps> = ({
  schedule,
  todayDateStr,
}) => {
  const executions = useHabitStore((s) => s.timetableExecutions);
  const toggleExecution = useHabitStore((s) => s.toggleTimetableExecution);
  const startTimer = useHabitStore((s) => s.startTimetableBlockTimer);
  const setBlockModalOpen = useHabitStore((s) => s.setTimetableBlockModalOpen);
  const cascadeShift = useHabitStore((s) => s.cascadeShiftActiveSchedule);
  const snapToNow = useHabitStore((s) => s.snapBlockToCurrentTime);

  const [currentMinutesNow, setCurrentMinutesNow] = useState<number>(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // Keep now-line updated every 15 seconds
  useEffect(() => {
    const update = () => {
      const d = new Date();
      setCurrentMinutesNow(d.getHours() * 60 + d.getMinutes());
    };
    const timer = setInterval(update, 15000);
    return () => clearInterval(timer);
  }, []);

  const sortedBlocks = [...schedule.blocks].sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Determine earliest start hour and latest end hour for view scaling
  let minHour = 6; // default 6 AM
  let maxHour = 24; // default midnight

  if (sortedBlocks.length > 0) {
    const starts = sortedBlocks.map((b) => Math.floor(parseTimeToMinutes(b.startTime) / 60));
    const ends = sortedBlocks.map((b) => Math.ceil(parseTimeToMinutes(b.endTime) / 60));
    const minCalculated = Math.min(...starts);
    const maxCalculated = Math.max(...ends);
    if (minCalculated >= 0 && minCalculated < 24) minHour = Math.max(0, minCalculated - 1);
    if (maxCalculated > minHour && maxCalculated <= 24) maxHour = Math.min(24, maxCalculated + 1);
  }

  const totalHours = Math.max(12, maxHour - minHour);
  const hourHeightPx = 64; // pixels per hour
  const totalHeightPx = totalHours * hourHeightPx;

  // Real-time now line position
  const nowOffsetMinutes = currentMinutesNow - minHour * 60;
  const nowTopPx = (nowOffsetMinutes / 60) * hourHeightPx;
  const isNowInView = nowTopPx >= 0 && nowTopPx <= totalHeightPx;

  const hoursArray: number[] = [];
  for (let h = minHour; h <= maxHour; h++) {
    hoursArray.push(h);
  }

  const formatHourLabel = (h: number): string => {
    if (h === 0 || h === 24) return '12:00 AM';
    if (h === 12) return '12:00 PM';
    if (h > 12) return `${h - 12}:00 PM`;
    return `${h}:00 AM`;
  };

  return (
    <div className="space-y-4">
      {/* Smart Cascade Shift Toolbar */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface-card)',
          borderColor: 'var(--border-subtle)',
        }}
        className="p-3.5 rounded-2xl border flex flex-wrap items-center justify-between gap-3 text-xs"
      >
        <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
          <Sparkles size={14} className="text-indigo-400" />
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Smart Adaptive Schedule Shift:
          </span>
          <span className="hidden sm:inline" style={{ color: 'var(--text-muted)' }}>
            Running late or early? Cascade-shift remaining blocks smoothly.
          </span>
        </div>

        <div className="flex items-center gap-2">
          {selectedBlockId ? (
            <>
              <button
                type="button"
                onClick={() => void cascadeShift(selectedBlockId, 15)}
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
                className="px-2.5 py-1.5 rounded-lg border font-mono font-semibold hover:border-indigo-500/50 transition-colors flex items-center gap-1 cursor-pointer"
                title="Push remaining blocks by 15 minutes"
              >
                <FastForward size={12} className="text-indigo-400" />
                <span>+15m</span>
              </button>

              <button
                type="button"
                onClick={() => void cascadeShift(selectedBlockId, 30)}
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
                className="px-2.5 py-1.5 rounded-lg border font-mono font-semibold hover:border-indigo-500/50 transition-colors flex items-center gap-1 cursor-pointer"
                title="Push remaining blocks by 30 minutes"
              >
                <FastForward size={12} className="text-indigo-400" />
                <span>+30m</span>
              </button>

              <button
                type="button"
                onClick={() => void snapToNow(selectedBlockId)}
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: '#ffffff',
                }}
                className="px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 shadow hover:opacity-90 transition-opacity cursor-pointer"
                title="Snap selected routine block start time to right now"
              >
                <Clock size={12} />
                <span>Snap to Now</span>
              </button>
            </>
          ) : (
            <span style={{ color: 'var(--text-muted)' }} className="text-[11px] italic">
              Click any block below to enable Smart Shift
            </span>
          )}
        </div>
      </div>

      {/* Visual Gantt Timeline Container */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--shadow-card)',
        }}
        className="rounded-3xl border p-4 sm:p-6 overflow-x-auto relative"
      >
        <div className="min-w-[640px] relative" style={{ height: `${totalHeightPx}px` }}>
          {/* Background Hour Grid Lines & Labels */}
          {hoursArray.map((hour, idx) => {
            const top = idx * hourHeightPx;
            return (
              <div
                key={hour}
                style={{ top: `${top}px`, borderColor: 'var(--border-subtle)' }}
                className="absolute left-0 right-0 border-t flex items-center pointer-events-none"
              >
                <span
                  style={{ color: 'var(--text-muted)' }}
                  className="text-[10px] font-mono select-none -translate-y-3.5 pr-3 w-16 text-right shrink-0"
                >
                  {formatHourLabel(hour)}
                </span>
                <div className="flex-1 h-px bg-white/[0.04]" />
              </div>
            );
          })}

          {/* Pulsating Current Time Line (NOW) */}
          {isNowInView && (
            <div
              style={{ top: `${nowTopPx}px` }}
              className="absolute left-16 right-0 z-30 pointer-events-none flex items-center"
            >
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20 -ml-1.5 shrink-0 animate-pulse" />
              <div className="flex-1 h-[2px] bg-emerald-400/80 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/30 ml-1">
                NOW
              </span>
            </div>
          )}

          {/* Timeline Blocks Canvas */}
          <div className="absolute left-20 right-2 top-0 bottom-0">
            {sortedBlocks.map((block) => {
              const startMins = parseTimeToMinutes(block.startTime);
              const duration = calculateBlockDurationMinutes(block.startTime, block.endTime);
              const offsetMins = startMins - minHour * 60;
              const topPx = (offsetMins / 60) * hourHeightPx;
              const heightPx = Math.max(34, (duration / 60) * hourHeightPx - 4);
              const isDone = Boolean(executions[`${todayDateStr}_${block.id}`]);
              const isSelected = selectedBlockId === block.id;

              return (
                <div
                  key={block.id}
                  onClick={() => setSelectedBlockId(isSelected ? null : block.id)}
                  style={{
                    top: `${topPx}px`,
                    height: `${heightPx}px`,
                    backgroundColor: isDone
                      ? 'rgba(16, 185, 129, 0.12)'
                      : `${block.color || 'var(--accent-primary)'}18`,
                    borderColor: isSelected
                      ? '#6366f1'
                      : isDone
                      ? 'rgba(16, 185, 129, 0.4)'
                      : `${block.color || 'var(--accent-primary)'}40`,
                    boxShadow: isSelected ? '0 0 0 2px rgba(99, 102, 241, 0.5)' : undefined,
                  }}
                  className={`absolute left-0 right-0 rounded-2xl border px-3.5 py-2 flex items-center justify-between transition-all cursor-pointer group hover:scale-[1.005] hover:z-20 ${
                    isDone ? 'opacity-70' : 'opacity-100'
                  }`}
                >
                  {/* Left: Icon & Title & Time */}
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <TimetableIcon
                      icon={block.icon || block.emoji}
                      category={block.category}
                      color={block.color}
                      size={15}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          style={{
                            color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                            textDecoration: isDone ? 'line-through' : 'none',
                          }}
                          className="text-xs font-bold truncate"
                        >
                          {block.title}
                        </span>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-black/30 border border-white/5 text-zinc-300 shrink-0">
                          {duration}m
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                        <span>{formatTimeRange12h(block.startTime, block.endTime)}</span>
                        {block.description && (
                          <span className="hidden md:inline truncate max-w-[200px]">
                            · {block.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Quick Actions */}
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => startTimer(block)}
                      style={{
                        backgroundColor: 'var(--accent-primary)',
                        color: '#ffffff',
                      }}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shadow hover:opacity-90 transition-opacity cursor-pointer"
                      title="Start Focus Timer for this routine"
                    >
                      <Play size={10} fill="currentColor" />
                      <span className="hidden sm:inline">Focus</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBlockModalOpen(true, block, schedule.id)}
                      style={{ color: 'var(--text-muted)' }}
                      className="w-7 h-7 rounded-lg hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] flex items-center justify-center transition-colors cursor-pointer"
                      title="Edit Block"
                    >
                      <Edit2 size={12} />
                    </button>

                    <button
                      type="button"
                      onClick={() => void toggleExecution(todayDateStr, block.id)}
                      style={{
                        color: isDone ? '#10b981' : 'var(--text-muted)',
                      }}
                      className="w-7 h-7 rounded-lg hover:bg-[var(--bg-surface-subtle)] flex items-center justify-center transition-colors cursor-pointer"
                      title={isDone ? 'Mark Incomplete' : 'Check Off'}
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
