import React, { useMemo } from 'react';
import {
  Sparkles,
  ShieldAlert,
  Brain,
  Swords,
  Eye,
  Skull,
  Play,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { formatLocalDate } from '../../lib/dateUtils';
import { computeStreakStats } from '../../lib/statsUtils';
import { computeCircadianProfile } from '../../lib/circadianEngine';
import { sound } from '../../lib/audio';

export const ProtocolsCommandDeck: React.FC = React.memo(() => {
  const habits = useHabitStore((s) => s.habits);
  const allCheckinsList = useHabitStore((s) => s.allCheckinsList);
  const wellnessLogs = useHabitStore((s) => s.wellnessLogs);
  const focusSessions = useHabitStore((s) => s.focusSessions);
  const timetableSchedules = useHabitStore((s) => s.timetableSchedules);
  const routines = useHabitStore((s) => s.routines);
  const currentDate = useHabitStore((s) => s.currentDate);
  const streakThreshold = useHabitStore((s) => s.settings?.streak_threshold ?? 50);

  const setGhostDebriefOpen = useHabitStore((s) => s.setGhostDebriefOpen);
  const setCircadianModalOpen = useHabitStore((s) => s.setCircadianModalOpen);
  const setTitanBossArenaModalOpen = useHabitStore((s) => s.setTitanBossArenaModalOpen);
  const setAiVisionSentinelModalOpen = useHabitStore((s) => s.setAiVisionSentinelModalOpen);
  const setHardcoreLockdownModalOpen = useHabitStore((s) => s.setHardcoreLockdownModalOpen);
  const setFocusShieldModalOpen = useHabitStore((s) => s.setFocusShieldModalOpen);
  const setRoutineManagerOpen = useHabitStore((s) => s.setRoutineManagerOpen);

  const todayStr = useMemo(() => formatLocalDate(currentDate), [currentDate]);
  const activeHabits = useMemo(() => habits.filter((h) => !h?.archived), [habits]);

  // Real-time user telemetry computations
  const streakStats = useMemo(
    () => computeStreakStats(habits, allCheckinsList, streakThreshold, currentDate),
    [habits, allCheckinsList, streakThreshold, currentDate]
  );

  const circadian = useMemo(
    () =>
      computeCircadianProfile(
        habits,
        allCheckinsList,
        wellnessLogs,
        focusSessions,
        timetableSchedules
      ),
    [habits, allCheckinsList, wellnessLogs, focusSessions, timetableSchedules]
  );

  const todaysWellness = wellnessLogs[todayStr];

  const todayFocusMins = useMemo(
    () =>
      focusSessions
        .filter((s) => s.date === todayStr)
        .reduce((acc, s) => acc + (s.duration_minutes || 0), 0),
    [focusSessions, todayStr]
  );

  const totalFocusHours = useMemo(
    () =>
      Math.round(
        focusSessions.reduce((acc, s) => acc + (s.duration_minutes || 0), 0) / 60
      ),
    [focusSessions]
  );

  const protocols = useMemo(
    () => [
      {
        id: 'ghost-protocol',
        name: 'The Ghost Protocol',
        category: 'AI PERFORMANCE AUDITOR',
        badge: todaysWellness
          ? `LOGGED (${todaysWellness.energy}/5 ⚡)`
          : 'EVENING AUDIT READY',
        description: todaysWellness
          ? `Logged Energy: ${todaysWellness.energy}/5 · Mood: ${todaysWellness.mood}/5. Ready to generate evening performance directives.`
          : `Tracking ${activeHabits.length} habits today. Ready for Stoic bottleneck appraisal and action directives.`,
        shortcut: 'Ctrl+Shift+G',
        icon: ShieldAlert,
        accentColor: '#f472b6',
        actionText: todaysWellness ? 'View Debrief' : 'Run AI Debrief',
        onLaunch: () => {
          sound.playClick();
          setGhostDebriefOpen(true);
        },
      },
      {
        id: 'circadian-bioclock',
        name: 'Circadian Bioclock AI',
        category: 'BIOLOGICAL RHYTHM MODEL',
        badge: `PEAK: ${circadian.peakFocusWindow}`,
        description: `Burnout Risk: ${circadian.burnout.riskScore}% (${circadian.burnout.riskLevel}). ${circadian.synergies.length} habit domino synergies mapped from your live check-ins.`,
        shortcut: 'Ctrl+Shift+C',
        icon: Brain,
        accentColor: '#818cf8',
        actionText: 'View Bioclock',
        onLaunch: () => {
          sound.playClick();
          setCircadianModalOpen(true);
        },
      },
      {
        id: 'titan-arena',
        name: 'Titan Slayer Boss Arena',
        category: 'GAMIFIED COMBAT RPG',
        badge:
          streakStats.currentStreak > 0
            ? `${streakStats.currentStreak}D STREAK CRIT`
            : 'BOSS BATTLE READY',
        description:
          streakStats.currentStreak > 0
            ? `Active ${(1 + streakStats.currentStreak * 0.25).toFixed(1)}x crit multiplier armed from your ${streakStats.currentStreak}-day momentum streak.`
            : 'Confront procrastination monstrosities with compound habit streak damage and critical strikes.',
        shortcut: 'Ctrl+Shift+B',
        icon: Swords,
        accentColor: '#c084fc',
        actionText: 'Enter Arena',
        onLaunch: () => {
          sound.playClick();
          setTitanBossArenaModalOpen(true);
        },
      },
      {
        id: 'vision-sentinel',
        name: 'Local AI Vision Sentinel',
        category: 'COMPUTER VISION',
        badge:
          todayFocusMins > 0 ? `${todayFocusMins}M FOCUS TODAY` : 'ZERO-CLOUD PRIVACY',
        description:
          todayFocusMins > 0
            ? `${todayFocusMins}m verified deep work today (${totalFocusHours}h total on-device proof-of-work).`
            : 'On-device posture, gaze & deep work proof-of-work cryptographic verification with zero cloud telemetry.',
        shortcut: 'Ctrl+Shift+V',
        icon: Eye,
        accentColor: '#34d399',
        actionText: 'Engage Sentinel',
        onLaunch: () => {
          sound.playClick();
          setAiVisionSentinelModalOpen(true);
        },
      },
      {
        id: 'dopamine-vault',
        name: 'Focus Shield & Web Blocker',
        category: 'WEB & APP FIREWALL',
        badge: 'DNS & HOSTS DEFLECTION',
        description:
          'Block social media websites, redirect distracting URLs to Stoic wisdom, and enforce system-level focus lockdown.',
        shortcut: 'Ctrl+Shift+L',
        icon: ShieldCheck,
        accentColor: '#34d399',
        actionText: 'Configure Shield',
        onLaunch: () => {
          sound.playClick();
          setFocusShieldModalOpen(true);
        },
      },
      {
        id: 'routine-flows',
        name: 'Routine Flows & Stacking',
        category: 'FLOW ORCHESTRATION',
        badge:
          routines.length > 0
            ? `${routines.length} FLOWS ACTIVE`
            : 'STEP-BY-STEP',
        description:
          routines.length > 0
            ? `Ready to launch: "${routines[0].title}" (${routines[0].steps.length} guided steps with ambient soundscapes).`
            : 'Launch guided habit stacking sequences with focused countdown timers and audio cues.',
        shortcut: 'Routines',
        icon: Play,
        accentColor: '#38bdf8',
        actionText: 'Launch Routine',
        onLaunch: () => {
          sound.playClick();
          setRoutineManagerOpen(true);
        },
      },
    ],
    [
      todaysWellness,
      activeHabits.length,
      circadian,
      streakStats.currentStreak,
      todayFocusMins,
      totalFocusHours,
      routines,
      setGhostDebriefOpen,
      setCircadianModalOpen,
      setTitanBossArenaModalOpen,
      setAiVisionSentinelModalOpen,
      setHardcoreLockdownModalOpen,
      setRoutineManagerOpen,
    ]
  );

  return (
    <section
      id="protocols-deck"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
      className="rounded-2xl border p-4 sm:p-5 relative transition-colors shadow-xs scroll-mt-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-4 border-b border-white/[0.06]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 font-mono uppercase tracking-wider">
              <Sparkles size={11} />
              <span>Command Suite</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Telemetry Active · 100% Offline</span>
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-[var(--text-primary)]">
            Executive Protocols Deck
          </h2>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <ShieldCheck size={13} className="text-indigo-400 shrink-0" />
          <span>Real-time user intelligence · Zero cloud dependencies</span>
        </div>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-4">
        {protocols.map((protocol) => {
          const IconComponent = protocol.icon;
          return (
            <div
              key={protocol.id}
              onClick={protocol.onLaunch}
              className="group relative flex flex-col justify-between p-4 sm:p-4.5 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden hover:-translate-y-0.5"
              style={{
                backgroundColor: 'var(--bg-surface-card)',
                borderColor: 'var(--border-subtle)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${protocol.accentColor}50`;
                e.currentTarget.style.boxShadow = `0 8px 24px -6px ${protocol.accentColor}20, 0 0 0 1px ${protocol.accentColor}30`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* Subtle top ambient glow */}
              <div
                className="absolute top-0 right-0 w-28 h-28 rounded-full blur-2xl opacity-0 group-hover:opacity-15 pointer-events-none transition-opacity duration-300"
                style={{ backgroundColor: protocol.accentColor }}
              />

              <div>
                {/* Top Row: Icon + Shortcut Chip */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div
                    className="w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 shadow-inner transition-transform group-hover:scale-105"
                    style={{
                      backgroundColor: `${protocol.accentColor}15`,
                      borderColor: `${protocol.accentColor}35`,
                      color: protocol.accentColor,
                    }}
                  >
                    <IconComponent size={18} />
                  </div>

                  <kbd className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-zinc-400 group-hover:text-zinc-200 group-hover:border-white/20 transition-colors">
                    {protocol.shortcut}
                  </kbd>
                </div>

                {/* Category Tag */}
                <div className="text-[10px] font-mono font-bold tracking-wider uppercase text-zinc-500 mb-1">
                  {protocol.category}
                </div>

                {/* Card Title */}
                <h3 className="text-[14px] font-bold text-white group-hover:text-white transition-colors mb-1.5 tracking-tight flex items-center gap-1.5">
                  <span>{protocol.name}</span>
                </h3>

                {/* Card Description - Real-time User Data */}
                <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                  {protocol.description}
                </p>
              </div>

              {/* Bottom Row: Dynamic Live Badge & Launch Action */}
              <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs font-semibold">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-zinc-300">
                  {protocol.badge}
                </span>

                <span
                  className="flex items-center gap-1 transition-colors text-xs font-bold"
                  style={{ color: protocol.accentColor }}
                >
                  <span>{protocol.actionText}</span>
                  <ArrowRight
                    size={12}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
});
ProtocolsCommandDeck.displayName = 'ProtocolsCommandDeck';
