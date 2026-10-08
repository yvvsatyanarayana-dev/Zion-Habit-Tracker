import React from 'react';
import { Header } from '../components/ui/Header';
import { YearHeatmap } from '../components/analytics/YearHeatmap';
import { WeekdayPerformance } from '../components/analytics/WeekdayPerformance';
import { HabitTrends } from '../components/analytics/HabitTrends';
import { BestWorstHabits } from '../components/analytics/BestWorstHabits';
import { Card } from '../components/ui/Card';
import { useHabitStore } from '../store/useHabitStore';
import { BarChart3, Award } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const habits = useHabitStore((s) => s.habits);
  const allCheckinsList = useHabitStore((s) => s.allCheckinsList);
  const setWeeklyReviewOpen = useHabitStore((s) => s.setWeeklyReviewOpen);
  const activeHabits = habits.filter((h) => !h.archived);

  // Month over month completion comparison
  const currentDate = useHabitStore((s) => s.currentDate);
  const curMonthStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
  const prevMonthStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;

  const curMonthCheckins = allCheckinsList.filter((c) => c.date.startsWith(curMonthStr) && c.completed).length;
  const prevMonthCheckins = allCheckinsList.filter((c) => c.date.startsWith(prevMonthStr) && c.completed).length;

  const momDiff = curMonthCheckins - prevMonthCheckins;
  const momPctChange = prevMonthCheckins > 0 ? Math.round((momDiff / prevMonthCheckins) * 100) : curMonthCheckins > 0 ? 100 : 0;

  return (
    <div className="w-full max-w-[1600px] mx-auto pb-16 space-y-6 animate-in fade-in duration-200">
      <Header title="Analytics" />

      {activeHabits.length === 0 ? (
        <Card className="py-16 text-center">
          <div
            style={{ backgroundColor: 'var(--bg-surface-hover)', color: 'var(--text-muted)' }}
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <BarChart3 size={28} />
          </div>
          <h3
            style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}
            className="text-[20px] font-bold"
          >
            Not enough data yet
          </h3>
          <p style={{ color: 'var(--text-secondary)' }} className="text-[13.5px] mt-1 max-w-sm mx-auto">
            Create habits and log your daily completions to unlock analytics, trends, and year heatmaps.
          </p>
        </Card>
      ) : (
        <>
          {/* Weekly Review & Consistency Grade Card */}
          <Card className="!p-5 sm:!p-6 border relative overflow-hidden bg-gradient-to-r from-[var(--bg-surface-elevated)] via-[var(--bg-surface)] to-[var(--bg-surface-elevated)]">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-400 flex items-center justify-center flex-shrink-0 shadow-sm">
                  <Award size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-[var(--text-primary)] tracking-tight">
                      Weekly Review & Consistency Grade
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      Weekly Report
                    </span>
                  </div>
                  <p className="text-xs sm:text-[13px] text-[var(--text-secondary)] mt-1 max-w-2xl leading-relaxed">
                    Evaluate your 7-day consistency score, calculate your official grade (A+ through F), inspect mood reflections, and review daily micro-notes.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setWeeklyReviewOpen(true)}
                style={{
                  backgroundColor: 'var(--text-primary)',
                  color: 'var(--bg-canvas)',
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all hover:opacity-90 active:scale-95 cursor-pointer shadow-md flex-shrink-0 self-stretch sm:self-auto justify-center"
                title="Launch Weekly Review modal (Hotkey: W)"
              >
                <Award size={15} />
                <span>Launch Weekly Review</span>
              </button>
            </div>
          </Card>

          {/* Month over Month card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="flex flex-col justify-between">
              <span
                style={{ color: 'var(--text-muted)' }}
                className="text-[11.5px] font-bold uppercase tracking-wider"
              >
                This Month Completions
              </span>
              <div
                style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}
                className="text-[38px] font-black font-num leading-tight mt-1"
              >
                {curMonthCheckins}
              </div>
              <span style={{ color: 'var(--text-secondary)' }} className="text-[12px] font-medium">
                Check-ins logged
              </span>
            </Card>

            <Card className="flex flex-col justify-between">
              <span
                style={{ color: 'var(--text-muted)' }}
                className="text-[11.5px] font-bold uppercase tracking-wider"
              >
                Previous Month
              </span>
              <div
                style={{ color: 'var(--text-secondary)', letterSpacing: '-0.03em' }}
                className="text-[38px] font-black font-num leading-tight mt-1"
              >
                {prevMonthCheckins}
              </div>
              <span style={{ color: 'var(--text-secondary)' }} className="text-[12px] font-medium">
                Check-ins completed
              </span>
            </Card>

            <Card className="flex flex-col justify-between">
              <span
                style={{ color: 'var(--text-muted)' }}
                className="text-[11.5px] font-bold uppercase tracking-wider"
              >
                Month-over-Month
              </span>
              <div
                style={{
                  color: momDiff >= 0 ? 'var(--status-success)' : 'var(--status-danger)',
                  letterSpacing: '-0.03em',
                }}
                className="text-[38px] font-black font-num leading-tight mt-1"
              >
                {momDiff >= 0 ? `+${momDiff}` : momDiff}
                <span style={{ color: 'var(--text-muted)' }} className="text-[15px] font-semibold ml-1.5">
                  ({momPctChange >= 0 ? `+${momPctChange}%` : `${momPctChange}%`})
                </span>
              </div>
              <span style={{ color: 'var(--text-secondary)' }} className="text-[12px] font-medium">
                Pace comparison
              </span>
            </Card>
          </div>

          {/* 365-Day Heatmap */}
          <YearHeatmap />

          {/* Best/Worst Habits */}
          <BestWorstHabits />

          {/* Weekday Performance & Trend Lines */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WeekdayPerformance />
            <HabitTrends />
          </div>
        </>
      )}
    </div>
  );
};
