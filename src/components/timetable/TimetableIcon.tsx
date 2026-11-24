import React from 'react';
import {
  Code2,
  BookOpen,
  Dumbbell,
  Moon,
  UtensilsCrossed,
  Coffee,
  Target,
  Clock,
  Sparkles,
  Brain,
  Languages,
  Laptop,
  CheckCircle2,
  Smile,
  type LucideIcon,
} from 'lucide-react';
import type { TimetableCategory } from '../../lib/types';

// Map icon ID or legacy emoji string to clean Lucide icons
export const ICON_MAP: Record<string, LucideIcon> = {
  // Code / CS
  code: Code2,
  laptop: Laptop,
  '💻': Code2,

  // Book / English / Reading
  book: BookOpen,
  english: Languages,
  languages: Languages,
  '📚': BookOpen,

  // Health / Workout
  dumbbell: Dumbbell,
  fitness: Dumbbell,
  health: Dumbbell,
  '🏃': Dumbbell,

  // Sleep
  moon: Moon,
  bed: Moon,
  sleep: Moon,
  '🌙': Moon,

  // Meals / Nutrition
  nutrition: UtensilsCrossed,
  meal: UtensilsCrossed,
  food: UtensilsCrossed,
  '🍽': UtensilsCrossed,

  // Break / Coffee / Tea
  coffee: Coffee,
  tea: Coffee,
  break: Coffee,
  '☕': Coffee,

  // Review / Testing / Target
  target: Target,
  review: Target,
  test: Target,
  quiz: Target,
  '🎯': Target,

  // General / Time
  clock: Clock,
  timer: Clock,
  general: Clock,
  '⏱': Clock,

  // Misc
  sparkles: Sparkles,
  brain: Brain,
  smile: Smile,
  check: CheckCircle2,
};

// Fallback category icon mapping
export const CATEGORY_ICON_MAP: Record<TimetableCategory, LucideIcon> = {
  cs: Code2,
  english: BookOpen,
  health: Dumbbell,
  sleep: Moon,
  meal: UtensilsCrossed,
  break: Coffee,
  review: Target,
  general: Clock,
};

interface TimetableIconProps {
  icon?: string;
  category?: TimetableCategory;
  color?: string;
  size?: number;
  badge?: boolean;
  className?: string;
}

export const TimetableIcon: React.FC<TimetableIconProps> = ({
  icon,
  category = 'general',
  color,
  size = 18,
  badge = false,
  className = '',
}) => {
  let IconComponent: LucideIcon = Clock;

  if (icon && ICON_MAP[icon.toLowerCase()]) {
    IconComponent = ICON_MAP[icon.toLowerCase()];
  } else if (icon && ICON_MAP[icon]) {
    IconComponent = ICON_MAP[icon];
  } else if (category && CATEGORY_ICON_MAP[category]) {
    IconComponent = CATEGORY_ICON_MAP[category];
  }

  const iconElement = (
    <IconComponent
      size={size}
      style={color ? { color } : undefined}
      className={`shrink-0 ${className}`}
    />
  );

  if (!badge) {
    return iconElement;
  }

  return (
    <div
      style={{
        backgroundColor: color ? `${color}18` : 'var(--bg-surface-subtle)',
        borderColor: color ? `${color}38` : 'var(--border-subtle)',
      }}
      className="p-2 rounded-xl border flex items-center justify-center shrink-0"
    >
      {iconElement}
    </div>
  );
};
