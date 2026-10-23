/** Application name shown in the UI. */
export const APP_NAME: string = import.meta.env.VITE_APP_NAME || 'FastDataUpload';

/**
 * Public base URL used to build the upload link that is encoded into the
 * QR code. Falls back to the current browser origin at runtime, which is
 * correct when the app is served behind Nginx Proxy Manager on its own domain.
 */
export function getPublicBaseUrl(): string {
  const configured = import.meta.env.VITE_APP_URL;
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
