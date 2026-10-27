import React, { useMemo, useState } from 'react';
import { Card } from '../ui/Card';
import { useHabitStore } from '../../store/useHabitStore';
import { computeSmartInsights } from '../../lib/correlationUtils';
import { Sparkles, TrendingUp, HeartPulse, AlertTriangle, ArrowRight, Zap, Trophy, ShieldAlert } from 'lucide-react';

export const HabitCorrelationCard: React.FC = () => {
  const habits = useHabitStore((s) => s.habits);
  const allCheckinsList = useHabitStore((s) => s.allCheckinsList);
  const wellnessLogs = useHabitStore((s) => s.wellnessLogs);

  const [activeTab, setActiveTab] = useState<'synergies' | 'wellness' | 'danger_zones'>('synergies');

  const insights = useMemo(() => {
    return computeSmartInsights(habits, allCheckinsList, wellnessLogs);
  }, [habits, allCheckinsList, wellnessLogs]);

  const { correlations, wellness_correlations, danger_zones, golden_habit } = insights;

  const hasData =
    correlations.length > 0 ||
    wellness_correlations.length > 0 ||
    danger_zones.length > 0 ||
    golden_habit !== null;

  return (
    <div className="space-y-4">
      {/* Golden / Keystone Habit Spotlight Banner */}
      {golden_habit && (
        <Card className="border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Trophy size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    Keystone Habit Detected
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-extrabold">
                    +{golden_habit.boost_percentage}% Lift
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-white mt-0.5">
                  {golden_habit.habit.emoji} {golden_habit.habit.name}
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Completing this habit triggers a major ripple effect, lifting completion across{' '}
                  <strong className="text-white">{golden_habit.synergy_count} other habits</strong>.
                </p>
              </div>
            </div>

            <div className="self-end sm:self-center px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold flex items-center gap-1.5 shrink-0">
              <Sparkles size={14} />
              Core Catalyst
            </div>
          </div>
        </Card>
      )}

      {/* Main Insights Card */}
      <Card>
        {/* Header & Sub-Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-blue-400" />
              <h3 className="text-base font-bold tracking-tight">Smart Correlation Engine</h3>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                100% Offline AI
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Data patterns discovering habit combos, energy impact, and danger zones
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5 border border-white/5 self-stretch sm:self-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('synergies')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'synergies'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <TrendingUp size={13} />
              Synergies ({correlations.length})
            </button>
            <button
              onClick={() => setActiveTab('wellness')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'wellness'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <HeartPulse size={13} />
              Wellness Impact ({wellness_correlations.length})
            </button>
            <button
              onClick={() => setActiveTab('danger_zones')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap ${
                activeTab === 'danger_zones'
                  ? 'bg-red-600 text-white shadow'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <AlertTriangle size={13} />
              Danger Zones ({danger_zones.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="pt-4">
          {!hasData ? (
            <div className="py-8 text-center text-xs space-y-2" style={{ color: 'var(--text-muted)' }}>
              <Zap size={28} className="mx-auto text-zinc-600 mb-1" />
              <p className="font-semibold text-zinc-400">Gathering correlation data...</p>
              <p className="max-w-xs mx-auto">
                Check in habits over multiple days to unlock automated behavioral synergies and slump detection.
              </p>
            </div>
          ) : activeTab === 'synergies' ? (
            /* Synergies Tab */
            correlations.length === 0 ? (
              <p className="py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                No significant cross-habit synergy detected yet. Keep logging your daily check-ins!
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {correlations.map((corr, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border bg-white/[0.02] flex flex-col justify-between space-y-3"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="px-2.5 py-1 rounded-xl text-xs font-bold truncate max-w-[120px]"
                          style={{
                            backgroundColor: `${corr.source_habit_color}20`,
                            color: corr.source_habit_color,
                          }}
                        >
                          {corr.source_habit_name}
                        </span>
                        <ArrowRight size={13} className="text-zinc-500 shrink-0" />
                        <span
                          className="px-2.5 py-1 rounded-xl text-xs font-bold truncate max-w-[120px]"
                          style={{
                            backgroundColor: `${corr.target_habit_color}20`,
                            color: corr.target_habit_color,
                          }}
                        >
                          {corr.target_habit_name}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-extrabold shrink-0">
                        +{corr.lift_percentage}% Boost
                      </span>
                    </div>

                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {corr.insight_text}
                    </p>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5 text-zinc-400">
                      <span>With: {Math.round(corr.probability_with * 100)}%</span>
                      <span>Without: {Math.round(corr.probability_without * 100)}%</span>
                      <span>{corr.sample_size} days tracked</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : activeTab === 'wellness' ? (
            /* Wellness Tab */
            wellness_correlations.length === 0 ? (
              <p className="py-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                Log energy and mood ratings in your daily check-ins to discover wellness impacts.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {wellness_correlations.map((w, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border bg-white/[0.02] flex flex-col justify-between space-y-2.5"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="px-2.5 py-1 rounded-xl text-xs font-bold"
                        style={{
                          backgroundColor: `${w.habit_color}20`,
                          color: w.habit_color,
                        }}
                      >
                        {w.habit_name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
                        +{w.difference.toFixed(1)} {w.metric === 'energy' ? '⚡ Energy' : '😊 Mood'}
                      </span>
                    </div>

                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {w.insight_text}
                    </p>

                    <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5 text-zinc-400">
                      <span>Avg with: {w.average_with.toFixed(1)} / 5</span>
                      <span>Avg without: {w.average_without.toFixed(1)} / 5</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Danger Zones Tab */
            danger_zones.length === 0 ? (
              <div className="py-6 text-center text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
                <p className="font-semibold text-emerald-400">No high-risk slump days detected!</p>
                <p>Your habit execution is evenly consistent throughout the week.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {danger_zones.map((dz, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border border-red-500/20 bg-red-500/[0.02] flex flex-col justify-between space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <ShieldAlert size={15} className="text-red-400" />
                        <span className="text-xs font-bold text-red-300">
                          {dz.weekday_name} Drop-off
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-extrabold">
                        {dz.failure_rate}% Miss Rate
                      </span>
                    </div>

                    <div className="text-xs">
                      <p className="font-semibold text-white">{dz.habit_name}</p>
                      <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                        {dz.suggestion}
                      </p>
                    </div>

                    <div className="text-[11px] pt-1 border-t border-white/5 text-zinc-400">
                      <span>Missed {dz.miss_count} times over {dz.sample_weeks} weeks</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </Card>
    </div>
  );
};
