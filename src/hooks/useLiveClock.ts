import { useEffect, useState } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import { formatLiveClock } from '../lib/dateUtils';

/**
 * High-performance hook for midnight day rollovers.
 * Runs in the background without forcing high-frequency re-renders on the host component tree.
 */
export function useMidnightRollover() {
  const tickClock = useHabitStore((s) => s.tickClock);

  useEffect(() => {
    const check = () => {
      tickClock(new Date());
    };

    // Low-overhead 10-second check for date transitions
    const interval = setInterval(check, 10000);

    // Immediate check when window regains focus or becomes visible
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        check();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [tickClock]);
}

/**
 * UI Clock hook for components that explicitly display a live ticking second-by-second clock string.
 */
export function useLiveClock() {
  const [clockDate, setClockDate] = useState<Date>(new Date());
  const tickClock = useHabitStore((s) => s.tickClock);
  const clockFormat = useHabitStore((s) => s.settings.clock_format);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setClockDate(now);
      tickClock(now);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [tickClock]);

  return {
    clockDate,
    formattedString: formatLiveClock(clockDate, clockFormat === '24h'),
  };
}
