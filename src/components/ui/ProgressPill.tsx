import React from 'react';

interface ProgressPillProps {
  rate: number; // 0 to 1
  color: string;
  height?: number; // default 6px
  className?: string;
}

export const ProgressPill: React.FC<ProgressPillProps> = ({
  rate,
  color,
  height = 6,
  className = '',
}) => {
  const safeRate = Number.isFinite(rate) ? Math.min(1, Math.max(0, rate)) : 0;
  const pct = Math.round(safeRate * 100);

  return (
    <div
      className={`relative w-full rounded-full overflow-hidden ${className}`}
      style={{
        height: `${height}px`,
        backgroundColor: color,
        opacity: 0.95,
      }}
    >
      {/* Background track at 22% opacity */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: '#000000',
          opacity: 0.78, // Leaves 22% of the base color showing
        }}
      />
      {/* Active fill */}
      <div
        className="absolute top-0 bottom-0 left-0 rounded-full transition-all duration-300 ease-out"
        style={{
          width: `${pct}%`,
          backgroundColor: color,
        }}
      />
    </div>
  );
};
