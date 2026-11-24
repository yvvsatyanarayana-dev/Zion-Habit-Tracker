import { useState, useEffect, useMemo, useRef } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import { calculateBlockDurationMinutes, formatTimeRange12h } from '../lib/timetableParser';
import { sendOsNotification } from '../lib/reminders';
import { sound } from '../lib/audio';
import type { TimetableBlock, TimetableCategory } from '../lib/types';

export interface LiveBlockStatus {
  block: TimetableBlock;
  progressPct: number;
  remainingSeconds: number;
  elapsedSeconds: number;
  totalDurationMinutes: number;
  remainingFormatted: string;
}

export function useLiveTimetable(selectedDayOverride?: number) {
  const timetableSchedules = useHabitStore((s) => s.timetableSchedules);
  const activeScheduleId = useHabitStore((s) => s.activeScheduleId);
  const currentDate = useHabitStore((s) => s.currentDate);
  const soundEnabled = useHabitStore((s) => s.settings.sound_enabled ?? true);

  const [now, setNow] = useState(() => new Date());
  const notifiedBlockIdRef = useRef<string | null>(null);

  // Tick clock every second for live countdown
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Determine current day of week (0=Sun, 1=Mon... 6=Sat)
  const currentDayOfWeek = selectedDayOverride !== undefined ? selectedDayOverride : now.getDay();
  const currentMinutesSinceMidnight = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  // Active schedule for today
  const activeSchedule = useMemo(() => {
    if (activeScheduleId) {
      const explicit = timetableSchedules.find((s) => s.id === activeScheduleId);
      if (explicit && explicit.daysOfWeek.includes(currentDayOfWeek)) return explicit;
    }
    // Match schedule by current day
    return (
      timetableSchedules.find((s) => s.isActive && s.daysOfWeek.includes(currentDayOfWeek)) ||
      timetableSchedules[0] ||
      null
    );
  }, [timetableSchedules, activeScheduleId, currentDayOfWeek]);

  const scheduleBlocks = useMemo(() => {
    if (!activeSchedule) return [];
    return [...activeSchedule.blocks].sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [activeSchedule]);

  // Find active block and next upcoming block
  const { activeStatus, nextBlock, nextStartsInMinutes } = useMemo(() => {
    if (scheduleBlocks.length === 0) {
      return { activeStatus: null, nextBlock: null, nextStartsInMinutes: null };
    }

    let foundActive: LiveBlockStatus | null = null;
    let foundNext: TimetableBlock | null = null;
    let minDiffToNext = Infinity;

    for (const b of scheduleBlocks) {
      const [sH, sM] = b.startTime.split(':').map((x) => parseInt(x, 10));
      const [eH, eM] = b.endTime.split(':').map((x) => parseInt(x, 10));

      const startMin = sH * 60 + sM;
      let endMin = eH * 60 + eM;
      const isOvernight = endMin <= startMin;

      let isNowInBlock = false;
      let totalDurationMin = 0;
      let elapsedMin = 0;

      if (!isOvernight) {
        isNowInBlock = currentMinutesSinceMidnight >= startMin && currentMinutesSinceMidnight < endMin;
        totalDurationMin = endMin - startMin;
        elapsedMin = currentMinutesSinceMidnight - startMin;
      } else {
        // e.g. 22:00 to 06:00
        isNowInBlock = currentMinutesSinceMidnight >= startMin || currentMinutesSinceMidnight < endMin;
        totalDurationMin = 24 * 60 - startMin + endMin;
        elapsedMin =
          currentMinutesSinceMidnight >= startMin
            ? currentMinutesSinceMidnight - startMin
            : 24 * 60 - startMin + currentMinutesSinceMidnight;
      }

      if (isNowInBlock) {
        const elapsedSec = Math.max(0, Math.floor(elapsedMin * 60));
        const totalSec = Math.max(1, totalDurationMin * 60);
        const remSec = Math.max(0, totalSec - elapsedSec);
        const pct = Math.min(100, Math.round((elapsedSec / totalSec) * 100));

        const rH = Math.floor(remSec / 3600);
        const rM = Math.floor((remSec % 3600) / 60);
        const rS = remSec % 60;
        const formatted =
          rH > 0
            ? `${rH}h ${String(rM).padStart(2, '0')}m`
            : `${rM}m ${String(rS).padStart(2, '0')}s`;

        foundActive = {
          block: b,
          progressPct: pct,
          remainingSeconds: remSec,
          elapsedSeconds: elapsedSec,
          totalDurationMinutes: totalDurationMin,
          remainingFormatted: formatted,
        };
      } else if (startMin > currentMinutesSinceMidnight) {
        const diff = startMin - currentMinutesSinceMidnight;
        if (diff < minDiffToNext) {
          minDiffToNext = diff;
          foundNext = b;
        }
      }
    }

    // If no next found today, pick the first block of tomorrow/today
    if (!foundNext && scheduleBlocks.length > 0) {
      foundNext = scheduleBlocks[0];
      const [sH, sM] = foundNext.startTime.split(':').map((x) => parseInt(x, 10));
      minDiffToNext = 24 * 60 - currentMinutesSinceMidnight + (sH * 60 + sM);
    }

    return {
      activeStatus: foundActive,
      nextBlock: foundNext,
      nextStartsInMinutes: minDiffToNext !== Infinity ? Math.round(minDiffToNext) : null,
    };
  }, [scheduleBlocks, currentMinutesSinceMidnight]);

  // Real-time OS notifications & taskbar flash on block entry
  useEffect(() => {
    if (!activeStatus?.block) return;
    const blockId = activeStatus.block.id;

    if (notifiedBlockIdRef.current !== blockId) {
      notifiedBlockIdRef.current = blockId;
      if (activeStatus.block.soundAlert && soundEnabled) {
        sound.playCelebration();
      }
      void sendOsNotification(
        `Scheduled Now: ${activeStatus.block.title}`,
        `${formatTimeRange12h(activeStatus.block.startTime, activeStatus.block.endTime)} (${activeStatus.totalDurationMinutes} mins)`
      );
      if (typeof window !== 'undefined' && window.api?.os?.flashFrame) {
        void window.api.os.flashFrame(true);
      }
    }
  }, [activeStatus?.block?.id, soundEnabled]);

  // Real-time Tray & Taskbar Progress Sync
  useEffect(() => {
    if (typeof window === 'undefined' || !window.api) return;

    if (activeStatus) {
      // Sync active block with Focus Shield Firewall
      void window.api.focusShield?.setActiveBlock?.(activeStatus.block.title);

      // Update Tray with live block & time left
      void window.api.os?.updateTray?.({
        activeBlockTitle: activeStatus.block.title,
        activeBlockTimeRange: formatTimeRange12h(activeStatus.block.startTime, activeStatus.block.endTime),
        activeBlockRemaining: `${activeStatus.remainingFormatted} left`,
      });

      // If manual focus timer is not running, show timetable routine progress on taskbar!
      const hasManualTimer = Boolean(useHabitStore.getState().activeHabitTimer);
      if (!hasManualTimer) {
        void window.api.os?.setProgressBar?.(activeStatus.progressPct / 100);
      }
    } else {
      void window.api.focusShield?.setActiveBlock?.(null);
      const hasManualTimer = Boolean(useHabitStore.getState().activeHabitTimer);
      if (!hasManualTimer) {
        void window.api.os?.updateTray?.({
          activeBlockTitle: undefined,
          activeBlockTimeRange: undefined,
          activeBlockRemaining: undefined,
        });
      }
    }
  }, [activeStatus?.block?.id, activeStatus?.remainingFormatted, activeStatus?.progressPct]);

  // System resume / unlock listener
  useEffect(() => {
    if (typeof window === 'undefined' || !window.api?.os?.onSystemResumed) return;
    const unsub = window.api.os.onSystemResumed(() => {
      setNow(new Date());
      void useHabitStore.getState().loadTimetableSchedules();
    });
    return () => unsub();
  }, []);

  // Compute category breakdown and statistics
  const categoryStats = useMemo(() => {
    const totals: Record<TimetableCategory, number> = {
      cs: 0,
      english: 0,
      health: 0,
      sleep: 0,
      meal: 0,
      break: 0,
      review: 0,
      general: 0,
    };

    let totalDayMinutes = 0;
    for (const b of scheduleBlocks) {
      const dur = calculateBlockDurationMinutes(b.startTime, b.endTime);
      totals[b.category] = (totals[b.category] || 0) + dur;
      totalDayMinutes += dur;
    }

    return { totals, totalDayMinutes };
  }, [scheduleBlocks]);

  return {
    now,
    currentDayOfWeek,
    activeSchedule,
    scheduleBlocks,
    activeStatus,
    nextBlock,
    nextStartsInMinutes,
    categoryStats,
  };
}
