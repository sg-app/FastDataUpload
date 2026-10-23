import cors from 'cors';
import type { CorsOptions } from 'cors';
import { config } from '../config';

/**
 * Build the CORS configuration.
 *
 * In production (behind Nginx Proxy Manager) the SPA and the API share the
 * same origin, so cross origin requests are not needed. When CORS_ORIGIN is
 * empty we simply reflect the request origin, which keeps local development
 * (Vite dev server on another port) working without extra configuration.
 */
export function createCorsMiddleware() {
  const options: CorsOptions = {
    origin: config.corsOrigins.length > 0 ? config.corsOrigins : true,
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  };

  return cors(options);
}
