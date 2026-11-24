import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Swords,
  Shield,
  Zap,
  Flame,
  Trophy,
  Skull,
  RotateCcw,
  Sparkles,
  ChevronRight,
  X,
  Award,
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import {
  loadTitanArenaState,
  executeHabitAttack,
  resetTitanBoss,
  TitanArenaState,
} from '../../lib/titanBossEngine';
import { computeHabitsMonthlyProgress } from '../../lib/statsUtils';
import { sound } from '../../lib/audio';

export const TitanBossArenaModal: React.FC = () => {
  const isOpen = useHabitStore((s) => s.titanBossArenaModalOpen);
  const setOpen = useHabitStore((s) => s.setTitanBossArenaModalOpen);
  const currentUser = useHabitStore((s) => s.currentUser);
  const habits = useHabitStore((s) => s.habits);
  const checkins = useHabitStore((s) => s.checkins);
  const currentDate = useHabitStore((s) => s.currentDate);
  const toggleCheckin = useHabitStore((s) => s.toggleCheckin);

  const userId = currentUser?.id;

  const [arenaState, setArenaState] = useState<TitanArenaState>(() => loadTitanArenaState(userId));
  const [activeTab, setActiveTab] = useState<'arena' | 'relics' | 'logs'>('arena');
  const [lastDamageAnim, setLastDamageAnim] = useState<number | null>(null);

  const todayStr = currentDate.toISOString().slice(0, 10);
  const activeHabits = habits.filter((h) => !h.archived);

  // Real-time per-habit progress and streaks
  const habitProgressList = useMemo(() => {
    return computeHabitsMonthlyProgress(
      habits,
      checkins,
      currentDate.getFullYear(),
      currentDate.getMonth(),
      currentDate
    );
  }, [habits, checkins, currentDate]);

  useEffect(() => {
    if (isOpen) {
      setArenaState(loadTitanArenaState(userId));
    }
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const { boss, combatLogs, unlockedRelics, totalDamageDealt, bossDefeatedCount } = arenaState;
  const hpPercent = Math.max(0, Math.min(100, Math.round((boss.currentHp / boss.maxHp) * 100)));

  const handleHabitStrike = (habitId: string) => {
    const targetHabit = habits.find((h) => h.id === habitId);
    if (!targetHabit) return;

    sound.playClick();
    const streak = habitProgressList.find((p) => p.habit.id === habitId)?.currentStreak || 0;
    const { newState, log } = executeHabitAttack(targetHabit, streak, arenaState, userId);
    setArenaState(newState);
    setLastDamageAnim(log.damage);

    if (log.isCrit) {
      sound.playCelebration();
    }

    setTimeout(() => {
      setLastDamageAnim(null);
    }, 1200);

    // Also mark habit as completed today if not already
    if (!checkins[`${targetHabit.id}_${todayStr}`]?.completed) {
      void toggleCheckin(targetHabit.id, todayStr);
    }
  };

  const handleResetBoss = () => {
    sound.playClick();
    const reset = resetTitanBoss(userId);
    setArenaState(reset);
  };

  return createPortal(
    <div
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-[16px] animate-fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--shadow-dropdown)',
        }}
        className="w-full max-w-3xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors"
      >
        {/* Header */}
        <div
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'linear-gradient(90deg, rgba(168, 85, 247, 0.12) 0%, rgba(236, 72, 153, 0.08) 50%, transparent 100%)',
          }}
          className="px-6 py-4.5 border-b flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                backgroundColor: 'rgba(168, 85, 247, 0.15)',
                borderColor: 'rgba(168, 85, 247, 0.35)',
                color: '#c084fc',
              }}
              className="w-10 h-10 rounded-xl border flex items-center justify-center shadow-inner"
            >
              <Swords size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 style={{ color: 'var(--text-primary)' }} className="text-base font-bold tracking-tight">
                  Titan Slayer Arena
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Phase {boss.phase}: {boss.phase === 1 ? 'Normal' : boss.phase === 2 ? 'Enraged' : 'Desperation'}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)' }} className="text-xs">
                Turn compound habit completions into kinetic damage against procrastination entities.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetBoss}
              title="Spawn Next Titan"
              style={{ color: 'var(--text-muted)' }}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <RotateCcw size={16} />
            </button>
            <button
              onClick={() => setOpen(false)}
              style={{ color: 'var(--text-muted)' }}
              className="p-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)]">
          <button
            onClick={() => setActiveTab('arena')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'arena'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Battlefield
          </button>
          <button
            onClick={() => setActiveTab('relics')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'relics'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <Trophy size={13} />
            <span>Relics ({unlockedRelics.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'logs'
                ? 'border-purple-500 text-purple-400'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            Combat Logs
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {activeTab === 'arena' && (
            <>
              {/* Titan Boss Showcase Card */}
              <div
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderColor:
                    boss.phase === 3
                      ? 'rgba(239, 68, 68, 0.4)'
                      : boss.phase === 2
                      ? 'rgba(245, 158, 11, 0.4)'
                      : 'var(--border-subtle)',
                }}
                className="p-6 rounded-2xl border relative overflow-hidden space-y-4"
              >
                {/* Floating Damage Number Anim */}
                {lastDamageAnim && (
                  <div className="absolute top-4 right-1/2 translate-x-1/2 text-2xl font-black font-num text-yellow-400 animate-bounce pointer-events-none drop-shadow-[0_0_12px_rgba(234,179,8,0.8)] z-20">
                    -{lastDamageAnim} DMG!
                  </div>
                )}

                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-3xl shadow-lg shadow-purple-500/10">
                      {boss.avatarUrl}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-white tracking-wide">
                          {boss.name}
                        </h3>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                          TITAN BOSS
                        </span>
                      </div>
                      <p className="text-xs text-purple-300 font-medium">{boss.title}</p>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5 max-w-md">
                        {boss.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider block">
                      Titan Health
                    </span>
                    <span className="text-base font-black font-num text-white">
                      {boss.currentHp.toLocaleString()} / {boss.maxHp.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Animated Health Bar */}
                <div className="space-y-1.5">
                  <div className="w-full h-3 rounded-full bg-black/60 border border-white/10 overflow-hidden relative p-0.5">
                    <div
                      style={{
                        width: `${hpPercent}%`,
                        background:
                          boss.phase === 3
                            ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                            : boss.phase === 2
                            ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                            : 'linear-gradient(90deg, #a855f7, #ec4899)',
                      }}
                      className="h-full rounded-full transition-all duration-500 shadow-sm"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-muted)]">
                    <span>{hpPercent}% Integrity Remaining</span>
                    <span>Reward: {boss.rewards.relicName}</span>
                  </div>
                </div>
              </div>

              {/* Victory Ascension Banner when Boss is Defeated */}
              {boss.currentHp <= 0 && (
                <div className="p-4 rounded-2xl border border-yellow-500/40 bg-gradient-to-r from-yellow-500/15 via-purple-500/15 to-transparent flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in shadow-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 flex items-center justify-center shrink-0">
                      <Trophy size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{boss.name} Defeated!</span>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                          RELIC UNLOCKED
                        </span>
                      </h4>
                      <p className="text-xs text-zinc-300 mt-0.5">
                        You earned <strong>{boss.rewards.relicName}</strong> (+{boss.rewards.xpBonus} XP).
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleResetBoss}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-extrabold text-xs flex items-center gap-1.5 shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <RotateCcw size={13} strokeWidth={2.5} />
                    <span>Summon Next Titan</span>
                  </button>
                </div>
              )}

              {/* Habit Weapon Arsenal */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)]">
                  <span>Strike With Your Habits Today</span>
                  <span className="text-[11px] font-mono text-[var(--text-muted)]">
                    Total Dealt: {totalDamageDealt.toLocaleString()} DMG
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                  {activeHabits.map((habit) => {
                    const isDone = Boolean(checkins[`${habit.id}_${todayStr}`]?.completed);
                    const streak = habitProgressList.find((p) => p.habit.id === habit.id)?.currentStreak || 0;
                    const baseDmg = habit.target_value && habit.target_value > 1 ? 350 : 250;
                    const estDmg = Math.round(baseDmg * Math.min(2.5, 1 + streak * 0.08));

                    return (
                      <button
                        key={habit.id}
                        onClick={() => handleHabitStrike(habit.id)}
                        disabled={boss.currentHp <= 0}
                        style={{
                          backgroundColor: 'var(--bg-surface-subtle)',
                          borderColor: isDone ? 'rgba(168, 85, 247, 0.4)' : 'var(--border-subtle)',
                        }}
                        className="p-3 rounded-xl border flex items-center justify-between text-left hover:border-purple-500/50 hover:bg-purple-500/5 transition-all cursor-pointer group disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2.5 truncate min-w-0">
                          <div
                            style={{
                              backgroundColor: `${habit.color}25`,
                              color: habit.color,
                            }}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                          >
                            {habit.emoji || '⚔️'}
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-bold text-[var(--text-primary)] truncate group-hover:text-purple-300">
                              {habit.name}
                            </div>
                            <div className="text-[10px] font-mono text-[var(--text-muted)]">
                              {streak > 0 ? `🔥 ${streak}d streak · ` : ''}{estDmg} DMG ({estDmg * 2} CRIT)
                            </div>
                          </div>
                        </div>

                        <div className="px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[11px] font-bold group-hover:bg-purple-500 group-hover:text-white transition-all flex items-center gap-1">
                          <Swords size={12} />
                          <span>Strike</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {activeTab === 'relics' && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-[var(--text-secondary)]">
                Acquired Artifacts & Permanent Buffs
              </div>
              {unlockedRelics.length === 0 ? (
                <div className="p-8 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-subtle)] rounded-2xl">
                  Defeat a Titan to forge your first Legendary Relic.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {unlockedRelics.map((r) => (
                    <div
                      key={r.id}
                      className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 space-y-1.5"
                    >
                      <div className="flex items-center gap-2 text-yellow-400 font-bold text-xs">
                        <Award size={15} />
                        <span>{r.name}</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                        {r.description}
                      </p>
                      <span className="text-[9px] font-mono text-zinc-500 block pt-1">
                        Unlocked: {new Date(r.unlockedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[var(--text-secondary)]">
                Recent Battlefield Strikes
              </div>
              <div className="space-y-1.5 max-h-80 overflow-y-auto font-mono text-[11px]">
                {combatLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] flex items-center justify-between"
                  >
                    <span className={log.isCrit ? 'text-amber-400 font-bold' : 'text-zinc-300'}>
                      {log.message}
                    </span>
                    <span className="text-[10px] text-zinc-500 ml-2 flex-shrink-0">
                      {log.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            borderColor: 'var(--border-subtle)',
          }}
          className="px-6 py-3.5 border-t flex items-center justify-between text-xs text-[var(--text-muted)]"
        >
          <div className="flex items-center gap-2">
            <Trophy size={14} className="text-purple-400" />
            <span>Titans Slain: <strong className="text-white font-num">{bossDefeatedCount}</strong></span>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs transition-colors cursor-pointer"
          >
            Close Arena
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
