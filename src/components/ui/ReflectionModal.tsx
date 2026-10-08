import React, { useState, useEffect } from 'react';
import { useHabitStore } from '../../store/useHabitStore';
import { format } from 'date-fns';
import { Sparkles, X, Check, Smile, Zap, Meh, Moon, StickyNote, Hash } from 'lucide-react';
import type { CheckinMood } from '../../lib/types';

const MOODS: { id: CheckinMood; label: string; icon: any; color: string; bg: string }[] = [
  { id: 'energized', label: 'Energized', icon: Zap, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' },
  { id: 'good', label: 'Good & Focused', icon: Smile, color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' },
  { id: 'neutral', label: 'Neutral', icon: Meh, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.12)' },
  { id: 'tired', label: 'Tired / Low', icon: Moon, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.12)' },
];

export const ReflectionModal: React.FC = () => {
  const reflectionModal = useHabitStore((s) => s.reflectionModal);
  const closeReflectionModal = useHabitStore((s) => s.closeReflectionModal);
  const habits = useHabitStore((s) => s.habits);
  const checkins = useHabitStore((s) => s.checkins);
  const updateCheckinDetails = useHabitStore((s) => s.updateCheckinDetails);
  const updateNumericValue = useHabitStore((s) => s.updateNumericValue);

  const [note, setNote] = useState('');
  const [selectedMood, setSelectedMood] = useState<CheckinMood | undefined>(undefined);
  const [numericVal, setNumericVal] = useState<number>(0);

  const habit = habits.find((h) => h.id === reflectionModal?.habitId);
  const checkinKey = reflectionModal ? `${reflectionModal.habitId}_${reflectionModal.dateStr}` : '';
  const currentCheckin = reflectionModal ? checkins[checkinKey] : undefined;

  useEffect(() => {
    if (reflectionModal) {
      setNote(currentCheckin?.note || '');
      setSelectedMood(currentCheckin?.mood);
      const targetVal = habit?.target_value ?? 1;
      setNumericVal(currentCheckin?.value ?? (currentCheckin?.completed ? targetVal : 0));
    }
  }, [reflectionModal, currentCheckin, habit]);

  if (!reflectionModal?.isOpen || !habit) return null;

  const dateObj = new Date(reflectionModal.dateStr + 'T12:00:00');
  const dateFormatted = format(dateObj, 'EEEE, MMMM d, yyyy');

  const handleSave = async () => {
    if (!reflectionModal) return;

    if (habit.type === 'numeric') {
      await updateNumericValue(habit.id, reflectionModal.dateStr, numericVal, false);
    }

    await updateCheckinDetails(habit.id, reflectionModal.dateStr, {
      note: note.trim(),
      mood: selectedMood,
    });

    closeReflectionModal();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
        className="relative w-full max-w-md rounded-xl border shadow-2xl overflow-hidden select-none animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-4 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              style={{ backgroundColor: `${habit.color}20`, color: habit.color }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold border border-[var(--border-subtle)]"
            >
              {habit.emoji || habit.name.charAt(0).toUpperCase()}
            </span>
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-1.5">
                <span>{habit.name}</span>
                <span className="text-[11px] font-normal text-[var(--text-muted)]">· Daily Reflection</span>
              </h2>
              <p className="text-[11px] text-[var(--text-secondary)] font-mono">{dateFormatted}</p>
            </div>
          </div>
          <button
            onClick={closeReflectionModal}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-elevated)] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Numeric Quantity Stepper if numeric habit */}
          {habit.type === 'numeric' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
                <Hash size={13} className="text-[var(--accent-primary)]" />
                <span>Quantity Progress ({habit.unit || 'units'})</span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setNumericVal((v) => Math.max(0, v - (habit.target_value && habit.target_value > 20 ? 10 : 1)))}
                  className="w-9 h-9 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold text-sm hover:border-[var(--border-medium)] transition-colors"
                >
                  -
                </button>
                <div className="flex-1 relative">
                  <input
                    type="number"
                    min="0"
                    value={numericVal}
                    onChange={(e) => setNumericVal(Math.max(0, parseFloat(e.target.value) || 0))}
                    style={{
                      backgroundColor: 'var(--bg-canvas)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                    className="w-full h-9 px-3 rounded-lg border text-center font-bold text-sm outline-none focus:border-[var(--accent-primary)] font-num"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)] font-mono">
                    / {habit.target_value} {habit.unit}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setNumericVal((v) => v + (habit.target_value && habit.target_value > 20 ? 10 : 1))}
                  className="w-9 h-9 rounded-lg bg-[var(--bg-surface-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] font-bold text-sm hover:border-[var(--border-medium)] transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          )}

          {/* Mood Rating Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-400" />
              <span>How did this routine feel today?</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {MOODS.map((m) => {
                const Icon = m.icon;
                const isSelected = selectedMood === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSelectedMood(isSelected ? undefined : m.id)}
                    style={{
                      backgroundColor: isSelected ? m.bg : 'var(--bg-surface-elevated)',
                      borderColor: isSelected ? m.color : 'var(--border-subtle)',
                      color: isSelected ? m.color : 'var(--text-secondary)',
                    }}
                    className="flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium transition-all cursor-pointer hover:border-[var(--border-medium)]"
                  >
                    <Icon size={14} style={{ color: m.color }} />
                    <span className="font-semibold">{m.label}</span>
                    {isSelected && <Check size={13} className="ml-auto" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Micro-Journal Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-secondary)] flex items-center gap-1.5">
              <StickyNote size={13} className="text-[var(--accent-primary)]" />
              <span>Personal Notes & Reflection</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Record weights, pages read, quick thoughts, or what helped you stay consistent..."
              rows={3}
              style={{
                backgroundColor: 'var(--bg-canvas)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              className="w-full p-3 rounded-lg border text-xs outline-none focus:border-[var(--accent-primary)] transition-colors resize-none placeholder-[var(--text-muted)] leading-relaxed"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[var(--bg-surface-elevated)] border-t border-[var(--border-subtle)] flex items-center justify-between">
          <button
            type="button"
            onClick={closeReflectionModal}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            style={{
              backgroundColor: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
            }}
            className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm hover:opacity-95 cursor-pointer flex items-center gap-1.5"
          >
            <Check size={14} />
            <span>Save Reflection</span>
          </button>
        </div>
      </div>
    </div>
  );
};
