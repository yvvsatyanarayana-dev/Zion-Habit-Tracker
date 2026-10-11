import React from 'react';
import { useHabitStore } from '../../store/useHabitStore';
import { HABIT_CATEGORIES } from '../../lib/constants';
import { LayoutGrid, Layers, Activity, Brain, Briefcase, Coffee } from 'lucide-react';

const ICON_MAP: Record<string, any> = {
  LayoutGrid,
  Layers,
  Activity,
  Brain,
  Briefcase,
  Coffee,
};

export const CategoryFilterBar: React.FC = () => {
  const selectedCategory = useHabitStore((s) => s.selectedCategory);
  const setSelectedCategory = useHabitStore((s) => s.setSelectedCategory);
  const habits = useHabitStore((s) => s.habits);

  const activeHabits = habits.filter((h) => !h.archived);

  return (
    <div className="mobile-category-filters flex items-center justify-between gap-2 py-0.5 select-none">
      {/* Category Pills */}
      <div className="mobile-category-filter-list flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
        {HABIT_CATEGORIES.map((cat) => {
          const Icon = ICON_MAP[cat.icon] || LayoutGrid;
          const isSelected = selectedCategory === cat.id;
          const count =
            cat.id === 'all'
              ? activeHabits.length
              : activeHabits.filter((h) => (h.category || 'routine') === cat.id).length;

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`mobile-category-filter px-2.5 py-1 rounded-[6px] text-[11.5px] font-semibold border transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                isSelected ? 'is-active shadow-sm font-bold' : ''
              }`}
            >
              <Icon size={12} style={{ color: isSelected ? 'var(--btn-primary-text)' : cat.color }} />
              <span>{cat.label}</span>
              <span className="mobile-category-count px-1.5 py-0.1 rounded-full text-[9.5px] font-mono ml-0.5">
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
