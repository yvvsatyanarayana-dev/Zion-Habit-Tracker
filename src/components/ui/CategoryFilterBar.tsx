import React from 'react';
import { useHabitStore } from '../../store/useHabitStore';
import { HABIT_CATEGORIES } from '../../lib/constants';
import { Sparkles, Activity, Brain, Briefcase, Coffee, Award, Volume2, VolumeX } from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  Sparkles,
  Activity,
  Brain,
  Briefcase,
  Coffee,
};

export const CategoryFilterBar: React.FC = () => {
  const selectedCategory = useHabitStore((s) => s.selectedCategory);
  const setSelectedCategory = useHabitStore((s) => s.setSelectedCategory);
  const habits = useHabitStore((s) => s.habits);
  const setWeeklyReviewOpen = useHabitStore((s) => s.setWeeklyReviewOpen);
  const soundEnabled = useHabitStore((s) => s.settings.sound_enabled ?? true);
  const toggleSound = useHabitStore((s) => s.toggleSound);

  const activeHabits = habits.filter((h) => !h.archived);

  return (
    <div className="flex items-center justify-between gap-2 py-0.5 select-none">
      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {HABIT_CATEGORIES.map((cat) => {
          const Icon = ICON_MAP[cat.icon] || Sparkles;
          const isSelected = selectedCategory === cat.id;
          const count =
            cat.id === 'all'
              ? activeHabits.length
              : activeHabits.filter((h) => (h.category || 'routine') === cat.id).length;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              style={{
                backgroundColor: isSelected ? 'var(--btn-primary-bg)' : 'var(--bg-surface)',
                color: isSelected ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
                borderColor: isSelected ? 'transparent' : 'var(--border-subtle)',
              }}
              className={`px-2.5 py-1 rounded-[6px] text-[11.5px] font-semibold border transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer hover:border-[var(--border-medium)] hover:text-[var(--text-primary)] ${
                isSelected ? 'shadow-sm font-bold' : ''
              }`}
            >
              <Icon size={12} style={{ color: isSelected ? 'inherit' : cat.color }} />
              <span>{cat.label}</span>
              <span
                style={{
                  backgroundColor: isSelected ? 'rgba(0,0,0,0.15)' : 'var(--bg-surface-elevated)',
                  color: isSelected ? 'inherit' : 'var(--text-muted)',
                }}
                className="px-1.5 py-0.1 rounded-full text-[9.5px] font-mono ml-0.5"
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
