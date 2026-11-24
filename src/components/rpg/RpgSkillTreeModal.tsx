import React from 'react';
import {
  X,
  Award,
  Zap,
  TrendingUp,
  Code2,
  BookOpen,
  Dumbbell,
  Target,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { SKILL_METADATA, type SkillBranch } from '../../lib/levelingSystem';

const BRANCH_ICONS: Record<SkillBranch, LucideIcon> = {
  engineering: Code2,
  languages: BookOpen,
  vitality: Dumbbell,
  discipline: Target,
};

export const RpgSkillTreeModal: React.FC = () => {
  const isOpen = useHabitStore((s) => s.rpgSkillTreeModalOpen);
  const setOpen = useHabitStore((s) => s.setRpgSkillTreeModalOpen);
  const profile = useHabitStore((s) => s.rpgProfile);

  if (!isOpen || !profile) return null;

  const branches: SkillBranch[] = ['engineering', 'languages', 'vitality', 'discipline'];

  return (
    <div
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-[10px] animate-fade-in"
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
        {/* Header with Overall Level & Rank */}
        <div
          style={{ borderColor: 'var(--border-subtle)' }}
          className="px-6 py-5 border-b flex items-center justify-between bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent"
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                borderColor: 'rgba(99, 102, 241, 0.35)',
                color: 'var(--accent-primary)',
              }}
              className="w-12 h-12 rounded-2xl border flex items-center justify-center font-bold text-lg shadow-inner"
            >
              <Award size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 style={{ color: 'var(--text-primary)' }} className="text-lg font-bold tracking-tight">
                  Mastery & Skill Tree
                </h2>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  Level {profile.overallLevel} · {profile.overallTitle}
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)' }} className="text-xs">
                Earn XP by completing scheduled routine blocks, daily habits, and deep focus sessions
              </p>
            </div>
          </div>

          <button
            onClick={() => setOpen(false)}
            style={{ color: 'var(--text-muted)' }}
            className="w-8 h-8 rounded-lg hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Total XP Banner */}
        <div
          style={{
            borderColor: 'var(--border-subtle)',
            backgroundColor: 'var(--bg-surface-card)',
          }}
          className="px-6 py-3 border-b flex items-center justify-between text-xs"
        >
          <div className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <Zap size={14} className="text-amber-400" />
            <span>
              Total Experience:{' '}
              <strong style={{ color: 'var(--text-primary)' }} className="font-mono">
                {profile.totalXp.toLocaleString()} XP
              </strong>
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-indigo-400">
            <Sparkles size={12} />
            <span>Active Rank: {profile.overallTitle}</span>
          </div>
        </div>

        {/* Modal Body: 4 Skill Branches */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {branches.map((b) => {
              const meta = SKILL_METADATA[b];
              const skill = profile.skills[b];
              const Icon = BRANCH_ICONS[b];
              const currentLvlXp = skill?.currentXp || 0;
              const nextLvlXp = skill?.xpToNextLevel || 100;
              const pct = Math.min(100, Math.max(0, Math.round((currentLvlXp / nextLvlXp) * 100)));

              return (
                <div
                  key={b}
                  style={{
                    backgroundColor: 'var(--bg-surface-card)',
                    borderColor: 'var(--border-subtle)',
                  }}
                  className="p-4 rounded-2xl border space-y-3 relative overflow-hidden group hover:border-[var(--border-medium)] transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        style={{
                          backgroundColor: `${meta.color}18`,
                          borderColor: `${meta.color}35`,
                          color: meta.color,
                        }}
                        className="w-10 h-10 rounded-xl border flex items-center justify-center font-bold"
                      >
                        <Icon size={18} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 style={{ color: 'var(--text-primary)' }} className="text-sm font-bold">
                            {meta.name}
                          </h3>
                        </div>
                        <span style={{ color: meta.color }} className="text-[11px] font-mono font-semibold">
                          Level {skill?.level || 1} · {skill?.title || 'Initiate'}
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-zinc-300">
                      {skill?.totalXp || 0} XP
                    </span>
                  </div>

                  <p style={{ color: 'var(--text-muted)' }} className="text-xs leading-relaxed">
                    {meta.description}
                  </p>

                  {/* XP Progress Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                      <span>
                        {currentLvlXp} / {nextLvlXp} XP to Level {(skill?.level || 1) + 1}
                      </span>
                      <span className="font-bold">{pct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                      <div
                        style={{
                          width: `${pct}%`,
                          backgroundColor: meta.color,
                        }}
                        className="h-full rounded-full transition-all duration-500 shadow-sm"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Recent Unlocks & Activity */}
          {profile.recentUnlocks && profile.recentUnlocks.length > 0 && (
            <div
              style={{
                backgroundColor: 'var(--bg-surface-card)',
                borderColor: 'var(--border-subtle)',
              }}
              className="p-4 rounded-2xl border space-y-2.5"
            >
              <h4 style={{ color: 'var(--text-primary)' }} className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp size={13} className="text-emerald-400" />
                Recent XP Earned & Milestones
              </h4>
              <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                {profile.recentUnlocks.slice(0, 8).map((u) => {
                  const meta = SKILL_METADATA[u.branch];
                  return (
                    <div
                      key={u.id}
                      className="px-3 py-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          style={{
                            backgroundColor: `${meta.color}20`,
                            color: meta.color,
                          }}
                          className="w-2 h-2 rounded-full inline-block"
                        />
                        <span style={{ color: 'var(--text-primary)' }} className="font-medium">
                          {u.title}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-amber-400 text-[11px]">
                        +{u.xpGained} XP
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
