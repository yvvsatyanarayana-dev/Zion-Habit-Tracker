import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Clock,
  Tag,
  Bell,
  Link2,
  Code2,
  BookOpen,
  Dumbbell,
  Moon,
  UtensilsCrossed,
  Coffee,
  Target,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';
import { HABIT_PALETTE } from '../../lib/constants';
import type { TimetableBlock, TimetableCategory } from '../../lib/types';
import { formatTimeTo12h, formatTimeRange12h } from '../../lib/timetableParser';
import { TimetableIcon } from './TimetableIcon';

interface CategoryOption {
  id: TimetableCategory;
  label: string;
  iconId: string;
  icon: LucideIcon;
  color: string;
}

const CATEGORIES: CategoryOption[] = [
  { id: 'cs', label: 'Computer Science', iconId: 'code', icon: Code2, color: '#6366f1' },
  { id: 'english', label: 'English & Language', iconId: 'book', icon: BookOpen, color: '#10b981' },
  { id: 'health', label: 'Health & Workout', iconId: 'dumbbell', icon: Dumbbell, color: '#f59e0b' },
  { id: 'sleep', label: 'Sleep & Rest', iconId: 'moon', icon: Moon, color: '#8b5cf6' },
  { id: 'meal', label: 'Meals & Food', iconId: 'nutrition', icon: UtensilsCrossed, color: '#f43f5e' },
  { id: 'break', label: 'Break & Free Time', iconId: 'coffee', icon: Coffee, color: '#06b6d4' },
  { id: 'review', label: 'Revision & Testing', iconId: 'target', icon: Target, color: '#ec4899' },
  { id: 'general', label: 'General Routine', iconId: 'clock', icon: Clock, color: '#64748b' },
];

export const TimetableBlockModal: React.FC = () => {
  const isOpen = useHabitStore((s) => s.timetableBlockModalOpen);
  const setOpen = useHabitStore((s) => s.setTimetableBlockModalOpen);
  const selectedBlock = useHabitStore((s) => s.selectedTimetableBlock);
  const selectedScheduleId = useHabitStore((s) => s.selectedScheduleIdForBlock);
  const allHabits = useHabitStore((s) => s.habits);
  const saveBlock = useHabitStore((s) => s.saveTimetableBlock);

  // Memoize habits list to prevent infinite render cycles
  const habits = React.useMemo(() => (allHabits || []).filter((h) => !h.archived), [allHabits]);

  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [category, setCategory] = useState<TimetableCategory>('cs');
  const [color, setColor] = useState('#6366f1');
  const [icon, setIcon] = useState('code');
  const [description, setDescription] = useState('');
  const [soundAlert, setSoundAlert] = useState(true);
  const [linkedHabitId, setLinkedHabitId] = useState<string>('');

  useEffect(() => {
    if (selectedBlock) {
      setTitle(selectedBlock.title);
      setStartTime(selectedBlock.startTime);
      setEndTime(selectedBlock.endTime);
      setCategory(selectedBlock.category);
      setColor(selectedBlock.color);
      setIcon(selectedBlock.icon || selectedBlock.emoji || 'code');
      setDescription(selectedBlock.description || '');
      setSoundAlert(selectedBlock.soundAlert);
      setLinkedHabitId(selectedBlock.linkedHabitId || '');
    } else {
      setTitle('');
      setStartTime('09:00');
      setEndTime('10:00');
      setCategory('cs');
      setColor('#6366f1');
      setIcon('code');
      setDescription('');
      setSoundAlert(true);
      setLinkedHabitId('');
    }
  }, [selectedBlock, isOpen]);

  if (!isOpen || !selectedScheduleId) return null;

  const handleCategorySelect = (cat: CategoryOption) => {
    setCategory(cat.id);
    setColor(cat.color);
    setIcon(cat.iconId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const block: TimetableBlock = {
      id: selectedBlock ? selectedBlock.id : `block_${Date.now()}`,
      scheduleId: selectedScheduleId,
      title: title.trim(),
      startTime,
      endTime,
      category,
      color,
      icon,
      emoji: icon,
      description: description.trim(),
      soundAlert,
      linkedHabitId: linkedHabitId || undefined,
      sortOrder: selectedBlock ? selectedBlock.sortOrder : 99,
    };

    await saveBlock(selectedScheduleId, block);
    setOpen(false);
  };

  return (
    <div
      onClick={() => setOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-[10px] animate-fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--shadow-dropdown)',
        }}
        className="w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors"
      >
        {/* Header */}
        <div
          style={{ borderColor: 'var(--border-subtle)' }}
          className="px-6 py-4 border-b flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <TimetableIcon icon={icon} category={category} color={color} size={20} badge />
            <div>
              <h2 style={{ color: 'var(--text-primary)' }} className="text-base font-bold tracking-tight">
                {selectedBlock ? 'Edit Timetable Block' : 'Add Timetable Block'}
              </h2>
              <p style={{ color: 'var(--text-muted)' }} className="text-xs">
                Real-time 24h routine slot with focus synchronization
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{ color: 'var(--text-muted)' }}
            className="p-1.5 rounded-lg hover:text-[var(--text-primary)] hover:bg-[var(--bg-surface-subtle)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
          {/* Block Title */}
          <div>
            <label style={{ color: 'var(--text-secondary)' }} className="block text-xs font-semibold mb-1.5">
              Activity Name *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. CS: hands-on coding practice"
              style={{
                backgroundColor: 'var(--bg-surface-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
              autoFocus
            />
          </div>

          {/* Time Range (12-Hour formatted inputs) */}
          <div className="space-y-1.5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={{ color: 'var(--text-secondary)' }} className="block text-xs font-semibold mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                    <span>Start Time</span>
                  </span>
                  <span className="text-[11px] font-mono text-[var(--accent-primary)] font-bold">
                    {formatTimeTo12h(startTime)}
                  </span>
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg-surface-card)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  className="w-full px-3 py-2 rounded-xl border text-sm font-mono focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
              <div>
                <label style={{ color: 'var(--text-secondary)' }} className="block text-xs font-semibold mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} style={{ color: 'var(--text-muted)' }} />
                    <span>End Time</span>
                  </span>
                  <span className="text-[11px] font-mono text-[var(--accent-primary)] font-bold">
                    {formatTimeTo12h(endTime)}
                  </span>
                </label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  style={{
                    backgroundColor: 'var(--bg-surface-card)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  className="w-full px-3 py-2 rounded-xl border text-sm font-mono focus:outline-none focus:border-[var(--accent-primary)]"
                />
              </div>
            </div>
            <div style={{ color: 'var(--text-muted)' }} className="text-[11px] font-mono flex items-center gap-1.5 px-0.5">
              <span>Formatted:</span>
              <span style={{ color: 'var(--text-primary)' }} className="font-semibold">
                {formatTimeRange12h(startTime, endTime)}
              </span>
            </div>
          </div>

          {/* Category Chips (Lucide Icons, No Emojis) */}
          <div>
            <label style={{ color: 'var(--text-secondary)' }} className="block text-xs font-semibold mb-1.5 flex items-center gap-1.5">
              <Tag size={13} style={{ color: 'var(--text-muted)' }} />
              <span>Routine Category</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                const IconComp = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat)}
                    style={{
                      backgroundColor: isSelected ? `${cat.color}1c` : 'var(--bg-surface-card)',
                      borderColor: isSelected ? cat.color : 'var(--border-subtle)',
                      color: isSelected ? cat.color : 'var(--text-secondary)',
                    }}
                    className="p-2.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition-all cursor-pointer hover:border-[var(--border-medium)]"
                  >
                    <IconComp size={15} className="shrink-0" />
                    <span className="truncate">{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Palette */}
          <div>
            <label style={{ color: 'var(--text-secondary)' }} className="block text-xs font-semibold mb-1.5">
              Highlight Accent Color
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {HABIT_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{ backgroundColor: c }}
                  className={`w-7 h-7 rounded-lg transition-transform cursor-pointer flex items-center justify-center ${
                    color === c ? 'scale-115 ring-2 ring-white/50 shadow-md' : 'hover:scale-105 opacity-80'
                  }`}
                >
                  {color === c && <Check size={14} className="text-white drop-shadow" />}
                </button>
              ))}
            </div>
          </div>

          {/* Description / Notes */}
          <div>
            <label style={{ color: 'var(--text-secondary)' }} className="block text-xs font-semibold mb-1.5">
              Description or Target Notes (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. solve 3 LeetCode problems or read chapter 4"
              style={{
                backgroundColor: 'var(--bg-surface-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              className="w-full px-3.5 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-[var(--accent-primary)]"
            />
          </div>

          {/* Linked Habit Synchronization */}
          {habits.length > 0 && (
            <div>
              <label style={{ color: 'var(--text-secondary)' }} className="block text-xs font-semibold mb-1.5 flex items-center gap-1.5">
                <Link2 size={13} style={{ color: 'var(--text-muted)' }} />
                <span>Link to Habit Tracking (Optional)</span>
              </label>
              <select
                value={linkedHabitId}
                onChange={(e) => setLinkedHabitId(e.target.value)}
                style={{
                  backgroundColor: 'var(--bg-surface-card)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
                className="w-full px-3 py-2 rounded-xl border text-xs font-medium focus:outline-none focus:border-[var(--accent-primary)]"
              >
                <option value="">None (Independent routine block)</option>
                {habits.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sound Alert Toggle */}
          <div
            style={{
              backgroundColor: 'var(--bg-surface-card)',
              borderColor: 'var(--border-subtle)',
            }}
            className="flex items-center justify-between p-3 rounded-xl border"
          >
            <div className="flex items-center gap-2.5">
              <Bell size={16} style={{ color: 'var(--accent-primary)' }} />
              <div>
                <div style={{ color: 'var(--text-primary)' }} className="text-xs font-bold">
                  Transition Sound & Notification
                </div>
                <div style={{ color: 'var(--text-muted)' }} className="text-[11px]">
                  Chime audio and OS desktop alert when block starts
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={soundAlert}
              onChange={(e) => setSoundAlert(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          {/* Modal Actions */}
          <div
            style={{ borderColor: 'var(--border-subtle)' }}
            className="pt-4 border-t flex items-center justify-end gap-2"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                color: 'var(--text-secondary)',
                borderColor: 'var(--border-subtle)',
              }}
              className="px-4 py-2 rounded-xl border text-xs font-semibold hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                backgroundColor: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-text)',
                boxShadow: 'var(--btn-primary-shadow)',
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 hover:opacity-90"
            >
              {selectedBlock ? 'Save Changes' : 'Create Block'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
