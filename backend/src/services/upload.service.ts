import fs from 'fs';
import path from 'path';
import { config } from '../config';

/**
 * Ensures the upload directory exists.
 */
export function ensureUploadDir(): void {
  if (!fs.existsSync(config.uploadDir)) {
    fs.mkdirSync(config.uploadDir, { recursive: true });
  }
}

/**
 * Sanitize a filename so it is safe to store on disk.
 * Keeps the base name and extension, replaces unsafe characters.
 */
export function sanitizeFilename(originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  const base = path
    .basename(originalName, ext)
    .replace(/[^a-zA-Z0-9-_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80);
  const safeBase = base.length > 0 ? base : 'file';
  return `${safeBase}${ext}`;
}

/**
 * Build a unique, collision free filename while keeping the original name
 * recognizable. A timestamp + random suffix is appended before the extension.
 */
export function buildUniqueFilename(originalName: string): string {
  const sanitized = sanitizeFilename(originalName);
  const ext = path.extname(sanitized);
  const base = path.basename(sanitized, ext);
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  return `${base}-${unique}${ext}`;
}
