import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Trash2, GitBranch, GitBranchPlus, ArrowUpDown, AlertCircle, HelpCircle } from 'lucide-react';
import { HabitIconView } from '../../lib/habitIcons';
import { useHabitStore } from '../../store/useHabitStore';
import { validateNewDependency, getChainVisualization } from '../../lib/habitChain';
import { clsx } from 'clsx';

interface HabitChainModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HabitChainModal: React.FC<HabitChainModalProps> = ({ isOpen, onClose }) => {
  const { habits, habitDependencies, addDependency, removeDependency, removeAllDependencies } = useHabitStore();
  const [selectedHabitId, setSelectedHabitId] = useState<string>('');
  const [dependencyType, setDependencyType] = useState<'prerequisite' | 'anti'>('prerequisite');
  const [error, setError] = useState<string>('');
  const [showHelp, setShowHelp] = useState(false);

  const activeHabits = habits.filter(h => !h.archived);
  const selectedHabit = activeHabits.find(h => h.id === selectedHabitId);
  const chainNodes = getChainVisualization(activeHabits, habitDependencies);

  // Get dependencies for selected habit
  const prerequisites = habitDependencies.filter(d => d.habit_id === selectedHabitId && d.type === 'prerequisite');
  const antiChains = habitDependencies.filter(d => d.habit_id === selectedHabitId && d.type === 'anti');
  const dependents = habitDependencies.filter(d => d.depends_on_id === selectedHabitId && d.type === 'prerequisite');

  const availableForPrerequisite = activeHabits.filter(h =>
    h.id !== selectedHabitId &&
    !prerequisites.some(p => p.depends_on_id === h.id) &&
    !antiChains.some(a => a.depends_on_id === h.id)
  );

  const availableForAnti = activeHabits.filter(h =>
    h.id !== selectedHabitId &&
    !prerequisites.some(p => p.depends_on_id === h.id) &&
    !antiChains.some(a => a.depends_on_id === h.id)
  );

  const handleRemoveDependency = async (habitId: string, dependsOnId: string) => {
    await removeDependency(habitId, dependsOnId);
    setError('');
  };

  const handleRemoveAll = async () => {
    if (!selectedHabitId) return;
    if (window.confirm('Remove all dependencies for this habit?')) {
      await removeAllDependencies(selectedHabitId);
      setError('');
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-[16px]"
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
          onClick={e => e.stopPropagation()}
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
              <div className="p-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <GitBranch className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--text-primary, #f4f4f6)' }}>
                  Habit Chains & Dependencies
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-secondary, #9898a4)' }}>
                  Manage prerequisites, sequential stacking, and anti-chains
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Toggle Chain Help"
                aria-label="Toggle help"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Close"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Help Panel */}
          <AnimatePresence>
            {showHelp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="border-b p-4 text-xs flex-shrink-0"
                style={{
                  backgroundColor: 'rgba(168, 85, 247, 0.08)',
                  borderColor: 'rgba(168, 85, 247, 0.2)',
                }}
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-purple-300">
                    <GitBranch className="w-4 h-4 flex-shrink-0" />
                    <span><strong>Prerequisite:</strong> Must complete first before this habit</span>
                  </div>
                  <div className="flex items-center gap-2 text-orange-300">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span><strong>Anti-chain:</strong> Cannot complete both on the same day</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-300">
                    <ArrowUpDown className="w-4 h-4 flex-shrink-0" />
                    <span><strong>Smart Reschedule:</strong> Drag habit → dependents move automatically</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-300">
                    <GitBranchPlus className="w-4 h-4 flex-shrink-0" />
                    <span><strong>Visual Chains:</strong> See all connected dependencies at a glance</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
            {/* Left Panel - Habit List */}
            <div
              className="w-full md:w-72 border-b md:border-b-0 md:border-r flex flex-col flex-shrink-0"
              style={{
                borderColor: 'var(--border-subtle, rgba(255,255,255,0.08))',
                backgroundColor: 'var(--bg-surface, #0e0e11)',
              }}
            >
              <div
                className="p-3 sm:p-4 border-b flex-shrink-0"
                style={{ borderColor: 'var(--border-subtle, rgba(255,255,255,0.08))' }}
              >
                <label
                  className="block text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--text-muted, #5e5e6c)' }}
                >
                  Select Habit
                </label>
                <select
                  value={selectedHabitId}
                  onChange={e => { setSelectedHabitId(e.target.value); setError(''); }}
                  className="w-full rounded-xl px-3 py-2 text-sm border focus:outline-none transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle, #1c1c20)',
                    borderColor: 'var(--border-medium, rgba(255,255,255,0.11))',
                    color: 'var(--text-primary, #f4f4f6)',
                  }}
                >
                  <option value="" style={{ backgroundColor: '#131316', color: '#f4f4f6' }}>
                    Choose a habit...
                  </option>
                  {activeHabits.map(h => (
                    <option key={h.id} value={h.id} style={{ backgroundColor: '#131316', color: '#f4f4f6' }}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chain Overview */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                <div
                  className="text-[11px] font-bold uppercase tracking-wider px-1 mb-1"
                  style={{ color: 'var(--text-muted, #5e5e6c)' }}
                >
                  Connected Habits ({chainNodes.filter(n => n.prerequisites.length > 0 || n.dependents.length > 0 || n.antiChains.length > 0).length})
                </div>

                {chainNodes.filter(n =>
                  n.prerequisites.length > 0 || n.dependents.length > 0 || n.antiChains.length > 0
                ).map(node => {
                  const habit = activeHabits.find(h => h.id === node.habitId);
                  if (!habit) return null;
                  const isSelected = selectedHabitId === node.habitId;

                  return (
                    <motion.div
                      key={node.habitId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={clsx(
                        'p-2.5 rounded-xl text-xs transition-all cursor-pointer border',
                        isSelected ? 'shadow-md' : 'hover:bg-white/[0.04]'
                      )}
                      style={{
                        backgroundColor: isSelected ? 'var(--bg-surface-card, #17171a)' : 'transparent',
                        borderColor: isSelected ? 'var(--accent-primary, #6366f1)' : 'var(--border-subtle, rgba(255,255,255,0.065))',
                      }}
                      onClick={() => { setSelectedHabitId(node.habitId); setError(''); }}
                    >
                      <div className="flex items-center gap-2.5">
                        <HabitIconView iconId={habit.emoji} color={habit.color} size={16} />
                        <span className="font-semibold truncate" style={{ color: 'var(--text-primary, #f4f4f6)' }}>
                          {habit.name}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {node.prerequisites.length > 0 && (
                          <span className="px-2 py-0.5 bg-purple-500/15 border border-purple-500/25 text-purple-300 rounded-md text-[10px] font-medium">
                            ↳ {node.prerequisites.length} prereq
                          </span>
                        )}
                        {node.dependents.length > 0 && (
                          <span className="px-2 py-0.5 bg-blue-500/15 border border-blue-500/25 text-blue-300 rounded-md text-[10px] font-medium">
                            {node.dependents.length} dependent
                          </span>
                        )}
                        {node.antiChains.length > 0 && (
                          <span className="px-2 py-0.5 bg-orange-500/15 border border-orange-500/25 text-orange-300 rounded-md text-[10px] font-medium">
                            ≠ {node.antiChains.length} anti
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}

                {chainNodes.every(n => n.prerequisites.length === 0 && n.dependents.length === 0 && n.antiChains.length === 0) && (
                  <div className="text-center py-10 px-3">
                    <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center bg-white/[0.03] border border-white/5">
                      <GitBranch className="w-6 h-6 text-zinc-500" />
                    </div>
                    <p className="text-sm font-semibold text-zinc-300">No chains yet</p>
                    <p className="text-xs text-zinc-500 mt-1">Select a habit above to set up dependencies</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Dependency Editor */}
            <div
              className="flex-1 flex flex-col overflow-y-auto"
              style={{ backgroundColor: 'var(--bg-surface-elevated, #131316)' }}
            >
              {selectedHabit ? (
                <>
                  {/* Selected Habit Header */}
                  <div
                    className="p-4 sm:p-5 border-b flex-shrink-0"
                    style={{
                      borderColor: 'var(--border-subtle, rgba(255,255,255,0.08))',
                      backgroundColor: 'var(--bg-surface-card, #17171a)',
                    }}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner flex-shrink-0"
                        style={{
                          backgroundColor: selectedHabit.color ? `${selectedHabit.color}15` : 'rgba(255,255,255,0.05)',
                          borderColor: selectedHabit.color ? `${selectedHabit.color}35` : 'var(--border-subtle, rgba(255,255,255,0.08))',
                        }}
                      >
                        <HabitIconView iconId={selectedHabit.emoji} color={selectedHabit.color} size={22} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-base tracking-tight truncate" style={{ color: 'var(--text-primary, #f4f4f6)' }}>
                          {selectedHabit.name}
                        </h3>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary, #9898a4)' }}>
                          {prerequisites.length} prerequisite{prerequisites.length !== 1 ? 's' : ''} • {dependents.length} dependent{dependents.length !== 1 ? 's' : ''} • {antiChains.length} anti-chain{antiChains.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Prerequisites */}
                  <div className="p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-400">
                        <GitBranch className="w-4 h-4" />
                        Prerequisites (must complete first)
                      </h4>
                    </div>

                    {prerequisites.length > 0 ? (
                      <div className="space-y-2">
                        {prerequisites.map(dep => {
                          const prereqHabit = activeHabits.find(h => h.id === dep.depends_on_id);
                          return (
                            <motion.div
                              key={dep.depends_on_id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center justify-between p-3 rounded-xl border"
                              style={{
                                backgroundColor: 'rgba(168, 85, 247, 0.08)',
                                borderColor: 'rgba(168, 85, 247, 0.2)',
                              }}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/20 border border-purple-500/30 flex-shrink-0">
                                  <HabitIconView iconId={prereqHabit?.emoji} color={prereqHabit?.color} size={16} />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary, #f4f4f6)' }}>
                                    {prereqHabit?.name || 'Unknown'}
                                  </p>
                                  <p className="text-[11px] text-purple-300/80">
                                    Must be finished before checking in {selectedHabit.name}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveDependency(selectedHabitId, dep.depends_on_id)}
                                className="p-2 hover:bg-rose-500/15 rounded-lg text-rose-400 transition-colors flex-shrink-0"
                                title="Remove prerequisite"
                                aria-label="Remove prerequisite"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </motion.div>
                          );
                        })}
                      </div>
                    ) : (
                      <div
                        className="text-xs text-center py-4 rounded-xl border border-dashed"
                        style={{
                          borderColor: 'var(--border-subtle, rgba(255,255,255,0.08))',
                          color: 'var(--text-muted, #5e5e6c)',
                        }}
                      >
                        No prerequisites set for this habit
                      </div>
                    )}

                    {/* Add Dependency Controls */}
                    <div
                      className="pt-4 border-t space-y-3"
                      style={{ borderColor: 'var(--border-subtle, rgba(255,255,255,0.08))' }}
                    >
                      <div className="flex items-center justify-between">
                        <label
                          className="text-xs font-bold uppercase tracking-wider"
                          style={{ color: 'var(--text-muted, #5e5e6c)' }}
                        >
                          Add Connection
                        </label>
                        <div className="flex gap-1 p-0.5 rounded-lg border" style={{ backgroundColor: 'var(--bg-surface-subtle, #1c1c20)', borderColor: 'var(--border-subtle, rgba(255,255,255,0.08))' }}>
                          <button
                            type="button"
                            onClick={() => setDependencyType('prerequisite')}
                            className={clsx(
                              'px-3 py-1 text-xs font-semibold rounded-md transition-all',
                              dependencyType === 'prerequisite'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'text-zinc-400 hover:text-white'
                            )}
                          >
                            Prerequisite
                          </button>
                          <button
                            type="button"
                            onClick={() => setDependencyType('anti')}
                            className={clsx(
                              'px-3 py-1 text-xs font-semibold rounded-md transition-all',
                              dependencyType === 'anti'
                                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                : 'text-zinc-400 hover:text-white'
                            )}
                          >
                            Anti-chain
                          </button>
                        </div>
                      </div>

                      {dependencyType === 'prerequisite' ? (
                        <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                          {availableForPrerequisite.map(h => (
                            <button
                              key={h.id}
                              onClick={() => {
                                const validation = validateNewDependency(selectedHabitId, h.id, 'prerequisite', habitDependencies, activeHabits);
                                if (validation.valid) {
                                  addDependency(selectedHabitId, h.id, 'prerequisite');
                                  setError('');
                                } else {
                                  setError(validation.error || 'Invalid dependency');
                                }
                              }}
                              className="w-full text-left p-2.5 rounded-xl transition-colors flex items-center justify-between border hover:border-purple-500/40"
                              style={{
                                backgroundColor: 'var(--bg-surface-card, #17171a)',
                                borderColor: 'var(--border-subtle, rgba(255,255,255,0.065))',
                              }}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <HabitIconView iconId={h.emoji} color={h.color} size={16} />
                                <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary, #f4f4f6)' }}>
                                  {h.name}
                                </span>
                              </div>
                              <span className="text-[11px] font-medium text-purple-400 flex items-center gap-1">
                                + Add Prereq
                              </span>
                            </button>
                          ))}
                          {availableForPrerequisite.length === 0 && (
                            <p className="text-xs text-center py-3" style={{ color: 'var(--text-muted, #5e5e6c)' }}>
                              All available habits are already connected
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="max-h-44 overflow-y-auto space-y-1.5 pr-1">
                          {availableForAnti.map(h => (
                            <button
                              key={h.id}
                              onClick={() => {
                                const validation = validateNewDependency(selectedHabitId, h.id, 'anti', habitDependencies, activeHabits);
                                if (validation.valid) {
                                  addDependency(selectedHabitId, h.id, 'anti');
                                  setError('');
                                } else {
                                  setError(validation.error || 'Invalid dependency');
                                }
                              }}
                              className="w-full text-left p-2.5 rounded-xl transition-colors flex items-center justify-between border hover:border-orange-500/40"
                              style={{
                                backgroundColor: 'var(--bg-surface-card, #17171a)',
                                borderColor: 'var(--border-subtle, rgba(255,255,255,0.065))',
                              }}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <HabitIconView iconId={h.emoji} color={h.color} size={16} />
                                <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary, #f4f4f6)' }}>
                                  {h.name}
                                </span>
                              </div>
                              <span className="text-[11px] font-medium text-orange-400 flex items-center gap-1">
                                + Add Anti-Chain
                              </span>
                            </button>
                          ))}
                          {availableForAnti.length === 0 && (
                            <p className="text-xs text-center py-3" style={{ color: 'var(--text-muted, #5e5e6c)' }}>
                              All available habits are already connected
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dependents (read-only) */}
                  {dependents.length > 0 && (
                    <div className="px-4 sm:px-5 pb-4">
                      <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-400 mb-2">
                        <GitBranch className="w-4 h-4" />
                        Dependent Habits (auto-move when rescheduled)
                      </h4>
                      <div className="space-y-1.5">
                        {dependents.map(dep => {
                          const depHabit = activeHabits.find(h => h.id === dep.habit_id);
                          return (
                            <div
                              key={dep.habit_id}
                              className="flex items-center gap-2.5 p-2.5 rounded-xl text-xs border"
                              style={{
                                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                                borderColor: 'rgba(59, 130, 246, 0.2)',
                              }}
                            >
                              <HabitIconView iconId={depHabit?.emoji} color={depHabit?.color} size={16} />
                              <span className="font-semibold truncate" style={{ color: 'var(--text-primary, #f4f4f6)' }}>
                                {depHabit?.name || 'Unknown'}
                              </span>
                              <span className="ml-auto text-[11px] text-blue-300">
                                Moves in lockstep with {selectedHabit.name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Anti-chains */}
                  {antiChains.length > 0 && (
                    <div className="px-4 sm:px-5 pb-4">
                      <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-orange-400 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        Anti-Chains (mutually exclusive on same day)
                      </h4>
                      <div className="space-y-1.5">
                        {antiChains.map(dep => {
                          const antiHabit = activeHabits.find(h => h.id === dep.depends_on_id);
                          return (
                            <motion.div
                              key={dep.depends_on_id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center justify-between p-3 rounded-xl border"
                              style={{
                                backgroundColor: 'rgba(249, 115, 22, 0.08)',
                                borderColor: 'rgba(249, 115, 22, 0.2)',
                              }}
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-500/20 border border-orange-500/30 flex-shrink-0">
                                  <HabitIconView iconId={antiHabit?.emoji} color={antiHabit?.color} size={16} />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-primary, #f4f4f6)' }}>
                                    {antiHabit?.name || 'Unknown'}
                                  </p>
                                  <p className="text-[11px] text-orange-300/80">
                                    Cannot complete both on the same date
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveDependency(selectedHabitId, dep.depends_on_id)}
                                className="p-2 hover:bg-rose-500/15 rounded-lg text-rose-400 transition-colors flex-shrink-0"
                                title="Remove anti-chain"
                                aria-label="Remove anti-chain"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div
                    className="p-4 sm:p-5 mt-auto border-t"
                    style={{ borderColor: 'var(--border-subtle, rgba(255,255,255,0.08))' }}
                  >
                    <button
                      onClick={handleRemoveAll}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold tracking-wide border transition-all flex items-center justify-center gap-2"
                      style={{
                        backgroundColor: 'rgba(244, 63, 94, 0.08)',
                        borderColor: 'rgba(244, 63, 94, 0.2)',
                        color: '#fb7185',
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove All Dependencies for {selectedHabit.name}
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center p-8 text-center">
                  <div>
                    <div
                      className="w-16 h-16 rounded-3xl mx-auto mb-4 flex items-center justify-center border"
                      style={{
                        backgroundColor: 'var(--bg-surface-subtle, #1c1c20)',
                        borderColor: 'var(--border-subtle, rgba(255,255,255,0.08))',
                      }}
                    >
                      <GitBranch className="w-8 h-8 text-purple-400" />
                    </div>
                    <p className="text-base font-bold" style={{ color: 'var(--text-primary, #f4f4f6)' }}>
                      Select a habit
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-secondary, #9898a4)' }}>
                      Pick a habit on the left to configure its prerequisites and anti-chains
                    </p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mx-4 my-2 p-3 rounded-xl text-xs font-medium border flex items-center gap-2"
                  style={{
                    backgroundColor: 'rgba(244, 63, 94, 0.15)',
                    borderColor: 'rgba(244, 63, 94, 0.3)',
                    color: '#fecdd3',
                  }}
                >
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{error}</span>
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
