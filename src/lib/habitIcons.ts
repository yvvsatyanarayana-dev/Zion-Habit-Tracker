import React from 'react';
import {
  Target,
  Activity,
  Flame,
  Dumbbell,
  BookOpen,
  Droplets,
  Zap,
  Heart,
  Sun,
  Moon,
  Coffee,
  Sparkles,
  Smile,
  CheckCircle2,
  Compass,
  Feather,
  Code,
  Timer,
  Trophy,
  Music,
  Bed,
  Utensils,
  Brain,
  Bike,
  Footprints,
  Pencil,
  Shield,
  Star,
  Laptop,
  Camera,
  type LucideIcon,
} from 'lucide-react';

export interface HabitIconItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export const HABIT_ICONS: HabitIconItem[] = [
  { id: 'target', label: 'Target', icon: Target },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'flame', label: 'Streak', icon: Flame },
  { id: 'dumbbell', label: 'Fitness', icon: Dumbbell },
  { id: 'book', label: 'Reading', icon: BookOpen },
  { id: 'droplets', label: 'Water', icon: Droplets },
  { id: 'zap', label: 'Energy', icon: Zap },
  { id: 'heart', label: 'Health', icon: Heart },
  { id: 'sun', label: 'Morning', icon: Sun },
  { id: 'moon', label: 'Night', icon: Moon },
  { id: 'coffee', label: 'Coffee/Tea', icon: Coffee },
  { id: 'sparkles', label: 'Habit', icon: Sparkles },
  { id: 'smile', label: 'Mindset', icon: Smile },
  { id: 'check', label: 'Checklist', icon: CheckCircle2 },
  { id: 'compass', label: 'Focus', icon: Compass },
  { id: 'feather', label: 'Journal', icon: Feather },
  { id: 'code', label: 'Coding', icon: Code },
  { id: 'timer', label: 'Pomodoro', icon: Timer },
  { id: 'trophy', label: 'Goal', icon: Trophy },
  { id: 'music', label: 'Music', icon: Music },
  { id: 'bed', label: 'Sleep', icon: Bed },
  { id: 'nutrition', label: 'Nutrition', icon: Utensils },
  { id: 'brain', label: 'Learning', icon: Brain },
  { id: 'bike', label: 'Cardio', icon: Bike },
  { id: 'footprints', label: 'Walking', icon: Footprints },
  { id: 'pencil', label: 'Writing', icon: Pencil },
  { id: 'shield', label: 'Discipline', icon: Shield },
  { id: 'star', label: 'Priority', icon: Star },
  { id: 'laptop', label: 'Work', icon: Laptop },
  { id: 'camera', label: 'Creative', icon: Camera },
];

const iconMap = new Map<string, LucideIcon>(
  HABIT_ICONS.map((item) => [item.id, item.icon])
);

export function getHabitIcon(iconId?: string): LucideIcon {
  if (!iconId) return Target;
  return iconMap.get(iconId.toLowerCase()) || Target;
}

interface HabitIconViewProps {
  iconId?: string;
  size?: number;
  color?: string;
  className?: string;
}

export const HabitIconView: React.FC<HabitIconViewProps> = ({
  iconId,
  size = 15,
  color,
  className = '',
}) => {
  const IconComponent = getHabitIcon(iconId);
  return React.createElement(IconComponent, {
    size,
    style: color ? { color } : undefined,
    className: `flex-shrink-0 ${className}`,
  });
};
