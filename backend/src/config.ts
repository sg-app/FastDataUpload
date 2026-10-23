import path from 'path';
import dotenv from 'dotenv';

// dotenv v17+ logs an "injected env" banner on every start. The quiet flag
// keeps the container output limited to the FastDataUpload messages.
dotenv.config({ quiet: true });

/** Parse an integer environment variable with a fallback default. */
function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    // eslint-disable-next-line no-console
    console.warn(`[config] Invalid value for ${name}="${raw}", using default ${fallback}.`);
    return fallback;
  }
  return parsed;
}

/** Parse a comma separated list environment variable into an array. */
function listFromEnv(name: string): string[] {
  const raw = process.env[name];
  if (!raw || raw.trim() === '') {
    return [];
  }
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

export const config = {
  /** HTTP port of the Express server. */
  port: intFromEnv('PORT', 3001),

  /** Node environment. */
  nodeEnv: process.env.NODE_ENV ?? 'development',

  /** Token validity in minutes. */
  tokenExpiryMinutes: intFromEnv('TOKEN_EXPIRY_MINUTES', 10),

  /** Maximum size of a single uploaded file in bytes. */
  maxFileSizeBytes: intFromEnv('MAX_FILE_SIZE_MB', 50) * 1024 * 1024,

  /** Maximum number of files accepted in a single request. */
  maxFilesPerRequest: intFromEnv('MAX_FILES_PER_REQUEST', 20),

  /** Absolute path of the upload directory (backed by a volume mount). */
  uploadDir: process.env.UPLOAD_DIR && process.env.UPLOAD_DIR.trim() !== ''
    ? process.env.UPLOAD_DIR
    : path.join(process.cwd(), 'uploads'),

  /** Allowed CORS origins. Empty array means "reflect request origin". */
  corsOrigins: listFromEnv('CORS_ORIGIN'),
} as const;

export type AppConfig = typeof config;
