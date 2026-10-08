import React, { useState } from 'react';

export interface DayBarData {
  dateStr: string;
  dayOfMonth: number;
  weekdayLabel: string;
  completed: number;
  total: number;
  rate: number; // 0 to 1
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
}

interface RoundedBarChartProps {
  days: DayBarData[];
  barWidth?: number; // 13px
  chartHeight?: number; // e.g. 150px
  accentColor?: string; // default #6366f1
}

export const RoundedBarChart: React.FC<RoundedBarChartProps> = ({
  days,
  barWidth = 13,
  chartHeight = 150,
  accentColor = '#6366f1',
}) => {
  const [hoveredDay, setHoveredDay] = useState<DayBarData | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  return (
    <div className="relative w-full select-none overflow-x-auto">
      <div className="min-w-[320px]">
      {/* Hairline Grid & Y-Axis Labels */}
      <div className="relative w-full" style={{ height: `${chartHeight}px` }}>
        {/* 100% line */}
        <div
          style={{ borderColor: 'var(--border-medium)' }}
          className="absolute top-0 left-0 right-10 border-b border-dashed h-[1px]"
        />
        <span
          style={{ color: 'var(--text-secondary)' }}
          className="absolute top-0 right-0 text-[11px] font-bold font-num transform -translate-y-1/2"
        >
          100%
        </span>

        {/* 50% line */}
        <div
          style={{ top: '50%', borderColor: 'var(--border-medium)' }}
          className="absolute left-0 right-10 border-b border-dashed h-[1px]"
        />
        <span
          style={{ top: '50%', color: 'var(--text-secondary)' }}
          className="absolute right-0 text-[11px] font-bold font-num transform -translate-y-1/2"
        >
          50%
        </span>

        {/* 0% line */}
        <div
          style={{ borderColor: 'var(--border-medium)' }}
          className="absolute bottom-0 left-0 right-10 border-b h-[1px]"
        />
        <span
          style={{ color: 'var(--text-secondary)' }}
          className="absolute bottom-0 right-0 text-[11px] font-bold font-num transform translate-y-1/2"
        >
          0%
        </span>

        {/* Bars Container */}
        <div className="absolute inset-0 right-10 flex items-end justify-between px-1">
          {days.map((day) => {
            const heightPx = Math.max(
              day.isFuture ? 0 : 4,
              Math.round(day.rate * chartHeight)
            );

            return (
              <div
                key={day.dateStr}
                className="relative flex flex-col items-center justify-end h-full cursor-pointer group"
                style={{ width: `${barWidth + 2}px` }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
                  setHoveredDay(day);
                }}
                onMouseLeave={() => setHoveredDay(null)}
              >
                {day.isFuture ? (
                  // Future day: small dot at baseline
                  <div
                    style={{ backgroundColor: 'var(--border-medium)' }}
                    className="w-[5px] h-[5px] rounded-full mb-1 transition-opacity group-hover:opacity-100 opacity-60"
                  />
                ) : (
                  // Past or today: fully rounded bar
                  <div
                    style={{
                      height: `${heightPx}px`,
                      width: `${barWidth}px`,
                      backgroundColor: accentColor,
                      borderRadius: `${barWidth / 2}px`,
                      opacity: day.isToday ? 1 : hoveredDay?.dateStr === day.dateStr ? 1 : 0.65,
                    }}
                    className="transition-all duration-200 ease-out"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* X-Axis labels: 1, 5, 10, 15, 20, 25, 30 and Today */}
      <div className="relative right-10 flex justify-between px-1 mt-2">
        {days.map((day) => {
          const showLabel =
            day.dayOfMonth === 1 ||
            day.dayOfMonth % 5 === 0 ||
            day.isToday;

          return (
            <div
              key={day.dateStr}
              className="flex justify-center text-center"
              style={{ width: `${barWidth + 2}px` }}
            >
              {showLabel && (
                <span
                  style={{
                    color: day.isToday ? 'var(--status-success)' : 'var(--text-secondary)',
                  }}
                  className={`text-[10.5px] font-num ${
                    day.isToday
                      ? 'font-black underline underline-offset-2'
                      : 'font-semibold'
                  }`}
                >
                  {day.dayOfMonth}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Hover Floating Tooltip */}
      {hoveredDay && (
        <div
          style={{
            position: 'fixed',
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y - 12}px`,
            transform: 'translate(-50%, -100%)',
            backgroundColor: 'var(--bg-surface-elevated)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-dropdown)',
          }}
          className="z-50 px-3 py-2 rounded-[12px] border pointer-events-none whitespace-nowrap text-center animate-in fade-in zoom-in-95 duration-150"
        >
          <div
            style={{ color: 'var(--text-primary)' }}
            className="text-[12px] font-semibold"
          >
            {hoveredDay.weekdayLabel}, {hoveredDay.dateStr}
          </div>
          <div
            style={{ color: 'var(--text-secondary)' }}
            className="text-[11px] font-medium mt-0.5"
          >
            <span
              style={{ color: 'var(--text-primary)' }}
              className="font-num font-semibold"
            >
              {hoveredDay.completed} of {hoveredDay.total}
            </span>{' '}
            habits ·{' '}
            <span
              style={{ color: 'var(--accent-primary)' }}
              className="font-num font-bold"
            >
              {Math.round(hoveredDay.rate * 100)}%
            </span>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
