import React from 'react';
import { Check } from 'lucide-react';

interface CircleCheckboxProps {
  checked: boolean;
  color: string;
  size?: number; // 22 for grid, 32 for today card
  disabled?: boolean;
  onClick?: () => void;
  ariaLabel: string;
  id?: string;
  isToday?: boolean;
  shape?: 'circle' | 'rounded';
}

export const CircleCheckbox: React.FC<CircleCheckboxProps> = ({
  checked,
  color,
  size = 22,
  disabled = false,
  onClick,
  ariaLabel,
  id,
  isToday = false,
  shape = 'circle',
}) => {
  const iconSize = size >= 28 ? 16 : 12;
  const isSquircle = shape === 'rounded';

  return (
    <button
      id={id}
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled && onClick) onClick();
      }}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: checked
          ? color
          : isToday
          ? 'rgba(124, 58, 237, 0.12)'
          : 'rgba(255, 255, 255, 0.05)',
        borderColor: checked
          ? color
          : isToday
          ? 'var(--accent-primary)'
          : 'rgba(255, 255, 255, 0.22)',
        boxShadow: checked
          ? `0 0 10px ${color}60, 0 2px 4px rgba(0, 0, 0, 0.4)`
          : isToday
          ? '0 0 10px var(--accent-glow)'
          : undefined,
      }}
      className={`group/cb relative inline-flex items-center justify-center border transition-all duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-white/40 select-none ${
        isSquircle ? 'rounded-[6px]' : 'rounded-full'
      } ${
        disabled
          ? 'opacity-20 cursor-not-allowed'
          : 'cursor-pointer hover:scale-110 active:scale-90 hover:border-white/60 hover:bg-white/10'
      }`}
    >
      {checked ? (
        <Check
          size={iconSize}
          color="#000000"
          strokeWidth={3.5}
          className="transition-transform duration-150 scale-100 animate-in fade-in zoom-in-75"
        />
      ) : (
        !disabled && (
          <span
            style={{ backgroundColor: color }}
            className="w-1.5 h-1.5 rounded-full opacity-0 group-hover/cb:opacity-70 transition-opacity pointer-events-none"
          />
        )
      )}
    </button>
  );
};

