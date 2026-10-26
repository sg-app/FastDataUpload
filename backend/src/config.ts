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

/**
 * Parse a boolean environment variable. Accepted truthy values are 1/true/yes/on,
 * falsy values are 0/false/no/off (case insensitive).
 */
function boolFromEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }
  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  // eslint-disable-next-line no-console
  console.warn(`[config] Invalid value for ${name}="${raw}", using default ${fallback}.`);
  return fallback;
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

  /**
   * Directory containing the built frontend (single image deployments).
   * If it does not exist the server runs in API only mode, which is the case
   * during local development and inside the backend-only container.
   */
  spaDir: process.env.SPA_DIR && process.env.SPA_DIR.trim() !== ''
    ? process.env.SPA_DIR
    : path.join(process.cwd(), 'public'),

  /**
   * Public base URL of the application (runtime configuration for the
   * frontend). This is the URL that ends up inside the QR code. An empty value
   * makes the frontend fall back to the browser origin.
   */
  publicAppUrl: (process.env.APP_URL ?? '').trim().replace(/\/+$/, ''),

  /** Display name of the application (runtime configuration for the frontend). */
  appName: (process.env.APP_NAME ?? '').trim() || 'FastDataUpload',

  /**
   * True when the app is reached over https (e.g. behind Nginx Proxy Manager
   * with a Let's Encrypt certificate). Only then are the headers that require a
   * secure context delivered: Strict-Transport-Security, Cross-Origin-Opener-
   * Policy, Origin-Agent-Cluster and the CSP directive
   * "upgrade-insecure-requests".
   *
   * On a plain http deployment (http://<host>:<port>, e.g. http://dockersrv:8083)
   * browsers ignore HSTS/COOP/Origin-Agent-Cluster - and
   * "upgrade-insecure-requests" would even rewrite every asset request to
   * https and fail with net::ERR_SSL_PROTOCOL_ERROR.
   */
  httpsEnabled: boolFromEnv('HTTPS_ENABLED', false),

  /** Allowed CORS origins. Empty array means "reflect request origin". */
  corsOrigins: listFromEnv('CORS_ORIGIN'),
} as const;

export type AppConfig = typeof config;
