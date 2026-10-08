import React from 'react';

interface ActivityRingProps {
  todayRate: number; // 0 to 1
  weekRate: number; // 0 to 1
  monthRate: number; // 0 to 1
  size?: number; // default 220
  strokeWidth?: number; // default 22
  todayColor?: string;
  weekColor?: string;
  monthColor?: string;
}

export const ActivityRings: React.FC<ActivityRingProps> = ({
  todayRate,
  weekRate,
  monthRate,
  size = 220,
  strokeWidth = 22,
  todayColor = '#6366f1',
  weekColor = '#10b981',
  monthColor = '#06b6d4',
}) => {
  const center = size / 2;
  const gap = 3;

  // Radii
  const rOuter = center - strokeWidth / 2;
  const rMiddle = rOuter - strokeWidth - gap;
  const rInner = rMiddle - strokeWidth - gap;

  const cOuter = 2 * Math.PI * rOuter;
  const cMiddle = 2 * Math.PI * rMiddle;
  const cInner = 2 * Math.PI * rInner;

  // Clamp rates safely between 0 and 1 (with 0 if NaN)
  const safeTodayRate = Number.isFinite(todayRate) ? Math.min(1, Math.max(0, todayRate)) : 0;
  const safeWeekRate = Number.isFinite(weekRate) ? Math.min(1, Math.max(0, weekRate)) : 0;
  const safeMonthRate = Number.isFinite(monthRate) ? Math.min(1, Math.max(0, monthRate)) : 0;

  const offsetOuter = cOuter * (1 - safeTodayRate);
  const offsetMiddle = cMiddle * (1 - safeWeekRate);
  const offsetInner = cInner * (1 - safeMonthRate);

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90 origin-center"
        aria-label="Concentric Activity Rings"
      >
        {/* Outer Ring: Today Track */}
        <circle
          cx={center}
          cy={center}
          r={rOuter}
          stroke="var(--ring-track)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {safeTodayRate > 0 && (
          <circle
            cx={center}
            cy={center}
            r={rOuter}
            stroke={todayColor}
            strokeWidth={strokeWidth}
            strokeDasharray={cOuter}
            strokeDashoffset={offsetOuter}
            strokeLinecap="round"
            fill="none"
            className="transition-all duration-500 ease-out"
          />
        )}

        {/* Middle Ring: Week Track */}
        <circle
          cx={center}
          cy={center}
          r={rMiddle}
          stroke="var(--ring-track)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {safeWeekRate > 0 && (
          <circle
            cx={center}
            cy={center}
            r={rMiddle}
            stroke={weekColor}
            strokeWidth={strokeWidth}
            strokeDasharray={cMiddle}
            strokeDashoffset={offsetMiddle}
            strokeLinecap="round"
            fill="none"
            className="transition-all duration-500 ease-out"
          />
        )}

        {/* Inner Ring: Month Track */}
        <circle
          cx={center}
          cy={center}
          r={rInner}
          stroke="var(--ring-track)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {safeMonthRate > 0 && (
          <circle
            cx={center}
            cy={center}
            r={rInner}
            stroke={monthColor}
            strokeWidth={strokeWidth}
            strokeDasharray={cInner}
            strokeDashoffset={offsetInner}
            strokeLinecap="round"
            fill="none"
            className="transition-all duration-500 ease-out"
          />
        )}
      </svg>
    </div>
  );
};

export const MiniRing: React.FC<{
  rate: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  label?: string;
}> = ({ rate, color, size = 46, strokeWidth = 5, label }) => {
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const safeRate = Number.isFinite(rate) ? Math.min(1, Math.max(0, rate)) : 0;
  const offset = circumference * (1 - safeRate);

  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90 origin-center"
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="var(--ring-track)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {safeRate > 0 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            fill="none"
            className="transition-all duration-300 ease-out"
          />
        )}
      </svg>
      {label && (
        <span
          style={{ color: 'var(--text-primary)' }}
          className="absolute font-num text-[11px] font-bold text-center"
        >
          {label}
        </span>
      )}
    </div>
  );
};
