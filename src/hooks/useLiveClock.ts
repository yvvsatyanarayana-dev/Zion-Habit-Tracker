import { useEffect, useState } from 'react';
import { useHabitStore } from '../store/useHabitStore';
import { formatLiveClock } from '../lib/dateUtils';

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
