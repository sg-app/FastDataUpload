import { randomUUID } from 'crypto';
import { config } from '../config';
import type { UploadToken } from '../types';

/**
 * In-memory token store.
 *
 * Tokens are kept in a simple Map. Expired tokens are removed by a periodic
 * cleanup task started in the constructor. Because the store lives in memory,
 * tokens are lost on container restart - this is acceptable for short lived
 * (default 10 minutes) upload sessions.
 */
export class TokenService {
  private readonly tokens = new Map<string, UploadToken>();
  private readonly expiryMs: number;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(expiryMinutes: number = config.tokenExpiryMinutes) {
    this.expiryMs = expiryMinutes * 60 * 1000;
    // Run cleanup every minute.
    this.cleanupTimer = setInterval(() => this.cleanup(), 60 * 1000);
    // Do not keep the process alive because of this timer.
    this.cleanupTimer.unref?.();
  }

  /** Create and store a new upload token. */
  generate(): UploadToken {
    const now = new Date();
    const token: UploadToken = {
      token: randomUUID(),
      createdAt: now,
      expiresAt: new Date(now.getTime() + this.expiryMs),
      uploadCount: 0,
      isActive: true,
    };
    this.tokens.set(token.token, token);
    return token;
  }

  /** Return a token only if it exists, is active and not yet expired. */
  getValid(token: string): UploadToken | undefined {
    const entry = this.tokens.get(token);
    if (!entry) {
      return undefined;
    }
    if (!entry.isActive) {
      return undefined;
    }
    if (entry.expiresAt.getTime() <= Date.now()) {
      return undefined;
    }
    return entry;
  }

  /** Check whether a token is currently usable. */
  isValid(token: string): boolean {
    return this.getValid(token) !== undefined;
  }

  /** Seconds remaining until the token expires (0 if invalid/expired). */
  secondsRemaining(token: string): number {
    const entry = this.getValid(token);
    if (!entry) {
      return 0;
    }
    return Math.max(0, Math.floor((entry.expiresAt.getTime() - Date.now()) / 1000));
  }

  /** Mark a token as invalidated. */
  invalidate(token: string): boolean {
    const entry = this.tokens.get(token);
    if (!entry) {
      return false;
    }
    entry.isActive = false;
    return true;
  }

  /** Register an additional upload against a token. */
  registerUpload(token: string): void {
    const entry = this.tokens.get(token);
    if (entry) {
      entry.uploadCount += 1;
    }
  }

  /** Remove all expired or invalidated tokens from the store. */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.tokens.entries()) {
      if (!entry.isActive || entry.expiresAt.getTime() <= now) {
        this.tokens.delete(key);
      }
    }
  }

  /** Stop the background cleanup timer (used for graceful shutdown/tests). */
  dispose(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /** Current number of stored tokens (mostly for diagnostics). */
  size(): number {
    return this.tokens.size;
  }
}

/** Shared singleton instance used throughout the application. */
export const tokenService = new TokenService();
