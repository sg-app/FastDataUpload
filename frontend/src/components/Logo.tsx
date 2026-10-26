import { getAppName } from '../lib/env';

interface LogoProps {
  /** Size of the square mark in pixels. */
  size?: number;
  /** Whether to render the wordmark next to the mark. */
  showWordmark?: boolean;
  className?: string;
}

/**
 * Inline brand logo: a rounded gradient mark containing a fast "upload" arrow
 * with motion lines, optionally followed by the wordmark.
 */
export function Logo({ size = 44, showWordmark = true, className = '' }: LogoProps) {
  // Name is part of the runtime configuration (APP_NAME).
  const APP_NAME = getAppName();

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        role="img"
        aria-label={APP_NAME}
        className="shrink-0 drop-shadow-sm"
      >
        <defs>
          <linearGradient id="fdu-gradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="60" height="60" rx="17" fill="url(#fdu-gradient)" />
        <g
          stroke="#ffffff"
          strokeOpacity="0.6"
          strokeWidth="3"
          strokeLinecap="round"
        >
          <line x1="9" y1="27" x2="19" y2="27" />
          <line x1="7" y1="35" x2="17" y2="35" />
          <line x1="9" y1="43" x2="19" y2="43" />
        </g>
        <path
          d="M41 46 V25 M32 34 L41 24 L50 34"
          fill="none"
          stroke="#ffffff"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showWordmark && (
        <div className="leading-tight">
          <span className="block text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Fast<span className="text-brand-600 dark:text-brand-400">Data</span>Upload
          </span>
          <span className="block text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400">
            Scan · Upload · Done
          </span>
        </div>
      )}
    </div>
  );
}
