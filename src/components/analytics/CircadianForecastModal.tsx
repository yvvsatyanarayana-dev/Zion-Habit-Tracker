import React, { useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Brain,
  Zap,
  Activity,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { computeCircadianProfile } from '../../lib/circadianEngine';
import { HabitIconView } from '../../lib/habitIcons';
import { sound } from '../../lib/audio';

interface CircadianForecastModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CircadianForecastModal: React.FC<CircadianForecastModalProps> = ({
  isOpen,
  onClose,
}) => {
  const habits = useHabitStore((s) => s.habits);
  const allCheckinsList = useHabitStore((s) => s.allCheckinsList);
  const wellnessLogs = useHabitStore((s) => s.wellnessLogs);
  const focusSessions = useHabitStore((s) => s.focusSessions);
  const timetableSchedules = useHabitStore((s) => s.timetableSchedules);
  const streakShields = useHabitStore((s) => s.streakShields);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const profile = useMemo(() => {
    return computeCircadianProfile(
      habits,
      allCheckinsList,
      wellnessLogs,
      focusSessions,
      timetableSchedules
    );
  }, [habits, allCheckinsList, wellnessLogs, focusSessions, timetableSchedules]);

  const peakFocusScore = useMemo(() => {
    if (!profile.hourlyCurve || profile.hourlyCurve.length === 0) return 95;
    const windowPoints = profile.hourlyCurve.filter((p) => p.hour >= 8 && p.hour <= 14);
    return windowPoints.length > 0 ? Math.max(...windowPoints.map((p) => p.energyScore)) : 95;
  }, [profile.hourlyCurve]);

  const physicalPeakScore = useMemo(() => {
    if (!profile.hourlyCurve || profile.hourlyCurve.length === 0) return 90;
    const windowPoints = profile.hourlyCurve.filter((p) => p.hour >= 15 && p.hour <= 20);
    return windowPoints.length > 0 ? Math.max(...windowPoints.map((p) => p.energyScore)) : 90;
  }, [profile.hourlyCurve]);

  const rechargeScore = useMemo(() => {
    if (!profile.hourlyCurve || profile.hourlyCurve.length === 0) return 45;
    const windowPoints = profile.hourlyCurve.filter((p) => p.hour >= 13 && p.hour <= 16);
    return windowPoints.length > 0 ? Math.min(...windowPoints.map((p) => p.energyScore)) : 45;
  }, [profile.hourlyCurve]);

  if (!isOpen) return null;

  const currentHour = new Date().getHours();

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-[16px] select-none"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-4xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] bg-[#131316]"
          style={{
            backgroundColor: '#131316',
            borderColor: 'var(--border-subtle, rgba(255,255,255,0.08))',
            boxShadow: '0 25px 60px -15px rgba(0,0,0,0.95), 0 0 0 1px rgba(255,255,255,0.08)',
            color: 'var(--text-primary, #f4f4f6)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between p-4 sm:p-5 border-b flex-shrink-0 bg-[#0e0e11]"
            style={{
              borderColor: 'var(--border-subtle, rgba(255,255,255,0.08))',
              backgroundColor: '#0e0e11',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold tracking-tight text-white">
                    Neural Circadian Forecast & Burnout Predictor
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/35 text-indigo-300 text-[10px] font-mono font-bold">
                    BIOCLOCK AI
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Algorithmic alignment of your energy curves, peak cognitive execution windows & fatigue limits
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-[#131316]">
            {/* Top Row: 3 Focus Timing Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl border bg-[#17171a] border-white/[0.08] relative overflow-hidden">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
                  <span className="flex items-center gap-1.5">
                    <Zap size={14} /> Peak Focus Window
                  </span>
                  <span className="text-[10px] font-mono text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded">
                    {peakFocusScore}% Peak
                  </span>
                </div>
                <p className="text-lg font-black text-white font-mono tracking-tight">
                  {profile.peakFocusWindow}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                  Optimal for high executive function, analytical problem-solving & deep work.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl border bg-[#17171a] border-white/[0.08] relative overflow-hidden">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
                  <span className="flex items-center gap-1.5">
                    <Activity size={14} /> Physical Peak Window
                  </span>
                  <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                    {physicalPeakScore}% Power
                  </span>
                </div>
                <p className="text-lg font-black text-white font-mono tracking-tight">
                  {profile.secondaryPeakWindow}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                  Peak thermogenic core temperature for workouts, athletic performance & endurance.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl border bg-[#17171a] border-white/[0.08] relative overflow-hidden">
                <div className="flex items-center justify-between text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                  <span className="flex items-center gap-1.5">
                    <Clock size={14} /> Circadian Dip / Recharge
                  </span>
                  <span className="text-[10px] font-mono text-amber-300 bg-amber-500/20 px-1.5 py-0.5 rounded">
                    {rechargeScore}% Dip
                  </span>
                </div>
                <p className="text-lg font-black text-white font-mono tracking-tight">
                  {profile.rechargeWindow}
                </p>
                <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                  Natural post-prandial dip. Avoid heavy cognitive decisions; take walks or decompress.
                </p>
              </div>
            </div>

            {/* 24-Hour Energy Waveform Chart */}
            <div className="p-4 sm:p-5 rounded-2xl border bg-[#17171a] border-white/[0.08]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-indigo-400" />
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    24-Hour Circadian Energy Trajectory
                  </h3>
                </div>
                <span className="text-xs font-mono text-zinc-400">
                  Current Hour: <strong className="text-white">{profile.hourlyCurve[currentHour]?.label}</strong>
                </span>
              </div>

              {/* Bar waveform */}
              <div className="h-32 flex items-end gap-1 sm:gap-1.5 pt-4 pb-2 border-b border-white/[0.06]">
                {profile.hourlyCurve.map((pt) => {
                  const isCurrent = pt.hour === currentHour;
                  const isPeak = pt.energyScore >= 85;
                  const isLow = pt.energyScore < 40;

                  return (
                    <div
                      key={pt.hour}
                      className="flex-1 flex flex-col items-center h-full justify-end group relative"
                    >
                      <div
                        className="w-full rounded-t-sm transition-all duration-300 group-hover:brightness-125"
                        style={{
                          height: `${Math.max(12, pt.energyScore)}%`,
                          backgroundColor: isCurrent
                            ? '#ffffff'
                            : isPeak
                            ? '#6366f1'
                            : isLow
                            ? '#f59e0b'
                            : 'rgba(255, 255, 255, 0.25)',
                          boxShadow: isCurrent ? '0 0 12px rgba(255,255,255,0.8)' : undefined,
                        }}
                      />
                      {/* Tooltip on hover */}
                      <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 px-2 py-1 rounded-md bg-black/90 border border-white/20 text-[10px] font-mono text-white whitespace-nowrap shadow-xl">
                        {pt.label}: {pt.energyScore}% Energy ({pt.checkinCount} checkins)
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Time axis labels */}
              <div className="flex justify-between text-[10px] font-mono text-zinc-500 mt-2 px-1">
                <span>12 AM</span>
                <span>6 AM</span>
                <span>12 PM</span>
                <span>6 PM</span>
                <span>11 PM</span>
              </div>
            </div>

            {/* Burnout Vulnerability Gauge & Keystone Habit */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Burnout Card */}
              <div className="p-4 sm:p-5 rounded-2xl border bg-[#17171a] border-white/[0.08] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-emerald-400" />
                      Burnout Vulnerability Index
                    </span>
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded-full font-mono uppercase ${
                        profile.burnout.riskLevel === 'critical'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : profile.burnout.riskLevel === 'elevated'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {profile.burnout.riskLevel} ({profile.burnout.riskScore}/100)
                    </span>
                  </div>

                  {/* Meter Bar */}
                  <div className="w-full h-2.5 rounded-full bg-zinc-900 border border-white/10 overflow-hidden my-3">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${profile.burnout.riskScore}%`,
                        backgroundColor:
                          profile.burnout.riskLevel === 'critical'
                            ? '#f43f5e'
                            : profile.burnout.riskLevel === 'elevated'
                            ? '#f59e0b'
                            : '#10b981',
                        boxShadow: `0 0 10px ${
                          profile.burnout.riskLevel === 'critical'
                            ? '#f43f5e'
                            : profile.burnout.riskLevel === 'elevated'
                            ? '#f59e0b'
                            : '#10b981'
                        }`,
                      }}
                    />
                  </div>

                  <p className="text-xs font-semibold text-white mt-1">
                    {profile.burnout.title}
                  </p>
                  <p className="text-[11.5px] text-zinc-400 mt-1 leading-relaxed">
                    {profile.burnout.explanation}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.08] space-y-1.5">
                  {profile.burnout.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-zinc-300">
                      <CheckCircle2 size={13} className="text-indigo-400 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Keystone Synergy Card */}
              <div className="p-4 sm:p-5 rounded-2xl border bg-[#17171a] border-white/[0.08] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={14} />
                      Keystone Domino Synergies
                    </span>
                    <span className="text-[10px] font-mono text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30 font-bold">
                      ATOMIC HABITS
                    </span>
                  </div>

                  {profile.keystoneHabit ? (
                    <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/25 mt-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-purple-200">
                        <Flame size={14} className="text-amber-400" />
                        <span>Key Catalyst: {profile.keystoneHabit.habitAName}</span>
                      </div>
                      <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">
                        Completing <strong>"{profile.keystoneHabit.habitAName}"</strong> delivers a{' '}
                        <strong className="text-emerald-400 font-mono">
                          +{profile.keystoneHabit.upliftPct}% probability boost
                        </strong>{' '}
                        to completing <strong>"{profile.keystoneHabit.habitBName}"</strong>.
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-zinc-400 text-center py-4">
                      Check in to more habits across consecutive days to calculate your personal catalyst synergies.
                    </div>
                  )}

                  {profile.synergies.length > 1 && (
                    <div className="mt-3 space-y-1.5">
                      <span className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wider">
                        Secondary Synergies:
                      </span>
                      {profile.synergies.slice(1, 4).map((syn, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04]"
                        >
                          <span className="truncate max-w-[190px] text-zinc-300 font-medium">
                            {syn.habitAName} → {syn.habitBName}
                          </span>
                          <span className="text-emerald-400 font-mono font-bold text-[11px]">
                            +{syn.upliftPct}%
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Optimal Action Windows Table */}
            <div className="p-4 sm:p-5 rounded-2xl border bg-[#17171a] border-white/[0.08]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                  <Clock size={16} className="text-indigo-400" />
                  Optimal Habit Schedule Windows
                </h3>
                <span className="text-xs text-zinc-400">
                  {profile.optimalWindows.length} Active Habits Mapped
                </span>
              </div>

              <div className="divide-y divide-white/[0.06]">
                {profile.optimalWindows.map((opt) => {
                  const habit = habits.find((h) => h.id === opt.habitId);
                  return (
                    <div
                      key={opt.habitId}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-xl border flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: habit?.color ? `${habit.color}15` : 'rgba(255,255,255,0.05)',
                            borderColor: habit?.color ? `${habit.color}35` : 'rgba(255,255,255,0.1)',
                          }}
                        >
                          <HabitIconView iconId={habit?.emoji} color={habit?.color} size={15} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {opt.habitName}
                          </p>
                          <p className="text-[11px] text-zinc-400 truncate">
                            {opt.reason}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 pl-11 sm:pl-0">
                        <span className="font-mono text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-indigo-300">
                          {opt.recommendedWindow}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/25">
                          {opt.efficiencyScore}% Eff.
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
