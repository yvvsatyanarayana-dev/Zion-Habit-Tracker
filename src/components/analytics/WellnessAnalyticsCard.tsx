import React, { useMemo } from 'react';
import { Heart, Zap, Smile, Plus } from 'lucide-react';
import { Card } from '../ui/Card';
import { useHabitStore } from '../../store/useHabitStore';
import { formatLocalDate } from '../../lib/dateUtils';
import { isHabitScheduledOnDay } from '../../lib/statsUtils';

export const WellnessAnalyticsCard: React.FC = () => {
  const habits = useHabitStore((s) => s.habits || []);
  const checkins = useHabitStore((s) => s.checkins || {});
  const wellnessLogs = useHabitStore((s) => s.wellnessLogs || {});
  const currentDate = useHabitStore((s) => s.currentDate || new Date());
  const setWellnessModalOpen = useHabitStore((s) => s.setWellnessModalOpen);

  const activeHabits = useMemo(() => habits.filter((h) => !h?.archived), [habits]);

  const last14Days = useMemo(() => {
    const days: Array<{
      dateStr: string;
      label: string;
      rate: number;
      energy: number | null;
      mood: number | null;
    }> = [];

    for (let i = 13; i >= 0; i--) {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - i);
      const dateStr = formatLocalDate(d);
      const wday = d.getDay();

      const scheduled = activeHabits.filter((h) => isHabitScheduledOnDay(h, wday));
      const completed = scheduled.filter((h) => checkins[`${h.id}_${dateStr}`]?.completed).length;
      const rate = scheduled.length > 0 ? Math.round((completed / scheduled.length) * 100) : 0;

      const wLog = wellnessLogs[dateStr];
      days.push({
        dateStr,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
        rate,
        energy: wLog ? wLog.energy : null,
        mood: wLog ? wLog.mood : null,
      });
    }
    return days;
  }, [activeHabits, checkins, wellnessLogs, currentDate]);

  const loggedDays = last14Days.filter((d) => d.energy !== null);
  const highEnergyDays = loggedDays.filter((d) => (d.energy ?? 0) >= 4);
  const lowEnergyDays = loggedDays.filter((d) => (d.energy ?? 0) <= 2);

  const avgHigh =
    highEnergyDays.length > 0
      ? Math.round(highEnergyDays.reduce((s, d) => s + d.rate, 0) / highEnergyDays.length)
      : null;
  const avgLow =
    lowEnergyDays.length > 0
      ? Math.round(lowEnergyDays.reduce((s, d) => s + d.rate, 0) / lowEnergyDays.length)
      : null;

  const avgEnergy =
    loggedDays.length > 0
      ? (loggedDays.reduce((s, d) => s + (d.energy ?? 0), 0) / loggedDays.length).toFixed(1)
      : '—';
  const avgMood =
    loggedDays.length > 0
      ? (loggedDays.reduce((s, d) => s + (d.mood ?? 0), 0) / loggedDays.length).toFixed(1)
      : '—';

  const todayStr = formatLocalDate(currentDate);
  const todayLogged = Boolean(wellnessLogs[todayStr]);

  return (
    <Card className="!p-5 sm:!p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-pink-500/15 border border-pink-500/25 text-pink-400 flex items-center justify-center shrink-0">
            <Heart size={20} />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Energy, Mood & Habit Output (14 Days)
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              See how daily energy and mood levels influence your habit completion rate
            </p>
          </div>
        </div>

        <button
          onClick={() => setWellnessModalOpen(true)}
          style={{
            backgroundColor: todayLogged ? 'var(--bg-surface-elevated)' : 'rgba(236, 72, 153, 0.14)',
            borderColor: todayLogged ? 'var(--border-subtle)' : 'rgba(236, 72, 153, 0.35)',
            color: todayLogged ? 'var(--text-secondary)' : '#f472b6',
          }}
          className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto hover:opacity-90 cursor-pointer"
        >
          <Plus size={13} />
          <span>{todayLogged ? "Edit Today's Wellness" : "Log Today's Wellness"}</span>
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div
          style={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}
          className="p-3 rounded-xl border"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
            <Zap size={12} className="text-amber-400" />
            <span>Avg Energy</span>
          </div>
          <div className="font-num text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
            {avgEnergy} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ 5</span>
          </div>
        </div>

        <div
          style={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}
          className="p-3 rounded-xl border"
        >
          <div className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
            <Smile size={12} className="text-pink-400" />
            <span>Avg Mood</span>
          </div>
          <div className="font-num text-xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
            {avgMood} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ 5</span>
          </div>
        </div>

        <div
          style={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}
          className="p-3 rounded-xl border"
        >
          <div className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
            High-Energy Output
          </div>
          <div className="font-num text-xl font-bold mt-1 text-emerald-400">
            {avgHigh !== null ? `${avgHigh}%` : '—'}
          </div>
        </div>

        <div
          style={{ backgroundColor: 'var(--bg-surface-elevated)', borderColor: 'var(--border-subtle)' }}
          className="p-3 rounded-xl border"
        >
          <div className="text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}>
            Low-Energy Output
          </div>
          <div className="font-num text-xl font-bold mt-1 text-amber-400">
            {avgLow !== null ? `${avgLow}%` : '—'}
          </div>
        </div>
      </div>

      {/* 14-day Dual Bar Chart */}
      <div className="grid grid-cols-14 gap-1.5 items-end h-32 pt-2">
        {last14Days.map((day) => {
          const barHeight = Math.max(6, day.rate);
          const energyPct = day.energy ? (day.energy / 5) * 100 : 0;
          return (
            <div
              key={day.dateStr}
              className="flex flex-col items-center gap-1 h-full justify-end group"
              title={`${day.dateStr}: ${day.rate}% habits${day.energy ? ` · Energy ${day.energy}/5` : ''}${day.mood ? ` · Mood ${day.mood}/5` : ''}`}
            >
              <div className="w-full flex items-end justify-center gap-0.5 flex-1">
                {/* Habit completion bar */}
                <div
                  className="w-2 sm:w-2.5 rounded-t bg-indigo-500/80 group-hover:bg-indigo-400 transition-all"
                  style={{ height: `${barHeight}%` }}
                />
                {/* Energy bar if logged */}
                {day.energy !== null && (
                  <div
                    className="w-1.5 sm:w-2 rounded-t bg-amber-400/80 group-hover:bg-amber-300 transition-all"
                    style={{ height: `${Math.max(8, energyPct)}%` }}
                  />
                )}
              </div>
              <span className="text-[9px] font-num truncate max-w-full" style={{ color: 'var(--text-muted)' }}>
                {day.label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-3 pt-2 border-t text-[11px]" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500 inline-block" />
          Habit Completion %
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
          Energy Level (1–5)
        </span>
      </div>
    </Card>
  );
};
