import { useCallback, useEffect, useRef, useState } from 'react';

export interface Countdown {
  /** Remaining seconds. */
  seconds: number;
  /** True once the countdown reached zero. */
  isExpired: boolean;
  /** Restart the countdown with a new duration (in seconds). */
  reset: (durationSeconds: number) => void;
}

/**
 * A simple countdown timer driven by an interval.
 * `onExpire` is called once when the timer hits zero.
 */
export function useCountdown(onExpire?: () => void): Countdown {
  const [seconds, setSeconds] = useState(0);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (seconds <= 0) {
      return;
    }
    const id = window.setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          onExpireRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [seconds > 0]);

  const reset = useCallback((durationSeconds: number) => {
    setSeconds(Math.max(0, Math.floor(durationSeconds)));
  }, []);

  return { seconds, isExpired: seconds <= 0, reset };
}

/** Format seconds as mm:ss. */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}
