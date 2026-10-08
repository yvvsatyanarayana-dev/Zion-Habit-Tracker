import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Trash2,
  Archive,
  Check,
  Sparkles,
  Minus,
  Plus,
  Zap,
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { HABIT_PALETTE } from '../../lib/constants';
import { HABIT_ICONS, getHabitIcon } from '../../lib/habitIcons';
import type { HabitCategory, HabitType } from '../../lib/types';

const WEEKDAYS = [
  { id: 1, label: 'Mon', short: 'M' },
  { id: 2, label: 'Tue', short: 'T' },
  { id: 3, label: 'Wed', short: 'W' },
  { id: 4, label: 'Thu', short: 'T' },
  { id: 5, label: 'Fri', short: 'F' },
  { id: 6, label: 'Sat', short: 'S' },
  { id: 0, label: 'Sun', short: 'S' },
];

const CATEGORY_OPTIONS: { id: HabitCategory; label: string; icon: string }[] = [
  { id: 'health', label: 'Fitness & Health', icon: 'Activity' },
  { id: 'mind', label: 'Mind & Growth', icon: 'Brain' },
  { id: 'work', label: 'Deep Work & Career', icon: 'Briefcase' },
  { id: 'routine', label: 'Daily Lifestyle', icon: 'Coffee' },
];

const PRESET_SUGGESTIONS: {
  name: string;
  icon: string;
  color: string;
  goal: number;
  type: HabitType;
  targetValue?: number;
  unit?: string;
  category: HabitCategory;
}[] = [
  { name: 'Morning Workout', icon: 'dumbbell', color: '#10b981', goal: 20, type: 'boolean', category: 'health' },
  { name: 'Read 20 Pages', icon: 'book', color: '#6366f1', goal: 25, type: 'numeric', targetValue: 20, unit: 'pages', category: 'mind' },
  { name: 'Drink 2,000ml Water', icon: 'droplets', color: '#06b6d4', goal: 30, type: 'numeric', targetValue: 2000, unit: 'ml', category: 'health' },
  { name: 'Meditate & Breathe', icon: 'sparkles', color: '#8b5cf6', goal: 20, type: 'boolean', category: 'mind' },
  { name: 'Deep Work (60m)', icon: 'laptop', color: '#3b82f6', goal: 20, type: 'numeric', targetValue: 60, unit: 'mins', category: 'work' },
  { name: '10,000 Steps', icon: 'footprints', color: '#f59e0b', goal: 30, type: 'numeric', targetValue: 10000, unit: 'steps', category: 'health' },
];

export const HabitModal: React.FC = () => {
  const habitModalOpen = useHabitStore((s) => s.habitModalOpen);
  const editingHabit = useHabitStore((s) => s.editingHabit);
  const closeHabitModal = useHabitStore((s) => s.closeHabitModal);
  const saveHabit = useHabitStore((s) => s.saveHabit);
  const deleteHabit = useHabitStore((s) => s.deleteHabit);
  const archiveHabit = useHabitStore((s) => s.archiveHabit);
  const habits = useHabitStore((s) => s.habits);

  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('target');
  const [color, setColor] = useState<string>(HABIT_PALETTE[0]);
  const [monthlyGoal, setMonthlyGoal] = useState<number>(30);
  const [scheduleDays, setScheduleDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [habitType, setHabitType] = useState<HabitType>('boolean');
  const [targetValue, setTargetValue] = useState<number>(1);
  const [unit, setUnit] = useState<string>('');
  const [category, setCategory] = useState<HabitCategory>('health');
  const [error, setError] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingHabit) {
      setName(editingHabit.name);
      setSelectedIcon(editingHabit.emoji || 'target');
      setColor(editingHabit.color);
      setMonthlyGoal(editingHabit.monthly_goal);
      setScheduleDays(editingHabit.schedule_days || [0, 1, 2, 3, 4, 5, 6]);
      setHabitType(editingHabit.type || 'boolean');
      setTargetValue(editingHabit.target_value ?? 1);
      setUnit(editingHabit.unit || '');
      setCategory(editingHabit.category || 'health');
    } else {
      const usedColors = new Set(habits.map((h) => h.color));
      const nextColor =
        HABIT_PALETTE.find((c) => !usedColors.has(c)) ||
        HABIT_PALETTE[habits.length % HABIT_PALETTE.length];
      setName('');
      setSelectedIcon('target');
      setColor(nextColor);
      setMonthlyGoal(30);
      setScheduleDays([0, 1, 2, 3, 4, 5, 6]);
      setHabitType('boolean');
      setTargetValue(1);
      setUnit('');
      setCategory('health');
    }
    setError('');

    if (habitModalOpen) {
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [editingHabit, habitModalOpen, habits]);

  // Keyboard shortcut listener (Esc to close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && habitModalOpen) {
        closeHabitModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [habitModalOpen, closeHabitModal]);

  if (!habitModalOpen) return null;

  const handleToggleWeekday = (dayId: number) => {
    if (scheduleDays.includes(dayId)) {
      if (scheduleDays.length === 1) return; // Keep at least one active day
      setScheduleDays(scheduleDays.filter((d) => d !== dayId));
    } else {
      setScheduleDays([...scheduleDays, dayId]);
    }
  };

  const handleSelectAllDays = () => {
    setScheduleDays([0, 1, 2, 3, 4, 5, 6]);
  };

  const handleSelectWeekdaysOnly = () => {
    setScheduleDays([1, 2, 3, 4, 5]);
  };

  const handleSelectWeekendsOnly = () => {
    setScheduleDays([0, 6]);
  };

  // Quick Preset fill
  const handleApplyPreset = (preset: typeof PRESET_SUGGESTIONS[0]) => {
    setName(preset.name);
    setSelectedIcon(preset.icon);
    setColor(preset.color);
    setMonthlyGoal(preset.goal || 30);
    setHabitType(preset.type || 'boolean');
    setTargetValue(preset.targetValue ?? 1);
    setUnit(preset.unit || '');
    setCategory(preset.category || 'health');
    setError('');
    inputRef.current?.focus();
  };

  // One-click instant creation from preset
  const handleQuickAddPreset = async (preset: typeof PRESET_SUGGESTIONS[0]) => {
    if (habits.length >= 25 && !editingHabit) {
      setError('Maximum 25 habits allowed.');
      return;
    }

    await saveHabit({
      name: preset.name,
      emoji: preset.icon,
      color: preset.color,
      monthly_goal: preset.goal || 30,
      schedule_days: [0, 1, 2, 3, 4, 5, 6],
      type: preset.type || 'boolean',
      target_value: preset.targetValue ?? 1,
      unit: preset.unit || '',
      category: preset.category || 'health',
    });

    closeHabitModal();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a habit name.');
      inputRef.current?.focus();
      return;
    }
    if (habits.length >= 25 && !editingHabit) {
      setError('Maximum 25 habits allowed.');
      return;
    }

    await saveHabit({
      id: editingHabit?.id,
      name: name.trim(),
      emoji: selectedIcon,
      color,
      monthly_goal: Number(monthlyGoal) || 30,
      schedule_days: scheduleDays,
      type: habitType,
      target_value: habitType === 'numeric' ? Number(targetValue) || 1 : 1,
      unit: habitType === 'numeric' ? unit.trim() : '',
      category,
    });

    closeHabitModal();
  };

  const handleDelete = async () => {
    if (
      editingHabit &&
      confirm(
        `Are you sure you want to delete "${editingHabit.name}"? This will permanently delete all check-in history.`
      )
    ) {
      await deleteHabit(editingHabit.id);
      closeHabitModal();
    }
  };

  const handleArchive = async () => {
    if (editingHabit) {
      await archiveHabit(editingHabit.id);
      closeHabitModal();
    }
  };

  const CurrentIcon = getHabitIcon(selectedIcon);

  return (
    <div
      onClick={closeHabitModal}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-[10px] animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--shadow-dropdown)',
        }}
        className="border w-full max-w-[560px] rounded-2xl p-5 relative max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Sticky Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--border-subtle)] flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2
                style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}
                className="text-[17px] font-bold"
              >
                {editingHabit ? 'Edit Habit' : 'Create New Habit'}
              </h2>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-[4px] bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] border border-[var(--border-subtle)]">
                ↵ Enter to save
              </span>
            </div>
            <p style={{ color: 'var(--text-secondary)' }} className="text-xs font-normal mt-0.5">
              Set habit target, studio color and weekly schedule
            </p>
          </div>

          <button
            type="button"
            onClick={closeHabitModal}
            style={{ color: 'var(--text-muted)' }}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        {error && (
          <div className="mt-2.5 p-2 bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-semibold rounded-lg flex-shrink-0">
            {error}
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-1 py-3 space-y-3.5 flex flex-col min-h-0">
          {/* Quick Action Presets (One-click add or click to fill) */}
          {!editingHabit && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10.5px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                  <Zap size={11} className="text-amber-400 fill-amber-400" />
                  <span>Quick Action Presets</span>
                </span>
                <span className="text-[10px] text-[var(--text-dim)]">
                  Click to fill · <span className="text-emerald-400 font-semibold">+ 1-Click Add</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_SUGGESTIONS.map((preset) => {
                  const PresetIcon = getHabitIcon(preset.icon);
                  return (
                    <div
                      key={preset.name}
                      className="group inline-flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface-subtle)] hover:border-[var(--border-medium)] transition-all overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className="h-7 px-2.5 flex items-center gap-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                        title={`Click to customize "${preset.name}"`}
                      >
                        <PresetIcon size={12} style={{ color: preset.color }} />
                        <span>{preset.name}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickAddPreset(preset)}
                        className="h-7 px-1.5 border-l border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-white hover:bg-[var(--accent-primary)] transition-colors cursor-pointer"
                        title={`⚡ 1-Click Instant Add "${preset.name}"`}
                      >
                        <Plus size={11} strokeWidth={2.5} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Habit Name Input */}
          <div>
            <label
              style={{ color: 'var(--text-muted)' }}
              className="block text-[11px] font-bold uppercase tracking-wider mb-1"
            >
              Habit Name
            </label>
            <div className="relative flex items-center">
              <div
                style={{ color: color }}
                className="absolute left-3 flex items-center pointer-events-none"
              >
                <CurrentIcon size={16} />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                placeholder="e.g. Morning Workout, Read 20 pages..."
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
                className="w-full pl-9 pr-20 py-2 rounded-lg border text-sm font-medium outline-none transition-colors focus:border-[var(--accent-primary)] placeholder-[var(--text-dim)]"
              />
              {name.trim() && !editingHabit && (
                <span className="absolute right-2 px-1.5 py-0.5 rounded-[4px] bg-[var(--bg-surface-subtle)] text-[10px] font-mono text-[var(--text-muted)] border border-[var(--border-subtle)] pointer-events-none">
                  ↵ Enter
                </span>
              )}
            </div>
          </div>

          {/* Life Category Selector */}
          <div>
            <label
              style={{ color: 'var(--text-muted)' }}
              className="block text-[11px] font-bold uppercase tracking-wider mb-1"
            >
              Life Area / Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {CATEGORY_OPTIONS.map((catOpt) => {
                const isSelected = category === catOpt.id;
                return (
                  <button
                    key={catOpt.id}
                    type="button"
                    onClick={() => setCategory(catOpt.id)}
                    style={{
                      backgroundColor: isSelected ? 'var(--bg-surface-subtle)' : 'var(--bg-surface)',
                      borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-subtle)',
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    }}
                    className={`h-8 px-2 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:border-[var(--border-medium)] ${
                      isSelected ? 'ring-1 ring-[var(--accent-primary)]' : ''
                    }`}
                  >
                    <span>{catOpt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tracking Mode: Checkbox vs Numeric Goal */}
          <div className="p-3 rounded-xl border space-y-2.5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center justify-between">
              <label
                style={{ color: 'var(--text-muted)' }}
                className="text-[11px] font-bold uppercase tracking-wider"
              >
                Tracking Type
              </label>
              <div className="inline-flex rounded-lg border border-[var(--border-subtle)] p-0.5 bg-[var(--bg-surface-subtle)]">
                <button
                  type="button"
                  onClick={() => setHabitType('boolean')}
                  style={{
                    backgroundColor: habitType === 'boolean' ? 'var(--bg-surface-elevated)' : 'transparent',
                    color: habitType === 'boolean' ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                  className="px-2.5 py-1 rounded-[6px] text-xs font-bold transition-all cursor-pointer"
                >
                  Yes / No Checkbox
                </button>
                <button
                  type="button"
                  onClick={() => setHabitType('numeric')}
                  style={{
                    backgroundColor: habitType === 'numeric' ? 'var(--bg-surface-elevated)' : 'transparent',
                    color: habitType === 'numeric' ? 'var(--text-primary)' : 'var(--text-muted)',
                  }}
                  className="px-2.5 py-1 rounded-[6px] text-xs font-bold transition-all cursor-pointer"
                >
                  Numeric Goal (Measurable)
                </button>
              </div>
            </div>

            {habitType === 'numeric' && (
              <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10.5px] font-semibold text-[var(--text-secondary)] block mb-1">
                      Daily Target Amount
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={targetValue}
                      onChange={(e) => setTargetValue(Math.max(1, parseFloat(e.target.value) || 1))}
                      style={{
                        backgroundColor: 'var(--bg-canvas)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                      className="w-full h-8 px-2.5 rounded-lg border text-xs font-bold font-num outline-none focus:border-[var(--accent-primary)]"
                    />
                  </div>
                  <div>
                    <label className="text-[10.5px] font-semibold text-[var(--text-secondary)] block mb-1">
                      Unit (e.g. ml, pages, mins)
                    </label>
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      placeholder="e.g. pages, ml, mins, km"
                      style={{
                        backgroundColor: 'var(--bg-canvas)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                      className="w-full h-8 px-2.5 rounded-lg border text-xs outline-none focus:border-[var(--accent-primary)]"
                    />
                  </div>
                </div>

                {/* Quick Unit Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] text-[var(--text-dim)] font-medium">Quick Units:</span>
                  {['pages', 'ml', 'mins', 'km', 'steps', 'reps'].map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnit(u)}
                      className={`px-2 py-0.5 rounded text-[10.5px] font-mono border transition-colors cursor-pointer ${
                        unit === u
                          ? 'bg-[var(--accent-primary)] text-white border-transparent'
                          : 'bg-[var(--bg-surface-subtle)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)]'
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Lucide Studio Icon Picker */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label
                style={{ color: 'var(--text-muted)' }}
                className="block text-[11px] font-bold uppercase tracking-wider"
              >
                Habit Icon (Lucide Studio)
              </label>
              <span className="text-[10px] text-[var(--text-dim)] font-medium">
                {HABIT_ICONS.find((i) => i.id === selectedIcon)?.label || 'Selected'}
              </span>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
              className="p-1.5 rounded-xl border max-h-[88px] overflow-y-auto grid grid-cols-6 sm:grid-cols-10 gap-1 custom-scrollbar"
            >
              {HABIT_ICONS.map((item) => {
                const isSelected = selectedIcon === item.id;
                const IconComp = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedIcon(item.id)}
                    style={{
                      backgroundColor: isSelected ? `${color}25` : 'transparent',
                      borderColor: isSelected ? color : 'transparent',
                      color: isSelected ? color : 'var(--text-secondary)',
                    }}
                    className="w-7.5 h-7.5 rounded-lg border flex items-center justify-center transition-all hover:bg-[var(--bg-surface-hover)] hover:text-[var(--text-primary)] cursor-pointer"
                    title={item.label}
                  >
                    <IconComp size={14} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Accent (12 Studio Colors) */}
          <div>
            <label
              style={{ color: 'var(--text-muted)' }}
              className="block text-[11px] font-bold uppercase tracking-wider mb-1.5"
            >
              Color Accent (12 Studio Colors)
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              {HABIT_PALETTE.map((c) => {
                const isSelected = color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    style={{
                      backgroundColor: c,
                      boxShadow: isSelected ? `0 0 10px ${c}80` : undefined,
                      outline: isSelected ? `2px solid #ffffff` : 'none',
                      outlineOffset: '2px',
                    }}
                    className="w-6.5 h-6.5 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 cursor-pointer"
                    title={c}
                  >
                    {isSelected && <Check size={13} color="#ffffff" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2-Column Responsive Row: Monthly Goal & Schedule Days */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Monthly Target Goal */}
            <div className="p-2.5 rounded-xl border" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  style={{ color: 'var(--text-muted)' }}
                  className="text-[10.5px] font-bold uppercase tracking-wider"
                >
                  Monthly Target
                </label>
                <span className="text-xs font-bold font-num" style={{ color: color }}>
                  {monthlyGoal}d / mo
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <div
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    borderColor: 'var(--border-subtle)',
                  }}
                  className="flex items-center rounded-[5px] border p-0.5"
                >
                  <button
                    type="button"
                    onClick={() => setMonthlyGoal((g) => Math.max(1, g - 1))}
                    className="w-6 h-6 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[4px] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                    title="Decrease monthly target"
                  >
                    <Minus size={11} strokeWidth={2.4} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={monthlyGoal}
                    onChange={(e) =>
                      setMonthlyGoal(Math.max(1, Math.min(31, Number(e.target.value) || 1)))
                    }
                    className="w-8 text-center bg-transparent text-xs font-bold font-num outline-none text-[var(--text-primary)] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    type="button"
                    onClick={() => setMonthlyGoal((g) => Math.min(31, g + 1))}
                    className="w-6 h-6 flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-[4px] hover:bg-[var(--bg-surface-hover)] transition-colors cursor-pointer"
                    title="Increase monthly target"
                  >
                    <Plus size={11} strokeWidth={2.4} />
                  </button>
                </div>

                {/* Quick Goal Pills */}
                <div className="flex items-center gap-1 flex-1">
                  {[10, 15, 20, 25, 30].map((goalNum) => (
                    <button
                      key={goalNum}
                      type="button"
                      onClick={() => setMonthlyGoal(goalNum)}
                      style={{
                        backgroundColor:
                          monthlyGoal === goalNum ? `${color}25` : 'var(--bg-surface-subtle)',
                        borderColor:
                          monthlyGoal === goalNum ? color : 'var(--border-subtle)',
                        color:
                          monthlyGoal === goalNum ? color : 'var(--text-muted)',
                      }}
                      className="flex-1 py-1 rounded-[5px] border text-[11px] font-semibold font-num transition-colors cursor-pointer hover:border-[var(--border-medium)]"
                    >
                      {goalNum}d
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Schedule Days */}
            <div className="p-2.5 rounded-xl border" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  style={{ color: 'var(--text-muted)' }}
                  className="text-[10.5px] font-bold uppercase tracking-wider"
                >
                  Schedule Days
                </label>
                <div className="flex items-center gap-1.5 text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={handleSelectAllDays}
                    className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] cursor-pointer"
                  >
                    Daily
                  </button>
                  <span className="text-[var(--text-dim)]">•</span>
                  <button
                    type="button"
                    onClick={handleSelectWeekdaysOnly}
                    className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] cursor-pointer"
                  >
                    Weekdays
                  </button>
                  <span className="text-[var(--text-dim)]">•</span>
                  <button
                    type="button"
                    onClick={handleSelectWeekendsOnly}
                    className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] cursor-pointer"
                  >
                    Weekends
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((day) => {
                  const isSelected = scheduleDays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => handleToggleWeekday(day.id)}
                      style={{
                        backgroundColor: isSelected ? color : 'var(--bg-surface-subtle)',
                        borderColor: isSelected ? color : 'var(--border-subtle)',
                        color: isSelected ? '#ffffff' : 'var(--text-muted)',
                        boxShadow: isSelected ? `0 0 8px ${color}40` : undefined,
                      }}
                      className="py-1 rounded-[5px] border text-[11px] font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer flex flex-col items-center"
                    >
                      <span>{day.short}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </form>

        {/* Sticky Modal Footer Actions (Always visible!) */}
        <div className="pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between gap-3 flex-shrink-0 mt-auto">
          <div>
            {editingHabit && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleDelete}
                  className="h-8 px-2.5 rounded-[5px] border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
                  title="Delete habit"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
                <button
                  type="button"
                  onClick={handleArchive}
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-muted)',
                  }}
                  className="h-8 px-2.5 rounded-[5px] border hover:text-[var(--text-primary)] flex items-center gap-1.5 text-xs font-semibold transition-colors cursor-pointer"
                  title="Archive habit"
                >
                  <Archive size={13} />
                  <span>Archive</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={closeHabitModal}
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              className="h-8 px-3.5 rounded-[5px] border text-xs font-semibold hover:border-[var(--border-medium)] transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              style={{
                backgroundColor: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-text)',
                boxShadow: 'var(--btn-primary-shadow)',
              }}
              className="h-8 px-4 rounded-[5px] text-xs font-bold hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check size={13} strokeWidth={2.5} />
              <span>{editingHabit ? 'Save Changes' : 'Create Habit'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
