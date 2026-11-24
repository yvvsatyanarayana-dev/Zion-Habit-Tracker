import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  History,
  Sparkles,
  Camera,
  Calendar,
  Layers,
  ArrowLeftRight,
  Trash2,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Award,
  Plus,
  CheckCircle2,
  Eye,
  FileCheck,
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { HabitIconView } from '../../lib/habitIcons';
import type { HabitProof, Habit } from '../../lib/types';
import {
  parseProofCaption,
  generateProofCertificateDataUrl,
} from '../../lib/proofCertificate';
import { ProofUploadModal } from './ProofUploadModal';

/**
 * Bulletproof Proof Media Display:
 * If an image fails to load or image_data is empty/invalid, renders a rich, high-fidelity
 * cryptographic milestone certificate directly in the DOM. Zero broken <img> icons ever!
 */
export const ProofMediaDisplay: React.FC<{
  proof: HabitProof;
  habit?: Habit;
  className?: string;
  imageClassName?: string;
}> = ({ proof, habit, className = '', imageClassName = '' }) => {
  const [hasError, setHasError] = useState(false);
  const parsed = parseProofCaption(proof.caption);

  const rawData = proof.image_data?.trim() || '';
  const isValidDataUrl =
    rawData.length > 30 &&
    (rawData.startsWith('data:image/') ||
      rawData.startsWith('http://') ||
      rawData.startsWith('https://') ||
      rawData.startsWith('blob:') ||
      rawData.startsWith('file://'));

  if (!isValidDataUrl || hasError) {
    const habitColor = habit?.color || '#6366f1';
    const habitName = habit?.name || 'Habit Milestone';

    return (
      <div
        className={`w-full h-full flex flex-col items-center justify-center p-4 text-center select-none relative overflow-hidden bg-gradient-to-b from-[#131318] via-[#0d0d11] to-[#08080a] ${className}`}
        style={{
          border: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        {/* Subtle Cyber Grid */}
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.4) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Ambient Color Glow */}
        <div
          className="absolute w-40 h-40 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: habitColor }}
        />

        {/* Top Header Badge */}
        <div className="relative z-10 flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 bg-white/[0.04] mb-2.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9.5px] font-mono font-bold tracking-wider uppercase text-zinc-300">
            {parsed.isAiVerified ? 'AI SENTINEL · PROOF OF WORK' : 'VERIFIED MILESTONE RECEIPT'}
          </span>
        </div>

        {/* Central Shield / Icon Badge */}
        <div className="relative z-10 mb-2">
          <div
            className="w-13 h-13 rounded-2xl flex items-center justify-center border shadow-xl relative"
            style={{
              backgroundColor: `${habitColor}18`,
              borderColor: `${habitColor}55`,
              color: habitColor,
            }}
          >
            {habit?.emoji ? (
              <HabitIconView iconId={habit.emoji} color={habitColor} size={22} />
            ) : (
              <ShieldCheck size={24} strokeWidth={2.2} />
            )}
          </div>
        </div>

        {/* Integrity Score or Verification Title */}
        <div className="relative z-10 mb-1">
          {parsed.isAiVerified ? (
            <div className="flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-black font-mono tracking-tight text-white leading-none">
                {parsed.integrityScore}%
              </span>
              <span className="text-[9px] font-mono font-bold tracking-widest text-emerald-400 mt-1">
                FOCUS INTEGRITY VERIFIED
              </span>
            </div>
          ) : (
            <span className="text-xs sm:text-sm font-bold text-white tracking-tight">
              Milestone Confirmed
            </span>
          )}
        </div>

        {/* Habit Label */}
        <div className="relative z-10 mt-1 max-w-[240px] truncate">
          <span
            className="text-[11px] font-black tracking-wide uppercase px-2.5 py-0.5 rounded-md border"
            style={{
              color: habitColor,
              borderColor: `${habitColor}35`,
              backgroundColor: `${habitColor}12`,
            }}
          >
            {habitName}
          </span>
        </div>

        {/* Certificate Hash & Date Metadata */}
        <div className="relative z-10 mt-2.5 pt-2 border-t border-white/10 w-full max-w-[260px] flex items-center justify-between text-[9px] font-mono text-zinc-400">
          <span className="truncate max-w-[140px]">
            {parsed.certificateId ? `ID: ${parsed.certificateId}` : 'RECEIPT: RECORDED'}
          </span>
          <span className="text-zinc-500 font-bold">{proof.date}</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={rawData}
      alt={habit?.name ? `${habit.name} proof` : 'Proof attachment'}
      onError={() => setHasError(true)}
      className={`w-full h-full object-cover ${imageClassName}`}
    />
  );
};

export const TimeCapsuleModal: React.FC = () => {
  const isOpen = useHabitStore((s) => s.timeCapsuleModalOpen);
  const setOpen = useHabitStore((s) => s.setTimeCapsuleModalOpen);
  const selectedHabitId = useHabitStore((s) => s.timeCapsuleHabitId);
  const habits = useHabitStore((s) => s.habits);
  const habitProofs = useHabitStore((s) => s.habitProofs);
  const deleteHabitProof = useHabitStore((s) => s.deleteHabitProof);
  const currentDate = useHabitStore((s) => s.currentDate);

  const [activeFilterId, setActiveFilterId] = useState<string | null>(selectedHabitId || null);
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [viewMode, setViewMode] = useState<'slider' | 'gallery'>('slider');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedProofPreview, setSelectedProofPreview] = useState<HabitProof | null>(null);

  // Reload proofs from DB/localStorage whenever modal opens
  useEffect(() => {
    if (isOpen) {
      void useHabitStore.getState().loadHabitProofs();
      if (selectedHabitId) {
        setActiveFilterId(selectedHabitId);
      }
    }
  }, [isOpen, selectedHabitId]);

  const filteredProofs = useMemo(() => {
    let list = [...habitProofs];
    if (activeFilterId) {
      list = list.filter((p) => p.habit_id === activeFilterId);
    }
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [habitProofs, activeFilterId]);

  const earliestProof = filteredProofs.length > 0 ? filteredProofs[0] : null;
  const latestProof = filteredProofs.length > 1 ? filteredProofs[filteredProofs.length - 1] : null;

  if (!isOpen) return null;

  const currentFilterHabit = habits.find((h) => h.id === activeFilterId) || habits[0];

  return (
    <>
      <div
        onClick={() => setOpen(false)}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-[12px] animate-fade-in select-none"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: 'var(--bg-surface-elevated, #111115)',
            borderColor: 'var(--border-subtle, rgba(255,255,255,0.1))',
            boxShadow: 'var(--shadow-dropdown)',
          }}
          className="w-full max-w-5xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] transition-colors"
        >
          {/* Header */}
          <div
            style={{ borderColor: 'var(--border-subtle, rgba(255,255,255,0.1))' }}
            className="px-6 py-4.5 border-b flex items-center justify-between gap-3 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent"
          >
            <div className="flex items-center gap-3">
              <div
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  borderColor: 'rgba(245, 158, 11, 0.35)',
                  color: '#f59e0b',
                }}
                className="w-11 h-11 rounded-2xl border flex items-center justify-center shadow-inner shrink-0"
              >
                <History size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }} className="text-base sm:text-lg font-bold">
                    Identity Time Capsule & Transformation Scrubber
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <Sparkles size={11} />
                    {filteredProofs.length} {filteredProofs.length === 1 ? 'PROOF LOGGED' : 'PROOFS LOGGED'}
                  </span>
                </div>
                <p style={{ color: 'var(--text-secondary)' }} className="text-xs mt-0.5">
                  Visual proof of consistency over time. Compare your initial milestone against today.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Quick Add Proof Button */}
              {currentFilterHabit && (
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black shadow-md active:scale-95 shrink-0"
                  title="Upload new proof or photo"
                >
                  <Plus size={14} strokeWidth={2.4} />
                  <span className="hidden sm:inline">Add Proof</span>
                </button>
              )}

              {/* View Mode Toggle */}
              <div
                style={{
                  backgroundColor: 'var(--bg-surface-card, #18181b)',
                  borderColor: 'var(--border-subtle, rgba(255,255,255,0.1))',
                }}
                className="flex items-center rounded-xl border p-0.5 text-xs font-semibold"
              >
                <button
                  type="button"
                  onClick={() => setViewMode('slider')}
                  style={
                    viewMode === 'slider'
                      ? {
                          backgroundColor: 'var(--btn-primary-bg, #ffffff)',
                          color: 'var(--btn-primary-text, #09090b)',
                          boxShadow: 'var(--btn-primary-shadow)',
                        }
                      : { color: 'var(--text-muted, #a1a1aa)' }
                  }
                  className="px-3 py-1 rounded-lg transition-all cursor-pointer font-bold"
                >
                  Before / After
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('gallery')}
                  style={
                    viewMode === 'gallery'
                      ? {
                          backgroundColor: 'var(--btn-primary-bg, #ffffff)',
                          color: 'var(--btn-primary-text, #09090b)',
                          boxShadow: 'var(--btn-primary-shadow)',
                        }
                      : { color: 'var(--text-muted, #a1a1aa)' }
                  }
                  className="px-3 py-1 rounded-lg transition-all cursor-pointer font-bold"
                >
                  All Moments
                </button>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{ color: 'var(--text-muted)' }}
                className="p-1.5 rounded-lg hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Habit Selector Bar */}
          <div
            style={{
              borderColor: 'var(--border-subtle, rgba(255,255,255,0.1))',
              backgroundColor: 'var(--bg-surface, #141417)',
            }}
            className="px-6 py-2.5 border-b flex items-center gap-2 overflow-x-auto custom-scrollbar"
          >
            <button
              type="button"
              onClick={() => setActiveFilterId(null)}
              style={
                activeFilterId === null
                  ? {
                      backgroundColor: 'var(--btn-primary-bg, #ffffff)',
                      color: 'var(--btn-primary-text, #09090b)',
                      boxShadow: 'var(--btn-primary-shadow)',
                    }
                  : {
                      backgroundColor: 'var(--bg-surface-card, #1c1c21)',
                      borderColor: 'var(--border-subtle, rgba(255,255,255,0.1))',
                      color: 'var(--text-secondary, #d4d4d8)',
                    }
              }
              className="px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 cursor-pointer transition-all border"
            >
              All Habit Proofs ({habitProofs.length})
            </button>
            {habits.map((h) => {
              const count = habitProofs.filter((p) => p.habit_id === h.id).length;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setActiveFilterId(h.id)}
                  style={
                    activeFilterId === h.id
                      ? {
                          backgroundColor: 'var(--btn-primary-bg, #ffffff)',
                          color: 'var(--btn-primary-text, #09090b)',
                          boxShadow: 'var(--btn-primary-shadow)',
                        }
                      : {
                          backgroundColor: 'var(--bg-surface-card, #1c1c21)',
                          borderColor: 'var(--border-subtle, rgba(255,255,255,0.1))',
                          color: 'var(--text-secondary, #d4d4d8)',
                        }
                  }
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1.5 cursor-pointer transition-all border"
                >
                  <HabitIconView iconId={h.emoji} color={h.color} size={13} />
                  <span>{h.name}</span>
                  {count > 0 && (
                    <span className="text-[10px] font-mono px-1 rounded bg-white/10 font-bold">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Body Content */}
          <div style={{ backgroundColor: 'var(--bg-canvas, #09090b)' }} className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {filteredProofs.length === 0 ? (
              /* Zero Proofs Empty State */
              <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                <div
                  style={{
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderColor: 'rgba(245, 158, 11, 0.25)',
                    color: '#f59e0b',
                  }}
                  className="w-16 h-16 rounded-2xl border flex items-center justify-center shadow-inner"
                >
                  <Camera size={28} />
                </div>
                <div className="space-y-1 max-w-md">
                  <h3 style={{ color: 'var(--text-primary)' }} className="text-base font-bold">
                    No Proofs Attached Yet
                  </h3>
                  <p style={{ color: 'var(--text-muted)' }} className="text-xs leading-relaxed">
                    Upload your first photo proof or complete an AI Vision Sentinel focus session to establish your baseline milestone.
                  </p>
                </div>
                {currentFilterHabit && (
                  <button
                    type="button"
                    onClick={() => setUploadModalOpen(true)}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black flex items-center gap-2 shadow-lg transition-transform active:scale-95"
                  >
                    <Plus size={14} />
                    <span>Upload First Proof</span>
                  </button>
                )}
              </div>
            ) : viewMode === 'slider' && filteredProofs.length === 1 && earliestProof ? (
              /* Milestone 1 Showcase View (When exactly 1 proof is recorded) */
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="p-4 sm:p-5 rounded-2xl border border-amber-500/25 bg-amber-500/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <span>Milestone 1 Baseline Recorded!</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                          Day 1
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 mt-0.5">
                        Log a second proof on any subsequent day to unlock the interactive Before / After transformation scrubber.
                      </p>
                    </div>
                  </div>

                  {currentFilterHabit && (
                    <button
                      type="button"
                      onClick={() => setUploadModalOpen(true)}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black shrink-0 transition-all flex items-center gap-1.5 shadow-md active:scale-95"
                    >
                      <Plus size={13} strokeWidth={2.4} />
                      <span>Log Milestone 2</span>
                    </button>
                  )}
                </div>

                {/* Milestone 1 Hero Card */}
                {(() => {
                  const proof = earliestProof;
                  const habit = habits.find((h) => h.id === proof.habit_id);

                  return (
                    <div className="max-w-lg mx-auto rounded-3xl border border-white/10 bg-zinc-900/80 overflow-hidden shadow-2xl">
                      <div className="relative aspect-4/3 overflow-hidden bg-black/60 group">
                        <ProofMediaDisplay
                          proof={proof}
                          habit={habit}
                          imageClassName="transition-transform duration-300 group-hover:scale-102"
                        />
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/80 text-amber-400 font-mono text-[11px] font-bold backdrop-blur-xs border border-white/10 flex items-center gap-1.5">
                          <CheckCircle2 size={12} className="text-amber-400" />
                          <span>BASELINE MILESTONE</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedProofPreview(proof)}
                          className="absolute bottom-3 right-3 p-2 rounded-xl bg-black/75 text-white hover:bg-black transition-colors backdrop-blur-xs border border-white/10 cursor-pointer"
                          title="Enlarge Proof"
                        >
                          <Maximize2 size={14} />
                        </button>
                      </div>

                      <div className="p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {habit && <HabitIconView iconId={habit.emoji} color={habit.color} size={18} />}
                            <span className="font-bold text-base text-white">{habit?.name || 'Habit Proof'}</span>
                          </div>
                          <span className="text-xs font-mono text-zinc-400 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
                            {proof.date}
                          </span>
                        </div>

                        {proof.caption && (
                          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-zinc-300 font-mono">
                            {proof.caption}
                          </div>
                        )}

                        <div className="pt-1 flex items-center justify-between border-t border-white/5 text-xs">
                          <button
                            type="button"
                            onClick={() => setViewMode('gallery')}
                            className="text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-[11.5px]"
                          >
                            <Layers size={13} />
                            <span>View All Moments</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteHabitProof(proof.id, proof.habit_id)}
                            className="text-rose-400 hover:text-rose-300 transition-colors cursor-pointer flex items-center gap-1 text-[11.5px]"
                          >
                            <Trash2 size={13} />
                            <span>Delete Proof</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : viewMode === 'slider' && earliestProof && latestProof && earliestProof.id !== latestProof.id ? (
              /* Interactive Before & After Scrubber */
              <div className="space-y-4 max-w-3xl mx-auto">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-[var(--text-muted)]">
                  <span className="flex items-center gap-1.5 text-amber-400">
                    <span>BEFORE:</span>
                    <span>{earliestProof.date}</span>
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <span>AFTER:</span>
                    <span>{latestProof.date}</span>
                  </span>
                </div>

                {/* Scrubber Container */}
                <div
                  style={{ borderColor: 'var(--border-subtle)' }}
                  className="relative w-full aspect-16/10 rounded-2xl overflow-hidden border select-none bg-black shadow-xl"
                >
                  {/* Background (Latest Proof) */}
                  <div className="absolute inset-0 w-full h-full">
                    <ProofMediaDisplay
                      proof={latestProof}
                      habit={habits.find((h) => h.id === latestProof.habit_id)}
                    />
                  </div>

                  {/* Foreground Clip (Earliest Proof) */}
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ width: `${sliderPosition}%` }}
                  >
                    <div className="absolute inset-0" style={{ width: '100%', height: '100%' }}>
                      <ProofMediaDisplay
                        proof={earliestProof}
                        habit={habits.find((h) => h.id === earliestProof.habit_id)}
                      />
                    </div>
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/80 text-amber-400 font-mono text-[11px] font-bold backdrop-blur-xs border border-white/10">
                      BEFORE ({earliestProof.date})
                    </div>
                  </div>

                  <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/80 text-emerald-400 font-mono text-[11px] font-bold backdrop-blur-xs border border-white/10">
                    AFTER ({latestProof.date})
                  </div>

                  {/* Draggable Divider Line */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-2xl cursor-ew-resize flex items-center justify-center pointer-events-none"
                    style={{ left: `${sliderPosition}%` }}
                  >
                    <div className="w-8 h-8 rounded-full bg-white text-zinc-900 shadow-xl flex items-center justify-center -ml-3.5 border-2 border-zinc-900 pointer-events-auto">
                      <ArrowLeftRight size={14} />
                    </div>
                  </div>

                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderPosition}
                    onChange={(e) => setSliderPosition(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                  />
                </div>

                <div
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-subtle)',
                    boxShadow: 'var(--shadow-card)',
                  }}
                  className="p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <span className="text-xs font-bold text-[var(--text-primary)] block">
                      Interactive Time Scrubber
                    </span>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      Drag the dividing handle to witness your visual transformation over time.
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderPosition}
                    onChange={(e) => setSliderPosition(Number(e.target.value))}
                    className="w-full sm:w-48 accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            ) : (
              /* Gallery Cards Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredProofs.map((p) => {
                  const habit = habits.find((h) => h.id === p.habit_id);
                  const parsed = parseProofCaption(p.caption);

                  return (
                    <div
                      key={p.id}
                      style={{
                        backgroundColor: 'var(--bg-surface-elevated, #141418)',
                        borderColor: 'var(--border-subtle, rgba(255,255,255,0.1))',
                        boxShadow: 'var(--shadow-card)',
                      }}
                      className="rounded-2xl border overflow-hidden flex flex-col justify-between group hover:border-[var(--border-medium, rgba(255,255,255,0.25))] transition-all"
                    >
                      {/* Image Frame with Guaranteed Fallback */}
                      <div className="relative aspect-4/3 overflow-hidden bg-black/50">
                        <ProofMediaDisplay
                          proof={p}
                          habit={habit}
                          imageClassName="group-hover:scale-102 transition-transform duration-300"
                        />

                        {/* Top Overlay Badges */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          {parsed.isAiVerified && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 font-mono text-[9.5px] font-bold border border-emerald-500/30 backdrop-blur-xs flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              AI CERTIFIED
                            </span>
                          )}
                        </div>

                        {/* Delete & Zoom Controls */}
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => setSelectedProofPreview(p)}
                            className="p-1.5 rounded-lg bg-black/75 text-zinc-300 hover:text-white backdrop-blur-xs cursor-pointer"
                            title="Inspect Proof"
                          >
                            <Maximize2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteHabitProof(p.id, p.habit_id)}
                            className="p-1.5 rounded-lg bg-black/75 text-rose-400 hover:text-rose-300 backdrop-blur-xs cursor-pointer"
                            title="Delete this proof"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>

                        {/* Date Pill */}
                        <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 text-[10px] font-mono font-bold text-white backdrop-blur-xs border border-white/10">
                          {p.date}
                        </div>
                      </div>

                      {/* Card Content & Details */}
                      <div className="p-3.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-primary)] truncate">
                          {habit && <HabitIconView iconId={habit.emoji} color={habit.color} size={14} />}
                          <span className="truncate">{habit?.name || 'Habit Proof'}</span>
                        </div>
                        {p.caption ? (
                          <p style={{ color: 'var(--text-secondary)' }} className="text-xs line-clamp-2 font-mono">
                            {p.caption}
                          </p>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }} className="text-[11px] italic">
                            No caption recorded
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox / High-Resolution Proof Inspector Modal */}
      {selectedProofPreview && (
        <div
          onClick={() => setSelectedProofPreview(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-lg animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-3xl w-full rounded-3xl border border-white/15 bg-zinc-950 overflow-hidden shadow-2xl relative"
          >
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck size={18} className="text-amber-400" />
                <span className="font-bold text-sm text-white">Visual Milestone Proof</span>
                <span className="text-xs font-mono text-zinc-400 font-bold">
                  ({selectedProofPreview.date})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProofPreview(null)}
                className="p-1 rounded-full text-zinc-400 hover:text-white bg-white/5"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 flex items-center justify-center bg-black/50">
              <div className="w-full max-w-xl aspect-4/3 rounded-xl overflow-hidden shadow-2xl">
                <ProofMediaDisplay
                  proof={selectedProofPreview}
                  habit={habits.find((h) => h.id === selectedProofPreview.habit_id)}
                />
              </div>
            </div>

            {selectedProofPreview.caption && (
              <div className="p-4 bg-zinc-900 border-t border-white/10 text-xs font-mono text-zinc-300">
                {selectedProofPreview.caption}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Upload Proof Dialog */}
      {currentFilterHabit && (
        <ProofUploadModal
          habit={currentFilterHabit}
          dateStr={currentDate.toISOString().slice(0, 10)}
          isOpen={uploadModalOpen}
          onClose={() => {
            setUploadModalOpen(false);
            void useHabitStore.getState().loadHabitProofs();
          }}
        />
      )}
    </>
  );
};
