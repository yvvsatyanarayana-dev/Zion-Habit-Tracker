import React from 'react';
import { Plus } from 'lucide-react';
import { useHabitStore } from '../../store/useHabitStore';

export const EmptyHabitsState: React.FC = () => {
  const openHabitModal = useHabitStore((s) => s.openHabitModal);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center max-w-md mx-auto">
      {/* Line Illustration: Three Empty Concentric Rings */}
      <div className="relative w-32 h-32 mb-6 flex items-center justify-center">
        <svg
          width="128"
          height="128"
          viewBox="0 0 128 128"
          className="transform -rotate-90"
        >
          {/* Outer ring */}
          <circle
            cx="64"
            cy="64"
            r="54"
            stroke="var(--border-medium)"
            strokeWidth="10"
            fill="none"
          />
          {/* Middle ring */}
          <circle
            cx="64"
            cy="64"
            r="40"
            stroke="var(--border-medium)"
            strokeWidth="10"
            fill="none"
          />
          {/* Inner ring */}
          <circle
            cx="64"
            cy="64"
            r="26"
            stroke="var(--border-medium)"
            strokeWidth="10"
            fill="none"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div style={{ backgroundColor: 'var(--border-medium)' }} className="w-3 h-3 rounded-full" />
        </div>
      </div>

      <h2
        style={{ color: 'var(--text-primary)', letterSpacing: '-0.015em' }}
        className="text-[20px] font-bold"
      >
        Add your first habit to start tracking
      </h2>
      <p style={{ color: 'var(--text-secondary)' }} className="text-[13px] mt-1.5 mb-5 max-w-sm">
        Build consistency with concentric activity rings, streak milestones, and live daily grids.
      </p>

      <button
        onClick={() => openHabitModal()}
        style={{
          backgroundColor: 'var(--btn-primary-bg)',
          color: 'var(--btn-primary-text)',
          boxShadow: 'var(--btn-primary-shadow)',
        }}
        className="h-9 px-4.5 rounded-[6px] font-bold text-xs flex items-center gap-1.5 transition-all hover:opacity-90 active:scale-95 cursor-pointer"
      >
        <Plus size={15} strokeWidth={2.4} />
        <span>Add Habit</span>
      </button>
    </div>
  );
};
