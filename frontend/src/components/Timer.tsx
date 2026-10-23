import { formatDuration } from '../hooks/useCountdown';

interface TimerProps {
  seconds: number;
  /** Total duration used for the progress ring. */
  totalSeconds: number;
  label?: string;
}

/**
 * Displays a circular countdown ring with the remaining mm:ss time.
 * The ring turns amber below 60s and red below 20s.
 */
export function Timer({ seconds, totalSeconds, label = 'Gültig für' }: TimerProps) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const fraction = totalSeconds > 0 ? Math.max(0, Math.min(1, seconds / totalSeconds)) : 0;
  const dashOffset = circumference * (1 - fraction);

  const color =
    seconds <= 20 ? 'text-red-500' : seconds <= 60 ? 'text-amber-500' : 'text-brand-600';

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="8"
            className="stroke-slate-200 dark:stroke-slate-700"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={`${color} stroke-current transition-[stroke-dashoffset] duration-1000 ease-linear`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-2xl font-bold tabular-nums ${color}`}>
            {formatDuration(seconds)}
          </span>
        </div>
      </div>
      <span className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</span>
    </div>
  );
}
