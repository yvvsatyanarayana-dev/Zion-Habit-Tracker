import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Trash2, GitBranch, GitBranchPlus, ArrowUpDown, AlertCircle, HelpCircle } from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import type { Habit, HabitDependency } from '../../lib/types';
import { validateNewDependency, getChainVisualization, ChainNode } from '../../lib/habitChain';
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

  const handleAddDependency = async () => {
    if (!selectedHabitId) {
      setError('Please select a habit first');
      return;
    }

    // This would need a target habit selector - simplified for now
    setError('Select a target habit from the list below');
  };

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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-background rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-xl">
                <GitBranch className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Habit Chains</h2>
                <p className="text-sm text-muted-foreground">Manage prerequisites & anti-chains</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
                aria-label="Toggle help"
              >
                <HelpCircle className="w-5 h-5 text-muted-foreground" />
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-muted-foreground" />
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
                className="bg-purple-500/10 border-b border-purple-500/20 p-4 text-sm"
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex items-center gap-2 text-purple-300">
                    <GitBranch className="w-4 h-4" />
                    <span><strong>Prerequisite:</strong> Must complete first before this habit</span>
                  </div>
                  <div className="flex items-center gap-2 text-orange-300">
                    <AlertCircle className="w-4 h-4" />
                    <span><strong>Anti-chain:</strong> Cannot complete both on same day</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-300">
                    <ArrowUpDown className="w-4 h-4" />
                    <span><strong>Smart Reschedule:</strong> Drag habit → dependents move automatically</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-300">
                    <GitBranchPlus className="w-4 h-4" />
                    <span><strong>Visual Chains:</strong> See all connections at a glance</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex-1 overflow-hidden flex">
            {/* Left Panel - Habit List */}
            <div className="w-64 border-r border-border flex flex-col">
              <div className="p-3 border-b border-border">
                <label className="block text-xs font-medium text-muted-foreground mb-2">Select Habit</label>
                <select
                  value={selectedHabitId}
                  onChange={e => { setSelectedHabitId(e.target.value); setError(''); }}
                  className="w-full bg-input border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Choose a habit...</option>
                  {activeHabits.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.emoji} {h.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Chain Overview */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {chainNodes.filter(n =>
                  n.prerequisites.length > 0 || n.dependents.length > 0 || n.antiChains.length > 0
                ).map(node => {
                  const habit = activeHabits.find(h => h.id === node.habitId);
                  if (!habit) return null;

                  return (
                    <motion.div
                      key={node.habitId}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={clsx(
                        'p-2 rounded-lg text-xs transition-colors cursor-pointer',
                        selectedHabitId === node.habitId
                          ? 'bg-primary/20 border border-primary/30'
                          : 'hover:bg-accent'
                      )}
                      onClick={() => { setSelectedHabitId(node.habitId); setError(''); }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{habit.emoji}</span>
                        <span className="font-medium text-foreground truncate">{habit.name}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {node.prerequisites.length > 0 && (
                          <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs">
                            ↳ {node.prerequisites.length} prereq
                          </span>
                        )}
                        {node.dependents.length > 0 && (
                          <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded text-xs">
                            {node.dependents.length} →
                          </span>
                        )}
                        {node.antiChains.length > 0 && (
                          <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-300 rounded text-xs">
                            ≠ {node.antiChains.length}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                {chainNodes.every(n => n.prerequisites.length === 0 && n.dependents.length === 0 && n.antiChains.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No chains yet</p>
                    <p className="text-xs mt-1">Select a habit to create connections</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Dependency Editor */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {selectedHabit ? (
                <>
                  {/* Selected Habit Header */}
                  <div className="p-4 border-b border-border bg-muted/30">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{selectedHabit.emoji}</span>
                      <div>
                        <h3 className="font-semibold text-foreground">{selectedHabit.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {prerequisites.length} prerequisite{prerequisites.length !== 1 ? 's' : ''},
                          {dependents.length} dependent{dependents.length !== 1 ? 's' : ''},
                          {antiChains.length} anti-chain{antiChains.length !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Prerequisites */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="flex items-center gap-2 text-sm font-medium text-purple-300">
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
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center justify-between p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{prereqHabit?.emoji || '❓'}</span>
                                <div>
                                  <p className="font-medium text-foreground">{prereqHabit?.name || 'Unknown'}</p>
                                  <p className="text-xs text-muted-foreground">Must complete before {selectedHabit.name}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveDependency(selectedHabitId, dep.depends_on_id)}
                                className="p-1.5 hover:bg-purple-500/20 rounded text-purple-400 transition-colors"
                                aria-label="Remove prerequisite"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </motion.div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No prerequisites set</p>
                    )}

                    {/* Add Prerequisite */}
                    <div className="pt-2 border-t border-border/50">
                      <label className="block text-xs font-medium text-muted-foreground mb-2">
                        Add Prerequisite
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={dependencyType}
                          onChange={e => setDependencyType(e.target.value as 'prerequisite' | 'anti')}
                          className="flex-1 bg-input border-border rounded-lg px-3 py-2 text-sm"
                        >
                          <option value="prerequisite">🔗 Prerequisite</option>
                          <option value="anti">⚠️ Anti-chain</option>
                        </select>
                      </div>

                      {dependencyType === 'prerequisite' ? (
                        <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
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
                              className="w-full text-left p-2 hover:bg-accent rounded-lg transition-colors flex items-center gap-2"
                            >
                              <span className="text-lg">{h.emoji}</span>
                              <span className="text-sm text-foreground">{h.name}</span>
                            </button>
                          ))}
                          {availableForPrerequisite.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-2">All habits already connected</p>
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
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
                              className="w-full text-left p-2 hover:bg-accent rounded-lg transition-colors flex items-center gap-2"
                            >
                              <span className="text-lg">{h.emoji}</span>
                              <span className="text-sm text-foreground">{h.name}</span>
                            </button>
                          ))}
                          {availableForAnti.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-2">All habits already connected</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Dependents (read-only) */}
                  {dependents.length > 0 && (
                    <div className="px-4 pb-4">
                      <h4 className="flex items-center gap-2 text-sm font-medium text-blue-300 mb-2">
                        <GitBranch className="w-4 h-4" />
                        Dependent Habits (auto-move when rescheduled)
                      </h4>
                      <div className="space-y-1">
                        {dependents.map(dep => {
                          const depHabit = activeHabits.find(h => h.id === dep.habit_id);
                          return (
                            <div key={dep.habit_id} className="flex items-center gap-2 p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm">
                              <span className="text-lg">{depHabit?.emoji || '❓'}</span>
                              <span className="text-foreground">{depHabit?.name || 'Unknown'}</span>
                              <span className="ml-auto text-xs text-blue-400">moves with {selectedHabit.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Anti-chains */}
                  {antiChains.length > 0 && (
                    <div className="px-4 pb-4">
                      <h4 className="flex items-center gap-2 text-sm font-medium text-orange-300 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        Anti-Chains (can't do both same day)
                      </h4>
                      <div className="space-y-1">
                        {antiChains.map(dep => {
                          const antiHabit = activeHabits.find(h => h.id === dep.depends_on_id);
                          return (
                            <motion.div
                              key={dep.depends_on_id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="flex items-center justify-between p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-xl">{antiHabit?.emoji || '❓'}</span>
                                <div>
                                  <p className="font-medium text-foreground">{antiHabit?.name || 'Unknown'}</p>
                                  <p className="text-xs text-muted-foreground">Cannot complete both on same day</p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveDependency(selectedHabitId, dep.depends_on_id)}
                                className="p-1.5 hover:bg-orange-500/20 rounded text-orange-400 transition-colors"
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
                  <div className="px-4 pb-4 pt-2 border-t border-border/50">
                    <button
                      onClick={handleRemoveAll}
                      className="w-full py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4 inline mr-1" />
                      Remove All Dependencies
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <GitBranch className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="text-lg">Select a habit</p>
                    <p className="text-sm mt-1">to manage its chains</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-2 rounded-lg text-sm z-10"
                >
                  {error}
                </motion.div>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};