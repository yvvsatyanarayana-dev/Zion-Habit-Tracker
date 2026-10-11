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
  const iconSize = size >= 28 ? 16 : 13;
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
      style={
        {
          width: `${size}px`,
          height: `${size}px`,
          '--cb-color': color,
          '--cb-glow': `${color}60`,
          ...(checked
            ? {
                backgroundColor: color,
                borderColor: color,
                boxShadow: `0 2px 8px ${color}60, 0 1px 3px rgba(0, 0, 0, 0.25)`,
              }
            : isToday
            ? {
                borderColor: 'var(--checkbox-today-border)',
                backgroundColor: 'var(--checkbox-today-bg)',
                boxShadow: 'var(--checkbox-today-glow)',
              }
            : {
                borderColor: 'var(--checkbox-unchecked-border)',
                backgroundColor: 'var(--checkbox-unchecked-bg)',
              }),
        } as React.CSSProperties
      }
      className={`circle-checkbox group/cb relative inline-flex items-center justify-center border-[1.5px] border-solid transition-all duration-150 ease-out focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/40 select-none touch-manipulation after:content-[''] after:absolute after:-inset-2.5 after:rounded-full ${
        isSquircle ? 'rounded-[7px]' : 'rounded-full'
      } ${isToday ? 'is-today' : ''} ${checked ? 'is-checked' : ''} ${
        disabled
          ? 'opacity-25 cursor-not-allowed'
          : 'cursor-pointer hover:scale-108 active:scale-92'
      }`}
    >
      {checked ? (
        <Check
          size={iconSize}
          color="#ffffff"
          strokeWidth={3.5}
          className="transition-transform duration-150 scale-100 animate-in fade-in zoom-in-75 drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]"
        />
      ) : (
        !disabled && (
          <span
            style={{ backgroundColor: color }}
            className="w-1.5 h-1.5 rounded-full opacity-0 group-hover/cb:opacity-75 transition-opacity pointer-events-none"
          />
        )
      )}
    </button>
  );
};

