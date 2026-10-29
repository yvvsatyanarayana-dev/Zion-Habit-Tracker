import React, { useState } from 'react';
import { useHabitStore } from '../../store/useHabitStore';
import type { RoutineStack, RoutineStep } from '../../lib/types';
import { X, Plus, Trash2, Play, Edit3, Check, Layers, Clock } from 'lucide-react';

const RoutineManagerModalContent: React.FC = () => {
  const setOpen = useHabitStore((s) => s.setRoutineManagerOpen);
  const routines = useHabitStore((s) => s.routines || []);
  const habits = useHabitStore((s) => (s.habits || []).filter((h) => !h.archived));
  const saveRoutine = useHabitStore((s) => s.saveRoutine);
  const deleteRoutine = useHabitStore((s) => s.deleteRoutine);
  const startRoutineRunner = useHabitStore((s) => s.startRoutineRunner);

  const [editingRoutine, setEditingRoutine] = useState<RoutineStack | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [emoji, setEmoji] = useState('⚡');
  const [color, setColor] = useState('#3b82f6');
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening' | 'anytime'>('morning');
  const [steps, setSteps] = useState<RoutineStep[]>([]);

  const handleOpenEdit = (routine?: RoutineStack) => {
    if (routine) {
      setEditingRoutine(routine);
      setTitle(routine.title);
      setDescription(routine.description || '');
      setEmoji(routine.emoji || '⚡');
      setColor(routine.color || '#3b82f6');
      setTimeOfDay(routine.time_of_day || 'morning');
      setSteps([...routine.steps]);
    } else {
      setEditingRoutine({
        id: `routine-${Date.now()}`,
        title: '',
        description: '',
        emoji: '⚡',
        color: '#3b82f6',
        time_of_day: 'morning',
        steps: [],
        created_at: new Date().toISOString(),
      });
      setTitle('');
      setDescription('');
      setEmoji('⚡');
      setColor('#3b82f6');
      setTimeOfDay('morning');
      setSteps([
        { id: `step-${Date.now()}-1`, habit_id: '', duration_minutes: 5, notes: 'First action' },
      ]);
    }
  };

  const handleAddStep = () => {
    setSteps([
      ...steps,
      {
        id: `step-${Date.now()}`,
        habit_id: '',
        duration_minutes: 5,
        notes: '',
      },
    ]);
  };

  const handleRemoveStep = (idx: number) => {
    setSteps(steps.filter((_, i) => i !== idx));
  };

  const handleStepChange = (idx: number, patch: Partial<RoutineStep>) => {
    const updated = [...steps];
    updated[idx] = { ...updated[idx], ...patch };
    setSteps(updated);
  };

  const handleSaveRoutine = async () => {
    if (!title.trim()) return;
    await saveRoutine({
      id: editingRoutine?.id,
      title: title.trim(),
      description: description.trim(),
      emoji,
      color,
      time_of_day: timeOfDay,
      steps,
    });
    setEditingRoutine(null);
  };

  const handleStartFlow = (routine: RoutineStack) => {
    setOpen(false);
    startRoutineRunner(routine);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{
          backgroundColor: 'var(--surface-primary, #18181b)',
          borderColor: 'var(--border-subtle, rgba(255,255,255,0.1))',
          color: 'var(--text-primary, #ffffff)',
        }}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle, rgba(255,255,255,0.1))' }}>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Layers size={22} />
            </span>
            <div>
              <h2 className="text-lg font-bold tracking-tight">Routine Stacks & Flows</h2>
              <p className="text-xs" style={{ color: 'var(--text-muted, #a1a1aa)' }}>
                Chain habits together into seamless morning and evening rituals
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-2 rounded-full hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-5">
          {editingRoutine ? (
            /* Editing form */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground" style={{ color: 'var(--text-secondary, #d4d4d8)' }}>
                  {editingRoutine.title ? 'Edit Routine Stack' : 'Create New Routine'}
                </h3>
                <button
                  onClick={() => setEditingRoutine(null)}
                  className="text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>

              {/* Title & Emoji */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted, #a1a1aa)' }}>
                    Emoji
                  </label>
                  <input
                    type="text"
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    maxLength={3}
                    className="w-full text-center text-xl py-2 rounded-xl border bg-white/5 text-white outline-none focus:border-blue-500"
                    style={{ borderColor: 'var(--border-subtle, rgba(255,255,255,0.1))' }}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted, #a1a1aa)' }}>
                    Routine Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Morning Ignition Flow"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-white/5 text-white outline-none focus:border-blue-500 text-sm"
                    style={{ borderColor: 'var(--border-subtle, rgba(255,255,255,0.1))' }}
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted, #a1a1aa)' }}>
                  Short Purpose / Mantra
                </label>
                <input
                  type="text"
                  placeholder="e.g. Prime mind, body, and energy for high focus"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border bg-white/5 text-white outline-none focus:border-blue-500 text-sm"
                  style={{ borderColor: 'var(--border-subtle, rgba(255,255,255,0.1))' }}
                />
              </div>

              {/* Time of Day */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted, #a1a1aa)' }}>
                  Time of Day
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['morning', 'afternoon', 'evening', 'anytime'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTimeOfDay(t)}
                      className={`py-2 px-1 text-center capitalize rounded-xl text-xs font-semibold border transition-all ${
                        timeOfDay === t
                          ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                          : 'bg-white/5 border-white/5 text-zinc-400 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Steps List */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground" style={{ color: 'var(--text-muted, #a1a1aa)' }}>
                    Routine Steps ({steps.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Step
                  </button>
                </div>

                <div className="space-y-2.5">
                  {steps.map((st, idx) => (
                    <div
                      key={st.id || idx}
                      className="p-3 rounded-2xl border bg-white/[0.02] flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                      style={{ borderColor: 'var(--border-subtle, rgba(255,255,255,0.1))' }}
                    >
                      <span className="text-xs font-bold text-zinc-500 px-1 shrink-0">#{idx + 1}</span>

                      {/* Notes / Action */}
                      <input
                        type="text"
                        placeholder="Action or cue..."
                        value={st.notes || ''}
                        onChange={(e) => handleStepChange(idx, { notes: e.target.value })}
                        className="flex-1 px-3 py-1.5 rounded-xl border bg-white/5 text-white text-xs outline-none"
                        style={{ borderColor: 'var(--border-subtle, rgba(255,255,255,0.1))' }}
                      />

                      {/* Link to Habit */}
                      <select
                        value={st.habit_id || ''}
                        onChange={(e) => handleStepChange(idx, { habit_id: e.target.value })}
                        className="px-2.5 py-1.5 rounded-xl border bg-zinc-900 text-white text-xs outline-none max-w-full sm:max-w-[180px]"
                        style={{ borderColor: 'var(--border-subtle, rgba(255,255,255,0.1))' }}
                      >
                        <option value="">No linked habit</option>
                        {habits.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.emoji} {h.name}
                          </option>
                        ))}
                      </select>

                      {/* Duration */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Clock size={14} className="text-zinc-400" />
                        <input
                          type="number"
                          min={0}
                          max={120}
                          value={st.duration_minutes}
                          onChange={(e) => handleStepChange(idx, { duration_minutes: Number(e.target.value) || 0 })}
                          className="w-14 px-2 py-1.5 rounded-xl border bg-white/5 text-center text-xs text-white outline-none"
                          style={{ borderColor: 'var(--border-subtle, rgba(255,255,255,0.1))' }}
                        />
                        <span className="text-xs text-zinc-400">min</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveStep(idx)}
                        className="p-2 text-zinc-500 hover:text-red-400 self-end sm:self-center"
                        title="Remove step"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRoutine(null)}
                  className="px-4 py-2.5 rounded-xl border text-xs font-semibold hover:bg-white/5"
                  style={{ borderColor: 'var(--border-subtle, rgba(255,255,255,0.1))' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveRoutine}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Check size={16} /> Save Routine
                </button>
              </div>
            </div>
          ) : (
            /* Routine List */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs" style={{ color: 'var(--text-muted, #a1a1aa)' }}>
                  Launch a full-screen guided flow with countdown timers and sound cues:
                </p>
                <button
                  onClick={() => handleOpenEdit()}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  <Plus size={15} /> New Routine
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3.5">
                {(routines || []).map((routine) => {
                  const totalMins = (routine.steps || []).reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
                  return (
                    <div
                      key={routine.id}
                      className="p-4 rounded-2xl border bg-white/[0.02] hover:border-blue-500/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      style={{ borderColor: 'var(--border-subtle, rgba(255,255,255,0.1))' }}
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <span className="text-3xl p-2.5 rounded-2xl bg-white/5 border border-white/10 shrink-0">
                          {routine.emoji || '⚡'}
                        </span>
                        <div className="min-w-0">
                          <h4 className="text-base font-bold truncate tracking-tight">{routine.title}</h4>
                          <p className="text-xs truncate max-w-md" style={{ color: 'var(--text-secondary, #d4d4d8)' }}>
                            {routine.description || `${(routine.steps || []).length} sequential steps`}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-400">
                            <span className="capitalize px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px]">
                              {routine.time_of_day}
                            </span>
                            <span>{(routine.steps || []).length} steps</span>
                            {totalMins > 0 && <span>~{totalMins} mins</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          onClick={() => handleOpenEdit(routine)}
                          className="p-2 rounded-xl border text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                          style={{ borderColor: 'var(--border-subtle, rgba(255,255,255,0.1))' }}
                          title="Edit"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => deleteRoutine(routine.id)}
                          className="p-2 rounded-xl border text-zinc-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                          style={{ borderColor: 'var(--border-subtle, rgba(255,255,255,0.1))' }}
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                        <button
                          onClick={() => handleStartFlow(routine)}
                          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-md active:scale-95 transition-all"
                        >
                          <Play size={14} fill="white" />
                          Start Flow
                        </button>
                      </div>
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

export const RoutineManagerModal: React.FC = () => {
  const isOpen = useHabitStore((s) => s.routineManagerOpen);
  if (!isOpen) return null;

  return <RoutineManagerModalContent />;
};
