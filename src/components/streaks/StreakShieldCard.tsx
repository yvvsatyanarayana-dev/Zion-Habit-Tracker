import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { useHabitStore } from '../../store/useHabitStore';
import { Shield, Sparkles, AlertCircle, CheckCircle2, History, Zap, Calendar } from 'lucide-react';
import { formatLocalDate } from '../../lib/dateUtils';
import { subDays } from 'date-fns';

export const StreakShieldCard: React.FC = () => {
  const streakShields = useHabitStore((s) => s.streakShields);
  const applyShield = useHabitStore((s) => s.applyShield);
  const startResurrectionQuest = useHabitStore((s) => s.startResurrectionQuest);
  const currentDate = useHabitStore((s) => s.currentDate || new Date());

  const [selectedDate, setSelectedDate] = useState(() => formatLocalDate(subDays(currentDate, 1)));
  const [feedback, setFeedback] = useState<{ message: string; isError?: boolean } | null>(null);

  const availableShields = streakShields?.available_shields ?? 2;
  const quest = streakShields?.resurrection_quest ?? null;
  const recentEvents = (streakShields?.shield_events || []).slice(0, 5);

  const handleApply = async () => {
    if (!selectedDate) return;
    const res = await applyShield(selectedDate, 'manual_forgiveness', 'Protected via Streak Shields');
    setFeedback({
      message: res.message,
      isError: !res.success,
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleStartQuest = async () => {
    // Start quest for reviving a broken streak (default 7 days if not known)
    await startResurrectionQuest(7);
    setFeedback({
      message: '⚡ 3-Day Resurrection Quest activated! Complete all 3 days to resurrect your streak.',
    });
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <Card className="overflow-hidden border relative">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400">
            <Shield size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold tracking-tight">"Never Miss Twice" Streak Shields</h3>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Atomic Habits
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Forgive unavoidable slip-ups and preserve hard-earned momentum.
            </p>
          </div>
        </div>

        {/* Shield Count Indicators */}
        <div className="flex items-center gap-2 self-start md:self-center px-3.5 py-2 rounded-2xl bg-white/[0.03] border border-white/5">
          <span className="text-xs font-semibold mr-1" style={{ color: 'var(--text-secondary)' }}>
            Available Shields:
          </span>
          {[0, 1, 2].map((idx) => {
            const hasShield = idx < availableShields;
            return (
              <div
                key={idx}
                className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                  hasShield
                    ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-black shadow-md shadow-cyan-500/20 scale-105'
                    : 'bg-white/5 text-zinc-600 border border-white/5'
                }`}
                title={hasShield ? 'Shield Ready' : 'Empty Slot (Earn at 7-day milestones)'}
              >
                <Shield size={14} className={hasShield ? 'fill-current' : ''} />
              </div>
            );
          })}
        </div>
      </div>

      {feedback && (
        <div
          className={`mt-4 p-3 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in ${
            feedback.isError
              ? 'bg-red-500/10 border border-red-500/20 text-red-400'
              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
          }`}
        >
          {feedback.isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Main Grid: Shield Deployer & Resurrection Quest */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        {/* Shield Forgiveness Tool */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border flex flex-col justify-between space-y-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="space-y-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground" style={{ color: 'var(--text-secondary)' }}>
              Freeze or Forgive a Missed Day
            </h4>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Apply 1 shield to protect a missed date so your streak count remains intact.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
              <Calendar size={14} className="text-zinc-400 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white text-xs outline-none w-full"
              />
            </div>
            <button
              onClick={handleApply}
              disabled={availableShields <= 0}
              className="px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:pointer-events-none text-black flex items-center justify-center gap-1.5 shadow transition-all active:scale-95"
            >
              <Shield size={14} className="fill-current" />
              Deploy Shield
            </button>
          </div>
        </div>

        {/* 3-Day Resurrection Quest */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border flex flex-col justify-between space-y-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <Zap size={14} className="text-amber-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground" style={{ color: 'var(--text-secondary)' }}>
                3-Day Resurrection Quest
              </h4>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Broke a major streak? Complete 3 consecutive days to resurrect it back to life!
            </p>
          </div>

          {quest && quest.active ? (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-amber-400">Quest Active: {quest.completed_dates.length} / 3 Days</span>
                <span style={{ color: 'var(--text-muted)' }}>Reviving +{quest.lost_streak_count} Days</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((dayNum) => {
                  const done = quest.completed_dates.length >= dayNum;
                  return (
                    <div
                      key={dayNum}
                      className={`py-2 rounded-xl text-center text-xs font-bold border transition-all ${
                        done
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-white/5 border-white/5 text-zinc-500'
                      }`}
                    >
                      Day {dayNum} {done ? '✓' : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="pt-1 flex justify-start">
              <button
                onClick={handleStartQuest}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-500/20 border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Sparkles size={14} />
                Activate Resurrection Quest
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Historical Shield Protected Events */}
      {recentEvents.length > 0 && (
        <div className="mt-4 pt-3 border-t flex flex-wrap items-center gap-2 text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
          <span className="flex items-center gap-1 font-semibold text-zinc-400">
            <History size={13} /> Protected Dates:
          </span>
          {recentEvents.map((evt) => (
            <span
              key={evt.id}
              className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px] font-mono"
            >
              🛡️ {evt.date}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
};
