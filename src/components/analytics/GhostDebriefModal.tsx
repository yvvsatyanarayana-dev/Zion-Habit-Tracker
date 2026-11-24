import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  Flame,
  Clock,
  Sparkles,
  Zap,
  Target,
  AlertTriangle,
  ArrowRight,
  Copy,
  Check,
  Download,
  X,
  Share2,
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { generateGhostDebrief, formatGhostDebriefMarkdown } from '../../lib/ghostProtocol';
import { formatLocalDate } from '../../lib/dateUtils';
import { sound } from '../../lib/audio';

export const GhostDebriefModal: React.FC = () => {
  const isOpen = useHabitStore((s) => s.ghostDebriefOpen);
  const setIsOpen = useHabitStore((s) => s.setGhostDebriefOpen);

  const habits = useHabitStore((s) => s.habits);
  const checkins = useHabitStore((s) => s.checkins);
  const allCheckinsList = useHabitStore((s) => s.allCheckinsList);
  const wellnessLogs = useHabitStore((s) => s.wellnessLogs);
  const focusSessions = useHabitStore((s) => s.focusSessions);
  const currentDate = useHabitStore((s) => s.currentDate);
  const timetableExecutions = useHabitStore((s) => s.timetableExecutions);
  const routines = useHabitStore((s) => s.routines);

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'appraisal' | 'bottlenecks' | 'tomorrow'>('appraisal');

  const todayStr = useMemo(() => formatLocalDate(currentDate), [currentDate]);
  const realFocusMinutesToday = useMemo(() => {
    return focusSessions
      .filter((s) => s.date === todayStr)
      .reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
  }, [focusSessions, todayStr]);

  const debrief = useMemo(() => {
    return generateGhostDebrief({
      habits,
      checkins,
      allCheckinsList,
      wellnessLogs,
      currentDate,
      focusMinutesToday: realFocusMinutesToday,
      timetableExecutions,
      routines,
    });
  }, [
    habits,
    checkins,
    allCheckinsList,
    wellnessLogs,
    currentDate,
    realFocusMinutesToday,
    timetableExecutions,
    routines,
  ]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    sound.playClick();
    const md = formatGhostDebriefMarkdown(debrief);
    await navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    sound.playClick();
    const md = formatGhostDebriefMarkdown(debrief);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Zion-Ghost-Debrief-${debrief.date}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-[16px]"
        onClick={() => setIsOpen(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          style={{
            backgroundColor: 'var(--bg-surface-elevated, #131316)',
            borderColor: 'var(--border-subtle, rgba(255,255,255,0.08))',
            boxShadow: 'var(--shadow-dropdown, 0 20px 48px rgba(0,0,0,0.9))',
            color: 'var(--text-primary, #f4f4f6)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            className="p-5 border-b flex-shrink-0 flex items-center justify-between"
            style={{
              borderColor: 'var(--border-subtle, rgba(255,255,255,0.08))',
              backgroundColor: 'var(--bg-surface, #0e0e11)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center border shadow-inner"
                style={{
                  backgroundColor: `${debrief.tierColor}18`,
                  borderColor: `${debrief.tierColor}35`,
                  color: debrief.tierColor,
                }}
              >
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold tracking-tight text-white">
                    THE GHOST PROTOCOL
                  </h2>
                  <span
                    className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black border"
                    style={{
                      backgroundColor: `${debrief.tierColor}20`,
                      borderColor: `${debrief.tierColor}40`,
                      color: debrief.tierColor,
                    }}
                  >
                    TIER {debrief.tier}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Offline AI Performance Appraisal • {debrief.formattedDate}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopy}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Copy Markdown Report"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
              <button
                onClick={handleDownload}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Download .md File"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div
            className="grid grid-cols-3 border-b text-center py-3 flex-shrink-0"
            style={{
              borderColor: 'var(--border-subtle, rgba(255,255,255,0.08))',
              backgroundColor: 'var(--bg-surface-card, #17171a)',
            }}
          >
            <div className="border-r border-white/5">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Execution</span>
              <div className="text-lg font-black tracking-tight text-white">
                {debrief.completionRate}%
              </div>
              <span className="text-[10px] text-zinc-400">
                {debrief.totalCompleted}/{debrief.totalScheduled} Habits
              </span>
            </div>
            <div className="border-r border-white/5">
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Focus Volume</span>
              <div className="text-lg font-black tracking-tight text-white">
                {debrief.focusMinutesToday}m
              </div>
              <span className="text-[10px] text-zinc-400">Deep Work Sprint</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Behavioral Tier</span>
              <div className="text-lg font-black tracking-tight" style={{ color: debrief.tierColor }}>
                {debrief.tierLabel}
              </div>
              <span className="text-[10px] text-zinc-400">Status Active</span>
            </div>
          </div>

          {/* Tab Selector */}
          <div
            className="flex border-b px-4 pt-2 gap-2 flex-shrink-0"
            style={{
              borderColor: 'var(--border-subtle, rgba(255,255,255,0.08))',
              backgroundColor: 'var(--bg-surface, #0e0e11)',
            }}
          >
            <button
              onClick={() => setActiveTab('appraisal')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'appraisal'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Executive Appraisal
            </button>
            <button
              onClick={() => setActiveTab('bottlenecks')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'bottlenecks'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Friction Diagnostics
            </button>
            <button
              onClick={() => setActiveTab('tomorrow')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === 'tomorrow'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Tomorrow's Directives
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-5 flex-1 overflow-y-auto space-y-4">
            {activeTab === 'appraisal' && (
              <div className="space-y-4 animate-in fade-in">
                {/* Headline Callout */}
                <div
                  className="p-4 rounded-2xl border"
                  style={{
                    backgroundColor: `${debrief.tierColor}10`,
                    borderColor: `${debrief.tierColor}30`,
                  }}
                >
                  <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                    Executive Verdict
                  </div>
                  <div className="text-sm font-bold text-white tracking-tight leading-snug">
                    "{debrief.executiveHeadline}"
                  </div>
                </div>

                {/* Stoic Paragraph */}
                <div
                  className="p-4 rounded-2xl border leading-relaxed text-xs sm:text-sm text-zinc-300 space-y-2"
                  style={{
                    backgroundColor: 'var(--bg-surface-card, #17171a)',
                    borderColor: 'var(--border-subtle, rgba(255,255,255,0.065))',
                  }}
                >
                  <p>{debrief.stoicAnalysis}</p>
                </div>

                {/* Keystone Multiplier */}
                {debrief.keystoneHabit && (
                  <div
                    className="p-3.5 rounded-2xl border flex items-start gap-3"
                    style={{
                      backgroundColor: 'rgba(99, 102, 241, 0.08)',
                      borderColor: 'rgba(99, 102, 241, 0.25)',
                    }}
                  >
                    <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-indigo-300">
                        Keystone Anchor: {debrief.keystoneHabit.name}
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        {debrief.keystoneHabit.reason}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'bottlenecks' && (
              <div className="space-y-4 animate-in fade-in">
                {debrief.criticalBottleneck ? (
                  <div
                    className="p-4 rounded-2xl border space-y-3"
                    style={{
                      backgroundColor: 'rgba(244, 63, 94, 0.08)',
                      borderColor: 'rgba(244, 63, 94, 0.25)',
                    }}
                  >
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4" />
                      Critical Friction Bottleneck
                    </div>
                    <p className="text-xs text-zinc-300">
                      {debrief.criticalBottleneck.issue}
                    </p>
                    <div
                      className="p-3 rounded-xl border bg-black/40 text-xs text-rose-300 font-medium"
                      style={{ borderColor: 'rgba(244, 63, 94, 0.2)' }}
                    >
                      <span className="font-bold">Prescription: </span>
                      {debrief.criticalBottleneck.prescription}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-zinc-400 text-xs">
                    No critical bottlenecks detected today. Your perimeter held firm.
                  </div>
                )}

                {debrief.wellnessCorrelation && (
                  <div
                    className="p-4 rounded-2xl border space-y-2"
                    style={{
                      backgroundColor: 'var(--bg-surface-card, #17171a)',
                      borderColor: 'var(--border-subtle, rgba(255,255,255,0.065))',
                    }}
                  >
                    <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Biological & Energy Calibration
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold">
                        ⚡ Energy: {debrief.wellnessCorrelation.energyScore}/5
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-pink-500/15 border border-pink-500/30 text-pink-300 font-bold">
                        ❤️ Mood: {debrief.wellnessCorrelation.moodScore}/5
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 italic pt-1">
                      {debrief.wellnessCorrelation.insight}
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tomorrow' && (
              <div className="space-y-3 animate-in fade-in">
                <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">
                  Tomorrow's Strategic Directives
                </div>
                {debrief.tomorrowsDirectives.map((directive, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl border flex items-start gap-3"
                    style={{
                      backgroundColor: 'var(--bg-surface-card, #17171a)',
                      borderColor: 'var(--border-subtle, rgba(255,255,255,0.065))',
                    }}
                  >
                    <div className="w-6 h-6 rounded-lg bg-white/10 text-white font-mono text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <div className="text-xs text-zinc-200 font-medium leading-relaxed">
                      {directive}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div
            className="p-4 border-t flex-shrink-0 flex items-center justify-between"
            style={{
              borderColor: 'var(--border-subtle, rgba(255,255,255,0.08))',
              backgroundColor: 'var(--bg-surface, #0e0e11)',
            }}
          >
            <span className="text-[11px] text-zinc-500">
              Zero cloud telemetry • Computed locally
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-3.5 py-1.5 rounded-xl border text-xs font-bold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5"
                style={{ borderColor: 'var(--border-subtle, rgba(255,255,255,0.1))' }}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Report'}</span>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md"
                style={{
                  backgroundColor: 'var(--btn-primary-bg, #ffffff)',
                  color: 'var(--btn-primary-text, #09090b)',
                }}
              >
                Dismiss
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
