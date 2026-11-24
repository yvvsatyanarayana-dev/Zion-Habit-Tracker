import React, { useMemo } from 'react';
import {
  Sparkles,
  Headphones,
  Heart,
  Share2,
  AlertTriangle,
  CheckCircle2,
  Award,
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { formatLocalDate } from '../../lib/dateUtils';
import { isHabitScheduledOnDay, computeStreakStats } from '../../lib/statsUtils';
import { computeSmartInsights } from '../../lib/correlationUtils';
import { computeMasteryInfo } from '../../lib/masteryUtils';
import { useLiveClock } from '../../hooks/useLiveClock';
import { sound } from '../../lib/audio';

export const DailyBriefingCard: React.FC = React.memo(() => {
  const currentUser = useHabitStore((s) => s.currentUser);
  const habits = useHabitStore((s) => s.habits);
  const checkins = useHabitStore((s) => s.checkins);
  const allCheckinsList = useHabitStore((s) => s.allCheckinsList);
  const wellnessLogs = useHabitStore((s) => s.wellnessLogs);
  const focusSessions = useHabitStore((s) => s.focusSessions);
  const currentDate = useHabitStore((s) => s.currentDate);
  const streakThreshold = useHabitStore((s) => s.settings?.streak_threshold ?? 50);

  const setFocusStudioOpen = useHabitStore((s) => s.setFocusStudioOpen);
  const setWellnessModalOpen = useHabitStore((s) => s.setWellnessModalOpen);
  const setShareCardOpen = useHabitStore((s) => s.setShareCardOpen);

  const activeHabits = useMemo(() => habits.filter((h) => !h?.archived), [habits]);
  const todayStr = formatLocalDate(currentDate);
  const todayWday = currentDate.getDay();

  const scheduledToday = useMemo(
    () => activeHabits.filter((h) => isHabitScheduledOnDay(h, todayWday)),
    [activeHabits, todayWday]
  );

  const completedToday = useMemo(
    () => scheduledToday.filter((h) => checkins[`${h.id}_${todayStr}`]?.completed).length,
    [scheduledToday, checkins, todayStr]
  );

  const remainingToday = Math.max(0, scheduledToday.length - completedToday);
  const todayFocusMins = useMemo(
    () =>
      focusSessions
        .filter((s) => s.date === todayStr)
        .reduce((sum, s) => sum + (s.duration_minutes || 0), 0),
    [focusSessions, todayStr]
  );

  const streakStats = useMemo(
    () => computeStreakStats(habits, allCheckinsList, streakThreshold, currentDate),
    [habits, allCheckinsList, streakThreshold, currentDate]
  );

  const mastery = useMemo(
    () =>
      computeMasteryInfo({
        allCheckinsList,
        focusSessions,
        bestStreak: streakStats.longestStreak,
        wellnessLogs,
      }),
    [allCheckinsList, focusSessions, streakStats.longestStreak, wellnessLogs]
  );

  const todayDangerAlert = useMemo(() => {
    if (activeHabits.length === 0 || allCheckinsList.length < 7) return null;
    const report = computeSmartInsights(activeHabits, allCheckinsList, wellnessLogs);
    return (
      report.danger_zones.find(
        (dz) =>
          dz.weekday === todayWday &&
          scheduledToday.some((h) => h.id === dz.habit_id && !checkins[`${h.id}_${todayStr}`]?.completed)
      ) || null
    );
  }, [activeHabits, allCheckinsList, wellnessLogs, todayWday, scheduledToday, checkins, todayStr]);

  const { clockDate } = useLiveClock();
  const hour = clockDate.getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = currentUser?.name
    ? currentUser.name.split(' ')[0]
    : currentUser?.username || 'Builder';

  const hasTodayWellness = Boolean(wellnessLogs[todayStr]);

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
      className="rounded-2xl border p-4 sm:p-5 relative z-20 overflow-visible"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left: Greeting + Live Coaching Insight */}
        <div className="space-y-1.5 flex-1 min-w-0 pr-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
              <Sparkles size={11} />
              <span>Daily Briefing</span>
            </span>
            <span
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
              style={{
                backgroundColor: `${mastery.rankColor}15`,
                borderColor: `${mastery.rankColor}40`,
                color: mastery.rankColor,
              }}
            >
              <Award size={11} />
              <span>
                Lv {mastery.level} · {mastery.rank}
              </span>
            </span>
            {todayFocusMins > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-num">
                {todayFocusMins}m focused today
              </span>
            )}
          </div>

          <h2 className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)]">
            {greeting}, {firstName}.{' '}
            {scheduledToday.length === 0 ? (
              <span style={{ color: 'var(--text-secondary)' }} className="font-normal">
                No habits scheduled today — great day for a Focus Session.
              </span>
            ) : remainingToday === 0 ? (
              <span className="text-emerald-400 font-semibold inline-flex items-center gap-1.5">
                <CheckCircle2 size={16} />
                All {scheduledToday.length} habits complete today!
              </span>
            ) : (
              <span style={{ color: 'var(--text-secondary)' }} className="font-normal">
                You have <strong style={{ color: 'var(--text-primary)' }}>{remainingToday}</strong> of{' '}
                {scheduledToday.length} habits left today.
              </span>
            )}
          </h2>

          {todayDangerAlert && (
            <div className="flex items-start sm:items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-1.5 w-fit">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 sm:mt-0" />
              <span>
                <strong>Pattern Alert:</strong> "{todayDangerAlert.habit_name}" has a{' '}
                {todayDangerAlert.failure_rate}% miss rate on {todayDangerAlert.weekday_name}s — tackle it early!
              </span>
            </div>
          )}
        </div>

        {/* Right: Studio Quick Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            onClick={() => {
              sound.playClick();
              setFocusStudioOpen(true);
            }}
            style={{ backgroundColor: 'var(--accent-primary)' }}
            className="px-3.5 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow hover:opacity-90 active:scale-95 transition-all cursor-pointer"
          >
            <Headphones size={14} />
            <span>Deep Focus Studio</span>
          </button>

          <button
            onClick={() => {
              sound.playClick();
              setWellnessModalOpen(true);
            }}
            style={{
              backgroundColor: hasTodayWellness ? 'var(--bg-surface-elevated)' : 'rgba(236, 72, 153, 0.12)',
              borderColor: hasTodayWellness ? 'var(--border-subtle)' : 'rgba(236, 72, 153, 0.35)',
              color: hasTodayWellness ? 'var(--text-secondary)' : '#f472b6',
            }}
            className="px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            title={hasTodayWellness ? "Edit Today's Wellness Log" : "Log Today's Energy & Mood"}
          >
            <Heart size={14} />
            <span>{hasTodayWellness ? 'Wellness Logged' : 'Log Wellness'}</span>
          </button>

          {/* Share Card Button */}
          <button
            onClick={() => {
              sound.playClick();
              setShareCardOpen(true);
            }}
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
            className="px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 hover:text-[var(--text-primary)] hover:border-[var(--border-medium)] active:scale-95 transition-all cursor-pointer shadow-sm"
            title="Export High-Resolution Achievement Card"
          >
            <Share2 size={14} />
            <span>Share Card</span>
          </button>
        </div>
      </div>
    </div>
  );
});
DailyBriefingCard.displayName = 'DailyBriefingCard';
