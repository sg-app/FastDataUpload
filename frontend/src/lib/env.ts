import { fetchRuntimeConfig } from './api';
import type { RuntimeConfig } from '../types';

/**
 * Runtime configuration (app name, public base URL).
 *
 * The values are loaded at runtime from the backend (GET /api/config) and come
 * from the container environment, e.g.
 *
 *   docker run -e APP_URL=https://upload.example.com fastdataupload
 *
 * Precedence for every value:
 *   1. runtime configuration from the container environment (APP_URL / APP_NAME)
 *   2. build time value baked by Vite (VITE_APP_URL / VITE_APP_NAME) - optional
 *   3. sensible default (browser origin / "FastDataUpload")
 */
let runtimeConfig: RuntimeConfig | null = null;

/** Timeout for the runtime configuration request in milliseconds. */
const CONFIG_TIMEOUT_MS = 5000;

/**
 * Load the runtime configuration. This never rejects: if the backend cannot be
 * reached, the build time values (or the defaults) are used instead.
 */
export async function loadRuntimeConfig(): Promise<void> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), CONFIG_TIMEOUT_MS);

  try {
    runtimeConfig = await fetchRuntimeConfig(controller.signal);
  } catch {
    runtimeConfig = null;
  } finally {
    window.clearTimeout(timer);
  }
}

/** Application name shown in the UI. */
export function getAppName(): string {
  const configured = runtimeConfig?.appName || import.meta.env.VITE_APP_NAME;
  return configured && configured.trim() !== '' ? configured : 'FastDataUpload';
}

/**
 * Public base URL used to build the upload link that is encoded into the
 * QR code. Falls back to the current browser origin at runtime, which is
 * correct when the app is served behind Nginx Proxy Manager on its own domain.
 */
export function getPublicBaseUrl(): string {
  const configured = runtimeConfig?.appUrl || import.meta.env.VITE_APP_URL;
  if (configured && configured.trim() !== '') {
    return configured.replace(/\/+$/, '');
  }
  return window.location.origin.replace(/\/+$/, '');
}

/** Build the full upload URL for a given token path. */
export function buildUploadUrl(uploadPath: string): string {
  const path = uploadPath.startsWith('/') ? uploadPath : `/${uploadPath}`;
  return `${getPublicBaseUrl()}${path}`;
}

/** Format a byte count into a human readable string. */
export function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}
