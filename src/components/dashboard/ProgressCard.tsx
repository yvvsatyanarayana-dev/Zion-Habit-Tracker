import React from 'react';
import { Card } from '../ui/Card';
import { ActivityRings } from '../ui/ActivityRing';
import { computeActivityRings } from '../../lib/statsUtils';
import { useHabitStore } from '../../store/useHabitStore';

export const ProgressCard: React.FC = () => {
  const habits = useHabitStore((s) => s.habits);
  const checkins = useHabitStore((s) => s.checkins);
  const selectedYear = useHabitStore((s) => s.selectedYear);
  const selectedMonth = useHabitStore((s) => s.selectedMonth);
  const currentDate = useHabitStore((s) => s.currentDate);

  const stats = computeActivityRings(
    habits,
    checkins,
    selectedYear,
    selectedMonth,
    currentDate
  );

  const todayPct = Math.round(stats.today.rate * 100);
  const weekPct = Math.round(stats.week.rate * 100);
  const monthPct = Math.round(stats.month.rate * 100);

  return (
    <Card className="flex flex-col justify-between !p-5">
      {/* Title */}
      <div className="flex items-center justify-between mb-3">
        <h2
          style={{ color: 'var(--text-primary)', letterSpacing: '0.04em' }}
          className="text-[12.5px] font-bold uppercase"
        >
          Activity Progress
        </h2>
        <span
          style={{
            backgroundColor: 'var(--bg-surface-hover)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
          className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-[6px] border"
        >
          Rings
        </span>
      </div>

      {/* Concentric rings & Legend */}
      <div className="flex flex-col sm:flex-row items-center justify-around gap-5 py-1">
        {/* Sleek 180px Concentric Rings */}
        <ActivityRings
          todayRate={stats.today.rate}
          weekRate={stats.week.rate}
          monthRate={stats.month.rate}
          size={180}
          strokeWidth={18}
          todayColor="#6366f1"
          weekColor="#10b981"
          monthColor="#06b6d4"
        />

        {/* Legend */}
        <div className="flex flex-col justify-center space-y-3 min-w-[160px]">
          {/* Today (Indigo/Electric Violet) */}
          <div>
            <div
              style={{ color: '#6366f1' }}
              className="text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1]" />
              Today
            </div>
            <div
              style={{ color: 'var(--text-primary)' }}
              className="text-[20px] font-extrabold font-num leading-tight mt-0.5"
            >
              {stats.today.completed}/{stats.today.total}{' '}
              <span style={{ color: 'var(--text-muted)' }} className="text-[12px] font-medium">habits</span>
            </div>
            <div style={{ color: 'var(--text-secondary)' }} className="text-[11px] font-medium font-num">
              {todayPct}% completed today
            </div>
          </div>

          {/* This Week (Emerald) */}
          <div>
            <div
              style={{ color: '#10b981' }}
              className="text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
              This Week
            </div>
            <div
              style={{ color: 'var(--text-primary)' }}
              className="text-[20px] font-extrabold font-num leading-tight mt-0.5"
            >
              {stats.week.completed}/{stats.week.total}{' '}
              <span style={{ color: '#10b981' }} className="text-[12px] font-bold">· {weekPct}%</span>
            </div>
            <div style={{ color: 'var(--text-secondary)' }} className="text-[11px] font-medium font-num">
              Active 7-day window
            </div>
          </div>

          {/* This Month (Cyan) */}
          <div>
            <div
              style={{ color: '#06b6d4' }}
              className="text-[10.5px] font-bold uppercase tracking-wider flex items-center gap-1.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4]" />
              This Month
            </div>
            <div
              style={{ color: 'var(--text-primary)' }}
              className="text-[20px] font-extrabold font-num leading-tight mt-0.5"
            >
              {stats.month.completed}/{stats.month.total}{' '}
              <span style={{ color: '#06b6d4' }} className="text-[12px] font-bold">· {monthPct}%</span>
            </div>
            <div style={{ color: 'var(--text-secondary)' }} className="text-[11px] font-medium font-num">
              Monthly target pace
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
