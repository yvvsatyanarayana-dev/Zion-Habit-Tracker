import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  Share2,
  Sparkles,
  Zap,
  ArrowRight,
  Plus,
  Trash2,
  TrendingUp,
  Link as LinkIcon,
  HelpCircle,
  Activity,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { calculateHabitSynergies, type HabitPairSynergy } from '../../lib/synergyCalculator';
import { HabitIconView } from '../../lib/habitIcons';
import type { Habit } from '../../lib/types';

interface GraphNode {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  radius: number;
}

export const HabitSynergyGraphModal: React.FC = () => {
  const isOpen = useHabitStore((s) => s.synergyGraphModalOpen);
  const setOpen = useHabitStore((s) => s.setSynergyGraphModalOpen);
  const habits = useHabitStore((s) => s.habits);
  const allCheckinsList = useHabitStore((s) => s.allCheckinsList);
  const habitStacks = useHabitStore((s) => s.habitStacks);
  const saveHabitStack = useHabitStore((s) => s.saveHabitStack);
  const deleteHabitStack = useHabitStore((s) => s.deleteHabitStack);
  const theme = useHabitStore((s) => s.settings.theme);

  const activeHabits = useMemo(() => habits.filter((h) => !h.archived), [habits]);

  const synergies = useMemo(
    () => calculateHabitSynergies(activeHabits, allCheckinsList, habitStacks),
    [activeHabits, allCheckinsList, habitStacks]
  );

  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [activeSynergyDetail, setActiveSynergyDetail] = useState<HabitPairSynergy | null>(null);
  const [isStackingOpen, setIsStackingOpen] = useState(false);
  const [newCueTrigger, setNewCueTrigger] = useState<'immediate' | '15m_after' | 'evening'>('immediate');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Initialize node layout
  const nodes = useMemo<GraphNode[]>(() => {
    const total = activeHabits.length;
    if (total === 0) return [];
    const centerX = 360;
    const centerY = 280;
    const radiusDist = Math.min(210, 110 + total * 12);

    return activeHabits.map((h, idx) => {
      const angle = (idx / total) * 2 * Math.PI - Math.PI / 2;
      return {
        id: h.id,
        name: h.name,
        color: h.color || 'var(--accent-primary)',
        x: centerX + radiusDist * Math.cos(angle),
        y: centerY + radiusDist * Math.sin(angle),
        radius: 26,
      };
    });
  }, [activeHabits]);

  // Interactive Canvas Animation Loop
  useEffect(() => {
    if (!isOpen || !canvasRef.current || nodes.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let offset = 0;

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      offset = (offset + 0.35) % 20;

      // Draw subtle background grid dots
      ctx.save();
      ctx.fillStyle = isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.025)';
      for (let gx = 20; gx < canvas.width; gx += 30) {
        for (let gy = 20; gy < canvas.height; gy += 30) {
          ctx.beginPath();
          ctx.arc(gx, gy, 1, 0, 2 * Math.PI);
          ctx.fill();
        }
      }
      ctx.restore();

      // Draw synergy edges
      for (const syn of synergies) {
        const fromNode = nodes.find((n) => n.id === syn.parentHabit.id);
        const toNode = nodes.find((n) => n.id === syn.childHabit.id);
        if (!fromNode || !toNode) continue;

        const isHighlighted =
          activeSynergyDetail?.parentHabit.id === syn.parentHabit.id &&
          activeSynergyDetail?.childHabit.id === syn.childHabit.id;

        const isPositiveLift = syn.synergyLiftPct > 0;
        const alpha = syn.isDefinedStack ? 0.95 : isHighlighted ? 0.85 : isPositiveLift ? 0.35 : 0.12;
        const lineWidth = syn.isDefinedStack ? 2.5 : isHighlighted ? 2.5 : isPositiveLift ? 1.5 : 0.8;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);

        const midX = (fromNode.x + toNode.x) / 2 + (fromNode.y - toNode.y) * 0.12;
        const midY = (fromNode.y + toNode.y) / 2 + (toNode.x - fromNode.x) * 0.12;
        ctx.quadraticCurveTo(midX, midY, toNode.x, toNode.y);

        ctx.strokeStyle = syn.isDefinedStack ? '#10b981' : isHighlighted ? '#6366f1' : fromNode.color;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = lineWidth;

        if (syn.isDefinedStack || isHighlighted) {
          ctx.setLineDash([6, 4]);
          ctx.lineDashOffset = -offset;
        } else {
          ctx.setLineDash([]);
        }

        ctx.stroke();
        ctx.restore();
      }

      // Draw nodes
      for (const node of nodes) {
        const isSelected =
          activeSynergyDetail?.parentHabit.id === node.id ||
          activeSynergyDetail?.childHabit.id === node.id;

        ctx.save();
        // Glow
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.radius + 8, 0, 2 * Math.PI);
          ctx.fillStyle = `${node.color}33`;
          ctx.fill();
        }

        // Base circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, 2 * Math.PI);
        ctx.fillStyle = isLight ? '#ffffff' : '#131316';
        ctx.fill();

        ctx.lineWidth = isSelected ? 3 : 2;
        ctx.strokeStyle = node.color;
        ctx.stroke();

        // Node label
        ctx.fillStyle = isLight ? '#09090b' : '#f4f4f6';
        ctx.font = '600 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          node.name.length > 14 ? node.name.slice(0, 12) + '…' : node.name,
          node.x,
          node.y + node.radius + 15
        );

        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isOpen, nodes, synergies, activeSynergyDetail, theme]);

  if (!isOpen) return null;

  const handleCreateStack = async () => {
    if (!selectedParentId || !selectedChildId || selectedParentId === selectedChildId) return;
    await saveHabitStack({
      parent_habit_id: selectedParentId,
      child_habit_id: selectedChildId,
      cue_trigger: newCueTrigger,
      synergy_score: 1.5,
    });
    setIsStackingOpen(false);
  };

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
        className="w-full max-w-5xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors"
      >
        {/* Header */}
        <div
          style={{ borderColor: 'var(--border-subtle)' }}
          className="px-6 py-4.5 border-b flex items-center justify-between gap-3 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent"
        >
          <div className="flex items-center gap-3">
            <div
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                borderColor: 'rgba(99, 102, 241, 0.35)',
                color: 'var(--accent-primary)',
              }}
              className="w-11 h-11 rounded-2xl border flex items-center justify-center shadow-inner"
            >
              <Share2 size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }} className="text-base sm:text-lg font-bold">
                  Habit Stacking & Synergy Ecosystem
                </h2>
                <span className="studio-badge-active">
                  LIVE FORCE GRAPH
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)' }} className="text-xs mt-0.5">
                Visualizing habit chains, momentum transfer, and empirical synergy lift from your actual check-ins.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsStackingOpen(true)}
              style={{
                backgroundColor: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-text)',
                boxShadow: 'var(--btn-primary-shadow)',
              }}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all hover:opacity-95 active:scale-95 cursor-pointer"
            >
              <Plus size={13} strokeWidth={2.5} />
              <span>Link Stack</span>
            </button>

            <button
              onClick={() => setOpen(false)}
              style={{ color: 'var(--text-muted)' }}
              className="p-1.5 rounded-lg hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[var(--border-subtle)]">
          {/* Canvas Graph View */}
          <div
            style={{ backgroundColor: 'var(--bg-canvas)' }}
            className="lg:col-span-7 p-4 flex flex-col items-center justify-center relative min-h-[420px]"
          >
            <canvas
              ref={canvasRef}
              width={720}
              height={560}
              className="w-full max-w-[620px] h-auto rounded-xl touch-none"
            />

            {/* Legend */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
                boxShadow: 'var(--shadow-card)',
              }}
              className="absolute bottom-4 left-4 p-2.5 rounded-xl border text-[11px] space-y-1.5 backdrop-blur-md"
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-emerald-400 rounded-full inline-block" />
                <span style={{ color: 'var(--text-secondary)' }}>Active Habit Stack (Green Flow)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-indigo-400 rounded-full inline-block" />
                <span style={{ color: 'var(--text-secondary)' }}>Empirical Synergy Lift</span>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Synergy Diagnosis */}
          <div
            style={{ backgroundColor: 'var(--bg-surface)' }}
            className="lg:col-span-5 p-5 flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 style={{ color: 'var(--text-primary)' }} className="text-xs font-bold uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Sparkles size={13} className="text-amber-400" />
                  <span>Top Empirical Synergies</span>
                </h3>
                <span style={{ color: 'var(--text-muted)' }} className="text-[11px] font-mono">
                  {synergies.length} pairs
                </span>
              </div>

              {/* Synergies List */}
              <div className="space-y-2 max-h-[340px] overflow-y-auto custom-scrollbar pr-1">
                {synergies.slice(0, 6).map((syn) => {
                  const isSelected =
                    activeSynergyDetail?.parentHabit.id === syn.parentHabit.id &&
                    activeSynergyDetail?.childHabit.id === syn.childHabit.id;

                  return (
                    <div
                      key={`${syn.parentHabit.id}->${syn.childHabit.id}`}
                      onClick={() => setActiveSynergyDetail(syn)}
                      style={{
                        backgroundColor: isSelected ? 'var(--bg-surface-card)' : 'var(--bg-surface-elevated)',
                        borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)',
                      }}
                      className="p-3 rounded-xl border transition-all cursor-pointer hover:border-[var(--border-medium)] flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-primary)] truncate">
                          <span className="truncate">{syn.parentHabit.name}</span>
                          <ArrowRight size={11} className="text-[var(--text-muted)] shrink-0" />
                          <span className="truncate">{syn.childHabit.name}</span>
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] mt-1 flex items-center gap-2 font-num">
                          <span>Base: {syn.baselineChildRate}%</span>
                          <span>•</span>
                          <span className="text-indigo-400 font-bold">
                            Stacked: {syn.synergyRate}%
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {syn.isDefinedStack ? (
                          <span className="studio-badge-current">
                            LINKED
                          </span>
                        ) : (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              syn.synergyLiftPct > 0
                                ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                                : 'bg-[var(--bg-surface-subtle)] text-[var(--text-muted)]'
                            }`}
                          >
                            {syn.synergyLiftPct > 0 ? `+${syn.synergyLiftPct}% LIFT` : `${syn.synergyLiftPct}%`}
                          </span>
                        )}
                        <ChevronRight size={14} className="text-[var(--text-muted)]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Detail Inspection */}
            {activeSynergyDetail ? (
              <div
                style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  borderColor: 'var(--border-subtle)',
                  boxShadow: 'var(--shadow-card)',
                }}
                className="p-4 rounded-2xl border space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wider font-mono">
                    Chain Diagnosis
                  </span>
                  {activeSynergyDetail.isDefinedStack && activeSynergyDetail.stackId && (
                    <button
                      onClick={() => deleteHabitStack(activeSynergyDetail.stackId!)}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 size={12} />
                      <span>Unlink Stack</span>
                    </button>
                  )}
                </div>

                <p style={{ color: 'var(--text-secondary)' }} className="text-xs leading-relaxed">
                  Completing <strong>"{activeSynergyDetail.parentHabit.name}"</strong> raises completion probability of{' '}
                  <strong>"{activeSynergyDetail.childHabit.name}"</strong> by{' '}
                  <span className="text-emerald-400 font-bold">
                    {Math.max(0, activeSynergyDetail.synergyLiftPct)}%
                  </span>{' '}
                  ({activeSynergyDetail.baselineChildRate}% → {activeSynergyDetail.synergyRate}%).
                </p>

                {!activeSynergyDetail.isDefinedStack && (
                  <button
                    onClick={() => {
                      saveHabitStack({
                        parent_habit_id: activeSynergyDetail.parentHabit.id,
                        child_habit_id: activeSynergyDetail.childHabit.id,
                        cue_trigger: activeSynergyDetail.recommendedTrigger,
                        synergy_score: 1.5,
                      });
                    }}
                    style={{
                      backgroundColor: 'var(--btn-primary-bg)',
                      color: 'var(--btn-primary-text)',
                      boxShadow: 'var(--btn-primary-shadow)',
                    }}
                    className="w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:opacity-95 active:scale-95 cursor-pointer"
                  >
                    <LinkIcon size={13} />
                    <span>Lock In as Active Routine Stack</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="p-3 text-center text-xs text-[var(--text-muted)] font-mono">
                Click any habit pair or node to inspect synergy diagnosis.
              </div>
            )}
          </div>
        </div>

        {/* Link New Stack Modal */}
        {isStackingOpen && (
          <div
            onClick={() => setIsStackingOpen(false)}
            className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                borderColor: 'var(--border-subtle)',
                boxShadow: 'var(--shadow-dropdown)',
              }}
              className="w-full max-w-md p-5 rounded-3xl border space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 style={{ color: 'var(--text-primary)' }} className="text-sm font-bold flex items-center gap-2">
                  <LinkIcon size={15} className="text-indigo-400" />
                  <span>Create Atomic Habit Stack</span>
                </h3>
                <button
                  onClick={() => setIsStackingOpen(false)}
                  style={{ color: 'var(--text-muted)' }}
                  className="p-1 hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[var(--text-secondary)] font-semibold mb-1">
                    1. When I complete (Trigger Habit):
                  </label>
                  <select
                    value={selectedParentId || ''}
                    onChange={(e) => setSelectedParentId(e.target.value)}
                    style={{
                      backgroundColor: 'var(--bg-surface-card)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                    className="w-full p-2.5 rounded-xl border outline-none font-medium"
                  >
                    <option value="">Select Trigger Habit...</option>
                    {activeHabits.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--text-secondary)] font-semibold mb-1">
                    2. I will then perform (Stacked Habit):
                  </label>
                  <select
                    value={selectedChildId || ''}
                    onChange={(e) => setSelectedChildId(e.target.value)}
                    style={{
                      backgroundColor: 'var(--bg-surface-card)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                    className="w-full p-2.5 rounded-xl border outline-none font-medium"
                  >
                    <option value="">Select Stacked Habit...</option>
                    {activeHabits
                      .filter((h) => h.id !== selectedParentId)
                      .map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[var(--text-secondary)] font-semibold mb-1">3. Trigger Cue:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'immediate', label: 'Immediately' },
                      { id: '15m_after', label: 'Within 15m' },
                      { id: 'evening', label: 'Evening Ritual' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setNewCueTrigger(opt.id as any)}
                        style={
                          newCueTrigger === opt.id
                            ? {
                                borderColor: 'var(--accent-primary)',
                                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                                color: 'var(--accent-primary)',
                              }
                            : {
                                borderColor: 'var(--border-subtle)',
                                backgroundColor: 'var(--bg-surface-card)',
                                color: 'var(--text-muted)',
                              }
                        }
                        className="p-2 rounded-xl border text-center text-[11px] font-semibold cursor-pointer transition-all"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <button
                  type="button"
                  onClick={() => setIsStackingOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!selectedParentId || !selectedChildId}
                  onClick={handleCreateStack}
                  style={{
                    backgroundColor: 'var(--btn-primary-bg)',
                    color: 'var(--btn-primary-text)',
                    boxShadow: 'var(--btn-primary-shadow)',
                  }}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-95 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  Save Stack
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
